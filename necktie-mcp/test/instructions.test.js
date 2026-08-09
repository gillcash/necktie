import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { MODES, buildInstructions, resolveMode, selectInstructions } from "../instructions.js";

test("MCP selector serves exactly lite, full, and mammon", () => {
  assert.deepEqual(MODES, ["lite", "full", "mammon"]);
  for (const mode of MODES) {
    assert.equal(resolveMode(mode), mode);
    const selected = selectInstructions(mode);
    assert.equal(selected.mode, mode);
    assert.match(selected.instructions, new RegExp(`level: ${mode}`, "i"));
    assert.equal(buildInstructions(mode), selected.instructions);
  }
  assert.throws(() => resolveMode("off"), /Invalid Necktie mode/);
});

test("MCP omitted mode uses environment, configuration, then Full", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "necktie-mcp-config-"));
  const configPath = path.join(directory, "config.json");
  try {
    fs.writeFileSync(configPath, JSON.stringify({ defaultMode: "lite" }));
    assert.equal(selectInstructions(undefined, { env: {}, configOptions: { configPath } }).mode, "lite");
    assert.equal(selectInstructions(undefined, {
      env: { NECKTIE_DEFAULT_MODE: "mammon" },
      configOptions: { configPath },
    }).mode, "mammon");
    const warnings = [];
    assert.equal(selectInstructions(undefined, {
      env: { NECKTIE_DEFAULT_MODE: "off" },
      configOptions: { configPath },
      onWarning: (warning) => warnings.push(warning),
    }).mode, "lite");
    assert.match(warnings.join("\n"), /NECKTIE_DEFAULT_MODE/);
    fs.unlinkSync(configPath);
    assert.equal(selectInstructions(undefined, { env: {}, configOptions: { configPath } }).mode, "full");
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
