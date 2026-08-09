#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const homepage = "https://github.com/gillcash/necktie";
const names = ["necktie"];

function render(name) {
  const source = fs.readFileSync(path.join(root, "skills", name, "SKILL.md"), "utf8").replace(/\r\n?/g, "\n");
  const match = source.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) throw new Error(`skills/${name}/SKILL.md has no frontmatter`);
  const description = match[1].match(/^description:\s*(.+)$/m)?.[1];
  if (!description) throw new Error(`skills/${name}/SKILL.md has no description`);
  const short = description.length <= 160 ? description : `${description.slice(0, 157).trimEnd()}...`;
  return `---\nname: ${name}\ndescription: "${short.replaceAll('"', "'")}"\nhomepage: ${homepage}\nlicense: MIT\n---\n${source.slice(match[0].length)}`;
}

function copyAuxiliary(name, targetDir) {
  const sourceDir = path.join(root, "skills", name);
  for (const child of ["references", "scripts"]) {
    const source = path.join(sourceDir, child);
    const destination = path.join(targetDir, child);
    if (fs.existsSync(destination)) fs.rmSync(destination, { recursive: true, force: true });
    if (!fs.existsSync(source)) continue;
    fs.cpSync(source, destination, {
      recursive: true,
      filter: (entry) => !entry.includes("__pycache__") && !entry.endsWith(".pyc"),
    });
  }
}

function generatedFiles(name) {
  const files = new Map([["SKILL.md", render(name)]]);
  const sourceDir = path.join(root, "skills", name);
  for (const child of ["references", "scripts"]) {
    const source = path.join(sourceDir, child);
    if (!fs.existsSync(source)) continue;
    for (const relative of walk(source)) {
      const content = fs.readFileSync(path.join(source, relative));
      files.set(path.join(child, relative), content);
    }
  }
  return files;
}

function walk(directory, prefix = "") {
  const results = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === "__pycache__" || entry.name.endsWith(".pyc")) continue;
    const relative = path.join(prefix, entry.name);
    if (entry.isDirectory()) results.push(...walk(path.join(directory, entry.name), relative));
    else if (entry.isFile()) results.push(relative);
  }
  return results;
}

function run({ check = process.argv.includes("--check") } = {}) {
  const stale = [];
  for (const name of names) {
    const targetDir = path.join(root, ".openclaw", "skills", name);
    const files = generatedFiles(name);
    if (check) {
      for (const [relative, expected] of files) {
        const target = path.join(targetDir, relative);
        const actual = fs.existsSync(target) ? fs.readFileSync(target) : null;
        const expectedBuffer = Buffer.isBuffer(expected) ? expected : Buffer.from(expected, "utf8");
        if (!actual || !actual.equals(expectedBuffer)) stale.push(path.relative(root, target));
      }
      const expectedPaths = new Set([...files.keys()].map((relative) => path.normalize(relative)));
      for (const relative of fs.existsSync(targetDir) ? walk(targetDir) : []) {
        if (!expectedPaths.has(path.normalize(relative))) stale.push(path.relative(root, path.join(targetDir, relative)));
      }
      continue;
    }
    fs.mkdirSync(targetDir, { recursive: true });
    fs.writeFileSync(path.join(targetDir, "SKILL.md"), render(name), "utf8");
    copyAuxiliary(name, targetDir);
  }
  if (stale.length) {
    console.error(`Generated OpenClaw skills are stale: ${stale.join(", ")}`);
    process.exitCode = 1;
    return stale;
  }
  if (!check) console.log(`Generated ${names.length} OpenClaw skill adapters.`);
  return [];
}

if (require.main === module) {
  run();
}

module.exports = { copyAuxiliary, generatedFiles, names, render, run, walk };
