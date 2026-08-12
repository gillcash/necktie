"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

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

test("mode references preserve one conclusion with distinct final authority", () => {
  for (const mode of ["lite", "full", "mammon"]) {
    const reference = fs.readFileSync(path.join(root, "skills", "necktie", "references", `${mode}.md`), "utf8");
    assert.match(reference, new RegExp(`level: ${mode}`, "i"));
    assert.match(reference, /Never narrate private analysis/i);
  }
  const full = fs.readFileSync(path.join(root, "skills", "necktie", "references", "full.md"), "utf8");
  const mammon = fs.readFileSync(path.join(root, "skills", "necktie", "references", "mammon.md"), "utf8");
  assert.match(full, /Useful action pass/);
  assert.match(mammon, /sole final perspective/);
  assert.doesNotMatch(mammon, /Then rebut Mammon/);
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

test("OpenClaw copy matches the skill and all generated references", () => {
  const generator = require(path.join(root, "scripts", "build-openclaw-skills.js"));
  assert.deepEqual(generator.names, ["necktie", "necktie-research"]);
  for (const name of generator.names) {
    const generated = generator.generatedFiles(name);
    for (const [relative, expected] of generated) {
      const actual = fs.readFileSync(path.join(root, ".openclaw", "skills", name, relative));
      const expectedBuffer = Buffer.isBuffer(expected) ? expected : Buffer.from(expected, "utf8");
      assert.ok(actual.equals(expectedBuffer), `${name}/${relative}`);
    }
  }
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
