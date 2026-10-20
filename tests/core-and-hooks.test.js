"use strict";

const assert = require("node:assert/strict");
const { execSync, spawn, spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const { Readable } = require("node:stream");
const test = require("node:test");
const { temporary } = require("./helpers.cjs");
const policy = require("../lib/necktie-policy.cjs");
const runtime = require("../hooks/necktie-context.js");
const root = path.resolve(__dirname, "..");
const json = (file) => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));

function childEnvironment() {
  const env = { ...process.env };
  for (const key of ["CODEX_THREAD_ID", "CLAUDE_SESSION_ID", "COPILOT_SESSION_ID", "QODER_SESSION_ID", "PLUGIN_ROOT", "CLAUDE_PLUGIN_ROOT", "PLUGIN_DATA", "COPILOT_PLUGIN_DATA"]) delete env[key];
  return env;
}

test("hooks ignore legacy settings and commands without changing existing state", (t) => {
  const directory = temporary(t);
  const settings = path.join(directory, "necktie");
  fs.mkdirSync(settings);
  const config = path.join(settings, "config.json");
  const session = path.join(settings, "session.json");
  fs.writeFileSync(config, '{"defaultMode":"lite","keep":true}');
  fs.writeFileSync(session, '{"mode":"full"}');
  const before = [fs.readFileSync(config, "utf8"), fs.readFileSync(session, "utf8")];
  const env = { ...childEnvironment(), PLUGIN_ROOT: root, PLUGIN_DATA: directory, APPDATA: directory, XDG_CONFIG_HOME: directory, NECKTIE_DEFAULT_MODE: "lite" };
  for (const input of [null, {}, { prompt: "/necktie-mode default full", session_id: "one" }]) {
    const result = spawnSync(process.execPath, [path.join(root, "hooks/necktie-context.js"), "UserPromptSubmit"], {
      encoding: "utf8", env, input: JSON.stringify(input),
    });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stderr, "");
    assert.equal(JSON.parse(result.stdout).hookSpecificOutput.additionalContext, policy.buildInstructions());
  }
  assert.deepEqual(fs.readdirSync(directory), ["necktie"]);
  assert.deepEqual(fs.readdirSync(settings).sort(), ["config.json", "session.json"]);
  assert.deepEqual([fs.readFileSync(config, "utf8"), fs.readFileSync(session, "utf8")], before);
});

test("hook payloads use each host's native shape", () => {
  for (const [env, host, event, field] of [
    [{ PLUGIN_ROOT: root, PLUGIN_DATA: "data" }, "", "SessionStart", "hookSpecificOutput"],
    [{ PLUGIN_ROOT: root }, "copilot", "SessionStart", "additionalContext"],
    [{ CLAUDE_PLUGIN_ROOT: root }, "", "SessionStart", "text"],
    [{ CLAUDE_PLUGIN_ROOT: root }, "", "SubagentStart", "hookSpecificOutput"],
    [{ PLUGIN_ROOT: root }, "qoder", "SessionStart", "hookSpecificOutput"],
    [{ PLUGIN_ROOT: root }, "gemini", "SessionStart", "hookSpecificOutput"],
  ]) {
    const result = runtime.evaluate(event, env, host);
    const value = runtime.hostPayload(event, result.context, result.host);
    const context = field === "text" ? value : field === "additionalContext" ? value.additionalContext : value.hookSpecificOutput.additionalContext;
    assert.equal(context, policy.buildInstructions());
    if (value.hookSpecificOutput) assert.equal(value.hookSpecificOutput.hookEventName, event);
  }
});

test("host manifests load lifecycle hooks explicitly without Gemini auto-discovery", () => {
  assert.equal(json("plugin.json").$schema, undefined);
  assert.equal(fs.existsSync(path.join(root, "hooks/hooks.json")), false);
  for (const manifestFile of [".claude-plugin/plugin.json", ".codex-plugin/plugin.json"]) {
    const manifest = json(manifestFile);
    assert.equal(manifest.skills, "./skills/", manifestFile);
    assert.equal(manifest.hooks, "./hooks/claude-codex-hooks.json", manifestFile);
    assert.ok(fs.existsSync(path.resolve(root, manifest.hooks)), manifestFile);
  }
  const gemini = json("gemini-extension.json");
  assert.equal(gemini.contextFileName, "AGENTS.md");
  assert.match(fs.readFileSync(path.join(root, gemini.contextFileName), "utf8"), /NECKTIE ACTIVE/);
  assert.equal(gemini.hooks, undefined);
  assert.equal(json(".github/plugin/plugin.json").hooks, "hooks/copilot-hooks.json");
  assert.equal(json(".qoder-plugin/plugin.json").hooks, "./hooks/qoder-hooks.json");
});

test("hook manifests cover session, prompt, subagent, Copilot, and Qoder events", () => {
  const hooks = json("hooks/claude-codex-hooks.json").hooks;
  assert.deepEqual(Object.keys(hooks).sort(), ["SessionStart", "SubagentStart", "UserPromptSubmit"]);
  assert.match(hooks.UserPromptSubmit[0].hooks[0].command, /necktie-context\.js/);
  const copilot = json("hooks/copilot-hooks.json").hooks;
  assert.deepEqual(Object.keys(copilot), ["sessionStart"]);
  const qoder = json("hooks/qoder-hooks.json").hooks;
  assert.deepEqual(Object.keys(qoder).sort(), ["SubagentStart", "UserPromptSubmit"]);
  assert.equal(qoder.SubagentStart[0].matcher, undefined);
});

