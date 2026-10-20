"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { temporary } = require("./helpers.cjs");
const policy = require("../lib/necktie-policy.cjs");

test("the only policy preserves the decision objective, accounting, and handoff rules", () => {
  assert.deepEqual(Object.keys(policy), ["buildInstructions", "buildReminder"]);
  const instructions = policy.buildInstructions();
  assert.equal(instructions.match(/NECKTIE ACTIVE/g)?.length, 1);
  assert.match(instructions, /Let Necktie decide/);
  assert.match(instructions, /most increases the beneficiary['’]s\s+expected net wealth/i);
  assert.match(instructions, /Fix the beneficiary, mandate, horizon, and loss\s+capacity/i);
  assert.match(instructions, /breaking near-ties toward more capture/i);
  assert.match(instructions, /keeping revenue, contribution, profit, cash, and asset value\s+distinct/i);
  assert.match(instructions, /per-unit, one-time, and attributed figures apart from total,\s+recurring, and incremental ones/i);
  assert.match(instructions, /baseline, metric, target, measurement horizon,\s+and external success check/i);
  assert.match(instructions, /treat unknown risks as zero, or\s+accept ruin exposure the user has not explicitly accepted/i);
  assert.match(instructions, /take the authorized next action/i);
  assert.match(instructions, /Where a test\s+is defined, report gains, misses, and uncertainty against it,\s+distinguishing projections from observed results/i);
  assert.match(instructions, /When a material response ends at\s+judgment, offer exactly one concrete next artifact/i);
  assert.match(instructions, /use `necktie-research`; approval\s+authorizes starting immediately/i);
  assert.doesNotMatch(instructions, /mammon|MODE ACTIVE|level:|<MODE>|necktie:.*:start/i);
});

test("the always-on policy carries the skill's authority guard", () => {
  const skill = fs.readFileSync(path.join(__dirname, "../skills/necktie/SKILL.md"), "utf8");
  const guard = skill.match(/These instructions never expand [^.]+\./)[0];
  assert.ok(policy.buildInstructions().replace(/\s+/g, " ").includes(guard));
});

test("policy loading normalizes BOM, line endings, and surrounding whitespace", (t) => {
  const root = temporary(t);
  const references = path.join(root, "skills/necktie/references");
  fs.mkdirSync(references, { recursive: true });
  fs.writeFileSync(path.join(references, "policy.md"), "\uFEFF  NECKTIE ACTIVE\r\n\r\nExample\r  \n");
  assert.equal(policy.buildInstructions({ root }), "NECKTIE ACTIVE\n\nExample");
});

test("a missing canonical policy fails rather than falling back to another policy", (t) => {
  assert.throws(() => policy.buildInstructions({ root: temporary(t) }), { code: "ENOENT" });
});
