#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const homepage = "https://github.com/gillcash/necktie";
const names = ["necktie", "necktie-critique", "necktie-reverse", "necktie-review"];

function render(name) {
  const source = fs.readFileSync(path.join(root, "skills", name, "SKILL.md"), "utf8").replace(/\r\n/g, "\n");
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
    if (!fs.existsSync(source)) continue;
    fs.cpSync(source, path.join(targetDir, child), {
      recursive: true,
      filter: (entry) => !entry.includes("__pycache__") && !entry.endsWith(".pyc"),
    });
  }
}

if (require.main === module) {
  for (const name of names) {
    const targetDir = path.join(root, ".openclaw", "skills", name);
    const target = path.join(targetDir, "SKILL.md");
    fs.mkdirSync(targetDir, { recursive: true });
    fs.writeFileSync(target, render(name), "utf8");
    copyAuxiliary(name, targetDir);
  }
  console.log(`Generated ${names.length} OpenClaw skill adapters.`);
}

module.exports = { copyAuxiliary, names, render };
