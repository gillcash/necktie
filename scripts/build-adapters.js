#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const ROOT = path.resolve(__dirname, "..");
const SKILLS = ["necktie", "necktie-research"];
const ADAPTERS = {
  "AGENTS.md": "",
  ".agents/rules/necktie.md": "",
  ".clinerules/necktie.md": "",
  ".cursor/rules/necktie.mdc": "---\ndescription: Necktie instructions.\nglobs:\nalwaysApply: true\n---\n\n",
  ".kiro/steering/necktie.md": "---\ntitle: Necktie Core\ninclusion: always\n---\n\n",
  ".qoder/rules/necktie.md": "",
  ".windsurf/rules/necktie.md": "",
  ".github/copilot-instructions.md": "",
};

function filesUnder(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { recursive: true })
    .filter((file) => !/(^|[\\/])__pycache__([\\/]|$)|\.pyc$/.test(file))
    .filter((file) => fs.statSync(path.join(directory, file)).isFile())
    .map((file) => file.replaceAll(path.sep, "/"));
}

function generate(root = ROOT) {
  const read = (file) => fs.readFileSync(path.join(root, file));
  const policy = read("skills/necktie/references/policy.md").toString("utf8")
    .replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").trim();
  if (!policy) throw new Error("Necktie policy is empty.");
  const generated = new Map();
  for (const [file, prefix] of Object.entries(ADAPTERS)) {
    generated.set(file, `${prefix}${policy}\n`);
  }
  for (const name of SKILLS) {
    const skill = read(`skills/${name}/SKILL.md`).toString("utf8").replace(/\r\n?/g, "\n");
    const frontmatter = skill.match(/^---\n([\s\S]*?)\n---\n?/);
    const description = frontmatter?.[1].match(/^description:\s*(.+)$/m)?.[1];
    if (!description) throw new Error(`skills/${name}/SKILL.md has no description frontmatter`);
    if (description.length > 1024) throw new Error(`skills/${name}/SKILL.md description exceeds the 1024-character Agent Skills limit`);
    const target = `.openclaw/skills/${name}`;
    generated.set(`${target}/SKILL.md`, `---\nname: ${name}\ndescription: ${JSON.stringify(description)}\nhomepage: https://github.com/gillcash/necktie\nlicense: MIT\n---\n${skill.slice(frontmatter[0].length)}`);
    for (const child of ["references", "scripts"]) {
      const sourceDir = `skills/${name}/${child}`;
      const files = new Set([
        ...filesUnder(path.join(root, sourceDir)),
        ...[...generated.keys()].filter((file) => file.startsWith(`${sourceDir}/`)).map((file) => file.slice(sourceDir.length + 1)),
      ]);
      for (const file of files) {
        const relative = `${sourceDir}/${file}`;
        generated.set(`${target}/${child}/${file}`, generated.get(relative) ?? read(relative));
      }
    }
  }
  return new Map([...generated].map(([file, content]) => [file, Buffer.from(content)]));
}

function run({ check = process.argv.includes("--check"), root = ROOT } = {}) {
  const generated = generate(root);
  const existing = SKILLS.flatMap((name) => filesUnder(path.join(root, ".openclaw/skills", name))
    .map((file) => `.openclaw/skills/${name}/${file}`));
  const stale = [];
  for (const relative of new Set([...generated.keys(), ...existing])) {
    const target = path.join(root, relative);
    const expected = generated.get(relative);
    const actual = fs.existsSync(target) ? fs.readFileSync(target) : null;
    if (expected && actual?.equals(expected)) continue;
    stale.push(relative);
    if (check) continue;
    if (expected) {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, expected);
    } else {
      fs.unlinkSync(target);
    }
  }
  return stale;
}

if (require.main === module) {
  const stale = run();
  if (process.argv.includes("--check") && stale.length) {
    console.error(`Generated artifacts are stale: ${stale.join(", ")}`);
    process.exitCode = 1;
  }
}

module.exports = { generate, run };
