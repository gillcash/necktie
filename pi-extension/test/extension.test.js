import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import necktieExtension, {
  coreContext,
  parseNecktieModeCommand,
  resolveSessionMode,
  sendSkill,
} from "../index.js";

function fakePi() {
  const commands = new Map();
  const handlers = new Map();
  const messages = [];
  const entries = [];
  return {
    commands, handlers, messages, entries,
    appendEntry(customType, data) { entries.push({ type: "custom", customType, data }); },
    registerCommand(name, value) { commands.set(name, value); },
    on(name, handler) { handlers.set(name, handler); },
    sendUserMessage(...args) { messages.push(args); },
  };
}

function context(entries = []) {
  const notifications = [];
  return {
    notifications,
    isIdle: () => true,
    sessionManager: { getEntries: () => entries },
    ui: { notify: (...args) => notifications.push(args) },
  };
}

async function withTempConfig(callback) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "necktie-pi-"));
  const previousXdg = process.env.XDG_CONFIG_HOME;
  const previousAppData = process.env.APPDATA;
  const previousDefault = process.env.NECKTIE_DEFAULT_MODE;
  process.env.XDG_CONFIG_HOME = directory;
  process.env.APPDATA = directory;
  delete process.env.NECKTIE_DEFAULT_MODE;
  try {
    return await callback(directory);
  } finally {
    if (previousXdg === undefined) delete process.env.XDG_CONFIG_HOME;
    else process.env.XDG_CONFIG_HOME = previousXdg;
    if (previousAppData === undefined) delete process.env.APPDATA;
    else process.env.APPDATA = previousAppData;
    if (previousDefault === undefined) delete process.env.NECKTIE_DEFAULT_MODE;
    else process.env.NECKTIE_DEFAULT_MODE = previousDefault;
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

test("Pi registers separate decision and mode commands", () => {
  const pi = fakePi();
  necktieExtension(pi);
  assert.deepEqual([...pi.commands.keys()], ["necktie", "necktie-mode"]);
});

test("Pi injects Full safely with or without an existing prompt", async () => withTempConfig(async () => {
  const pi = fakePi();
  necktieExtension(pi);
  const ctx = context();
  await pi.handlers.get("session_start")({}, ctx);
  const handler = pi.handlers.get("before_agent_start");
  assert.deepEqual(await handler(undefined), { systemPrompt: coreContext("full") });
  assert.deepEqual(await handler({}), { systemPrompt: coreContext("full") });
  assert.deepEqual(await handler({ systemPrompt: "base" }), { systemPrompt: `base\n\n${coreContext("full")}` });
}));

test("Pi mode command updates and restores only session state", async () => withTempConfig(async () => {
  const pi = fakePi();
  necktieExtension(pi);
  const ctx = context();
  await pi.handlers.get("session_start")({}, ctx);
  const message = await pi.commands.get("necktie-mode").handler("ultra", ctx);
  assert.match(message, /ultra for this session/);
  assert.deepEqual(pi.entries.at(-1), { type: "custom", customType: "necktie-mode", data: { mode: "ultra" } });
  assert.match((await pi.handlers.get("before_agent_start")({})).systemPrompt, /level: ultra/i);

  const resumed = fakePi();
  necktieExtension(resumed);
  await resumed.handlers.get("session_start")({}, context(pi.entries));
  assert.match((await resumed.handlers.get("before_agent_start")({})).systemPrompt, /level: ultra/i);
}));

test("Pi persisted default leaves the current session unchanged", async () => withTempConfig(async (directory) => {
  const pi = fakePi();
  necktieExtension(pi);
  const ctx = context();
  await pi.handlers.get("session_start")({}, ctx);
  await pi.commands.get("necktie-mode").handler("lite", ctx);
  const message = await pi.commands.get("necktie-mode").handler("default ultra", ctx);
  assert.match(message, /Current session remains lite/);
  assert.match((await pi.handlers.get("before_agent_start")({})).systemPrompt, /level: lite/i);
  const config = JSON.parse(fs.readFileSync(path.join(directory, "necktie", "config.json"), "utf8"));
  assert.equal(config.defaultMode, "ultra");
}));

test("Pi status and invalid commands are non-mutating", async () => withTempConfig(async () => {
  const pi = fakePi();
  necktieExtension(pi);
  const ctx = context();
  await pi.handlers.get("session_start")({}, ctx);
  assert.match(await pi.commands.get("necktie-mode").handler("status", ctx), /current full; configured default full/);
  assert.match(await pi.commands.get("necktie-mode").handler("off", ctx), /^Usage:/);
  assert.deepEqual(pi.entries, []);
}));

test("Pi decision delegation preserves arguments and follow-up delivery", () => {
  const pi = fakePi();
  sendSkill(pi, "necktie", "--mode lite a decision", { isIdle: () => false });
  assert.deepEqual(pi.messages[0], ["/skill:necktie --mode lite a decision", { deliverAs: "followUp" }]);
  sendSkill(pi, "necktie", "", { isIdle: () => true });
  assert.deepEqual(pi.messages[1], ["/skill:necktie"]);
});

test("Pi helper parsing and session resolution accept exactly three modes", () => {
  assert.deepEqual(parseNecktieModeCommand("default lite"), { type: "set-default", mode: "lite" });
  assert.equal(parseNecktieModeCommand("off").type, "invalid");
  assert.equal(resolveSessionMode([
    { type: "custom", customType: "necktie-mode", data: { mode: "lite" } },
    { type: "custom", customType: "necktie-mode", data: { mode: "ultra" } },
  ], "full"), "ultra");
});
