"use strict";

const assert = require("node:assert/strict");
const { execSync, spawn } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const policy = require(path.join(root, "lib", "necktie-policy.cjs"));
const commands = require(path.join(root, "lib", "necktie-command.cjs"));
const sessions = require(path.join(root, "lib", "necktie-session.cjs"));
const runtime = require(path.join(root, "hooks", "necktie-context.js"));

function temporary(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

test("shared core composes with each mode delta exactly once", () => {
  assert.deepEqual(policy.MODES, ["lite", "full", "mammon"]);
  assert.equal(policy.DEFAULT_MODE, "full");
  const core = fs.readFileSync(path.join(root, "core", "necktie-core.md"), "utf8");
  assert.match(core, /level: <MODE>/);
  for (const mode of policy.MODES) {
    const delta = fs.readFileSync(path.join(root, "core", `necktie-${mode}.md`), "utf8");
    assert.doesNotMatch(delta, /NECKTIE MODE ACTIVE|# Necktie Core/);
  }
  const lite = policy.buildInstructions("lite");
  const full = policy.buildInstructions("full");
  const mammon = policy.buildInstructions("mammon");
  for (const instructions of [lite, full, mammon]) {
    assert.equal(instructions.match(/NECKTIE MODE ACTIVE/g)?.length, 1);
    assert.doesNotMatch(instructions, /<MODE>/);
  }
  assert.match(lite, /level: lite/i);
  assert.match(lite, /Mammon is an internal adversary/i);
  assert.match(lite, /Mammon stays internal/i);
  assert.doesNotMatch(lite, /Ambition pass|Useful action pass|sole final perspective/i);

  assert.match(full, /level: full/i);
  assert.match(full, /Ambition pass/);
  assert.match(full, /Useful action pass/);
  assert.match(full, /research prompt/);
  assert.doesNotMatch(full, /Mammon is the sole final perspective/i);

  assert.match(mammon, /level: mammon/i);
  assert.match(mammon, /Mammon is the sole final perspective/i);
  assert.match(mammon, /No rebuttal/i);
  assert.match(mammon, /Useful action pass/);
  assert.doesNotMatch(mammon, /Then rebut|Ambition pass/);
  assert.throws(() => policy.buildInstructions("off"), { code: "NECKTIE_INVALID_MODE" });
  assert.throws(() => policy.buildInstructions("bogus"), { code: "NECKTIE_INVALID_MODE" });
});

test("mode resolution follows request, session, environment, config, full precedence", () => {
  const directory = temporary("necktie-policy-");
  const configPath = path.join(directory, "config.json");
  fs.writeFileSync(configPath, JSON.stringify({ defaultMode: "lite" }));
  const options = { configPath };
  try {
    assert.equal(policy.resolveMode({ env: {}, configOptions: options }).mode, "lite");
    assert.equal(policy.resolveMode({ sessionMode: "mammon", env: {}, configOptions: options }).mode, "mammon");
    assert.equal(policy.resolveMode({ requestedMode: "FULL", sessionMode: "mammon", env: {}, configOptions: options }).mode, "full");
    const environment = policy.resolveMode({ env: { NECKTIE_DEFAULT_MODE: "mammon" }, configOptions: options });
    assert.equal(environment.mode, "mammon");
    assert.equal(environment.environmentOverride, "mammon");
    assert.equal(environment.configuredDefaultMode, "lite");
    assert.equal(
      commands.formatStatus(environment),
      "Necktie mode: current mammon; configured default lite. Environment override: mammon.",
    );
    assert.throws(
      () => policy.resolveMode({ requestedMode: "off", env: {}, configOptions: options }),
      { code: "NECKTIE_INVALID_MODE" },
    );

    fs.writeFileSync(configPath, "not json");
    const malformed = policy.resolveMode({ env: {}, configOptions: options });
    assert.equal(malformed.mode, "full");
    assert.ok(malformed.warnings.some((warning) => /invalid Necktie configuration/.test(warning)));
    const invalidEnvironment = policy.resolveMode({ env: { NECKTIE_DEFAULT_MODE: "bogus" }, configOptions: options });
    assert.equal(invalidEnvironment.mode, "full");
    assert.ok(invalidEnvironment.warnings.some((warning) => /NECKTIE_DEFAULT_MODE/.test(warning)));
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("configuration paths use APPDATA on Windows and XDG only elsewhere", () => {
  assert.equal(
    policy.configPath(
      { APPDATA: "C:\\Users\\person\\AppData\\Roaming", XDG_CONFIG_HOME: "C:\\xdg" },
      { platform: "win32", home: "C:\\Users\\person" },
    ),
    "C:\\Users\\person\\AppData\\Roaming\\necktie\\config.json",
  );
  assert.equal(
    policy.configPath({ XDG_CONFIG_HOME: "/tmp/xdg" }, { platform: "linux", home: "/home/person" }),
    path.join("/tmp/xdg", "necktie", "config.json"),
  );
});

test("default writes are atomic, preserve unrelated keys, and report environment overrides", () => {
  const directory = temporary("necktie-config-");
  const configPath = path.join(directory, "config.json");
  fs.writeFileSync(configPath, JSON.stringify({ keep: true, defaultMode: "lite" }));
  try {
    const written = policy.writeDefaultMode("mammon", {}, { configPath });
    assert.equal(written.mode, "mammon");
    assert.deepEqual(JSON.parse(fs.readFileSync(configPath, "utf8")), { keep: true, defaultMode: "mammon" });
    const overridden = policy.writeDefaultMode("lite", { NECKTIE_DEFAULT_MODE: "full" }, { configPath });
    assert.equal(overridden.writtenMode, "lite");
    assert.equal(overridden.mode, "full");
    assert.equal(overridden.configuredMode, "lite");
    assert.equal(overridden.environmentOverride, "full");
    assert.deepEqual(fs.readdirSync(directory), ["config.json"]);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("session state is isolated and stores no prompt content", () => {
  const directory = temporary("necktie-session-");
  const options = { stateDirectory: directory };
  try {
    sessions.writeSessionMode("codex", "one", "lite", options);
    sessions.writeSessionMode("codex", "two", "mammon", options);
    assert.equal(sessions.readSessionMode("codex", "one", options), "lite");
    assert.equal(sessions.readSessionMode("codex", "two", options), "mammon");
    for (const file of fs.readdirSync(directory)) {
      const value = JSON.parse(fs.readFileSync(path.join(directory, file), "utf8"));
      assert.deepEqual(value, { mode: value.mode });
    }
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("invalid stored session state falls back with a diagnostic", () => {
  const directory = temporary("necktie-invalid-session-");
  const options = { stateDirectory: directory };
  try {
    const target = sessions.statePath("codex", "bad", options);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, JSON.stringify({ mode: "bogus" }));
    const stored = sessions.readSessionMode("codex", "bad", options);
    const resolved = policy.resolveMode({ sessionMode: stored, env: {}, configOptions: { configPath: path.join(directory, "config.json") } });
    assert.equal(resolved.mode, "full");
    assert.ok(resolved.warnings.some((warning) => /invalid stored Necktie session mode/.test(warning)));
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("session store prunes stale mode-only files", () => {
  const directory = temporary("necktie-stale-session-");
  const options = { stateDirectory: directory };
  try {
    sessions.writeSessionMode("codex", "stale", "lite", options);
    const target = sessions.statePath("codex", "stale", options);
    const old = new Date(Date.now() - sessions.MAX_AGE_MS - 1000);
    fs.utimesSync(target, old, old);
    sessions.readSessionMode("codex", "current", options);
    assert.equal(fs.existsSync(target), false);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("mode command grammar is separate from the Necktie decision command", () => {
  assert.deepEqual(commands.parseModeCommand("/necktie-mode"), { type: "status" });
  assert.deepEqual(commands.parseModeCommand("/necktie:necktie-mode mammon"), { type: "set-session", mode: "mammon" });
  assert.deepEqual(commands.parseModeCommand("[NECKTIE_MODE_COMMAND] default lite"), { type: "set-default", mode: "lite" });
  assert.deepEqual(
    commands.parseModeCommand("[NECKTIE_MODE_COMMAND] mammon\n\nReport the selected mode."),
    { type: "set-session", mode: "mammon" },
  );
  assert.equal(commands.parseModeCommand("/necktie assess this policy"), null);
  assert.equal(commands.parseModeArguments("off").type, "invalid");
  assert.equal(commands.parseModeArguments("default").type, "invalid");
});

test("hook runtime switches only the addressed session and preserves default-only semantics", () => {
  const directory = temporary("necktie-hook-");
  const stateDirectory = path.join(directory, "state");
  const configPath = path.join(directory, "config.json");
  const options = { sessionOptions: { stateDirectory }, configOptions: { configPath } };
  const env = { PLUGIN_ROOT: root, PLUGIN_DATA: directory };
  try {
    const started = runtime.evaluate("SessionStart", env, "", { session_id: "one" }, options);
    assert.equal(started.resolution.mode, "full");

    const switched = runtime.evaluate(
      "UserPromptSubmit",
      env,
      "",
      { session_id: "one", prompt: "/necktie-mode lite" },
      options,
    );
    assert.equal(switched.resolution.mode, "lite");
    assert.match(switched.message, /for this session/);
    assert.match(switched.context, /level: lite/i);

    const other = runtime.evaluate("UserPromptSubmit", env, "", { session_id: "two", prompt: "ordinary request" }, options);
    assert.equal(other.resolution.mode, "full");

    const changedDefault = runtime.evaluate(
      "UserPromptSubmit",
      env,
      "",
      { session_id: "one", prompt: "/necktie-mode default mammon" },
      options,
    );
    assert.equal(changedDefault.resolution.mode, "lite");
    assert.equal(JSON.parse(fs.readFileSync(configPath, "utf8")).defaultMode, "mammon");

    const status = runtime.evaluate(
      "UserPromptSubmit",
      env,
      "",
      { session_id: "one", prompt: "/necktie-mode status" },
      options,
    );
    assert.match(status.message, /current lite; configured default mammon/);

    const invalid = runtime.evaluate(
      "UserPromptSubmit",
      env,
      "",
      { session_id: "one", prompt: "/necktie-mode off" },
      options,
    );
    assert.match(invalid.message, /^Usage:/);
    assert.equal(invalid.resolution.mode, "lite");
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("hook runtime emits host-native payloads at the selected mode", () => {
  const directory = temporary("necktie-payload-");
  const options = { sessionOptions: { stateDirectory: directory }, configOptions: { configPath: path.join(directory, "config.json") } };
  try {
    const codex = runtime.payload("SessionStart", { PLUGIN_ROOT: root, PLUGIN_DATA: "data" }, "", { session_id: "codex" }, options);
    assert.equal(codex.hookSpecificOutput.hookEventName, "SessionStart");
    assert.match(codex.hookSpecificOutput.additionalContext, /level: full/i);

    const copilot = runtime.payload("SessionStart", { PLUGIN_ROOT: root }, "copilot", { session_id: "copilot" }, options);
    assert.match(copilot.additionalContext, /level: full/i);

    const claude = runtime.payload("SessionStart", { CLAUDE_PLUGIN_ROOT: root }, "", { session_id: "claude" }, options);
    assert.match(claude, /level: full/i);

    const subagent = runtime.payload("SubagentStart", { CLAUDE_PLUGIN_ROOT: root }, "", { session_id: "claude" }, options);
    assert.match(subagent.hookSpecificOutput.additionalContext, /level: full/i);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("hook manifests cover session, prompt, subagent, Copilot, and Qoder events", () => {
  const hooks = JSON.parse(fs.readFileSync(path.join(root, "hooks", "hooks.json"), "utf8"));
  assert.deepEqual(Object.keys(hooks.hooks).sort(), ["SessionStart", "SubagentStart", "UserPromptSubmit"]);
  assert.match(hooks.hooks.UserPromptSubmit[0].hooks[0].command, /necktie-context\.js/);
  const copilot = JSON.parse(fs.readFileSync(path.join(root, "hooks", "copilot-hooks.json"), "utf8"));
  assert.ok(copilot.hooks.sessionStart);
  assert.ok(copilot.hooks.userPromptSubmitted);
  const qoder = JSON.parse(fs.readFileSync(path.join(root, "hooks", "qoder-hooks.json"), "utf8"));
  assert.ok(qoder.hooks.UserPromptSubmit);
  assert.equal(qoder.hooks.PreToolUse[0].matcher, "task|Task");
});

test("shared hook command resolves Claude, Codex, and Gemini roots", () => {
  const hooks = JSON.parse(fs.readFileSync(path.join(root, "hooks", "hooks.json"), "utf8"));
  const command = hooks.hooks.SessionStart[0].hooks[0].command;
  const unique = `test-${process.pid}-${Date.now()}`;
  const childEnv = { ...process.env };
  childEnv.NECKTIE_DEFAULT_MODE = "full";
  delete childEnv.CODEX_THREAD_ID;
  delete childEnv.CLAUDE_SESSION_ID;
  delete childEnv.COPILOT_SESSION_ID;
  delete childEnv.QODER_SESSION_ID;
  delete childEnv.PLUGIN_ROOT;
  delete childEnv.PLUGIN_DATA;
  delete childEnv.COPILOT_PLUGIN_DATA;
  const geminiCommand = command.replaceAll("${extensionPath}", root);
  const gemini = JSON.parse(execSync(geminiCommand, {
    encoding: "utf8",
    env: childEnv,
    input: JSON.stringify({ session_id: `${unique}-gemini` }),
  }));
  assert.match(gemini.hookSpecificOutput.additionalContext, /level: full/i);

  const claudeCommand = command.replaceAll("${CLAUDE_PLUGIN_ROOT}", root);
  const claude = execSync(claudeCommand, {
    encoding: "utf8",
    env: childEnv,
    input: JSON.stringify({ session_id: `${unique}-claude` }),
  });
  assert.match(claude, /level: full/i);

  const codex = JSON.parse(execSync(claudeCommand, {
    encoding: "utf8",
    env: { ...childEnv, PLUGIN_DATA: path.join(root, ".test-data") },
    input: JSON.stringify({ session_id: `${unique}-codex` }),
  }));
  assert.match(codex.hookSpecificOutput.additionalContext, /level: full/i);
  for (const [detectedHost, id] of [
    ["gemini", `${unique}-gemini`],
    ["claude", `${unique}-claude`],
    ["codex", `${unique}-codex`],
  ]) {
    try { fs.unlinkSync(sessions.statePath(detectedHost, id)); } catch (_) {}
  }
});

test("hook reports a failed default write without losing active instructions", () => {
  const directory = temporary("necktie-hook-write-failure-");
  const options = {
    sessionOptions: { stateDirectory: path.join(directory, "state") },
    configOptions: { configPath: directory },
  };
  try {
    const result = runtime.evaluate(
      "UserPromptSubmit",
      { PLUGIN_ROOT: root, PLUGIN_DATA: directory },
      "",
      { session_id: "write-failure", prompt: "/necktie-mode default mammon" },
      options,
    );
    assert.match(result.message, /Failed to save Necktie default/);
    assert.equal(result.resolution.mode, "full");
    assert.match(result.context, /level: full/i);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("hook exits when stdin never closes", async () => {
  const sessionId = `timeout-${Date.now()}`;
  const childEnv = { ...process.env, CLAUDE_PLUGIN_ROOT: root };
  delete childEnv.PLUGIN_ROOT;
  delete childEnv.PLUGIN_DATA;
  delete childEnv.COPILOT_PLUGIN_DATA;
  delete childEnv.QODER_SESSION_ID;
  const child = spawn(process.execPath, [path.join(root, "hooks", "necktie-context.js"), "UserPromptSubmit"], {
    cwd: root,
    env: childEnv,
    stdio: ["pipe", "pipe", "pipe"],
  });
  child.stdin.write(JSON.stringify({ session_id: sessionId, prompt: "/necktie-mode lite" }));
  const output = [];
  child.stdout.on("data", (chunk) => output.push(chunk));
  const code = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error("Necktie hook did not self-exit."));
    }, 2500);
    child.on("exit", (value) => { clearTimeout(timer); resolve(value); });
  });
  assert.equal(code, 0);
  assert.match(Buffer.concat(output).toString("utf8"), /level: lite/i);
  try { fs.unlinkSync(sessions.statePath("claude", sessionId)); } catch (_) {}
});
