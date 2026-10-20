"use strict";

const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { temporary } = require("./helpers.cjs");

const root = path.resolve(__dirname, "..");
const policy = require(path.join(root, "lib", "necktie-policy.cjs"));
const jsonFiles = [
  "package.json", "plugin.json", ".codex-plugin/plugin.json", ".claude-plugin/plugin.json",
  ".devin-plugin/plugin.json", ".qoder-plugin/plugin.json", ".github/plugin/plugin.json",
  "gemini-extension.json", "pi-extension/package.json", "necktie-mcp/package.json",
];

test("versioned manifests identify Necktie 0.7.0", () => {
  for (const relative of jsonFiles) {
    const value = JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
    assert.equal(value.version, "0.7.0", relative);
    if (!["@gillcash/necktie-pi-extension", "necktie-mcp", "@gillcash/necktie"].includes(value.name)) {
      assert.equal(value.name, "necktie", relative);
    }
  }
  assert.match(fs.readFileSync(path.join(root, "plugin.yaml"), "utf8"), /^version: 0\.7\.0$/m);
  assert.match(fs.readFileSync(path.join(root, "NOTICE"), "utf8"), /^Necktie 0\.7\.0$/m);
});

test("release checks reject plugin and tag mismatches", (t) => {
  const directory = temporary(t);
  for (const relative of [...jsonFiles, "necktie-mcp/package-lock.json", "plugin.yaml", "NOTICE", "scripts/check-versions.js"]) {
    const target = path.join(directory, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(path.join(root, relative), target);
  }
  const run = (tag) => {
    const result = spawnSync(process.execPath, [path.join(directory, "scripts/check-versions.js")], {
      encoding: "utf8", timeout: 10000,
      env: { ...process.env, GITHUB_REF_TYPE: "tag", GITHUB_REF_NAME: tag },
    });
    assert.ifError(result.error);
    return result;
  };

  const matching = run("v0.7.0");
  assert.equal(matching.status, 0, matching.stderr);
  assert.match(matching.stdout, /All 13 version files are pinned at 0\.7\.0/);

  const manifest = path.join(directory, "plugin.json");
  const original = fs.readFileSync(manifest, "utf8");
  fs.writeFileSync(manifest, JSON.stringify({ ...JSON.parse(original), version: "0.7.1" }));
  const mismatchedPlugin = run("v0.7.0");
  assert.equal(mismatchedPlugin.status, 1);
  assert.match(mismatchedPlugin.stderr, /plugin\.json: 0\.7\.1/);

  fs.writeFileSync(manifest, original);
  const mismatchedTag = run("v0.7.1");
  assert.equal(mismatchedTag.status, 1);
  assert.match(mismatchedTag.stderr, /Release tag v0\.7\.1 does not match 0\.7\.0/);
});

test("Codex manifest registers lifecycle hooks and keeps MCP optional", () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, ".codex-plugin", "plugin.json"), "utf8"));
  assert.equal(manifest.hooks, "./hooks/codex-hooks.json");
  assert.equal(manifest.mcpServers, undefined);
  assert.equal(manifest.skills, "./skills/");
  assert.equal(manifest.interface.shortDescription, "Necktie decision support");
  assert.equal(manifest.interface.privacyPolicyURL, "https://github.com/gillcash/necktie/blob/main/PRIVACY.md");
  assert.equal(manifest.interface.termsOfServiceURL, "https://github.com/gillcash/necktie/blob/main/TERMS.md");
});

test("Claude and Copilot manifests do not point at the Gemini-only commands directory", () => {
  assert.deepEqual(fs.readdirSync(path.join(root, "commands")).filter((file) => file.endsWith(".md")), []);
  const marketplace = JSON.parse(fs.readFileSync(path.join(root, ".github", "plugin", "marketplace.json"), "utf8"));
  for (const [relative, manifest] of [
    [".claude-plugin/plugin.json", JSON.parse(fs.readFileSync(path.join(root, ".claude-plugin", "plugin.json"), "utf8"))],
    [".github/plugin/plugin.json", JSON.parse(fs.readFileSync(path.join(root, ".github", "plugin", "plugin.json"), "utf8"))],
    [".github/plugin/marketplace.json", marketplace.plugins[0]],
  ]) {
    assert.equal(manifest.commands, undefined, relative);
  }
});

test("Qoder manifest declares only fields in Qoder's plugin reference", () => {
  const documented = new Set([
    "name", "version", "displayName", "description", "author", "homepage", "repository", "license", "keywords", "dependencies",
    "commands", "agents", "skills", "outputStyles", "workflowsPath", "workflowsPaths", "hooks", "mcpServers", "settings",
  ]);
  const manifest = JSON.parse(fs.readFileSync(path.join(root, ".qoder-plugin", "plugin.json"), "utf8"));
  assert.deepEqual(Object.keys(manifest).filter((key) => !documented.has(key)), []);
});

