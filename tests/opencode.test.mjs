import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const require = createRequire(import.meta.url);
const sessions = require("../lib/necktie-session.cjs");
const module = await import(pathToFileURL(path.join(root, ".opencode", "plugins", "necktie.mjs")));

function cleanupSession(sessionID) {
  const target = sessions.statePath("opencode", sessionID);
  try { fs.unlinkSync(target); } catch (_) {}
}

async function withFullDefault(callback) {
  const previous = process.env.NECKTIE_DEFAULT_MODE;
  process.env.NECKTIE_DEFAULT_MODE = "full";
  try {
    return await callback();
  } finally {
    if (previous === undefined) delete process.env.NECKTIE_DEFAULT_MODE;
    else process.env.NECKTIE_DEFAULT_MODE = previous;
  }
}

test("OpenCode registers decision and mode commands plus the skill path", async () => {
  const plugin = await module.default();
  const config = {};
  await plugin.config(config);
  assert.deepEqual(Object.keys(config.command).sort(), ["necktie", "necktie-mode"]);
  assert.ok(config.skills.paths.includes(path.join(root, "skills")));
});

test("OpenCode injects Full by default and switches a session independently", async () => withFullDefault(async () => {
  const sessionID = `opencode-${process.pid}-${Date.now()}`;
  const otherID = `${sessionID}-other`;
  const plugin = await module.default();
  try {
    const initial = { system: ["base"] };
    await plugin["experimental.chat.system.transform"]({ sessionID }, initial);
    assert.match(initial.system[0], /level: full/i);

    await plugin["command.execute.before"]({ command: "necktie-mode", arguments: "lite", sessionID });
    const switched = { system: [] };
    await plugin["experimental.chat.system.transform"]({ sessionID }, switched);
    assert.match(switched.system[0], /mode set to lite for this session/i);
    assert.match(switched.system[0], /level: lite/i);

    const other = { system: [] };
    await plugin["experimental.chat.system.transform"]({ sessionID: otherID }, other);
    assert.match(other.system[0], /level: full/i);
  } finally {
    cleanupSession(sessionID);
    cleanupSession(otherID);
  }
}));

test("OpenCode default writes do not mutate the active session", async () => {
  const configHome = fs.mkdtempSync(path.join(os.tmpdir(), "necktie-opencode-config-"));
  const previousXdg = process.env.XDG_CONFIG_HOME;
  const previousAppData = process.env.APPDATA;
  const previousDefault = process.env.NECKTIE_DEFAULT_MODE;
  const sessionID = `opencode-default-${process.pid}-${Date.now()}`;
  process.env.XDG_CONFIG_HOME = configHome;
  process.env.APPDATA = configHome;
  delete process.env.NECKTIE_DEFAULT_MODE;
  const plugin = await module.default();
  try {
    await plugin["command.execute.before"]({ command: "necktie-mode", arguments: "lite", sessionID });
    await plugin["command.execute.before"]({ command: "necktie-mode", arguments: "default ultra", sessionID });
    const output = { system: [] };
    await plugin["experimental.chat.system.transform"]({ sessionID }, output);
    assert.match(output.system[0], /Current session remains lite/i);
    assert.match(output.system[0], /level: lite/i);
    const saved = JSON.parse(fs.readFileSync(path.join(configHome, "necktie", "config.json"), "utf8"));
    assert.equal(saved.defaultMode, "ultra");
  } finally {
    cleanupSession(sessionID);
    if (previousXdg === undefined) delete process.env.XDG_CONFIG_HOME;
    else process.env.XDG_CONFIG_HOME = previousXdg;
    if (previousAppData === undefined) delete process.env.APPDATA;
    else process.env.APPDATA = previousAppData;
    if (previousDefault === undefined) delete process.env.NECKTIE_DEFAULT_MODE;
    else process.env.NECKTIE_DEFAULT_MODE = previousDefault;
    fs.rmSync(configHome, { recursive: true, force: true });
  }
});

test("OpenCode rejects off without changing mode", async () => withFullDefault(async () => {
  const sessionID = `opencode-invalid-${process.pid}-${Date.now()}`;
  const plugin = await module.default();
  try {
    await plugin["command.execute.before"]({ command: "necktie-mode", arguments: "off", sessionID });
    const output = { system: [] };
    await plugin["experimental.chat.system.transform"]({ sessionID }, output);
    assert.match(output.system[0], /^Usage:/);
    assert.match(output.system[0], /level: full/i);
    assert.equal(fs.existsSync(sessions.statePath("opencode", sessionID)), false);
  } finally {
    cleanupSession(sessionID);
  }
}));
