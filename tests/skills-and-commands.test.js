"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const names = ["necktie"];

test("exactly one canonical skill and command adapter ships", () => {
  const skillDirs = fs.readdirSync(path.join(root, "skills"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && fs.existsSync(path.join(root, "skills", entry.name, "SKILL.md")))
    .map((entry) => entry.name).sort();
  assert.deepEqual(skillDirs, names);
  assert.deepEqual(fs.readdirSync(path.join(root, "commands")), ["necktie.toml"]);
  assert.deepEqual(fs.readdirSync(path.join(root, ".opencode", "command")), ["necktie.md"]);
});

test("skill frontmatter stays minimal and Codex invocation is explicit", () => {
  const skill = fs.readFileSync(path.join(root, "skills", "necktie", "SKILL.md"), "utf8");
  const frontmatter = skill.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] || "";
  const keys = [...frontmatter.matchAll(/^([a-z_]+):/gm)].map((match) => match[1]).sort();
  assert.deepEqual(keys, ["description", "name"]);
  const openai = fs.readFileSync(path.join(root, "skills", "necktie", "agents", "openai.yaml"), "utf8");
  assert.match(openai, /\$necktie/);
  assert.match(openai, /allow_implicit_invocation:\s*false/);
});

test("primary skill defines the internal Mammon boundary and opinionated judgment", () => {
  const skill = fs.readFileSync(path.join(root, "skills", "necktie", "SKILL.md"), "utf8");
  assert.match(skill, /Mammon is an internal adversarial voice/i);
  assert.match(skill, /Consult Mammon privately/i);
  assert.match(skill, /Rebut Mammon/i);
  assert.match(skill, /least extractive effective alternative/i);
  assert.doesNotMatch(skill, /Necktie Loop|run packet|state machine|APPROVE|REVISE|BLOCK/);
});

test("OpenClaw copy matches the generator", () => {
  const { names: generatedNames, render } = require(path.join(root, "scripts", "build-openclaw-skills.js"));
  assert.deepEqual(generatedNames, names);
  const actual = fs.readFileSync(path.join(root, ".openclaw", "skills", "necktie", "SKILL.md"), "utf8");
  assert.equal(actual, render("necktie"));
});
