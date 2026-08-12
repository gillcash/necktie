# Host support and adapter boundaries

Use this document to select and verify a Necktie adapter. Every adapter preserves one public conclusion and the selected Necktie policy; hosts differ in activation and state facilities.

## Select the mechanism

| Mechanism | Hosts | Mode behavior |
| --- | --- | --- |
| Lifecycle hook | Claude Code, Codex, GitHub Copilot CLI, Qoder | Injects the selected policy. Session and default commands work when the host supplies prompt hooks and stable session identity. |
| Model-call hook | Hermes Agent | Injects before each model call; `/necktie-mode` uses process-session state. |
| Chat transform | OpenCode | Appends the selected policy each turn; mode changes apply to the next transform. |
| Agent-start transform | Pi | Stores session mode in native session entries and appends the selected policy before each run. |
| Persistent context | Gemini, Antigravity, CodeWhale, and static-rule hosts | Loads Full from `AGENTS.md` or a host-specific rule. No persistent session selector is available. |
| Skill package | Devin, Swival, OpenClaw, Grok Build | Uses Full unless ambient host context selects a mode; `$necktie --mode <mode>` is a one-shot override. |
| MCP adapter | Any MCP client | Selects a policy per prompt/tool request; it has no session mode and cannot guarantee per-turn injection. |

Copilot clients that ignore additional context from `userPromptSubmitted` may not apply a switch until their next supported instruction injection. The command still records the session selection. Do not claim immediate switching on a host that does not expose the necessary injection point.

## Mode interface

Dynamic command adapters expose:

```text
/necktie-mode status
/necktie-mode lite|full
/necktie-mode default lite|full
```

The first form reports current and configured defaults. A plain mode changes only the current session. `default` writes future-session configuration and leaves the current session unchanged. `NECKTIE_DEFAULT_MODE` overrides the saved default and is reported by status. Invalid values change nothing.

There is no off state. Disable or uninstall the relevant adapter when ambient Necktie instructions are unwanted.

The explicit decision skill also accepts `$necktie --mode lite|full <decision>` as a one-shot override. This never changes session or configured state.

`$necktie-research <goal>` invokes the portable research-prompt loop directly. Full may also offer it; accepting that offer should trigger the same skill without another permission question.

## Verify an installation

1. Start a new host session after installation and confirm Full is active by default.
2. Inspect and trust hooks when the host requires approval.
3. Run `/necktie-mode full`, then check status and confirm the session reports Full.
4. Run `/necktie-mode default lite`; confirm the current session remains Full and a new session starts in Lite.
5. Ask a trivial factual or coding question and confirm no irrelevant political commentary or extra architecture appears.
6. Ask for a material decision involving a metric, incentive, power imbalance, hidden labor, lock-in, ambition, or externalized cost.
7. Confirm Full takes one position, explains the decisive tradeoff, offers or completes useful work, and does not expose a debate transcript or private reasoning.
8. Invoke `$necktie --mode full <decision>` and confirm the override applies once without changing status.
9. Invoke `$necktie-research <topic>` and confirm it returns one copy-ready prompt after the bounded protocol.

## Respect host limits

A plugin cannot create a lifecycle event or state primitive that the host does not expose. Static rules provide Full only while the host reads the rule. MCP provides retrieval, not automatic activation. Session files used by lifecycle adapters contain only the selected mode, are keyed by a hash of host/session identity, and expire opportunistically using file age.

Necktie must return one user-facing conclusion on every host. Modes never broaden permissions, authority, or acceptable risk.
