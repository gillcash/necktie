# Necktie

## Install

| Host | Install |
| --- | --- |
| Claude Code | `/plugin marketplace add gillcash/necktie`, then `/plugin install necktie@necktie` |
| Codex | `codex plugin marketplace add gillcash/necktie`, then `codex plugin add necktie@necktie` |
| GitHub Copilot CLI | `copilot plugin marketplace add gillcash/necktie`, then `copilot plugin install necktie@necktie` |
| Pi | `pi install git:github.com/gillcash/necktie` |
| Gemini CLI | `gemini extensions install https://github.com/gillcash/necktie` |
| Antigravity | `agy plugin install https://github.com/gillcash/necktie` |
| Hermes | `hermes plugins install gillcash/necktie --enable` |

For OpenCode 2:

```json
{ "plugins": ["@gillcash/necktie"] }
```

Hosts using lifecycle hooks require Node.js. Review and trust hooks when prompted, then restart the host.

## Use

```text
/necktie <decision or task>
$necktie-research <topic>
```

[Other hosts and adapter details](docs/host-support.md) · [Development](docs/host-support.md#develop)

[Support](https://github.com/gillcash/necktie/issues) · [Privacy](PRIVACY.md) · [Terms](TERMS.md) · [MIT license](LICENSE)
