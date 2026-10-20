#!/usr/bin/env node
import fs from "node:fs";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import policy from "../lib/necktie-policy.cjs";

const { version } = JSON.parse(await fs.promises.readFile(new URL("./package.json", import.meta.url), "utf8"));
const server = new McpServer({ name: "necktie", version });

server.registerPrompt(
  "necktie",
  {
    title: "Necktie",
    description: "Load Necktie instructions.",
  },
  () => {
    return {
      description: "Necktie instructions",
      messages: [{ role: "user", content: { type: "text", text: policy.buildInstructions() } }],
    };
  },
);

server.registerTool(
  "necktie_instructions",
  {
    title: "Necktie instructions",
    description: "Return Necktie instructions. MCP does not activate them automatically.",
    inputSchema: z.object({}).strict().default({}),
    outputSchema: { instructions: z.string() },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  () => {
    const structuredContent = { instructions: policy.buildInstructions() };
    return {
      content: [{ type: "text", text: structuredContent.instructions }],
      structuredContent,
    };
  },
);

await server.connect(new StdioServerTransport());
