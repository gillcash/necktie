"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const jsonFiles = [
  "package.json", "plugin.json", ".codex-plugin/plugin.json", ".claude-plugin/plugin.json",
  ".devin-plugin/plugin.json", ".qoder-plugin/plugin.json", ".github/plugin/plugin.json",
  "gemini-extension.json", "pi-extension/package.json", "necktie-mcp/package.json",
];

test("versioned manifests identify Necktie 0.3.0", () => {
  for (const relative of jsonFiles) {
    const value = JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
    assert.equal(value.version, "0.3.0", relative);
    if (value.name !== "@gillcash/necktie-pi-extension" && value.name !== "necktie-mcp" && value.name !== "@gillcash/necktie") {
      assert.equal(value.name, "necktie", relative);
    }
  }
});

test("Codex manifest relies on default hook discovery", () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, ".codex-plugin", "plugin.json"), "utf8"));
  assert.equal(manifest.hooks, undefined);
  assert.equal(manifest.skills, "./skills/");
  assert.equal(manifest.interface.shortDescription, "the angel of late-stage capitalism for your AI agent");
});

test("static adapters contain the exact canonical Core", () => {
  const core = fs.readFileSync(path.join(root, "core", "necktie-core.md"), "utf8").trim();
  for (const relative of [
    ".agents/rules/necktie.md", ".clinerules/necktie.md", ".qoder/rules/necktie.md",
    ".windsurf/rules/necktie.md", ".github/copilot-instructions.md",
  ]) {
    assert.equal(fs.readFileSync(path.join(root, relative), "utf8").trim(), core, relative);
  }
  assert.equal(fs.readFileSync(path.join(root, "AGENTS.md"), "utf8").trim(), core);
});

test("package exposes the Necktie OpenCode adapter", () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  assert.equal(pkg.main, "./.opencode/plugins/necktie.mjs");
  assert.equal(pkg.repository.url, "git+https://github.com/gillcash/necktie.git");
});
