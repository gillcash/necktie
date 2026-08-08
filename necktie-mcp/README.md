# Necktie MCP fallback

This optional stdio server exposes Necktie Core as the `necktie` prompt and the read-only `necktie_instructions` tool.

Use a host-native Necktie adapter when one is available. MCP has no portable lifecycle event that can guarantee Core injection before every response.

```text
npm install --prefix necktie-mcp
node necktie-mcp/index.js
```
