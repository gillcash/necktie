"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");

test("one canonical skill and two distinct commands ship", () => {
  const skillDirs = fs.readdirSync(path.join(root, "skills"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && fs.existsSync(path.join(root, "skills", entry.name, "SKILL.md")))
    .map((entry) => entry.name).sort();
  assert.deepEqual(skillDirs, ["necktie"]);
  assert.deepEqual(fs.readdirSync(path.join(root, "commands")).sort(), ["necktie-mode.toml", "necktie.toml"]);
  assert.deepEqual(fs.readdirSync(path.join(root, ".opencode", "command")).sort(), ["necktie-mode.md", "necktie.md"]);
});

test("skill frontmatter stays minimal and mode selection is one-shot", () => {
  const skill = fs.readFileSync(path.join(root, "skills", "necktie", "SKILL.md"), "utf8");
  const frontmatter = skill.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] || "";
  const keys = [...frontmatter.matchAll(/^([a-z_]+):/gm)].map((match) => match[1]).sort();
  assert.deepEqual(keys, ["description", "name"]);
  assert.match(skill, /--mode lite/);
  assert.match(skill, /use it for this invocation only/i);
  assert.match(skill, /references\/.*lite\.md.*full\.md.*ultra\.md/s);
  assert.match(skill, /never expands authority, permissions, tool access/i);
  assert.match(skill, /do not invent an `off` mode/i);
  assert.match(skill, /Never .*create a separate Mammon command/i);

  const openai = fs.readFileSync(path.join(root, "skills", "necktie", "agents", "openai.yaml"), "utf8");
  assert.match(openai, /\$necktie --mode full/);
  assert.match(openai, /allow_implicit_invocation:\s*false/);
});

test("mode references preserve one public Necktie voice", () => {
  for (const mode of ["lite", "full", "ultra"]) {
    const reference = fs.readFileSync(path.join(root, "skills", "necktie", "references", `${mode}.md`), "utf8");
    assert.match(reference, new RegExp(`level: ${mode}`, "i"));
    assert.match(reference, /Mammon is internal only/i);
    assert.match(reference, /Do not reveal private chain-of-thought/i);
  }
});

test("OpenClaw copy matches the skill and all generated references", () => {
  const generator = require(path.join(root, "scripts", "build-openclaw-skills.js"));
  assert.deepEqual(generator.names, ["necktie"]);
  const generated = generator.generatedFiles("necktie");
  for (const [relative, expected] of generated) {
    const actual = fs.readFileSync(path.join(root, ".openclaw", "skills", "necktie", relative));
    const expectedBuffer = Buffer.isBuffer(expected) ? expected : Buffer.from(expected, "utf8");
    assert.ok(actual.equals(expectedBuffer), relative);
  }
});

test("mode command templates expose no Mammon persona or off state", () => {
  const combined = [
    fs.readFileSync(path.join(root, "commands", "necktie-mode.toml"), "utf8"),
    fs.readFileSync(path.join(root, ".opencode", "command", "necktie-mode.md"), "utf8"),
  ].join("\n");
  assert.match(combined, /NECKTIE_MODE_COMMAND/);
  assert.doesNotMatch(combined, /Mammon (?:mode|persona|command)/i);
  assert.doesNotMatch(combined, /lite\|full\|ultra\|off/i);
});
