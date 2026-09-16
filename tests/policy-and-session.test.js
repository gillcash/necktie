"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { temporary } = require("./helpers.cjs");
const policy = require("../lib/necktie-policy.cjs");
const commands = require("../lib/necktie-command.cjs");
const sessions = require("../lib/necktie-session.cjs");
const root = path.resolve(__dirname, "..");
const json = (file) => JSON.parse(fs.readFileSync(file, "utf8"));

test("generated references preserve distinct modes and one shared core", () => {
  assert.deepEqual(policy.MODES, ["lite", "full", "mammon"]);
  assert.equal(policy.DEFAULT_MODE, "full");
  for (const [mode, included, excluded] of [
    ["lite", [/Mammon is an internal adversary/i, /Mammon stays internal/i], /Ambition pass|Useful action pass|sole final perspective/i],
    ["full", [/Ambition pass/, /Useful action pass/], /Mammon is the sole final perspective/i],
    ["mammon", [/Mammon is the sole final perspective/i, /No rebuttal/i, /Useful action pass/], /Then rebut|Ambition pass/],
  ]) {
    const instructions = policy.buildInstructions(mode);
    assert.equal(instructions.match(/NECKTIE MODE ACTIVE/g)?.length, 1);
    assert.doesNotMatch(instructions, /<MODE>/);
    assert.match(instructions, /Never narrate private analysis/i);
    assert.match(instructions, new RegExp(`level: ${mode}`, "i"));
    for (const pattern of included) assert.match(instructions, pattern);
    assert.doesNotMatch(instructions, excluded);
    if (mode !== "lite") assert.match(instructions, /use `necktie-research`; approval\s+authorizes starting immediately/i);
  }
  for (const mode of ["off", "bogus"]) assert.throws(() => policy.buildInstructions(mode), { code: "NECKTIE_INVALID_MODE" });
});

test("mode precedence and diagnostics preserve default metadata", (t) => {
  const configPath = path.join(temporary(t), "config.json");
  const resolve = (values = {}) => policy.resolveMode({ env: {}, configOptions: { configPath }, ...values });
  fs.writeFileSync(configPath, JSON.stringify({ defaultMode: "lite" }));
  for (const [values, mode, source] of [
    [{}, "lite", "config"],
    [{ sessionMode: "mammon" }, "mammon", "session"],
    [{ requestedMode: "FULL", sessionMode: "mammon" }, "full", "requested"],
    [{ env: { NECKTIE_DEFAULT_MODE: "mammon" } }, "mammon", "environment"],
  ]) {
    const result = resolve(values);
    assert.equal(result.mode, mode);
    assert.equal(result.source, source);
    assert.equal(result.configuredDefaultMode, "lite");
  }
  const environment = resolve({ env: { NECKTIE_DEFAULT_MODE: "mammon" } });
  assert.equal(environment.environmentOverride, "mammon");
  assert.equal(commands.formatStatus(environment), "Necktie mode: current mammon; configured default lite. Environment override: mammon.");
  assert.throws(() => resolve({ requestedMode: "off" }), { code: "NECKTIE_INVALID_MODE" });
  for (const [content, values, diagnostic] of [
    ["not json", {}, /invalid Necktie configuration/],
    ["[]", {}, /non-object Necktie configuration/],
    ['{"defaultMode":"off"}', {}, /invalid defaultMode/],
    ["{}", { env: { NECKTIE_DEFAULT_MODE: "bogus" } }, /NECKTIE_DEFAULT_MODE/],
    ["{}", { sessionMode: "bogus" }, /invalid stored Necktie session mode/],
  ]) {
    fs.writeFileSync(configPath, content);
    const result = resolve(values);
    assert.equal(result.mode, "full");
    assert.match(result.warnings.join("\n"), diagnostic);
  }
});

test("configuration paths use APPDATA on Windows and XDG only elsewhere", () => {
  assert.equal(policy.configPath({ APPDATA: "C:\\Users\\person\\AppData\\Roaming", XDG_CONFIG_HOME: "C:\\xdg" },
    { platform: "win32", home: "C:\\Users\\person" }), "C:\\Users\\person\\AppData\\Roaming\\necktie\\config.json");
  assert.equal(policy.configPath({ XDG_CONFIG_HOME: "/tmp/xdg" }, { platform: "linux", home: "/home/person" }),
    path.join("/tmp/xdg", "necktie", "config.json"));
});

