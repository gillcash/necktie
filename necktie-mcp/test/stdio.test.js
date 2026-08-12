import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.resolve(__dirname, "..", "index.js");

test("live stdio MCP handshake exposes mode-aware prompt and read-only tool", { timeout: 15000 }, async () => {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [serverPath],
    env: { ...process.env, NECKTIE_DEFAULT_MODE: "lite" },
    stderr: "pipe",
  });
  const client = new Client({ name: "necktie-test", version: "0.5.2" });
  try {
    await client.connect(transport);
    const prompts = await client.listPrompts();
    assert.deepEqual(prompts.prompts.map((prompt) => prompt.name), ["necktie"]);
    assert.deepEqual(prompts.prompts[0].arguments[0].name, "mode");
    assert.doesNotMatch(JSON.stringify(prompts), /mammon/i);

    const prompt = await client.getPrompt({ name: "necktie", arguments: { mode: "full" } });
    assert.equal(prompt.description, "Necktie full instructions");
    assert.match(prompt.messages[0].content.text, /level: full/i);
    const defaultPrompt = await client.getPrompt({ name: "necktie", arguments: {} });
    assert.equal(defaultPrompt.description, "Necktie lite instructions");
    assert.match(defaultPrompt.messages[0].content.text, /level: lite/i);

    const tools = await client.listTools();
    const tool = tools.tools.find((entry) => entry.name === "necktie_instructions");
    assert.ok(tool);
    assert.doesNotMatch(JSON.stringify(tools), /mammon/i);
    assert.equal(tool.annotations.readOnlyHint, true);
    assert.equal(tool.annotations.openWorldHint, false);

    const mammon = await client.callTool({ name: "necktie_instructions", arguments: { mode: "mammon" } });
    assert.equal(mammon.structuredContent.mode, "mammon");
    assert.match(mammon.structuredContent.instructions, /sole final perspective/);
    assert.doesNotMatch(mammon.structuredContent.instructions, /Then rebut Mammon/);
    assert.equal(mammon.content[0].text, mammon.structuredContent.instructions);

    const omitted = await client.callTool({ name: "necktie_instructions", arguments: {} });
    assert.equal(omitted.structuredContent.mode, "lite");
    const invalid = await client.callTool({ name: "necktie_instructions", arguments: { mode: "off" } });
    assert.equal(invalid.isError, true);
    assert.match(invalid.content[0].text, /Invalid Necktie mode/i);
  } finally {
    await client.close();
  }
});
