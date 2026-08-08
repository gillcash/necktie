import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { buildInstructions } from "../instructions.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const expected = fs.readFileSync(path.resolve(__dirname, "..", "..", "core", "necktie-core.md"), "utf8").trim();

test("MCP fallback serves the canonical Core without modes", () => {
  assert.equal(buildInstructions(), expected);
  assert.doesNotMatch(buildInstructions(), /lite|ultra|default mode/i);
});
