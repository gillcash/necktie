# Necktie MCP adapter

```bash
npm ci --prefix necktie-mcp
node necktie-mcp/index.js
```

Prompt `necktie` and read-only tool `necktie_instructions` take no arguments. The tool returns text and structured content containing `instructions`.

MCP retrieves the bundled policy on request; it does not inject instructions automatically. The server exposes no arbitrary file, execution, network, or mutation operation and reads no user configuration. It is not a sandbox.
