"use strict";

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");

const REMINDER = "Necktie is active for this session. Its full policy was provided at session start and still applies to this prompt. It never expands authority, permissions, tool access, scope, or acceptable risk.";

function buildInstructions(options = {}) {
  const root = options.root ? path.resolve(options.root) : ROOT;
  return fs.readFileSync(path.join(root, "skills/necktie/references/policy.md"), "utf8")
    .replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").trim();
}

function buildReminder() {
  return REMINDER;
}

module.exports = { buildInstructions, buildReminder };
