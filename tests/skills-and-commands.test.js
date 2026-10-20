"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { temporary } = require("./helpers.cjs");

const root = path.resolve(__dirname, "..");

test("decision and research skills ship with one decision command", () => {
  const skillDirs = fs.readdirSync(path.join(root, "skills"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && fs.existsSync(path.join(root, "skills", entry.name, "SKILL.md")))
    .map((entry) => entry.name).sort();
  assert.deepEqual(skillDirs, ["necktie", "necktie-research"]);
  assert.deepEqual(fs.readdirSync(path.join(root, "commands")), ["necktie.toml"]);
  assert.deepEqual(fs.readdirSync(path.join(root, ".opencode", "command")), ["necktie.md"]);
});

test("skill frontmatter stays minimal and loads one canonical policy", () => {
  const skill = fs.readFileSync(path.join(root, "skills", "necktie", "SKILL.md"), "utf8");
  const frontmatter = skill.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] || "";
  const keys = [...frontmatter.matchAll(/^([a-z_]+):/gm)].map((match) => match[1]).sort();
  assert.deepEqual(keys, ["description", "name"]);
  assert.doesNotMatch(frontmatter, /mammon/i);
  assert.match(skill, /references\/policy\.md/);
  assert.match(skill, /never expand authority, permissions, tool access/i);
  assert.match(skill, /Return one conclusion without a debate transcript/i);
  assert.doesNotMatch(skill, /--mode|mammon|selected policy/i);
  assert.deepEqual(fs.readdirSync(path.join(root, "skills/necktie/references")), ["policy.md"]);
  assert.match(skill, /necktie-research\/SKILL\.md/);

  const openai = fs.readFileSync(path.join(root, "skills", "necktie", "agents", "openai.yaml"), "utf8");
  assert.match(openai, /\$necktie to judge/);
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
  assert.match(protocol, /Preserve Necktie's beneficiary and expected-net-wealth objective/i);
  assert.match(protocol, /Do not weaken evidence standards or conceal downside risk/i);
  assert.doesNotMatch(skill, /--origin-mode|active Necktie mode/);
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
  const missing = "AGENTS.md";
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
  const previous = fs.readFileSync(path.join(directory, missing));
  fs.writeFileSync(path.join(directory, "skills/necktie/references/policy.md"), " \n");
  assert.throws(() => run(options), /Necktie policy is empty/);
  assert.deepEqual(fs.readFileSync(path.join(directory, missing)), previous);
});

test("generated OpenClaw skills keep the full source description", () => {
  const frontmatterDescription = (file) => fs.readFileSync(path.join(root, file), "utf8").replace(/\r\n?/g, "\n")
    .match(/^---\n[\s\S]*?^description: (.+)$/m)[1];
  for (const name of ["necktie", "necktie-research"]) {
    const source = frontmatterDescription(`skills/${name}/SKILL.md`);
    assert.equal(JSON.parse(frontmatterDescription(`.openclaw/skills/${name}/SKILL.md`)), source, name);
    assert.match(source, /\bUse when\b|\bwhen the user\b/, name);
  }
});

test("command templates invoke Necktie without selectors", () => {
  const combined = [
    fs.readFileSync(path.join(root, "commands", "necktie.toml"), "utf8"),
    fs.readFileSync(path.join(root, ".opencode", "command", "necktie.md"), "utf8"),
  ].join("\n");
  assert.match(combined, /Use \$necktie/);
  assert.doesNotMatch(combined, /--mode|necktie-mode|NECKTIE_MODE_COMMAND|mammon|lite|full/i);
});

test("README files and current documentation use only the Necktie name", () => {
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
