# Host support and adapter boundaries

Use this document to select and verify a Necktie adapter. Necktie supports every host covered by its Ponytail foundation, but each host supplies a different instruction mechanism.

## Select the mechanism

| Mechanism | Hosts | Core behavior | Loop behavior |
| --- | --- | --- | --- |
| Lifecycle hook | Claude Code, Codex, GitHub Copilot CLI, Qoder | Injects Core at the supported lifecycle event | Loads four bundled skills and commands |
| Model-call hook | Hermes Agent | Injects Core before each model call | Registers four skills and commands |
| Chat transform | OpenCode | Appends Core on each turn | Registers four skills and commands |
| Agent-start transform | Pi | Appends Core before each agent run | Delegates four commands to skills |
| Persistent context | Gemini, Antigravity, CodeWhale, static-rule hosts | Loads Core from `AGENTS.md` or a host-specific rule | Requires bundled skills or an explicit plain-language request |
| Skill package | Devin, Swival, OpenClaw, Grok Build | Depends on the host's persistent instruction support | Exposes the four explicit skills |
| MCP fallback | Any MCP client | Returns Core only when requested | Does not guarantee per-turn injection |

## Verify an installation

1. Start a new host session after installation.
2. Inspect or trust hooks when the host requires approval.
3. Ask for a small deliverable with one material omission.
4. Confirm that the response corrects its work or surfaces the omission without printing an empty footer.
5. Invoke `/necktie` or the host's skill syntax.
6. Confirm that the run follows frame, baseline, critique, reverse, execute, review, and verify.
7. Confirm that a `REVISE` result returns to review and that `BLOCK` stops the run.

## Respect host limits

A plugin cannot create a lifecycle event that the host does not expose. Static rules provide the always-on layer only while the host reads that rule. MCP provides retrieval, not automatic activation. Document the installed mechanism accurately when you distribute Necktie in a managed environment.

## Apply the documentation profile

This document is governed primarily by ISO 24495-1-oriented plain-language practice because its intended readers must select, install, and verify the correct host adapter, misunderstanding could cause Core not to run or the explicit loop to be unavailable, and the document requires both reader-level organization and technical semantic control. It is supplemented by ASD-STE100-oriented controls for command syntax, event names, conditions, and verification steps.

This is a writing profile, not a claim of conformity.