test("marketplace copy describes utility without internal framing", () => {
  const publicMetadataFiles = [
    "package.json", "plugin.json", "plugin.yaml", "gemini-extension.json",
    ".codex-plugin/plugin.json", ".claude-plugin/plugin.json", ".claude-plugin/marketplace.json",
    ".devin-plugin/plugin.json", ".github/plugin/plugin.json", ".github/plugin/marketplace.json",
    ".grok-plugin/marketplace.json", ".qoder-plugin/plugin.json", "skills/necktie/agents/openai.yaml",
  ];

  for (const relative of publicMetadataFiles) {
    const copy = fs.readFileSync(path.join(root, relative), "utf8");
    assert.doesNotMatch(copy, /angel|mammon/i, relative);
  }
});

test("public copy states the default objective", () => {
  const objective = /Default objective:(?:\*\*)? maximize the beneficiary's expected net wealth\./;
  assert.match(fs.readFileSync(path.join(root, "README.md"), "utf8"), objective);
  assert.match(fs.readFileSync(path.join(root, "plugin.yaml"), "utf8"), /^description: ".*Default objective: maximize the beneficiary's expected net wealth\."$/m);
  for (const relative of [
    "package.json", "plugin.json", "gemini-extension.json",
    ".claude-plugin/plugin.json", ".claude-plugin/marketplace.json", ".codex-plugin/plugin.json",
    ".devin-plugin/plugin.json", ".github/plugin/plugin.json", ".github/plugin/marketplace.json",
    ".grok-plugin/marketplace.json", ".qoder-plugin/plugin.json",
  ]) {
    const manifest = JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
    const descriptions = [manifest.description, manifest.interface?.longDescription, ...(manifest.plugins || []).map((plugin) => plugin.description)];
    for (const description of descriptions.filter((value) => value !== undefined)) assert.match(description, objective, relative);
  }
});

test("OpenAI submission materials contain the required review cases and public policies", () => {
  const submission = fs.readFileSync(path.join(root, "docs", "openai-submission.md"), "utf8");
  for (const id of ["P1", "P2", "P3", "P4", "P5", "N1", "N2", "N3"]) {
    assert.match(submission, new RegExp(`^### ${id} —`, "m"), id);
  }
  assert.ok(fs.existsSync(path.join(root, "PRIVACY.md")));
  assert.ok(fs.existsSync(path.join(root, "TERMS.md")));
});

test("static adapters and runtime load the same single policy", () => {
  const instructions = policy.buildInstructions();
  assert.equal(fs.readFileSync(path.join(root, "AGENTS.md"), "utf8").trim(), instructions);
  assert.match(instructions, /^NECKTIE ACTIVE\./);
  const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  assert.ok(pkg.files.includes("lib/"));
  assert.ok(pkg.files.includes("skills/"));
  const yamlManifest = fs.readFileSync(path.join(root, "plugin.yaml"), "utf8");
  assert.match(yamlManifest, /provides_skills:[\s\S]*- necktie\s+- necktie-research/);
});

test("package exposes the OpenCode adapter and uses generated-policy checks", () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  assert.equal(pkg.main, "./.opencode/plugins/necktie.mjs");
  assert.equal(pkg.repository.url, "git+https://github.com/gillcash/necktie.git");
  assert.equal(pkg.scripts["build:adapters"], "node scripts/build-adapters.js");
  assert.equal(pkg.scripts["check:adapters"], "node scripts/build-adapters.js --check");
  assert.match(pkg.scripts.test, /^npm run check:adapters && /);
});

test("private MCP package keeps only required direct dependencies and a matching lockfile", () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, "necktie-mcp", "package.json"), "utf8"));
  const lock = JSON.parse(fs.readFileSync(path.join(root, "necktie-mcp", "package-lock.json"), "utf8"));
  assert.deepEqual(Object.keys(manifest.dependencies).sort(), ["@modelcontextprotocol/sdk", "zod"]);
  assert.deepEqual(lock.packages[""].dependencies, manifest.dependencies);
  assert.equal(lock.version, "0.7.0");
});

test("benchmark fixtures cover decisions and observable boundaries", () => {
  const fixtures = JSON.parse(fs.readFileSync(path.join(root, "benchmarks", "fixtures.json"), "utf8"));
  assert.equal("modes" in fixtures, false);
  assert.deepEqual(fixtures.cases.map((entry) => entry.id).sort(), ["benign-plan", "extractive-metric", "trivial-task"]);
  for (const fixture of fixtures.cases) {
    assert.deepEqual(Object.keys(fixture).sort(), ["expectations", "id", "prompt"]);
    assert.ok(fixture.expectations.every((value) => !/chain.of.thought/i.test(value)));
  }
});
