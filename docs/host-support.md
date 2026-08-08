# Host support and adapter boundaries

Use this document to select and verify a Necktie adapter. Necktie supports every host covered by its Ponytail foundation, but each host supplies a different instruction mechanism.

If you are updating an existing 0.2.0 installation, read [Upgrading from 0.2.0 to 0.3.0](upgrading-to-0.3.0.md). Update or reinstall through the host's normal mechanism. Restart the host when it caches instructions or hooks. Start a new session before you verify Core.

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

## Handle attachments and local roots

Hosts expose current-request attachments in different forms. Some provide a local materialized path. Others provide an attachment identifier or a host tool. Necktie records the available form and uses the host-approved reader. It does not search for a guessed local copy.

The portable plugin manifest does not grant runtime access to user directories. Configure project-local inboxes in `.necktie/sources.json`, pass an explicit configuration path, or name a search root in the request. Do not add personal paths to a published plugin manifest or repository file.

Verify source discovery separately from hook activation:

1. Start a test in a directory that contains an unrelated file and no source configuration.
2. Confirm that discovery returns no candidate for the unrelated file.
3. Attach or explicitly name a test source and confirm that it appears.
4. Configure a metadata-only inbox and confirm that Necktie inventories it without reading file contents.
5. Approve one candidate and confirm that the run packet records the approval and source class.

## Apply the documentation profile

This document is governed primarily by ISO 24495-1-oriented plain-language practice because its intended readers must select, install, and verify the correct host adapter, misunderstanding could cause Core not to run or the explicit loop to be unavailable, and the document requires both reader-level organization and technical semantic control. It is supplemented by ASD-STE100-oriented controls for command syntax, event names, conditions, and verification steps.

This is a writing profile, not a claim of conformity.
