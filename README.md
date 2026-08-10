<p align="center">
  <img src="assets/logo-dark.png" width="220" alt="Necktie logo">
</p>

<h1 align="center">Necktie</h1>

<p align="center"><em>He follows the money. He finds the hidden cost. He takes a side.</em></p>

Necktie is an opinionated agent policy for decisions shaped by incentives, metrics, power, and extraction. It does not pretend every tradeoff is neutral.

Full is the useful default: it gives one Necktie judgment and completes or offers a concrete next action. Lite gives a focused Necktie judgment. Mammon returns Mammon's recommendation without a Necktie rebuttal. Full and Mammon can route accepted research-prompt work through a bounded prompt-reversal loop.

## Choose the depth

| Mode | Judgment and action | Best fit |
| --- | --- | --- |
| Lite | Strongest accumulation and extraction case, followed by Necktie's rebuttal | Focused decisions with a bounded judgment |
| Full | Lite plus an ambition pass and one context-specific useful action | Default product, engineering, and strategy work |

On hosts with dynamic command support:

```text
/necktie-mode
/necktie-mode lite
```

A plain mode changes only the current session. `default <mode>` changes new sessions without changing the current one. The effective default is read from `NECKTIE_DEFAULT_MODE`, then `%APPDATA%\necktie\config.json` on Windows or `$XDG_CONFIG_HOME/necktie/config.json`/`~/.config/necktie/config.json` elsewhere, and finally falls back to Full. Status reports the saved or built-in default separately from any environment override. There is no `off` mode; disable or uninstall the adapter to stop ambient injection.

Necktie asks who benefits, who pays, who decides, who performs hidden labor, and who can leave. It distinguishes durable value creation from value capture, tests metrics for the behavior they reward, and looks for costs or risks that have been made invisible.

Its commitments are opinionated:

- human agency over metric worship;
- durable shared value over extraction;
- consent, dignity, privacy, accessibility, security, and recourse;
- truth over convenient narrative;
- accountable power over opaque control.

## Use Necktie

Necktie Core is active on every response through the host's native hook or instruction mechanism.

Invoke the explicit skill when you want a direct judgment:

```text
/necktie We are considering ranking support agents by tickets closed per hour. Should we do it, and if so, how?
```

On skill-oriented hosts:

```text
$necktie Audit this pricing plan. Who benefits, who pays, who controls the relationship, and who can leave?
$necktie Make the strongest case for controlling this market and identify the move with the highest expected leverage.
```

`--mode lite|full` is a one-shot skill override. It does not change session or configured defaults.

Full does the work already authorized. When a response would otherwise stop at an opinion, full offers one specific build or action. If deeper evidence is the next constraint, full will usually offer a portable research prompt. Invoke the prompt builder directly or accept the offer:

```text
$necktie-research Reverse-engineer this discussion and the reference report into one copy-ready research prompt.
```

Necktie Research scans the user-authorized context, fingerprints any reference deliverable, critiques and reframes the inquiry, builds an exact prompt schema, reviews and revises the draft through a finite gate, and verifies that it works without hidden conversation state.

Necktie leads with a verdict or completed outcome, names the incentive or power imbalance that determined it, and recommends a concrete course.

## Understand the plugin

The root `plugin.json` targets the [Agent Plugins 1.0.0 specification](https://agent-plugins.org/). The portable surface contains the `necktie` judgment skill and the `necktie-research` prompt-building skill.

`skills/necktie/references/policy.md` is the canonical policy source. The build generates Lite, Full references plus matching `core/` artifacts. Static rules inject Full. Dynamic hooks select the session mode.

`necktie-mcp/` is an optional private stdio adapter. Its `necktie` prompt and read-only `necktie_instructions` tool accept Lite, Full, per request. MCP does not activate Necktie on every turn and exposes no arbitrary repository, file, execution, network, or mutation operation. The process is not a sandbox: it reads Necktie's bundled policy and optional local default configuration.

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

Copilot namespaces the commands as `/necktie:necktie` and `/necktie:necktie-mode`.

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

Restart Hermes. It injects the selected policy before each model call and registers the `necktie` and `necktie-mode` commands.
Use `/necktie-mode` to inspect or change the process-session mode.

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
npm ci --prefix necktie-mcp
npm run build:adapters
npm test
python C:/Users/you/.codex/skills/.system/skill-creator/scripts/quick_validate.py skills/necktie
python C:/Users/you/.codex/skills/.system/skill-creator/scripts/quick_validate.py skills/necktie-research
python C:/Users/you/.codex/skills/.system/plugin-creator/scripts/validate_plugin.py .
```

`skills/necktie/references/policy.md` is the source for generated instruction artifacts and static adapters. Do not edit generated copies directly.

## License

Necktie is available under the [MIT License](LICENSE). Third-party attribution is recorded in [NOTICE](NOTICE).
