#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");

function pluginRoot(env = process.env) {
  return env.PLUGIN_ROOT || env.CLAUDE_PLUGIN_ROOT || path.resolve(__dirname, "..");
}

function coreContext(env = process.env) {
  return fs.readFileSync(path.join(pluginRoot(env), "core", "necktie-core.md"), "utf8").trim();
}

function host(env = process.env) {
  const compatibilityRoot = env.CLAUDE_PLUGIN_ROOT || "";
  if (env.COPILOT_PLUGIN_DATA || compatibilityRoot.includes(".vscode/agent-plugins")) return "copilot";
  if (env.QODER_SESSION_ID) return "qoder";
  if (env.PLUGIN_ROOT || env.PLUGIN_DATA) return "codex";
  return "claude";
}

function payload(event, env = process.env, explicitHost = "") {
  const context = coreContext(env);
  const detected = explicitHost || host(env);
  if (detected === "copilot") return { additionalContext: context };
  if (detected === "codex" || detected === "qoder" || detected === "gemini" || event === "SubagentStart") {
    return { hookSpecificOutput: { hookEventName: event, additionalContext: context } };
  }
  return context;
}

function main(argv = process.argv.slice(2), env = process.env) {
  const event = argv[0] || "SessionStart";
  const hint = argv[1] || "";
  const explicitHost = hint === "copilot" || hint === "qoder" ? hint : hint ? "gemini" : "";
  const result = payload(event, env, explicitHost);
  process.stdout.write(typeof result === "string" ? result : JSON.stringify(result));
}

if (require.main === module) main();

module.exports = { coreContext, host, main, payload, pluginRoot };
