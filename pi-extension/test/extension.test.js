import assert from "node:assert/strict";
import test from "node:test";
import necktieExtension, { coreContext, sendSkill } from "../index.js";

function fakePi() {
  const commands = new Map();
  const handlers = new Map();
  const messages = [];
  return {
    commands, handlers, messages,
    registerCommand(name, value) { commands.set(name, value); },
    on(name, handler) { handlers.set(name, handler); },
    sendUserMessage(...args) { messages.push(args); },
  };
}

test("Pi registers exactly four commands", () => {
  const pi = fakePi();
  necktieExtension(pi);
  assert.deepEqual([...pi.commands.keys()].sort(), ["necktie", "necktie-critique", "necktie-reverse", "necktie-review"]);
});

test("Pi injects Core with and without an existing system prompt", async () => {
  const pi = fakePi();
  necktieExtension(pi);
  const handler = pi.handlers.get("before_agent_start");
  assert.deepEqual(await handler(undefined), { systemPrompt: coreContext() });
  assert.deepEqual(await handler({}), { systemPrompt: coreContext() });
  assert.deepEqual(await handler({ systemPrompt: "base" }), { systemPrompt: `base\n\n${coreContext()}` });
});

test("Pi command delegation preserves arguments and follow-up delivery", () => {
  const pi = fakePi();
  sendSkill(pi, "necktie", "a goal", { isIdle: () => false });
  assert.deepEqual(pi.messages[0], ["/skill:necktie a goal", { deliverAs: "followUp" }]);
  sendSkill(pi, "necktie-review", "", { isIdle: () => true });
  assert.deepEqual(pi.messages[1], ["/skill:necktie-review"]);
});
