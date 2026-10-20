import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import policy from "../../lib/necktie-policy.cjs";
import helpers from "../../tests/helpers.cjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.resolve(__dirname, "..", "index.js");

test("live MCP exposes one argument-free prompt and a strictly validated read-only tool", { timeout: 15000 }, async (t) => {
  const directory = helpers.temporary(t);
  const settings = path.join(directory, "necktie");
  fs.mkdirSync(settings);
  const config = path.join(settings, "config.json");
  const saved = '{"defaultMode":"lite","keep":true}';
  fs.writeFileSync(config, saved);
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [serverPath],
    env: { ...process.env, NECKTIE_DEFAULT_MODE: "lite", APPDATA: directory, XDG_CONFIG_HOME: directory },
    stderr: "pipe",
  });
  const client = new Client({ name: "necktie-test", version: "0.7.0" });
  try {
    await client.connect(transport);
    const prompts = await client.listPrompts();
    assert.deepEqual(prompts.prompts.map((prompt) => prompt.name), ["necktie"]);
    assert.deepEqual(prompts.prompts[0].arguments || [], []);
    const prompt = await client.getPrompt({ name: "necktie" });
    assert.equal(prompt.description, "Necktie instructions");
    assert.equal(prompt.messages[0].content.text, policy.buildInstructions());

    const tools = await client.listTools();
    assert.deepEqual(tools.tools.map((tool) => tool.name), ["necktie_instructions"]);
    const tool = tools.tools[0];
    assert.deepEqual(tool.inputSchema.properties, {});
    assert.equal(tool.annotations.readOnlyHint, true);
    assert.equal(tool.annotations.openWorldHint, false);
    assert.doesNotMatch(JSON.stringify({ prompts, tools }), /mammon|selected|mode/i);

    for (const args of [{ name: "necktie_instructions" }, { name: "necktie_instructions", arguments: {} }]) {
      const result = await client.callTool(args);
      assert.deepEqual(result.structuredContent, { instructions: policy.buildInstructions() });
      assert.equal(result.content[0].text, result.structuredContent.instructions);
    }
    const invalid = await client.callTool({ name: "necktie_instructions", arguments: { mode: "lite" } });
    assert.equal(invalid.isError, true);
    assert.match(invalid.content[0].text, /Input validation error/i);
    assert.deepEqual(fs.readdirSync(directory), ["necktie"]);
    assert.deepEqual(fs.readdirSync(settings), ["config.json"]);
    assert.equal(fs.readFileSync(config, "utf8"), saved);
  } finally {
    await client.close();
  }
});
