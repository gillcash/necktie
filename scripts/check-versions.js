#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const files = [
  ".claude-plugin/plugin.json",
  ".codex-plugin/plugin.json",
  ".devin-plugin/plugin.json",
  ".github/plugin/plugin.json",
  ".qoder-plugin/plugin.json",
  "gemini-extension.json",
  "plugin.json",
  "package.json",
  "necktie-mcp/package.json",
  "pi-extension/package.json",
];
const versions = files.map((file) => [file, JSON.parse(fs.readFileSync(path.join(root, file), "utf8")).version]);
const pluginYaml = fs.readFileSync(path.join(root, "plugin.yaml"), "utf8");
versions.push(["plugin.yaml", pluginYaml.match(/^version:\s*(\S+)\s*$/m)?.[1] || ""]);
const distinct = [...new Set(versions.map(([, version]) => version))];
if (distinct.length !== 1 || !/^\d+\.\d+\.\d+$/.test(distinct[0])) {
  for (const [file, version] of versions) console.error(`${file}: ${version}`);
  process.exit(1);
}
const version = distinct[0];
if (process.env.GITHUB_REF_TYPE === "tag" && process.env.GITHUB_REF_NAME?.replace(/^v/, "") !== version) {
  console.error(`Release tag ${process.env.GITHUB_REF_NAME} does not match ${version}.`);
  process.exit(1);
}
console.log(`All ${versions.length} version files are pinned at ${version}.`);
