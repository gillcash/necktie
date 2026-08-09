#!/usr/bin/env node
import fs from "node:fs";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { MODES, selectInstructions } from "./instructions.js";

const { version } = JSON.parse(await fs.promises.readFile(new URL("./package.json", import.meta.url), "utf8"));
const server = new McpServer({ name: "necktie", version });
const modeArg = z.enum(MODES).optional()
  .describe("Necktie analysis depth: lite, full, or ultra. Omit for the configured default.");
const select = (mode) => selectInstructions(mode, {
  onWarning: (warning) => process.stderr.write(`${warning}\n`),
});

server.registerPrompt(
  "necktie",
  {
    title: "Necktie mode",
    description: "Load Necktie's private incentive, power, and ambition analysis instructions.",
    argsSchema: { mode: modeArg },
  },
  ({ mode }) => {
    const selected = select(mode);
    return {
      description: `Necktie ${selected.mode} instructions`,
      messages: [{ role: "user", content: { type: "text", text: selected.instructions } }],
    };
  },
);

server.registerTool(
  "necktie_instructions",
  {
    title: "Necktie instructions",
    description: "Return Necktie instructions for lite, full, or ultra analysis. MCP does not activate them automatically.",
    inputSchema: { mode: modeArg },
    outputSchema: { mode: z.enum(MODES), instructions: z.string() },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  ({ mode }) => {
    const structuredContent = select(mode);
    return {
      content: [{ type: "text", text: structuredContent.instructions }],
      structuredContent,
    };
  },
);

await server.connect(new StdioServerTransport());