test("manifest-selected hook command resolves Claude and Codex roots", () => {
  for (const host of ["claude", "codex"]) {
    const manifest = json(`.${host}-plugin/plugin.json`);
    const command = json(manifest.hooks).hooks.SessionStart[0].hooks[0].command;
    const env = childEnvironment();
    if (host === "codex") env.PLUGIN_DATA = path.join(root, ".test-data");
    const replaced = command.replaceAll("${CLAUDE_PLUGIN_ROOT}", root);
    const result = execSync(replaced, { encoding: "utf8", env, input: "{}" });
    const context = host === "claude" ? result : JSON.parse(result).hookSpecificOutput.additionalContext;
    assert.equal(context, policy.buildInstructions());
  }
});

test("Qoder plugin hooks resolve the script from QODER_PLUGIN_ROOT, not the project directory", (t) => {
  const project = temporary(t);
  const env = { ...childEnvironment(), QODER_PLUGIN_ROOT: root, QODER_SESSION_ID: "session" };
  for (const [event, [group]] of Object.entries(json("hooks/qoder-hooks.json").hooks)) {
    const command = group.hooks[0].command;
    assert.doesNotMatch(command, /NECKTIE_DIR/, event);
    assert.match(command, /^node "\$\{QODER_PLUGIN_ROOT\}\/hooks\/necktie-context\.js" /, event);
    const shellCommand = process.platform === "win32" ? command.replaceAll("${QODER_PLUGIN_ROOT}", root) : command;
    const result = spawnSync(shellCommand, { shell: true, cwd: project, encoding: "utf8", env, input: "{}" });
    assert.equal(result.status, 0, `${event}: ${result.stderr}`);
    assert.equal(JSON.parse(result.stdout).hookSpecificOutput.additionalContext, policy.buildInstructions(), event);
  }
});

test("Qoder manifest commands emit context for the event that invoked them", (t) => {
  const project = temporary(t);
  const env = { ...childEnvironment(), QODER_PLUGIN_ROOT: root, QODER_SESSION_ID: "session" };
  for (const [event, [group]] of Object.entries(json("hooks/qoder-hooks.json").hooks)) {
    const command = group.hooks[0].command;
    const shellCommand = process.platform === "win32" ? command.replaceAll("${QODER_PLUGIN_ROOT}", root) : command;
    const result = spawnSync(shellCommand, {
      shell: true, cwd: project, encoding: "utf8", env,
      input: JSON.stringify({ hook_event_name: event }),
    });
    assert.equal(result.status, 0, `${event}: ${result.stderr}`);
    const output = JSON.parse(result.stdout).hookSpecificOutput;
    assert.equal(output.hookEventName, event, event);
    assert.equal(output.additionalContext, policy.buildInstructions(), event);
  }
});

test("hook input tolerates BOM and invalid JSON", async () => {
  for (const [input, expected] of [["\uFEFF{}", {}], ["not json", {}], ["", {}]]) {
    assert.deepEqual(await runtime.readHookInput(Readable.from([input])), expected);
  }
});

test("hook exits when stdin never closes", async () => {
  const child = spawn(process.execPath, [path.join(root, "hooks/necktie-context.js"), "UserPromptSubmit"], {
    cwd: root, env: { ...childEnvironment(), CLAUDE_PLUGIN_ROOT: root }, stdio: ["pipe", "pipe", "pipe"],
  });
  child.stdin.write('{"prompt":"/necktie-mode lite"}');
  const output = [];
  child.stdout.on("data", (chunk) => output.push(chunk));
  const code = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => { child.kill(); reject(new Error("Necktie hook did not self-exit.")); }, 2500);
    child.on("exit", (value) => { clearTimeout(timer); resolve(value); });
  });
  assert.equal(code, 0);
  assert.equal(Buffer.concat(output).toString("utf8"), policy.buildInstructions());
});

test("manifest launchers fail like the direct hook when the policy is unreadable", (t) => {
  const broken = temporary(t);
  for (const relative of ["hooks/necktie-context.js", "lib/necktie-policy.cjs"]) {
    fs.mkdirSync(path.join(broken, path.dirname(relative)), { recursive: true });
    fs.copyFileSync(path.join(root, relative), path.join(broken, relative));
  }
  const env = { ...childEnvironment(), CLAUDE_PLUGIN_ROOT: broken };
  const outcome = (result) => [result.status, result.stdout, result.stderr];
  const direct = spawnSync(process.execPath, [path.join(broken, "hooks/necktie-context.js"), "SessionStart"], { encoding: "utf8", env, input: "{}" });
  assert.deepEqual(outcome(direct), [0, "", ""]);
  for (const [event, [group]] of Object.entries(json("hooks/claude-codex-hooks.json").hooks)) {
    const command = group.hooks[0].command.replaceAll("${CLAUDE_PLUGIN_ROOT}", broken);
    for (const [host, hostEnv] of [["claude", env], ["codex", { ...env, PLUGIN_ROOT: broken, PLUGIN_DATA: path.join(broken, "data") }]]) {
      const launched = spawnSync(command, { shell: true, encoding: "utf8", env: hostEnv, input: "{}" });
      assert.deepEqual(outcome(launched), outcome(direct), `${host} ${event}`);
    }
  }
});

test("a policy read failure does not block the host", (t) => {
  const result = spawnSync(process.execPath, [path.join(root, "hooks/necktie-context.js"), "SessionStart"], {
    encoding: "utf8", env: { ...childEnvironment(), PLUGIN_ROOT: temporary(t) }, input: "{}",
  });
  assert.equal(result.status, 0);
  assert.equal(result.stdout, "");
});
