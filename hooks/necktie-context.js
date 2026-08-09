#!/usr/bin/env node
"use strict";

const path = require("node:path");

const { buildInstructions, resolveMode, writeDefaultMode } = require("../lib/necktie-policy.cjs");
const { USAGE, formatStatus, parseModeCommand } = require("../lib/necktie-command.cjs");
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
  for (const value of [input.prompt, input.text, input.userPrompt, input.user_prompt]) {
    if (typeof value === "string") return value.trim();
  }
  return "";
}

function evaluate(event, env = process.env, explicitHost = "", input = {}, options = {}) {
  const detectedHost = explicitHost || host(env);
  const identifier = sessionIdentifier(input, env, options.sessionOptions);
  let sessionMode = readSessionMode(detectedHost, identifier, options.sessionOptions);
  const initial = resolveMode({ sessionMode, env, configOptions: options.configOptions });
  let stateWarning = "";

  // Persist the initial default in session scope before handling a default write,
  // so `/necktie-mode default ...` never changes the current session implicitly.
  if (!sessionMode) {
    try {
      sessionMode = writeSessionMode(detectedHost, identifier, initial.mode, options.sessionOptions);
    } catch (error) {
      sessionMode = initial.mode;
      stateWarning = `Could not persist Necktie session mode: ${error.message}`;
    }
  }

  const parsed = event === "UserPromptSubmit" ? parseModeCommand(promptText(input)) : null;
  let message = "";

  if (parsed?.type === "set-session") {
    try {
      sessionMode = writeSessionMode(detectedHost, identifier, parsed.mode, options.sessionOptions);
      message = `Necktie mode set to ${sessionMode} for this session.`;
    } catch (error) {
      message = `Failed to save Necktie session mode: ${error.message}`;
    }
  } else if (parsed?.type === "set-default") {
    const before = resolveMode({ sessionMode, env, configOptions: options.configOptions });
    try {
      const written = writeDefaultMode(parsed.mode, env, options.configOptions);
      message = written.environmentOverride
        ? `Saved default ${written.writtenMode}, but NECKTIE_DEFAULT_MODE keeps the effective default at ${written.mode}. Current session remains ${before.mode}.`
        : `Default Necktie mode set to ${written.writtenMode} for new sessions. Current session remains ${before.mode}.`;
    } catch (error) {
      message = `Failed to save Necktie default: ${error.message}. Current session remains ${before.mode}.`;
    }
  } else if (parsed?.type === "invalid") {
    message = parsed.usage || USAGE;
  }

  const resolution = resolveMode({ sessionMode, env, configOptions: options.configOptions });
  if (stateWarning) resolution.warnings.push(stateWarning);
  if (parsed?.type === "status") message = formatStatus(resolution);

  const instructions = buildInstructions(resolution.mode, { root: pluginRoot(env) });
  const context = message
    ? `${message}\n\nAcknowledge this mode result concisely. Do not treat it as a decision request.\n\n${instructions}`
    : instructions;

  return {
    command: parsed,
    context,
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

function payload(event, env = process.env, explicitHost = "", input = {}, options = {}) {
  const result = evaluate(event, env, explicitHost, input, options);
  return hostPayload(event, result.context, result.host);
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
  payload,
  pluginRoot,
  promptText,
  readHookInput,
};
