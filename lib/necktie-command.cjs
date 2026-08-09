"use strict";

const { MODES, normalizeMode } = require("./necktie-policy.cjs");

const MODE_LIST = MODES.join("|");
const USAGE = `Usage: /necktie-mode [status|${MODE_LIST}|default <${MODE_LIST}>]`;

function extractArguments(text) {
  const value = String(text || "").trim();
  const marker = value.match(/^\[NECKTIE_MODE_COMMAND\][ \t]*([^\r\n]*)/i);
  if (marker) return marker[1].trim();
  const command = value.match(/^[/@$](?:[^\s:]+:)?necktie-mode(?:\s+([\s\S]*))?$/i);
  if (command) return String(command[1] || "").trim();
  return null;
}

function parseModeArguments(rawArguments) {
  const raw = String(rawArguments || "").trim();
  if (!raw || raw.toLowerCase() === "status") return { type: "status" };
  const parts = raw.split(/\s+/);
  if (parts[0].toLowerCase() === "default") {
    if (parts.length !== 2) return { type: "invalid", usage: USAGE };
    const mode = normalizeMode(parts[1]);
    return mode ? { type: "set-default", mode } : { type: "invalid", usage: USAGE };
  }
  if (parts.length !== 1) return { type: "invalid", usage: USAGE };
  const mode = normalizeMode(parts[0]);
  return mode ? { type: "set-session", mode } : { type: "invalid", usage: USAGE };
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

module.exports = { MODE_LIST, USAGE, extractArguments, formatStatus, parseModeArguments, parseModeCommand };
