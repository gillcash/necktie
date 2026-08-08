#!/usr/bin/env node
import fs from "node:fs";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { buildInstructions } from "./instructions.js";

const { version } = JSON.parse(await fs.promises.readFile(new URL("../package.json", import.meta.url), "utf8"));
const server = new McpServer({ name: "necktie", version });

server.registerPrompt(
  "necktie",
  {
    title: "Necktie Core",
    description: "Load the ambient Necktie check-and-broaden instructions.",
    argsSchema: {},
  },
  () => ({ messages: [{ role: "user", content: { type: "text", text: buildInstructions() } }] }),
);

server.registerTool(
  "necktie_instructions",
  {
    title: "Necktie instructions",
    description: "Return Necktie Core. MCP alone cannot guarantee automatic injection on every host turn.",
    inputSchema: {},
    outputSchema: { instructions: z.string() },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  () => {
    const instructions = buildInstructions();
    return { content: [{ type: "text", text: instructions }], structuredContent: { instructions } };
  },
);

await server.connect(new StdioServerTransport());
