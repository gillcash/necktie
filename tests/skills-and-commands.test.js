"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { temporary } = require("./helpers.cjs");

const root = path.resolve(__dirname, "..");

test("judgment and research skills ship with two distinct commands", () => {
  const skillDirs = fs.readdirSync(path.join(root, "skills"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && fs.existsSync(path.join(root, "skills", entry.name, "SKILL.md")))
    .map((entry) => entry.name).sort();
  assert.deepEqual(skillDirs, ["necktie", "necktie-research"]);
  assert.deepEqual(fs.readdirSync(path.join(root, "commands")).sort(), ["necktie-mode.toml", "necktie.toml"]);
  assert.deepEqual(fs.readdirSync(path.join(root, ".opencode", "command")).sort(), ["necktie-mode.md", "necktie.md"]);
});

test("skill frontmatter stays minimal and mode selection is one-shot", () => {
  const skill = fs.readFileSync(path.join(root, "skills", "necktie", "SKILL.md"), "utf8");
  const frontmatter = skill.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] || "";
  const keys = [...frontmatter.matchAll(/^([a-z_]+):/gm)].map((match) => match[1]).sort();
  assert.deepEqual(keys, ["description", "name"]);
  assert.doesNotMatch(frontmatter, /mammon/i);
  assert.match(skill, /--mode lite/);
  assert.match(skill, /use it for this invocation only/i);
  assert.match(skill, /references\/.*lite\.md.*full\.md.*mammon\.md/s);
  assert.match(skill, /never expands authority, permissions, tool access/i);
  assert.match(skill, /do not invent an `off` mode/i);
  assert.match(skill, /only Mammon's conclusion without a Necktie rebuttal/i);
  assert.match(skill, /necktie-research\/SKILL\.md/);

  const openai = fs.readFileSync(path.join(root, "skills", "necktie", "agents", "openai.yaml"), "utf8");
  assert.match(openai, /\$necktie --mode full/);
  assert.match(openai, /allow_implicit_invocation:\s*false/);
});

test("research skill uses a bounded, copy-ready prompt loop", () => {
  const skill = fs.readFileSync(path.join(root, "skills", "necktie-research", "SKILL.md"), "utf8");
  const frontmatter = skill.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] || "";
  assert.doesNotMatch(frontmatter, /mammon/i);
  const protocol = fs.readFileSync(path.join(root, "skills", "necktie-research", "references", "research-prompt-protocol.md"), "utf8");
  const openai = fs.readFileSync(path.join(root, "skills", "necktie-research", "agents", "openai.yaml"), "utf8");
  assert.match(skill, /discover, fingerprint, critique, blueprint, draft, review/i);
  assert.match(skill, /one fenced text block/i);
  assert.match(protocol, /reference output/i);
  assert.match(protocol, /KPI research prompt checklist/i);
  assert.match(protocol, /maximum of three revision passes.*five at `deep`/i);
  assert.match(openai, /\$necktie-research/);
  assert.match(openai, /allow_implicit_invocation:\s*true/);
});

test("generation repairs drift in one pass and check mode never writes", (t) => {
  const { generate, run } = require("../scripts/build-adapters.js");
  const directory = temporary(t);
  fs.cpSync(path.join(root, "skills"), path.join(directory, "skills"), { recursive: true });
  const options = { root: directory, check: false };
  assert.ok(run(options).length);
  assert.deepEqual(run({ ...options, check: true }), []);
  const missing = "skills/necktie/references/full.md";
  const extra = ".openclaw/skills/necktie/obsolete.md";
  fs.unlinkSync(path.join(directory, missing));
  fs.writeFileSync(path.join(directory, extra), "obsolete");
  assert.deepEqual(run({ ...options, check: true }).sort(), [missing, extra].sort());
  assert.equal(fs.existsSync(path.join(directory, missing)), false);
  assert.equal(fs.readFileSync(path.join(directory, extra), "utf8"), "obsolete");
  run(options);
  assert.deepEqual(run(options), []);
  for (const [relative, expected] of generate(directory)) {
    assert.ok(fs.readFileSync(path.join(directory, relative)).equals(expected), relative);
  }
  fs.writeFileSync(path.join(directory, "skills/necktie/references/policy.md"), "broken");
  assert.throws(() => run(options), /Missing or invalid shared policy section/);
});

test("command templates advertise only public modes and no off state", () => {
  const combined = [
    fs.readFileSync(path.join(root, "commands", "necktie.toml"), "utf8"),
    fs.readFileSync(path.join(root, "commands", "necktie-mode.toml"), "utf8"),
    fs.readFileSync(path.join(root, ".opencode", "command", "necktie.md"), "utf8"),
    fs.readFileSync(path.join(root, ".opencode", "command", "necktie-mode.md"), "utf8"),
  ].join("\n");
  assert.match(combined, /NECKTIE_MODE_COMMAND/);
  assert.match(combined, /lite or full/i);
  assert.doesNotMatch(combined, /mammon|lite\|full\|off/i);
});

test("public documentation does not advertise hidden modes", () => {
  const files = [
    "README.md", "README.es.md", "README.ko.md", "after-install.md",
    "benchmarks/README.md", "docs/host-support.md",
    "examples/kpi-data-reliability-rental-store.md",
    "necktie-mcp/README.md", "necktie-mcp/package.json",
  ];
  for (const relative of files) {
    assert.doesNotMatch(fs.readFileSync(path.join(root, relative), "utf8"), /mammon/i, relative);
  }
});
