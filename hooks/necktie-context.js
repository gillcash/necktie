#!/usr/bin/env node
"use strict";

const path = require("node:path");

const { buildInstructions } = require("../lib/necktie-policy.cjs");

function pluginRoot(env = process.env) {
  return env.PLUGIN_ROOT || env.CLAUDE_PLUGIN_ROOT || path.resolve(__dirname, "..");
}

const HOSTS = new Set(["claude", "codex", "copilot", "qoder"]);

function isVsCodePluginRoot(root = "") {
  return /[\\/]\.vscode[^\\/]*[\\/]agent-plugins(?:[\\/]|$)/i.test(root);
}

// VS Code runs the Claude manifest's hooks, so the claude host still checks for a VS Code plugin root.
function resolveHost(hint = "", env = process.env) {
  const named = HOSTS.has(hint) ? hint : "claude";
  if (named === "claude" && (env.COPILOT_PLUGIN_DATA || isVsCodePluginRoot(env.CLAUDE_PLUGIN_ROOT))) return "copilot";
  return named;
}

function evaluate(env = process.env, hint = "") {
  return {
    context: buildInstructions({ root: pluginRoot(env) }),
    host: resolveHost(hint, env),
  };
}

function hostPayload(event, context, detectedHost) {
  if (detectedHost === "copilot") return { additionalContext: context };
  if (detectedHost === "codex" || detectedHost === "qoder" || event === "SubagentStart") {
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

// Callers run main() without a catch, so it must never reject.
async function main(argv = process.argv.slice(2), env = process.env, options = {}) {
  try {
    const event = argv[0] || "SessionStart";
    await readHookInput(options.stdin || process.stdin, options.timeoutMs || 1000);
    const evaluated = evaluate(env, argv[1]);
    const result = hostPayload(event, evaluated.context, evaluated.host);
    process.stdout.write(typeof result === "string" ? result : JSON.stringify(result));
    return result;
  } catch (_) {
    process.exitCode = 0;
    return undefined;
  }
}

if (require.main === module) main();

module.exports = {
  evaluate,
  hostPayload,
  main,
  pluginRoot,
  readHookInput,
  resolveHost,
};
