"use strict";

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");

function buildInstructions(options = {}) {
  const root = options.root ? path.resolve(options.root) : ROOT;
  return fs.readFileSync(path.join(root, "skills/necktie/references/policy.md"), "utf8")
    .replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").trim();
}

module.exports = { buildInstructions };
