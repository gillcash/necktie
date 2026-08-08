# Host support and adapter boundaries

Use this document to select and verify a Necktie adapter. Each host supplies a different instruction mechanism, but every adapter must preserve the same Necktie voice and internal Mammon boundary.

## Select the mechanism

| Mechanism | Hosts | Behavior |
| --- | --- | --- |
| Lifecycle hook | Claude Code, Codex, GitHub Copilot CLI, Qoder | Injects Necktie Core and exposes the `necktie` skill or command |
| Model-call hook | Hermes Agent | Injects Core before each model call and registers one skill and command |
| Chat transform | OpenCode | Appends Core on each turn and registers one skill and command |
| Agent-start transform | Pi | Appends Core before each agent run and delegates `/necktie` to the skill |
| Persistent context | Gemini, Antigravity, CodeWhale, and static-rule hosts | Loads Core from `AGENTS.md` or a host-specific rule |
| Skill package | Devin, Swival, OpenClaw, Grok Build | Exposes the explicit `necktie` skill; persistent Core depends on host support |
| MCP fallback | Any MCP client | Returns Core only when requested; cannot guarantee per-turn injection |

## Verify an installation

1. Start a new host session after installation.
2. Inspect and trust hooks when the host requires approval.
3. Ask a trivial factual or coding question. Confirm that Necktie does not force irrelevant political commentary into the answer.
4. Ask for a material decision involving a metric, incentive, power imbalance, hidden labor, lock-in, or externalized cost.
5. Confirm that the response takes a position and explains the decisive incentive or tradeoff.
6. Confirm that it does not expose Mammon as a speaker, command, dialogue partner, or chain-of-thought transcript.
7. Invoke `/necktie` or the host's skill syntax and confirm that the explicit judgment completes the requested work rather than stopping at commentary.

## Respect host limits

A plugin cannot create a lifecycle event that the host does not expose. Static rules provide the always-on policy only while the host reads the rule. MCP provides retrieval, not automatic activation. Document the installed mechanism accurately in managed environments.

Necktie must remain one user-facing voice on every host. An adapter must not register a Mammon command or expose Mammon as an alternate system prompt.
