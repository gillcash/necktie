import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import helpers from "../../tests/helpers.cjs";
import necktieExtension, {
  coreContext,
  parseNecktieModeCommand,
  resolveSessionMode,
  sendSkill,
} from "../index.js";
const { isolatedConfig } = helpers;

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

async function fixture(t, entries = []) {
  const directory = isolatedConfig(t);
  const pi = fakePi();
  const ctx = context(entries);
  necktieExtension(pi);
  await pi.handlers.get("session_start")({}, ctx);
  return { directory, pi, ctx,
    command: (args) => pi.commands.get("necktie-mode").handler(args, ctx),
    prompt: async (event = {}) => (await pi.handlers.get("before_agent_start")(event)).systemPrompt,
  };
}

test("Pi registers separate decision and mode commands", () => {
  const pi = fakePi();
  necktieExtension(pi);
  assert.deepEqual([...pi.commands.keys()], ["necktie", "necktie-mode"]);
  assert.doesNotMatch(JSON.stringify([...pi.commands.values()]), /mammon/i);
});

test("Pi injects Full safely with or without an existing prompt", async (t) => {
  const { pi } = await fixture(t);
  const handler = pi.handlers.get("before_agent_start");
  assert.deepEqual(await handler(undefined), { systemPrompt: coreContext("full") });
  assert.deepEqual(await handler({}), { systemPrompt: coreContext("full") });
  assert.deepEqual(await handler({ systemPrompt: "base" }), { systemPrompt: `base\n\n${coreContext("full")}` });
});

test("Pi mode command updates and restores only session state", async (t) => {
  const { pi, command, prompt } = await fixture(t);
  const message = await command("mammon");
  assert.match(message, /mammon for this session/);
  assert.deepEqual(pi.entries.at(-1), { type: "custom", customType: "necktie-mode", data: { mode: "mammon" } });
  assert.match(await prompt(), /level: mammon/i);

  const resumed = fakePi();
  necktieExtension(resumed);
  await resumed.handlers.get("session_start")({}, context(pi.entries));
  assert.match((await resumed.handlers.get("before_agent_start")({})).systemPrompt, /level: mammon/i);
});

test("Pi persisted default leaves the current session unchanged", async (t) => {
  const { directory, pi, command, prompt } = await fixture(t);
  await command("default mammon");
  assert.deepEqual(pi.entries.at(-1).data, { mode: "full" });
  const resumed = fakePi();
  necktieExtension(resumed);
  await resumed.handlers.get("session_start")({}, context(pi.entries));
  assert.match((await resumed.handlers.get("before_agent_start")({})).systemPrompt, /level: full/i);
  await command("lite");
  const message = await command("default mammon");
  assert.match(message, /Current session remains lite/);
  assert.match(await prompt(), /level: lite/i);
  const config = JSON.parse(fs.readFileSync(path.join(directory, "necktie", "config.json"), "utf8"));
  assert.equal(config.defaultMode, "mammon");
  pi.appendEntry = () => { throw new Error("storage unavailable"); };
  assert.match(await command("default full"), /Failed to initialize Necktie session mode/);
  assert.match(await prompt(), /level: lite/i);
  assert.equal(JSON.parse(fs.readFileSync(path.join(directory, "necktie/config.json"), "utf8")).defaultMode, "mammon");
});

test("Pi status and invalid commands are non-mutating", async (t) => {
  const { pi, command } = await fixture(t);
  assert.match(await command("status"), /current full; configured default full/);
  assert.match(await command("off"), /^Usage:/);
  assert.deepEqual(pi.entries, []);
});

test("Pi decision delegation preserves arguments and follow-up delivery", () => {
  const pi = fakePi();
  sendSkill(pi, "necktie", "--mode lite a decision", { isIdle: () => false });
  assert.deepEqual(pi.messages[0], ["/skill:necktie --mode lite a decision", { deliverAs: "followUp" }]);
  sendSkill(pi, "necktie", "", { isIdle: () => true });
  assert.deepEqual(pi.messages[1], ["/skill:necktie"]);
});

test("Pi helper parsing and session resolution accept supported modes", () => {
  assert.deepEqual(parseNecktieModeCommand("default lite"), { type: "set-default", mode: "lite" });
  assert.equal(parseNecktieModeCommand("off").type, "invalid");
  assert.equal(resolveSessionMode([
    { type: "custom", customType: "necktie-mode", data: { mode: "lite" } },
    { type: "custom", customType: "necktie-mode", data: { mode: "mammon" } },
  ], "full"), "mammon");
});
