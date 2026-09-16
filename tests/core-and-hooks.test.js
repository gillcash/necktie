"use strict";

const assert = require("node:assert/strict");
const { execSync, spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { temporary } = require("./helpers.cjs");
const sessions = require("../lib/necktie-session.cjs");
const runtime = require("../hooks/necktie-context.js");
const root = path.resolve(__dirname, "..");
const json = (file) => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));

function fixture(t) {
  const directory = temporary(t);
  const configPath = path.join(directory, "config.json");
  const options = { sessionOptions: { stateDirectory: path.join(directory, "state") }, configOptions: { configPath } };
  const env = { PLUGIN_ROOT: root, PLUGIN_DATA: directory };
  return { directory, configPath, options, env,
    evaluate: (prompt, session_id = "one", event = "UserPromptSubmit") =>
      runtime.evaluate(event, env, "", { session_id, prompt }, options),
  };
}

function childEnvironment() {
  const env = { ...process.env, NECKTIE_DEFAULT_MODE: "full" };
  for (const key of ["CODEX_THREAD_ID", "CLAUDE_SESSION_ID", "COPILOT_SESSION_ID", "QODER_SESSION_ID", "PLUGIN_ROOT", "PLUGIN_DATA", "COPILOT_PLUGIN_DATA"]) delete env[key];
  return env;
}

test("hook mode commands isolate sessions and preserve default-only semantics", (t) => {
  const { evaluate, configPath } = fixture(t);
  assert.equal(evaluate("", "one", "SessionStart").resolution.mode, "full");
  const switched = evaluate("/necktie-mode lite");
  assert.equal(switched.resolution.mode, "lite");
  assert.match(switched.message, /for this session/);
  assert.match(switched.context, /level: lite/i);
  assert.equal(evaluate("ordinary request", "two").resolution.mode, "full");
  assert.equal(evaluate("/necktie-mode default mammon").resolution.mode, "lite");
  assert.equal(JSON.parse(fs.readFileSync(configPath, "utf8")).defaultMode, "mammon");
  assert.match(evaluate("/necktie-mode status").message, /current lite; configured default mammon/);
  const invalid = evaluate("/necktie-mode off");
  assert.match(invalid.message, /^Usage:/);
  assert.equal(invalid.resolution.mode, "lite");
});

test("hook payloads use each host's native shape", (t) => {
  const { options } = fixture(t);
  for (const [env, host, event, field] of [
    [{ PLUGIN_ROOT: root, PLUGIN_DATA: "data" }, "", "SessionStart", "hookSpecificOutput"],
    [{ PLUGIN_ROOT: root }, "copilot", "SessionStart", "additionalContext"],
    [{ CLAUDE_PLUGIN_ROOT: root }, "", "SessionStart", "text"],
    [{ CLAUDE_PLUGIN_ROOT: root }, "", "SubagentStart", "hookSpecificOutput"],
    [{ PLUGIN_ROOT: root }, "qoder", "SessionStart", "hookSpecificOutput"],
    [{ PLUGIN_ROOT: root }, "gemini", "SessionStart", "hookSpecificOutput"],
  ]) {
    const result = runtime.evaluate(event, env, host, { session_id: field }, options);
    const value = runtime.hostPayload(event, result.context, result.host);
    const context = field === "text" ? value : field === "additionalContext" ? value.additionalContext : value.hookSpecificOutput.additionalContext;
    assert.match(context, /level: full/i);
    if (value.hookSpecificOutput) assert.equal(value.hookSpecificOutput.hookEventName, event);
  }
});

test("hook manifests cover session, prompt, subagent, Copilot, and Qoder events", () => {
  const hooks = json("hooks/hooks.json").hooks;
  assert.deepEqual(Object.keys(hooks).sort(), ["SessionStart", "SubagentStart", "UserPromptSubmit"]);
  assert.match(hooks.UserPromptSubmit[0].hooks[0].command, /necktie-context\.js/);
  const copilot = json("hooks/copilot-hooks.json").hooks;
  assert.ok(copilot.sessionStart);
  assert.ok(copilot.userPromptSubmitted);
  const qoder = json("hooks/qoder-hooks.json").hooks;
  assert.ok(qoder.UserPromptSubmit);
  assert.equal(qoder.PreToolUse[0].matcher, "task|Task");
});

test("shared hook command resolves Claude, Codex, and Gemini roots", (t) => {
  const command = json("hooks/hooks.json").hooks.SessionStart[0].hooks[0].command;
  for (const host of ["gemini", "claude", "codex"]) {
    const session_id = `test-${process.pid}-${Date.now()}-${host}`;
    t.after(() => fs.rmSync(sessions.statePath(host, session_id), { force: true }));
    const env = childEnvironment();
    if (host === "codex") env.PLUGIN_DATA = path.join(root, ".test-data");
    const replaced = command.replaceAll(host === "gemini" ? "${extensionPath}" : "${CLAUDE_PLUGIN_ROOT}", root);
    const result = execSync(replaced, { encoding: "utf8", env, input: JSON.stringify({ session_id }) });
    const context = host === "claude" ? result : JSON.parse(result).hookSpecificOutput.additionalContext;
    assert.match(context, /level: full/i);
  }
});

test("hook write failures preserve active instructions and report diagnostics", (t) => {
  const { directory, options, evaluate, configPath } = fixture(t);
  options.configOptions.configPath = directory;
  const failedDefault = evaluate("/necktie-mode default mammon");
  assert.match(failedDefault.message, /Failed to save Necktie default/);
  assert.equal(failedDefault.resolution.mode, "full");
  assert.match(failedDefault.context, /level: full/i);

  const blockedState = path.join(directory, "state-file");
  fs.writeFileSync(blockedState, "keep");
  options.sessionOptions.stateDirectory = blockedState;
  options.configOptions.configPath = configPath;
  for (const [command, diagnostic] of [["lite", /Failed to save Necktie session mode/], ["default mammon", /Failed to initialize Necktie session mode/]]) {
    const result = evaluate(`/necktie-mode ${command}`, "fresh-session");
    assert.match(result.message, diagnostic);
    assert.match(result.resolution.warnings.join("\n"), /Could not persist Necktie session mode/);
    assert.match(result.context, /level: full/i);
    assert.equal(fs.existsSync(configPath), false);
  }
});

test("hook exits when stdin never closes", async (t) => {
  const sessionId = `timeout-${Date.now()}`;
  t.after(() => fs.rmSync(sessions.statePath("claude", sessionId), { force: true }));
  const child = spawn(process.execPath, [path.join(root, "hooks/necktie-context.js"), "UserPromptSubmit"], {
    cwd: root, env: { ...childEnvironment(), CLAUDE_PLUGIN_ROOT: root }, stdio: ["pipe", "pipe", "pipe"],
  });
  child.stdin.write(JSON.stringify({ session_id: sessionId, prompt: "/necktie-mode lite" }));
  const output = [];
  child.stdout.on("data", (chunk) => output.push(chunk));
  const code = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => { child.kill(); reject(new Error("Necktie hook did not self-exit.")); }, 2500);
    child.on("exit", (value) => { clearTimeout(timer); resolve(value); });
  });
  assert.equal(code, 0);
  assert.match(Buffer.concat(output).toString("utf8"), /level: lite/i);
});
