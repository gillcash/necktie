"use strict";

const { buildInstructions, normalizeMode, resolveMode, writeDefaultMode } = require("./necktie-policy.cjs");

const USAGE = "Usage: /necktie-mode [status|lite|full|default <lite|full>]";

function extractArguments(text) {
  const value = String(text || "").trim();
  const marker = value.match(/^\[NECKTIE_MODE_COMMAND\][ \t]*([^\r\n]*)/i);
  if (marker) return marker[1].trim();
  const command = value.match(/^[/@$](?:[^\s:]+:)?necktie-mode(?:\s+([\s\S]*))?$/i);
  return command ? (command[1] || "").trim() : null;
}

function parseModeArguments(rawArguments) {
  const raw = String(rawArguments || "").trim();
  if (!raw || raw.toLowerCase() === "status") return { type: "status" };
  const parts = raw.split(/\s+/);
  const isDefault = parts[0].toLowerCase() === "default";
  const mode = normalizeMode(parts.at(-1));
  if (!mode || parts.length !== (isDefault ? 2 : 1)) return { type: "invalid", usage: USAGE };
  return { type: isDefault ? "set-default" : "set-session", mode };
}

function parseModeCommand(text) {
  const args = extractArguments(text);
  return args === null ? null : parseModeArguments(args);
}

function formatStatus(resolution) {
  const override = resolution.environmentOverride
    ? ` Environment override: ${resolution.environmentOverride}.`
    : "";
  const configuredDefault = resolution.configuredDefaultMode || resolution.defaultMode;
  return `Necktie mode: current ${resolution.mode}; configured default ${configuredDefault}.${override}`;
}

function executeModeCommand(command, { sessionMode, saveSession, env = process.env, configOptions } = {}) {
  let resolution = resolveMode({ sessionMode, env, configOptions });
  let message = "";
  switch (command?.type) {
    case "invalid":
      message = command.usage || USAGE;
      break;
    case "status":
      message = formatStatus(resolution);
      break;
    case "set-session":
      try {
        saveSession(command.mode);
        resolution = resolveMode({ sessionMode: command.mode, env, configOptions });
        message = `Necktie mode set to ${command.mode} for this session.`;
      } catch (error) {
        message = `Failed to save Necktie session mode: ${error.message}`;
      }
      break;
    case "set-default":
      // Pin the current default before changing what future sessions inherit.
      try { saveSession(resolution.mode); }
      catch (error) {
        return { resolution, message: `Failed to initialize Necktie session mode: ${error.message}` };
      }
      try {
        const written = writeDefaultMode(command.mode, env, configOptions);
        resolution = resolveMode({ sessionMode: resolution.mode, env, configOptions });
        message = written.environmentOverride
          ? `Saved default ${written.writtenMode}, but NECKTIE_DEFAULT_MODE keeps the effective default at ${written.mode}.`
          : `Default Necktie mode set to ${written.writtenMode} for new sessions.`;
      } catch (error) {
        message = `Failed to save Necktie default: ${error.message}.`;
      }
      message += ` Current session remains ${resolution.mode}.`;
      break;
  }
  return { resolution, message };
}

function buildContext(mode, message = "", options = {}) {
  const instructions = buildInstructions(mode, options);
  return message
    ? `${message}\n\nAcknowledge this mode result concisely. Do not treat it as a decision request.\n\n${instructions}`
    : instructions;
}

module.exports = {
  USAGE, buildContext, executeModeCommand, extractArguments, formatStatus, parseModeArguments, parseModeCommand,
};
