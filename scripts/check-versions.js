#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const jsonFiles = [
  ".claude-plugin/plugin.json",
  ".codex-plugin/plugin.json",
  ".devin-plugin/plugin.json",
  ".github/plugin/plugin.json",
  ".qoder-plugin/plugin.json",
  "gemini-extension.json",
  "package.json",
  "necktie-mcp/package.json",
  "necktie-mcp/package-lock.json",
  "pi-extension/package.json",
  "plugin.json",
];

function readVersion(relative) {
  const text = fs.readFileSync(path.join(root, relative), "utf8").replace(/^\uFEFF/, "");
  if (relative.endsWith(".json")) return JSON.parse(text).version;
  if (relative.endsWith(".yaml") || relative.endsWith(".yml")) {
    return text.match(/^version:\s*([0-9]+\.[0-9]+\.[0-9]+)\s*$/m)?.[1];
  }
  return text.match(/^Necktie\s+([0-9]+\.[0-9]+\.[0-9]+)\s*$/m)?.[1];
}

const files = [...jsonFiles, "plugin.yaml", "NOTICE"];
const versions = files.map((file) => [file, readVersion(file)]);
const distinct = [...new Set(versions.map(([, version]) => version))];
if (distinct.length !== 1 || !/^\d+\.\d+\.\d+$/.test(distinct[0] || "")) {
  for (const [file, version] of versions) console.error(`${file}: ${version}`);
  process.exit(1);
}
const version = distinct[0];
if (process.env.GITHUB_REF_TYPE === "tag" && process.env.GITHUB_REF_NAME?.replace(/^v/, "") !== version) {
  console.error(`Release tag ${process.env.GITHUB_REF_NAME} does not match ${version}.`);
  process.exit(1);
}
console.log(`All ${files.length} version files are pinned at ${version}.`);

module.exports = { files, readVersion };
