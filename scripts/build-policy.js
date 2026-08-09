#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const sourcePath = path.join(root, "skills", "necktie", "references", "policy.md");
const modes = ["lite", "full", "ultra"];

function normalize(text) {
  return String(text).replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
}

function section(source, name) {
  const start = `<!-- necktie:${name}:start -->`;
  const end = `<!-- necktie:${name}:end -->`;
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end);
  if (startIndex < 0 || endIndex < 0 || endIndex <= startIndex) {
    throw new Error(`Missing or invalid ${name} policy section.`);
  }
  return source.slice(startIndex + start.length, endIndex).trim();
}

function renderPolicies(sourceText = fs.readFileSync(sourcePath, "utf8")) {
  const source = normalize(sourceText);
  const shared = section(source, "shared");
  const full = section(source, "full");
  const ultra = section(source, "ultra");
  const parts = {
    lite: [shared],
    full: [shared, full],
    ultra: [shared, full, ultra],
  };
  return Object.fromEntries(modes.map((mode) => [
    mode,
    `NECKTIE MODE ACTIVE — level: ${mode}. This selection supersedes earlier Necktie mode instructions in this session.\n\n${parts[mode].join("\n\n")}\n`,
  ]));
}

function targets(rendered) {
  const output = {};
  for (const mode of modes) {
    output[`skills/necktie/references/${mode}.md`] = rendered[mode];
    output[`core/necktie-${mode}.md`] = rendered[mode];
  }
  output["core/necktie-core.md"] = rendered.full;
  return output;
}

function run({ check = process.argv.includes("--check") } = {}) {
  const generated = targets(renderPolicies());
  const stale = [];
  for (const [relative, content] of Object.entries(generated)) {
    const target = path.join(root, relative);
    if (check) {
      const actual = fs.existsSync(target) ? fs.readFileSync(target, "utf8").replace(/^\uFEFF/, "") : null;
      if (actual !== content) stale.push(relative);
      continue;
    }
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content, { encoding: "utf8" });
  }
  if (stale.length) {
    console.error(`Generated policies are stale: ${stale.join(", ")}`);
    process.exitCode = 1;
    return stale;
  }
  if (!check) console.log(`Generated ${Object.keys(generated).length} Necktie policy artifacts.`);
  return [];
}

if (require.main === module) run();

module.exports = { modes, normalize, renderPolicies, run, section, targets };
