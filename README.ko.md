<p align="center"><img src="assets/logo-dark.png" width="220" alt="Necktie 로고"></p>

<h1 align="center">Necktie</h1>

<p align="center"><em>the angel of late-stage capitalism for your AI agent</em></p>

Necktie는 에이전트의 모든 응답에 간결한 품질 점검을 적용하고, 중요한 작업을 위한 명시적이고 제한된 워크플로를 제공합니다. `/necktie`를 호출하면 목표를 프레임하고, 기준안을 만들고, 비평하고, 역설계하고, 실행하고, 검토하고, 검증합니다.

## 두 계층을 구분하십시오

| 계층 | 실행 시점 | 결과 |
| --- | --- | --- |
| Necktie Core | 호스트의 기본 훅 또는 지침 메커니즘을 통해 모든 응답에서 실행 | 목표 적합성과 작업을 점검하고, 중요한 오류와 누락을 찾으며, 결과를 바꿀 수 있는 가장 중요한 미질문을 제시 |
| Necktie Loop | `/necktie`, `$necktie`, `@necktie` 또는 명시적 요청이 있을 때만 실행 | 네 개의 스킬과 유한한 검토 게이트로 일곱 단계를 실행 |

Necktie는 켜기/끄기 모드, 백그라운드 서비스 또는 지속적인 강도 수준을 사용하지 않습니다. Core를 사용하지 않으려면 플러그인을 제거하거나 비활성화하십시오.

## 예제를 실행하십시오

```text
/necktie 공구 및 장비 대여점의 KPI 데이터 신뢰성을 평가하십시오. 적격 증거를 사용해 의사결정용 통제 계획을 만들고 모든 중요한 주장을 검증하십시오.
```

```text
frame -> baseline -> critique -> reverse -> execute -> review -> verify
                                                   ^          |
                                                   |          v
                                                 revise <- REVISE
```

검토 결정은 `APPROVE`, `REVISE`, `BLOCK`입니다. 세 번의 수정 결정이 기록되거나, 같은 문제가 세 번 연속 남거나, 새로운 증거·권한·중요한 사용자 결정이 필요하면 루프가 중지됩니다.

## Necktie를 설치하십시오

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

`/hooks`를 열어 훅을 검토하고 신뢰한 다음 새 스레드를 시작하십시오.

### 다른 호스트

| 호스트 | 설치 또는 메커니즘 |
| --- | --- |
| GitHub Copilot CLI | `copilot plugin marketplace add gillcash/necktie` 후 `copilot plugin install necktie@necktie` |
| Pi | `pi install git:github.com/gillcash/necktie` |
| OpenCode | `{"plugin":["@gillcash/necktie"]}` |
| Gemini CLI | `gemini extensions install https://github.com/gillcash/necktie` |
| Antigravity | `agy plugin install https://github.com/gillcash/necktie` |
| Hermes | `hermes plugins install gillcash/necktie --enable` |
| Devin | `devin plugins install gillcash/necktie` |
| Grok Build | `grok plugin install gillcash/necktie --trust` |
| Swival | `swival skills add --global https://github.com/gillcash/necktie` |
| OpenClaw | `.openclaw/skills/` 또는 ClawHub에서 네 스킬 설치 |

Cursor, Windsurf, Cline, Copilot Chat, Kiro, Qoder, Aider, Zed, CodeWhale, Junie, Amp, Jules는 저장소에 포함된 해당 규칙 파일을 사용합니다. [호스트 문서](docs/host-support.md)를 참조하십시오. 정적 규칙은 Core를 제공하지만 슬래시 명령을 만들지는 않습니다.

## 네 스킬을 사용하십시오

- `necktie`: 전체 루프를 제어합니다.
- `necktie-critique`: 질문과 중요한 누락을 비평합니다.
- `necktie-reverse`: 반복 과정을 독립 실행 가능한 지침으로 컴파일합니다.
- `necktie-review`: `APPROVE`, `REVISE`, `BLOCK` 중 하나를 반환합니다.

## 프로젝트를 검증하십시오

```bash
npm run build:adapters
npm test
```

`core/necktie-core.md`는 생성 규칙의 단일 원본입니다. 프로젝트는 [NOTICE](NOTICE)에 Ponytail 어댑터 기반의 귀속을 보존하며 [MIT 라이선스](LICENSE)를 사용합니다.

이 문서는 독자 작업을 위해 ISO 24495-1 지향 방식을 주로 사용하고, 용어·명령·조건·상태를 위해 ASD-STE100 지향 통제를 보완적으로 사용합니다. 이는 적합성 선언이 아닙니다.
