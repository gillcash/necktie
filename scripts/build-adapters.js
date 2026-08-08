#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const core = fs.readFileSync(path.join(root, "core", "necktie-core.md"), "utf8").trim();
const generated = {
  "AGENTS.md": `${core}\n`,
  ".agents/rules/necktie.md": `${core}\n`,
  ".clinerules/necktie.md": `${core}\n`,
  ".cursor/rules/necktie.mdc": `---\ndescription: Necktie Core. Apply opinionated judgment to incentives, power, extraction, and human agency.\nglobs:\nalwaysApply: true\n---\n\n${core}\n`,
  ".kiro/steering/necktie.md": `---\ntitle: Necktie Core\ninclusion: always\n---\n\n${core}\n`,
  ".qoder/rules/necktie.md": `${core}\n`,
  ".windsurf/rules/necktie.md": `${core}\n`,
  ".github/copilot-instructions.md": `${core}\n`,
};

const check = process.argv.includes("--check");
const stale = [];
for (const [relative, content] of Object.entries(generated)) {
  const target = path.join(root, relative);
  if (check) {
    if (!fs.existsSync(target) || fs.readFileSync(target, "utf8") !== content) stale.push(relative);
    continue;
  }
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content, "utf8");
}
if (stale.length) {
  console.error(`Generated adapters are stale: ${stale.join(", ")}`);
  process.exit(1);
}
if (!check) console.log(`Generated ${Object.keys(generated).length} Necktie adapters.`);
