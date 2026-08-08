"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const names = ["necktie", "necktie-critique", "necktie-reverse", "necktie-review"];

test("exactly four canonical skills and command adapters ship", () => {
  const skillDirs = fs.readdirSync(path.join(root, "skills"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
  assert.deepEqual(skillDirs, [...names].sort());
  assert.deepEqual(fs.readdirSync(path.join(root, "commands")).sort(), names.map((name) => `${name}.toml`).sort());
  assert.deepEqual(fs.readdirSync(path.join(root, ".opencode", "command")).sort(), names.map((name) => `${name}.md`).sort());
});

test("skill frontmatter stays minimal and Codex invocation is explicit", () => {
  for (const name of names) {
    const skill = fs.readFileSync(path.join(root, "skills", name, "SKILL.md"), "utf8");
    const frontmatter = skill.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] || "";
    const keys = [...frontmatter.matchAll(/^([a-z_]+):/gm)].map((match) => match[1]).sort();
    assert.deepEqual(keys, ["description", "name"], name);
    const openai = fs.readFileSync(path.join(root, "skills", name, "agents", "openai.yaml"), "utf8");
    assert.match(openai, new RegExp(`\\$${name.replace("-", "\\-")}`));
    assert.match(openai, /allow_implicit_invocation:\s*false/);
  }
});

test("primary skill defines the exact phase order and fixed review bound", () => {
  const skill = fs.readFileSync(path.join(root, "skills", "necktie", "SKILL.md"), "utf8");
  const positions = ["### 1. Frame", "### 2. Establish a baseline", "### 3. Critique", "### 4. Reverse", "### 5. Execute", "### 6. Review", "### 7. Verify"].map((heading) => skill.indexOf(heading));
  assert.ok(positions.every((position) => position >= 0));
  assert.deepEqual([...positions].sort((a, b) => a - b), positions);
  assert.match(skill, /three revision decisions/);
  assert.match(skill, /explicitly named inputs, current-request attachments, configured inboxes, then user-approved search roots/);
  assert.match(skill, /deliverable contract/);
  assert.match(skill, /Never shrink the deliverable contract/);
  assert.doesNotMatch(skill, /quick|standard mode|deep mode|--mode/);
});

test("OpenClaw copies match the generator", () => {
  const { render } = require(path.join(root, "scripts", "build-openclaw-skills.js"));
  for (const name of names) {
    const actual = fs.readFileSync(path.join(root, ".openclaw", "skills", name, "SKILL.md"), "utf8");
    assert.equal(actual, render(name), name);
  }
  for (const relative of [
    "necktie/references/loop-protocol.md",
    "necktie/references/source-discovery.md",
    "necktie/scripts/necktie_loop.py",
    "necktie/scripts/necktie_sources.py",
    "necktie-reverse/references/blueprint-template.md",
    "necktie-review/references/reviewer-rubric.md",
    "necktie-review/scripts/validate_review.py",
    "necktie-review/scripts/verify_artifact_contract.py",
  ]) {
    assert.equal(
      fs.readFileSync(path.join(root, ".openclaw", "skills", relative), "utf8"),
      fs.readFileSync(path.join(root, "skills", relative), "utf8"),
      relative,
    );
  }
});
