<p align="center">
  <img src="assets/logo-dark.png" width="220" alt="Necktie logo">
</p>

<h1 align="center">Necktie</h1>

<p align="center"><em>He follows the money. He finds the hidden cost. He takes a side.</em></p>

Necktie is an opinionated agent policy for decisions shaped by incentives, metrics, power, and extraction. It does not pretend every tradeoff is neutral.

Full is the useful default: it gives one Necktie judgment and completes or offers a concrete next action. Lite gives a focused Necktie judgment. Full can route accepted research-prompt work through a bounded prompt-reversal loop.

## Choose the depth

| Mode | Judgment and action | Best fit |
| --- | --- | --- |
| Lite | Strongest accumulation and extraction case, followed by Necktie's rebuttal | Focused decisions with a bounded judgment |
| Full | Lite plus an ambition pass and one context-specific useful action | Default product, engineering, and strategy work |

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

The portable surface contains the `necktie` judgment skill and the `necktie-research` prompt-building skill. Host-specific manifests register lifecycle hooks. The root `plugin.json` intentionally omits the Agent Plugins `$schema`: some hosts otherwise select a skills-only loader and skip those hooks.

`skills/necktie/references/policy.md` is the canonical policy source. The build generates self-contained mode references shared by skills and runtime adapters. Static rules inject Full; dynamic hooks load the selected reference.

`necktie-mcp/` is an optional private stdio adapter. Its `necktie` prompt and read-only `necktie_instructions` tool accept a mode per request. MCP does not activate Necktie on every turn and exposes no arbitrary repository, file, execution, network, or mutation operation. The process is not a sandbox: it reads Necktie's bundled policy and optional local default configuration.

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

For OpenCode 2, use the published package:

```json
{ "plugins": ["@gillcash/necktie"] }
```

Or point at a checkout's plugin directory:

```json
{ "plugins": ["./.opencode/plugins"] }
```

OpenCode 2 requires a directory for local plugins. Opening this checkout needs no explicit entry: OpenCode discovers `.opencode/plugins/index.js` automatically.

OpenCode 1.18.29 and later also support the adapter through the legacy key: `{ "plugin": ["@gillcash/necktie"] }`, or `{ "plugin": ["./.opencode/plugins/necktie.mjs"] }` for a checkout. Earlier OpenCode 1 versions are not supported by the dual-API entry point.

### Gemini CLI and Antigravity

```bash
gemini extensions install https://github.com/gillcash/necktie
agy plugin install https://github.com/gillcash/necktie
```

Gemini loads Full through `AGENTS.md`. The Claude/Codex hook map lives at `hooks/claude-codex-hooks.json`, outside Gemini's auto-discovered `hooks/hooks.json` path; it does not register Gemini lifecycle hooks or persistent mode switching.

### Hermes Agent

```bash
hermes plugins install gillcash/necktie --enable
```

If the installer reports `plugin.json declares an unsupported or missing Agent Plugins schema`, use Hermes' native `plugin.yaml` loader while the [installer fix](https://github.com/NousResearch/hermes-agent/pull/125937) is pending:

```bash
git clone https://github.com/gillcash/necktie.git ~/.hermes/plugins/necktie
hermes plugins enable necktie
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

## Support and policies

- [Support](https://github.com/gillcash/necktie/issues)
- [Privacy policy](PRIVACY.md)
- [Terms of use](TERMS.md)

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

The [source map](docs/host-support.md#source-map) connects each entry point to its shared policy, command, and storage code. `npm test` also builds and checks the dependency-free website.

## License

Necktie is available under the [MIT License](LICENSE). Third-party attribution is recorded in [NOTICE](NOTICE).
