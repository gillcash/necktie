# Host support

## Install and activate

| Adapter | Hosts | Activation |
| --- | --- | --- |
| Lifecycle hooks | Claude Code, Codex, Copilot CLI, Qoder | Claude Code and Codex add the full policy at session start (including resume, clear, and compaction) and subagent start, plus a one-sentence reminder with each prompt. Copilot CLI adds it at session start. Qoder adds it with each prompt and at subagent start. |
| Model-call hook | Hermes | Bundled policy is added before each model call. |
| Chat/session hooks | OpenCode 2 and OpenCode 1.18.29+ | Bundled policy is appended to context; v2 also preserves it during compaction. |
| Agent-start hook | Pi | Bundled policy is appended before each run. |
| Static instructions | Gemini, Antigravity, Cursor, Windsurf, Cline, Kiro, Copilot Chat and AGENTS.md hosts | Host reads its generated rule or AGENTS.md. |
| Skills | Devin, Swival, OpenClaw, Grok Build | Invoke the installed Necktie skill. |
| MCP | Any MCP client | Retrieve instructions per request; no automatic activation. |

Installation commands for primary hosts are in the [README](../README.md). Additional installations:

| Host | Install or adapter |
| --- | --- |
| Devin CLI | `devin plugins install gillcash/necktie` |
| Grok Build | `grok plugin install gillcash/necktie --trust` |
| Swival | `swival skills add --global https://github.com/gillcash/necktie` |
| OpenClaw | `clawhub install necktie` or copy `.openclaw/skills/necktie/` |
| Qoder | `.qoder/rules/necktie.md`; for settings-level hooks, copy the `hooks` object from `hooks/qoder-hooks.json` and replace `${QODER_PLUGIN_ROOT}` with the absolute path to this checkout |
| Cursor | `.cursor/rules/necktie.mdc` |
| Windsurf | `.windsurf/rules/necktie.md` |
| Cline | `.clinerules/necktie.md` |
| Kiro | `.kiro/steering/necktie.md` |
| Copilot Chat | `.github/copilot-instructions.md` |
| Aider, Zed, CodeWhale, Amp, Jules, Junie | `AGENTS.md` |

OpenCode 2 uses `plugins` and a local directory such as `./.opencode/plugins`. OpenCode 1.18.29+ uses `plugin` and can load `@gillcash/necktie` or `./.opencode/plugins/necktie.mjs`. This checkout exposes both APIs through one adapter.

If Hermes' installer rejects the root plugin manifest, use its native loader:

```bash
git clone https://github.com/gillcash/necktie.git ~/.hermes/plugins/necktie
hermes plugins enable necktie
```

Claude and Codex explicitly load `hooks/claude-hooks.json` and `hooks/codex-hooks.json`, and each hook passes its host name to `hooks/necktie-context.js`. VS Code runs the Claude manifest's hooks; the script recognizes VS Code agent-plugin roots with either path separator. There is no `hooks/hooks.json`, because Gemini auto-discovers that path with a different event contract. Gemini reads `AGENTS.md` instead. The root `plugin.json` omits the Agent Plugins schema to preserve native hook loading.

## Verify

Review and trust hooks when required, restart the host, and invoke `/necktie <task>`. Copilot CLI uses `/necktie:necktie`. Check that the host loads `skills/necktie/references/policy.md` and preserves existing prompt content. Invoke `$necktie-research <topic>` to check the research handoff.

Every adapter uses the same policy. Previous selectors and configuration no longer control it; existing configuration and session files are left untouched. Disable or uninstall the adapter to stop ambient instruction injection.

## Source map

| Responsibility | Source |
| --- | --- |
| Policy | `skills/necktie/references/policy.md` |
| Generation | `scripts/build-adapters.js` copies the policy into static rules and standalone OpenClaw skills |
| JavaScript loading | `lib/necktie-policy.cjs` |
| Lifecycle hooks | `hooks/necktie-context.js` |
| OpenCode | `.opencode/plugins/necktie.mjs` and `index.js` |
| Pi | `pi-extension/index.js` |
| Hermes | `__init__.py` and `necktie_policy.py` |
| Research loop | `skills/necktie-research/scripts/research_prompt_loop.py` and `research_state.py` |

## Develop

```bash
npm ci --prefix necktie-mcp
npm run build:adapters
npm test
```

Edit policy and skill sources, then regenerate. Check mode reports missing, changed, and obsolete generated outputs without writing files. The generator validates and builds every output in memory before writing.
