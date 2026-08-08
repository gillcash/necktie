<p align="center">
  <img src="assets/logo-dark.png" width="220" alt="Necktie logo">
</p>

<h1 align="center">Necktie</h1>

<p align="center"><em>the angel of late-stage capitalism for your AI agent</em></p>

Necktie adds a compact quality check to every agent response and provides an explicit, bounded workflow for consequential work. Invoke `/necktie` to frame, baseline, critique, reverse, execute, review, and verify a goal.

## Know the two layers

| Layer | When it runs | What it does |
| --- | --- | --- |
| Necktie Core | Every response, through the host's native hook or instruction mechanism | Checks goal fit and work quality, corrects material errors, surfaces material omissions, and asks the strongest unasked expert question when it matters |
| Necktie Loop | Only after `/necktie`, `$necktie`, `@necktie`, or an explicit request | Runs the seven-phase workflow with four cooperating skills and a finite review gate |

Necktie does not use an on/off mode, background service, or persistent operating level. Remove or disable the plugin when you do not want Necktie Core.

## Use the portable plugin

The root `plugin.json` targets the [Agent Plugins 1.0.0 specification](https://agent-plugins.org/). The portable layer contains the four skills in the standard `skills/` location. Host-specific lifecycle hooks, commands, and rule files extend that interoperability floor without changing the portable skill definitions.

`necktie-mcp/` is an optional retrieval fallback. It is not required by the plugin or loop, and MCP alone does not make Core active on every response.

## Upgrade from 0.2.0 to 0.3.0

Version 0.3.0 preserves the four skills and seven phases from 0.2.0. It adds four controls:

- permission-aware discovery limited to named inputs, current-request attachments, configured inboxes, and user-approved search roots;
- run-packet schema 3.0, with automatic migration from schema 2.0 when the controller next loads and saves the packet;
- deliverable contracts that preserve required files, sections, tables, columns, evidence rules, and verification requirements; and
- a deterministic gate that requires the latest machine-checkable contract verification to pass before `APPROVE` or completion.

Existing simple invocations need no configuration change. Reinstall or update the plugin through the host's normal mechanism, restart the host when required, and start a new session so the revised Core and skills load.

Read [Upgrading from 0.2.0 to 0.3.0](docs/upgrading-to-0.3.0.md) for migration and verification steps. See [CHANGELOG.md](CHANGELOG.md) for the version record.

## Run the loop

```text
/necktie Assess KPI data reliability for a tool and equipment rental store. Build a decision-ready control plan from eligible evidence and verify every material claim.
```

Name the governing inputs when the result must reproduce or improve an existing deliverable:

```text
/necktie Rebuild the KPI data-reliability package from @research-brief.md and eligible raw evidence. Use @reference-package.zip as the structural reference and verify every material claim independently.
```

On a skill-oriented host, use:

```text
$necktie Assess KPI data reliability for a tool and equipment rental store. Build a decision-ready control plan from eligible evidence and verify every material claim.
```

The loop returns the requested artifact, a reusable execution brief, a review decision, a verification record, known limitations, and the strongest unasked question when it could affect action.

## Authorize sources safely

Necktie discovers local sources only from:

1. paths and links that you name;
2. files attached to the current request;
3. configured inboxes; and
4. search roots that you approve.

It does not search your user profile, home directory, Downloads folder, Taildrop folder, drive root, sibling projects, or unrelated directories by default.

For repeat work, create the ignored local file `.necktie/sources.json`:

```json
{
  "version": "1.0",
  "inboxes": [
    {
      "label": "research-inbox",
      "path": "../research-inbox",
      "access": "metadata",
      "include": ["*.md", "*.csv", "*.zip"],
      "max_depth": 2,
      "max_files": 200,
      "archives": "inventory"
    }
  ],
  "search_roots": []
}
```

`metadata` permits names, sizes, timestamps, and safe ZIP inventory. It does not permit reading file contents. Promote a selected candidate before Necktie reads it. Use `content` only for a boundary whose relevant files may be read without another prompt.

See [source discovery and authority](docs/source-discovery.md) for the configuration fields, commands, archive controls, and privacy boundary.

## Follow the seven phases

```text
frame -> baseline -> critique -> reverse -> execute -> review -> verify
                                                   ^          |
                                                   |          v
                                                 revise <- REVISE
```

| Phase | Required result |
| --- | --- |
| Frame | Outcome, reader, authorized discovery boundary, accepted source classes, deliverable contract, and acceptance criteria |
| Baseline | Smallest plausible approach that can satisfy the full contract, plus its assumptions |
| Critique | Material omissions, framing defects, evidence needs, and strongest unasked question |
| Reverse | One self-contained execution brief for a fresh session |
| Execute | Candidate built from eligible raw evidence |
| Review | Independent `APPROVE`, `REVISE`, or `BLOCK` decision |
| Verify | Test, render, calculation, or inspection in the intended environment |

`REVISE` returns the candidate to the author. The loop stops after three revision decisions, after the same unresolved issue appears in three consecutive reviews, or when a material blocker requires new evidence, authority, or user direction.

## Install

Node.js must be available to hosts that run the lifecycle hook. Review third-party hooks before you trust them.

### Claude Code

Send these as separate commands:

```text
/plugin marketplace add gillcash/necktie
/plugin install necktie@necktie
```

### Codex

```bash
codex plugin marketplace add gillcash/necktie
codex plugin add necktie@necktie
```

Start Codex, open `/hooks`, review and trust the Necktie hooks, and start a new thread. The same installation applies to the Codex desktop app after restart.

### GitHub Copilot CLI

```bash
copilot plugin marketplace add gillcash/necktie
copilot plugin install necktie@necktie
```

Copilot namespaces commands. For example, use `/necktie:necktie` and `/necktie:necktie-review`.

### Pi

```bash
pi install git:github.com/gillcash/necktie
```

### OpenCode

Use the published package:

```json
{ "plugin": ["@gillcash/necktie"] }
```

Or use a checkout:

```json
{ "plugin": ["./.opencode/plugins/necktie.mjs"] }
```

The OpenCode adapter injects Core on each turn and registers all four commands and skills.

### Gemini CLI and Antigravity

```bash
gemini extensions install https://github.com/gillcash/necktie
```

```bash
agy plugin install https://github.com/gillcash/necktie
```

These hosts use `AGENTS.md` as the always-on context and load the bundled skills through the extension.

### Qoder

Run Qoder from a checkout or copy `.qoder/rules/necktie.md` into the target project's `.qoder/rules/`. For hook-based per-prompt and subagent injection, install `hooks/qoder-hooks.json` in the project's Qoder settings and replace the plugin-root placeholder with the absolute checkout path if required by that host version.

### Hermes Agent

```bash
hermes plugins install gillcash/necktie --enable
```

Restart Hermes. It injects Core before each model call and registers `necktie:<skill>` plus the four slash commands.

### Swival

```bash
swival skills add --global https://github.com/gillcash/necktie
swival skills add necktie
```

Use `$necktie` to invoke the loop. Copy `AGENTS.md` to the project or global Swival instructions location for Core.

### Devin CLI

```bash
devin plugins install gillcash/necktie
```

Use `/necktie:necktie`, `/necktie:necktie-critique`, `/necktie:necktie-reverse`, or `/necktie:necktie-review`.

### OpenClaw

```bash
clawhub install necktie
clawhub install necktie-critique
clawhub install necktie-reverse
clawhub install necktie-review
```

Without ClawHub, copy the required directories from `.openclaw/skills/` into `~/.openclaw/skills/`. Install the Core rule separately as `AGENTS.md` when the host does not keep a skill active on every response.

### Grok Build

```bash
grok plugin install gillcash/necktie --trust
```

Enable `necktie` in `/plugins`, then start a new session. Grok exposes the four skills. Its plugin lifecycle cannot inject Core reliably on every response, so use the repository `AGENTS.md` in the project for the always-on layer.

### Static-rule hosts

Necktie covers the remaining Ponytail-supported hosts through their persistent instruction file:

| Host | Install this file |
| --- | --- |
| Cursor | `.cursor/rules/necktie.mdc` |
| Windsurf | `.windsurf/rules/necktie.md` |
| Cline | `.clinerules/necktie.md` |
| GitHub Copilot Chat | `.github/copilot-instructions.md` |
| Kiro | `.kiro/steering/necktie.md` |
| Qoder | `.qoder/rules/necktie.md` |
| Aider, Zed, CodeWhale, Amp, Jules | `AGENTS.md` |
| Junie | `AGENTS.md`, selected as the project guidelines file |

These adapters provide Core on every response when the host honors the installed rule. A static rule does not create slash commands; invoke the loop in plain language or install the four skills through that host's skill mechanism.

See [docs/host-support.md](docs/host-support.md) for adapter boundaries and verification checks.

## Use the four skills

- `necktie` controls the complete loop.
- `necktie-critique` challenges the inquiry and exposes material blind spots.
- `necktie-reverse` compiles the successful trajectory into a fresh-session brief.
- `necktie-review` returns an independent `APPROVE`, `REVISE`, or `BLOCK` decision.

The Core can recommend a material next step, but it must not silently launch the full loop.

## Keep an auditable run packet

Most runs need no file. Create a packet only when the work must be resumable or auditable:

```bash
python skills/necktie/scripts/necktie_loop.py init --goal "Assess KPI data reliability for a tool and equipment rental store" --output .necktie/run.json
python skills/necktie/scripts/necktie_loop.py discover --file .necktie/run.json --input research-brief.md --attachment reference-package.zip
python skills/necktie/scripts/necktie_loop.py source --file .necktie/run.json --candidate C001 --decision ACCEPT --kind constraint --use "Defines the required research scope"
python skills/necktie/scripts/necktie_loop.py contract --file .necktie/run.json --input .necktie/contract.json
python skills/necktie/scripts/necktie_loop.py transition --file .necktie/run.json --to baseline --note "Sources classified"
python skills/necktie/scripts/necktie_loop.py transition --file .necktie/run.json --to critique --note "Baseline recorded"
python skills/necktie/scripts/necktie_loop.py transition --file .necktie/run.json --to reverse --note "Critique resolved"
python skills/necktie/scripts/necktie_loop.py transition --file .necktie/run.json --to execute --note "Brief compiled"
python skills/necktie/scripts/necktie_loop.py verify-contract --file .necktie/run.json --artifact-root output
python skills/necktie/scripts/necktie_loop.py transition --file .necktie/run.json --to review --note "Candidate frozen"
python skills/necktie/scripts/necktie_loop.py review --file .necktie/run.json --decision APPROVE --reason "All material criteria pass"
python skills/necktie/scripts/necktie_loop.py transition --file .necktie/run.json --to complete --note "Verification passed"
python skills/necktie/scripts/necktie_loop.py show --file .necktie/run.json
python skills/necktie-review/scripts/validate_review.py review.json
```

The Python scripts use only the standard library. They record source authority, states, decisions, and verification evidence, not private reasoning or source contents. `.necktie/` is ignored by Git because its files can contain local paths.

## Develop and validate

```bash
npm run build:adapters
npm test
python C:/Users/you/.codex/skills/.system/skill-creator/scripts/quick_validate.py skills/necktie
python C:/Users/you/.codex/skills/.system/plugin-creator/scripts/validate_plugin.py .
```

`core/necktie-core.md` is the single source for generated instruction adapters. Do not edit generated copies directly.

This README is governed primarily by ISO 24495-1-oriented plain-language practice because its intended readers must install, invoke, evaluate, and safely modify Necktie, misunderstanding could cause invalid setup, unintended workflow activation, weakened review independence, or unreliable deliverables, and the document requires both reader-level organization and technical semantic control. It is supplemented by ASD-STE100-oriented controls for consistent terms, commands, conditions, status values, and stopping rules.

This is a writing profile, not a claim of conformity. See [docs/process-provenance.md](docs/process-provenance.md) for the generalized design provenance and source boundaries.

## License

Necktie is available under the [MIT License](LICENSE). [NOTICE](NOTICE) preserves attribution for the inherited Ponytail adapter foundation.
