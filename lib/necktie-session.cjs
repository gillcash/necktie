"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { normalizeMode } = require("./necktie-policy.cjs");
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function stateDirectory(options = {}) {
  return path.resolve(options.stateDirectory || path.join(os.tmpdir(), "necktie", "sessions"));
}

function sessionIdentifier(input = {}, env = process.env, options = {}) {
  const candidates = [
    input.session_id,
    input.sessionId,
    input.sessionID,
    input.thread_id,
    input.threadId,
    env.CODEX_THREAD_ID,
    env.CLAUDE_SESSION_ID,
    env.COPILOT_SESSION_ID,
    env.QODER_SESSION_ID,
    options.fallbackId,
  ];
  const found = candidates.find((value) => typeof value === "string" && value.trim());
  return found ? found.trim() : `parent-${options.parentPid || process.ppid}`;
}

function statePath(host, sessionId, options = {}) {
  const digest = crypto.createHash("sha256").update(`${host}\0${sessionId}`).digest("hex");
  return path.join(stateDirectory(options), `${host}-${digest}.json`);
}

function prune(options = {}) {
  const directory = stateDirectory(options);
  let entries;
  try { entries = fs.readdirSync(directory, { withFileTypes: true }); } catch (_) { return; }
  const now = options.now || Date.now();
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
    const target = path.join(directory, entry.name);
    try {
      if (now - fs.statSync(target).mtimeMs > MAX_AGE_MS) fs.unlinkSync(target);
    } catch (_) {}
  }
}

function readSessionMode(host, sessionId, options = {}) {
  prune(options);
  try {
    const parsed = JSON.parse(fs.readFileSync(statePath(host, sessionId, options), "utf8"));
    return typeof parsed?.mode === "string" ? parsed.mode : null;
  } catch (_) {
    return null;
  }
}

function writeSessionMode(host, sessionId, mode, options = {}) {
  const normalized = normalizeMode(mode);
  if (!normalized) return null;
  const target = statePath(host, sessionId, options);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const temporary = `${target}.${process.pid}.${Date.now()}.tmp`;
  try {
    fs.writeFileSync(temporary, `${JSON.stringify({ mode: normalized })}\n`, {
      encoding: "utf8",
      mode: 0o600,
    });
    fs.renameSync(temporary, target);
  } finally {
    try { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); } catch (_) {}
  }
  return normalized;
}

module.exports = {
  MAX_AGE_MS,
  prune,
  readSessionMode,
  sessionIdentifier,
  stateDirectory,
  statePath,
  writeSessionMode,
};
