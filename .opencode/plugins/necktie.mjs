import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { parseCommandFile } = require("./necktie-frontmatter.cjs");
const root = path.resolve(__dirname, "../..");
const skillsDir = path.join(root, "skills");

function coreContext() {
  return fs.readFileSync(path.join(root, "core", "necktie-core.md"), "utf8").trim();
}

export default async function necktiePlugin() {
  return {
    config: async (config) => {
      config.command ||= {};
      const commandDir = path.join(__dirname, "..", "command");
      for (const file of fs.readdirSync(commandDir).filter((name) => name.endsWith(".md"))) {
        const parsed = parseCommandFile(path.join(commandDir, file));
        if (parsed) config.command[path.basename(file, ".md")] = parsed;
      }
      config.skills ||= {};
      config.skills.paths ||= [];
      if (!config.skills.paths.includes(skillsDir)) config.skills.paths.push(skillsDir);
    },
    "experimental.chat.system.transform": async (_input, output) => {
      const context = coreContext();
      if (output.system.length) output.system[output.system.length - 1] += `\n\n${context}`;
      else output.system.push(context);
    },
  };
}
