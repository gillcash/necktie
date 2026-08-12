# Necktie MCP adapter

This optional private stdio server exposes prompt `necktie` and read-only tool `necktie_instructions`. Both accept an optional mode; omission resolves `NECKTIE_DEFAULT_MODE`, local configuration, then Full.

```text
npm install --prefix necktie-mcp
node necktie-mcp/index.js
```

The prompt returns the selected instructions as a user message. The tool returns text plus structured content:

```json
{
  "mode": "full",
  "instructions": "..."
}
```

MCP is request-scoped. A prompt is user-invoked and a read-only tool may be host/model-invoked; neither automatically injects Necktie every turn or stores a session mode. Prefer a native adapter when the host exposes lifecycle instructions.

The server exposes no operation for arbitrary repository or file access, code execution, external services, or state mutation. It is not a sandbox: runtime reads fixed bundled Necktie policy files and optional local default configuration. Installing the server brings the MCP SDK's transitive dependency footprint; `package-lock.json` pins it reproducibly.
