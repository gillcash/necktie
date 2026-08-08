import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

test("OpenCode registers four commands, skills, and Core", async () => {
  const module = await import(pathToFileURL(path.join(root, ".opencode", "plugins", "necktie.mjs")));
  assert.deepEqual(Object.keys(module), ["default"]);
  const plugin = await module.default();
  const config = {};
  await plugin.config(config);
  assert.deepEqual(Object.keys(config.command).sort(), ["necktie", "necktie-critique", "necktie-reverse", "necktie-review"]);
  assert.ok(config.skills.paths.includes(path.join(root, "skills")));
  const output = { system: ["base"] };
  await plugin["experimental.chat.system.transform"]({}, output);
  const core = fs.readFileSync(path.join(root, "core", "necktie-core.md"), "utf8").trim();
  assert.equal(output.system[0], `base\n\n${core}`);
});
