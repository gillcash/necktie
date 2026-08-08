import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function buildInstructions() {
  return fs.readFileSync(path.resolve(__dirname, "..", "core", "necktie-core.md"), "utf8").trim();
}