test("atomic writes preserve other keys and existing data on failure", (t) => {
  const directory = temporary(t);
  const configPath = path.join(directory, "config.json");
  fs.writeFileSync(configPath, JSON.stringify({ keep: true, defaultMode: "lite" }));
  assert.equal(policy.writeDefaultMode("mammon", {}, { configPath }).mode, "mammon");
  assert.deepEqual(json(configPath), { keep: true, defaultMode: "mammon" });
  const overridden = policy.writeDefaultMode("lite", { NECKTIE_DEFAULT_MODE: "full" }, { configPath });
  assert.equal(overridden.writtenMode, "lite");
  assert.equal(overridden.mode, "full");
  assert.equal(overridden.configuredMode, "lite");
  assert.equal(overridden.environmentOverride, "full");
  if (process.platform !== "win32") assert.equal(fs.statSync(configPath).mode & 0o777, 0o600);
  t.mock.method(fs, "renameSync", () => { throw new Error("rename failed"); });
  assert.throws(() => policy.writeDefaultMode("mammon", {}, { configPath }), /rename failed/);
  assert.deepEqual(fs.readdirSync(directory), ["config.json"]);
  assert.deepEqual(json(configPath), { keep: true, defaultMode: "lite" });
});

test("session storage isolates hosts and sessions, stores only modes, diagnoses corruption, and prunes stale files", (t) => {
  const directory = temporary(t);
  const options = { stateDirectory: directory };
  for (const [host, id, mode] of [["codex", "one", "lite"], ["codex", "two", "mammon"], ["claude", "one", "full"]]) {
    sessions.writeSessionMode(host, id, mode, options);
    assert.equal(sessions.readSessionMode(host, id, options), mode);
    assert.deepEqual(json(sessions.statePath(host, id, options)), { mode });
  }
  const target = sessions.statePath("codex", "one", options);
  fs.writeFileSync(target, JSON.stringify({ mode: "bogus" }));
  const stored = sessions.readSessionMode("codex", "one", options);
  const resolved = policy.resolveMode({ sessionMode: stored, env: {}, configOptions: { configPath: path.join(directory, "config.json") } });
  assert.equal(resolved.mode, "full");
  assert.match(resolved.warnings.join("\n"), /invalid stored Necktie session mode/);
  const old = new Date(Date.now() - sessions.MAX_AGE_MS - 1000);
  fs.utimesSync(target, old, old);
  sessions.readSessionMode("codex", "current", options);
  assert.equal(fs.existsSync(target), false);
});

test("mode command grammar stays separate from the decision command", () => {
  assert.match(commands.USAGE, /lite\|full/);
  assert.doesNotMatch(commands.USAGE, /mammon/i);
  for (const [text, expected] of [
    ["/necktie-mode", { type: "status" }],
    ["/necktie:necktie-mode mammon", { type: "set-session", mode: "mammon" }],
    ["[NECKTIE_MODE_COMMAND] default lite", { type: "set-default", mode: "lite" }],
    ["[NECKTIE_MODE_COMMAND] mammon\n\nReport the selected mode.", { type: "set-session", mode: "mammon" }],
    ["/necktie assess this policy", null],
  ]) assert.deepEqual(commands.parseModeCommand(text), expected);
  for (const text of ["off", "default", "default off", "lite extra"]) assert.equal(commands.parseModeArguments(text).type, "invalid");
});

test("default commands pin the effective mode before changing new-session defaults", (t) => {
  const configPath = path.join(temporary(t), "config.json");
  let saved;
  const options = { env: {}, configOptions: { configPath }, saveSession: (mode) => { saved = mode; } };
  for (const sessionMode of [null, "bogus"]) {
    fs.writeFileSync(configPath, '{"defaultMode":"lite"}');
    const result = commands.executeModeCommand(commands.parseModeArguments("default mammon"), { ...options, sessionMode });
    assert.equal(saved, "lite");
    assert.equal(result.resolution.mode, "lite");
    assert.equal(json(configPath).defaultMode, "mammon");
  }
  const failed = commands.executeModeCommand(commands.parseModeArguments("lite"), {
    ...options, sessionMode: "mammon", saveSession: () => { throw new Error("storage unavailable"); },
  });
  assert.equal(failed.resolution.mode, "mammon");
  assert.match(failed.message, /Failed to save Necktie session mode/);
});
