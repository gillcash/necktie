<p align="center">
  <img src="assets/logo-dark.png" width="220" alt="Necktie logo">
</p>

<h1 align="center">Necktie</h1>

<p align="center"><em>the angel of late-stage capitalism for your AI agent</em></p>

Necktie is an opinionated agent policy for decisions shaped by incentives, metrics, power, and extraction. It does not pretend every tradeoff is neutral.

For material decisions, Necktie privately consults Mammon: the strongest plausible case for accumulation, growth, control, rent extraction, lock-in, surveillance, exploitation, and shifting costs onto people with less power. Necktie then rebuts that case and gives the user one candid recommendation.

Mammon never speaks to the user. There is no Mammon command, persona, or debate transcript.

## Know the arrangement

| Voice | Role | Boundary |
| --- | --- | --- |
| Necktie | The user-facing angel of late-stage capitalism | Takes a position, explains the material tradeoff, and completes the work |
| Mammon | Necktie's internal adversarial voice | Builds the strongest extractive case; never becomes a user-facing agent |

Necktie asks who benefits, who pays, who decides, who performs hidden labor, and who can leave. It distinguishes durable value creation from value capture, tests metrics for the behavior they reward, and looks for costs or risks that have been made invisible.

Its commitments are opinionated:

- human agency over metric worship;
- durable shared value over extraction;
- consent, dignity, privacy, accessibility, security, and recourse;
- truth over convenient narrative;
- accountable power over opaque control.

Necktie is not reflexively anti-business or contrarian. Mammon must make the legitimate efficiency case as strongly as the extractive one. If a plan survives that challenge, Necktie should endorse it. If it does not, Necktie should say so plainly and offer the least extractive effective alternative.

## Use Necktie

Necktie Core is active on every response through the host's native hook or instruction mechanism. It applies the lens proportionately; a trivial coding question should not become an unsolicited political sermon.

Invoke the explicit skill when you want the full judgment:

```text
/necktie We are considering ranking support agents by tickets closed per hour. Should we do it, and if so, how?
```

On skill-oriented hosts:

```text
$necktie Audit this pricing plan. Who benefits, who pays, who controls the relationship, and who can leave?
```

Necktie leads with a verdict or completed outcome, names the incentive or power imbalance that determined it, and recommends a concrete course. It does not expose private chain-of-thought or print ritual sections when they add no value.

## Understand the plugin

The root `plugin.json` targets the [Agent Plugins 1.0.0 specification](https://agent-plugins.org/). The portable surface contains one skill: `necktie`.

`core/necktie-core.md` is the canonical always-on policy. Host-specific hooks and rule files inject that policy. `necktie-mcp/` is an optional retrieval fallback; MCP alone cannot guarantee per-response activation.

The loop-based workflow, helper skills, state machine, review schema, and run packets from the earlier release have been removed. The retired commands are:

- `necktie-critique`
- `necktie-reverse`
- `necktie-review`

Use `necktie` for the complete judgment. Existing `.necktie/run.json` files are historical artifacts and are not read by this version.

## Install

Node.js must be available to hosts that run the lifecycle hook. Review third-party hooks before trusting them.

### Claude Code

```text
/plugin marketplace add gillcash/necktie
/plugin install necktie@necktie
```

### Codex

```bash
codex plugin marketplace add gillcash/necktie
codex plugin add necktie@necktie
```

Open `/hooks`, review and trust the Necktie hooks, then start a new task. Restart the Codex desktop app after installation.

### GitHub Copilot CLI

```bash
copilot plugin marketplace add gillcash/necktie
copilot plugin install necktie@necktie
```

Copilot namespaces the command as `/necktie:necktie`.

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

### Gemini CLI and Antigravity

```bash
gemini extensions install https://github.com/gillcash/necktie
agy plugin install https://github.com/gillcash/necktie
```

### Hermes Agent

```bash
hermes plugins install gillcash/necktie --enable
```

Restart Hermes. It injects Core before each model call and registers the `necktie` skill and command.

### Other supported hosts

| Host | Installation or adapter |
| --- | --- |
| Devin CLI | `devin plugins install gillcash/necktie` |
| Grok Build | `grok plugin install gillcash/necktie --trust` |
| Swival | `swival skills add --global https://github.com/gillcash/necktie` |
| OpenClaw | `clawhub install necktie` or copy `.openclaw/skills/necktie/` |
| Qoder | `.qoder/rules/necktie.md` and optional `hooks/qoder-hooks.json` |
| Cursor | `.cursor/rules/necktie.mdc` |
| Windsurf | `.windsurf/rules/necktie.md` |
| Cline | `.clinerules/necktie.md` |
| GitHub Copilot Chat | `.github/copilot-instructions.md` |
| Kiro | `.kiro/steering/necktie.md` |
| Aider, Zed, CodeWhale, Amp, Jules | `AGENTS.md` |
| Junie | `AGENTS.md` as the project guidelines file |

See [host support](docs/host-support.md) for adapter boundaries and installation checks.

## Develop and validate

```bash
npm run build:adapters
npm test
python C:/Users/you/.codex/skills/.system/skill-creator/scripts/quick_validate.py skills/necktie
python C:/Users/you/.codex/skills/.system/plugin-creator/scripts/validate_plugin.py .
```

`core/necktie-core.md` is the source for generated instruction adapters. Do not edit generated copies directly.

See [design provenance](docs/process-provenance.md) for the product boundary and inherited adapter foundation.

## License

Necktie is available under the [MIT License](LICENSE). [NOTICE](NOTICE) preserves attribution for the inherited Ponytail adapter foundation.
