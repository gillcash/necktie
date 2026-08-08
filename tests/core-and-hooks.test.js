"use strict";

const assert = require("node:assert/strict");
const { execSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const core = fs.readFileSync(path.join(root, "core", "necktie-core.md"), "utf8").trim();
const runtime = require(path.join(root, "hooks", "necktie-context.js"));

test("Core states the always-on contract and bounded explicit loop", () => {
  assert.match(core, /active for every response/i);
  assert.match(core, /strongest unasked question/i);
  assert.match(core, /Do not run the full Necktie Loop unless/i);
  assert.match(core, /frame, baseline, critique, reverse, execute, review, verify/);
  assert.doesNotMatch(core, /lite|ultra|default mode|status line/i);
});

test("hook runtime reads the canonical Core", () => {
  assert.equal(runtime.coreContext({ PLUGIN_ROOT: root }), core);
  assert.equal(runtime.pluginRoot({ PLUGIN_ROOT: root }), root);
});

test("hook runtime emits host-native payloads", () => {
  const codex = runtime.payload("SessionStart", { PLUGIN_ROOT: root, PLUGIN_DATA: "data" });
  assert.equal(codex.hookSpecificOutput.hookEventName, "SessionStart");
  assert.equal(codex.hookSpecificOutput.additionalContext, core);

  const copilot = runtime.payload("SessionStart", { PLUGIN_ROOT: root }, "copilot");
  assert.deepEqual(copilot, { additionalContext: core });

  const claude = runtime.payload("SessionStart", { CLAUDE_PLUGIN_ROOT: root });
  assert.equal(claude, core);

  const subagent = runtime.payload("SubagentStart", { CLAUDE_PLUGIN_ROOT: root });
  assert.equal(subagent.hookSpecificOutput.additionalContext, core);

  const gemini = runtime.payload("SessionStart", {}, "gemini");
  assert.equal(gemini.hookSpecificOutput.hookEventName, "SessionStart");
  assert.equal(gemini.hookSpecificOutput.additionalContext, core);
});

test("hook manifests cover session, subagent, Copilot, and Qoder events", () => {
  const hooks = JSON.parse(fs.readFileSync(path.join(root, "hooks", "hooks.json"), "utf8"));
  assert.deepEqual(Object.keys(hooks.hooks).sort(), ["SessionStart", "SubagentStart"]);
  assert.match(hooks.hooks.SessionStart[0].hooks[0].command, /\$\{CLAUDE_PLUGIN_ROOT\}/);
  assert.match(hooks.hooks.SessionStart[0].hooks[0].command, /\$\{extensionPath\}/);
  const copilot = JSON.parse(fs.readFileSync(path.join(root, "hooks", "copilot-hooks.json"), "utf8"));
  assert.equal(copilot.version, 1);
  assert.ok(copilot.hooks.sessionStart[0].bash.includes("necktie-context.js"));
  const qoder = JSON.parse(fs.readFileSync(path.join(root, "hooks", "qoder-hooks.json"), "utf8"));
  assert.ok(qoder.hooks.UserPromptSubmit);
  assert.equal(qoder.hooks.PreToolUse[0].matcher, "task|Task");
});

test("shared SessionStart command resolves Claude/Codex and Gemini roots", () => {
  const hooks = JSON.parse(fs.readFileSync(path.join(root, "hooks", "hooks.json"), "utf8"));
  const command = hooks.hooks.SessionStart[0].hooks[0].command;
  const geminiCommand = command.replaceAll("${extensionPath}", root);
  const gemini = JSON.parse(execSync(geminiCommand, { encoding: "utf8" }));
  assert.equal(gemini.hookSpecificOutput.additionalContext, core);

  const claudeCommand = command.replaceAll("${CLAUDE_PLUGIN_ROOT}", root);
  const claude = execSync(claudeCommand, { encoding: "utf8" });
  assert.equal(claude, core);

  const codex = JSON.parse(execSync(claudeCommand, {
    encoding: "utf8",
    env: { ...process.env, PLUGIN_DATA: path.join(root, ".test-data") },
  }));
  assert.equal(codex.hookSpecificOutput.additionalContext, core);
});
