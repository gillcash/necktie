# Upgrade from Necktie 0.2.0 to 0.3.0

Use this guide to update an existing Necktie installation and adopt the new controls without widening filesystem authority or losing a saved run.

## Understand what remains stable

Version 0.3.0 keeps these 0.2.0 interfaces:

- the always-on Necktie Core;
- the explicit `/necktie`, `$necktie`, and `@necktie` invocation forms;
- the four `necktie`, `necktie-critique`, `necktie-reverse`, and `necktie-review` skills;
- the Frame, Baseline, Critique, Reverse, Execute, Review, and Verify phases; and
- the `APPROVE`, `REVISE`, and `BLOCK` review decisions with a three-revision limit.

Version 0.3.0 does not require a service, persistent operating mode, lifecycle hook, or MCP server. A host can continue to use its existing supported adapter.

## Understand what changed

| Area | Version 0.2.0 | Version 0.3.0 |
| --- | --- | --- |
| Local inputs | Named inputs and host authority governed agent access | Discovery records exact named inputs, current-request attachments, configured inboxes, and user-approved roots |
| Run packet | Schema 2.0 | Schema 3.0 with discovery, source decisions, and a deliverable contract |
| Reference artifacts | Classified as constraints or prior outputs | Also compiled into observable file, document, table, evidence, and verification requirements |
| Structural checks | General review and target-environment verification | Deterministic file, Markdown, and CSV contract verification |
| Approval gate | Independent reviewer decision | Latest structural contract check must pass before `APPROVE` or completion |

## Update the installation

1. Update or reinstall Necktie through the host's normal plugin, skill, extension, or checkout mechanism.
2. Restart the host if it caches hooks, extensions, instructions, or skills.
3. Start a new session.
4. Confirm that Necktie Core applies to a normal response.
5. Invoke `/necktie` or the host's equivalent syntax and confirm the seven-phase order.

Do not add personal filesystem paths to a tracked manifest or repository file. Put repeat local boundaries in the ignored `.necktie/sources.json` file.

## Decide whether to configure source discovery

No configuration is required for explicitly named files, links, or current-request attachments.

Create `.necktie/sources.json` only when the project needs a repeat inbox or approved search root. A configured root defaults to `metadata`, which permits a bounded inventory but not file-content access. Use `content` only when the user has approved content access for that exact boundary.

Read [Source discovery and authority](source-discovery.md) before you configure a root.

## Continue a saved 0.2.0 run

Do not edit the packet schema by hand.

The 0.3.0 controller accepts a schema-2 packet and converts it to schema 3.0 in memory. A controller command that changes and saves the packet writes the migrated form. The `show` command displays the migrated packet but does not rewrite the source file.

Before you continue a material saved run:

1. Keep a recoverable copy of the schema-2 packet.
2. Run `show` to confirm that the controller can read it.
3. Continue with the next valid state transition or source command.
4. Inspect the saved packet and confirm that `schema_version` is `3.0`.
5. Record the discovery boundary and deliverable contract before execution when the resumed task depends on local sources or a reference artifact.

Source discovery and source decisions are valid only in Frame. If a saved 0.2.0 run is already beyond Frame and needs a new local authorization boundary, start a new 0.3.0 run. Do not rewrite the saved state to bypass the transition rules.

## Adopt the deliverable contract

Use a deliverable contract when the request requires named files, sections, tables, columns, minimum coverage, evidence rules, or target-environment checks.

Classify a reference package as `constraint` or `prior-output`. Do not use it to corroborate its own factual claims. Build factual content from independently eligible evidence.

When the contract contains machine-checkable file, Markdown, or CSV requirements, run:

```text
python skills/necktie/scripts/necktie_loop.py verify-contract --file .necktie/run.json --artifact-root output
```

The controller rejects `APPROVE` and completion until the latest structural verification returns `PASS`.

## Verify the upgrade

For a repository checkout, run:

```text
npm run build:adapters
npm test
```

Then verify these behaviors in the target host:

1. A discovery run with no named input or configuration returns no ambient local candidates.
2. A named file appears as an exact candidate.
3. A metadata-only inbox requires content approval before a candidate is accepted.
4. A blocked ZIP cannot be accepted.
5. A missing required artifact causes contract verification to return `FAIL`.
6. The controller refuses `APPROVE` until the latest machine-checkable contract verification returns `PASS`.

## Apply the documentation profile

This document is governed primarily by ISO 24495-1-oriented plain-language practice because its intended readers must update Necktie, preserve saved runs, and enable new controls, misunderstanding could expose unrelated local information, lose audit state, or permit incomplete deliverables, and the document requires both reader-level organization and technical semantic control. It is supplemented by ASD-STE100-oriented controls for commands, schema values, access states, conditions, and verification gates.

This is a writing profile, not a claim of conformity.
