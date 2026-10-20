import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import helpers from "../../tests/helpers.cjs";
import necktieExtension, { coreContext, sendSkill } from "../index.js";

function fakePi() {
  const commands = new Map();
  const handlers = new Map();
  const messages = [];
  return {
    commands, handlers, messages,
    appendEntry() { assert.fail("Necktie must not write session settings"); },
    registerCommand(name, value) { commands.set(name, value); },
    on(name, handler) { handlers.set(name, handler); },
    sendUserMessage(...args) { messages.push(args); },
  };
}

test("Pi registers only the decision command and policy injection hook", () => {
  const pi = fakePi();
  necktieExtension(pi);
  assert.deepEqual([...pi.commands.keys()], ["necktie"]);
  assert.deepEqual([...pi.handlers.keys()], ["before_agent_start"]);
});

test("Pi injects the sole policy safely with or without an existing prompt", async () => {
  const pi = fakePi();
  necktieExtension(pi);
  const handler = pi.handlers.get("before_agent_start");
  const policy = coreContext();
  assert.match(policy, /^NECKTIE ACTIVE\./);
  assert.match(policy, /Let Necktie decide/);
  assert.deepEqual(await handler(undefined), { systemPrompt: policy });
  assert.deepEqual(await handler({}), { systemPrompt: policy });
  assert.deepEqual(await handler({ systemPrompt: "base" }), { systemPrompt: `base\n\n${policy}` });
});

test("Pi ignores legacy environment, config, and session entries without accessing settings", async (t) => {
  const directory = helpers.isolatedConfig(t);
  const legacy = path.join(directory, "necktie");
  const settings = path.join(legacy, "config.json");
  fs.mkdirSync(legacy);
  fs.writeFileSync(settings, '{"defaultMode":"lite","keep":"untouched"}');
  process.env.NECKTIE_DEFAULT_MODE = "lite";
  const originalRead = fs.readFileSync;
  const originalWrite = fs.writeFileSync;
  const guard = (file) => assert.ok(!path.resolve(String(file)).startsWith(`${legacy}${path.sep}`), "legacy settings must not be accessed");
  fs.readFileSync = (file, ...args) => { guard(file); return originalRead(file, ...args); };
  fs.writeFileSync = (file, ...args) => { guard(file); return originalWrite(file, ...args); };
  t.after(() => { fs.readFileSync = originalRead; fs.writeFileSync = originalWrite; });
  const pi = fakePi();
  necktieExtension(pi);
  const ctx = {
    sessionManager: {
      getBranch() { assert.fail("Necktie must not read session settings"); },
      getEntries() { assert.fail("Necktie must not read session settings"); },
    },
  };
  const output = await pi.handlers.get("before_agent_start")({}, ctx);
  assert.match(output.systemPrompt, /^NECKTIE ACTIVE\./);
  assert.match(output.systemPrompt, /Let Necktie decide/);
  assert.equal(originalRead(settings, "utf8"), '{"defaultMode":"lite","keep":"untouched"}');
});

test("Pi decision command delegates arguments and queues follow-up delivery while busy", () => {
  const pi = fakePi();
  necktieExtension(pi);
  pi.commands.get("necktie").handler("  price the renewal $&  ", { isIdle: () => false });
  assert.deepEqual(pi.messages[0], ["/skill:necktie price the renewal $&", { deliverAs: "followUp" }]);
  pi.commands.get("necktie").handler("", { isIdle: () => true });
  assert.deepEqual(pi.messages[1], ["/skill:necktie"]);
  sendSkill(pi, "necktie", "a decision");
  assert.deepEqual(pi.messages[2], ["/skill:necktie a decision"]);
});
