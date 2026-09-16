#!/usr/bin/env node
"use strict";

const path = require("node:path");

const { resolveMode } = require("../lib/necktie-policy.cjs");
const { buildContext, executeModeCommand, parseModeCommand } = require("../lib/necktie-command.cjs");
const { readSessionMode, sessionIdentifier, writeSessionMode } = require("../lib/necktie-session.cjs");

function pluginRoot(env = process.env) {
  return env.PLUGIN_ROOT || env.CLAUDE_PLUGIN_ROOT || path.resolve(__dirname, "..");
}

function host(env = process.env) {
  const compatibilityRoot = env.CLAUDE_PLUGIN_ROOT || "";
  if (env.COPILOT_PLUGIN_DATA || compatibilityRoot.includes(".vscode/agent-plugins")) return "copilot";
  if (env.QODER_SESSION_ID) return "qoder";
  if (env.PLUGIN_ROOT || env.PLUGIN_DATA) return "codex";
  return "claude";
}

function promptText(input = {}) {
  return [input.prompt, input.text, input.userPrompt, input.user_prompt]
    .find((value) => typeof value === "string")?.trim() || "";
}

function evaluate(event, env = process.env, explicitHost = "", input = {}, options = {}) {
  const detectedHost = explicitHost || host(env);
  const identifier = sessionIdentifier(input, env, options.sessionOptions);
  let sessionMode = readSessionMode(detectedHost, identifier, options.sessionOptions);
  const saveSession = (mode) => writeSessionMode(detectedHost, identifier, mode, options.sessionOptions);
  let stateWarning = "";

  // Persist the initial default in session scope before handling a default write,
  // so `/necktie-mode default ...` never changes the current session implicitly.
  if (!sessionMode) {
    sessionMode = resolveMode({ env, configOptions: options.configOptions }).mode;
    try {
      saveSession(sessionMode);
    } catch (error) {
      stateWarning = `Could not persist Necktie session mode: ${error.message}`;
    }
  }

  const parsed = event === "UserPromptSubmit" ? parseModeCommand(promptText(input)) : null;
  const { resolution, message } = executeModeCommand(parsed, {
    sessionMode: stateWarning ? null : sessionMode, saveSession, env, configOptions: options.configOptions,
  });
  if (stateWarning) resolution.warnings.push(stateWarning);
  return {
    command: parsed,
    context: buildContext(resolution.mode, message, { root: pluginRoot(env) }),
    host: detectedHost,
    message,
    resolution,
    sessionId: identifier,
  };
}

function hostPayload(event, context, detectedHost) {
  if (detectedHost === "copilot") return { additionalContext: context };
  if (detectedHost === "codex" || detectedHost === "qoder" || detectedHost === "gemini" || event === "SubagentStart") {
    return { hookSpecificOutput: { hookEventName: event, additionalContext: context } };
  }
  return context;
}

function readHookInput(stream = process.stdin, timeoutMs = 1000) {
  if (!stream || stream.isTTY) return Promise.resolve({});
  return new Promise((resolve) => {
    let raw = "";
    let finished = false;
    let timer;
    const onData = (chunk) => { raw += chunk; };
    const finish = () => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      stream.removeListener?.("data", onData);
      stream.removeListener?.("end", finish);
      stream.removeListener?.("error", finish);
      stream.pause?.();
      try {
        resolve(raw.trim() ? JSON.parse(raw.replace(/^\uFEFF/, "")) : {});
      } catch (_) {
        resolve({});
      }
    };
    stream.setEncoding?.("utf8");
    stream.on("data", onData);
    stream.on("end", finish);
    stream.on("error", finish);
    timer = setTimeout(finish, timeoutMs);
  });
}

async function main(argv = process.argv.slice(2), env = process.env, options = {}) {
  const event = argv[0] || "SessionStart";
  const hint = argv[1] || "";
  const explicitHost = hint === "copilot" || hint === "qoder" ? hint : hint ? "gemini" : "";
  const input = options.input || await readHookInput(options.stdin || process.stdin, options.timeoutMs || 1000);
  const evaluated = evaluate(event, env, explicitHost, input, options);
  for (const warning of evaluated.resolution.warnings) process.stderr.write(`${warning}\n`);
  const result = hostPayload(event, evaluated.context, evaluated.host);
  process.stdout.write(typeof result === "string" ? result : JSON.stringify(result));
  return result;
}

if (require.main === module) main().catch(() => { process.exitCode = 0; });

module.exports = {
  evaluate,
  host,
  hostPayload,
  main,
  pluginRoot,
  promptText,
  readHookInput,
};
