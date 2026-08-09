"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const { modes } = require(path.join(root, "scripts", "build-policy.js"));
const jsonFiles = [
  "package.json", "plugin.json", ".codex-plugin/plugin.json", ".claude-plugin/plugin.json",
  ".devin-plugin/plugin.json", ".qoder-plugin/plugin.json", ".github/plugin/plugin.json",
  "gemini-extension.json", "pi-extension/package.json", "necktie-mcp/package.json",
];

test("versioned manifests identify Necktie 0.5.1", () => {
  for (const relative of jsonFiles) {
    const value = JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
    assert.equal(value.version, "0.5.1", relative);
    if (!["@gillcash/necktie-pi-extension", "necktie-mcp", "@gillcash/necktie"].includes(value.name)) {
      assert.equal(value.name, "necktie", relative);
    }
  }
  assert.match(fs.readFileSync(path.join(root, "plugin.yaml"), "utf8"), /^version: 0\.5\.1$/m);
  assert.match(fs.readFileSync(path.join(root, "NOTICE"), "utf8"), /^Necktie 0\.5\.1$/m);
});

test("Codex manifest relies on component discovery and keeps MCP optional", () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, ".codex-plugin", "plugin.json"), "utf8"));
  assert.equal(manifest.hooks, undefined);
  assert.equal(manifest.mcpServers, undefined);
  assert.equal(manifest.skills, "./skills/");
  assert.equal(manifest.interface.shortDescription, "the angel of late-stage capitalism for your AI agent");
});

test("static adapter generation targets Full and the package ships shared mode assets", () => {
  const full = fs.readFileSync(path.join(root, "core", "necktie-full.md"), "utf8").trim();
  assert.equal(fs.readFileSync(path.join(root, "AGENTS.md"), "utf8").trim(), full);
  assert.match(full, /level: full/i);
  assert.deepEqual(
    fs.readdirSync(path.join(root, "core")).sort(),
    modes.map((mode) => `necktie-${mode}.md`).sort(),
  );
  const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  assert.ok(pkg.files.includes("lib/"));
  assert.ok(pkg.files.includes("core/"));
  assert.ok(pkg.files.includes("skills/"));
  const yamlManifest = fs.readFileSync(path.join(root, "plugin.yaml"), "utf8");
  assert.match(yamlManifest, /provides_skills:[\s\S]*- necktie\s+- necktie-research/);
});

test("package exposes the OpenCode adapter and uses generated-policy checks", () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  assert.equal(pkg.main, "./.opencode/plugins/necktie.mjs");
  assert.equal(pkg.repository.url, "git+https://github.com/gillcash/necktie.git");
  assert.match(pkg.scripts["build:adapters"], /build:policy/);
  assert.match(pkg.scripts["check:adapters"], /check:policy/);
});

test("private MCP package keeps only required direct dependencies and a matching lockfile", () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, "necktie-mcp", "package.json"), "utf8"));
  const lock = JSON.parse(fs.readFileSync(path.join(root, "necktie-mcp", "package-lock.json"), "utf8"));
  assert.deepEqual(Object.keys(manifest.dependencies).sort(), ["@modelcontextprotocol/sdk", "zod"]);
  assert.deepEqual(lock.packages[""].dependencies, manifest.dependencies);
  assert.equal(lock.version, "0.5.1");
});

test("CI checks clean generation on Ubuntu and Windows", () => {
  const workflow = fs.readFileSync(path.join(root, ".github", "workflows", "test.yml"), "utf8");
  assert.match(workflow, /os: \[ubuntu-latest, windows-latest\]/);
  assert.match(workflow, /npm ci --prefix necktie-mcp/);
  assert.match(workflow, /npm run build:adapters/);
  assert.match(workflow, /git diff --exit-code/);
  const attributes = fs.readFileSync(path.join(root, ".gitattributes"), "utf8");
  assert.match(attributes, /\/core\/\*\.md text eol=lf/);
  assert.match(attributes, /\/\.openclaw\/skills\/\*\* text eol=lf/);
});

test("benchmark fixtures cover each mode and observable safety boundaries", () => {
  const fixtures = JSON.parse(fs.readFileSync(path.join(root, "benchmarks", "fixtures.json"), "utf8"));
  assert.deepEqual(fixtures.modes, ["lite", "full", "mammon"]);
  assert.deepEqual(fixtures.cases.map((entry) => entry.id).sort(), ["benign-plan", "extractive-metric", "trivial-task"]);
  for (const fixture of fixtures.cases) {
    assert.ok(fixture.expectations.every((value) => !/chain.of.thought/i.test(value)));
  }
});
