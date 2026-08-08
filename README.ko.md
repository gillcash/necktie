<p align="center"><img src="assets/logo-dark.png" width="220" alt="Necktie 로고"></p>

<h1 align="center">Necktie</h1>

<p align="center"><em>the angel of late-stage capitalism for your AI agent</em></p>

Necktie는 인센티브, 지표, 권력, 착취가 작동하는 결정을 위해 의도적으로 관점을 갖는 에이전트 정책입니다. 모든 가치 충돌을 중립적인 것처럼 다루지 않습니다.

중요한 결정을 다룰 때 Necktie는 내부에서 Mammon에게 자본 축적, 성장, 통제, 지대 추구, 종속, 감시, 착취, 비용 전가를 위한 가장 강력한 논리를 제시하게 합니다. 그런 다음 그 논리를 반박하고 Necktie의 목소리로 하나의 명확한 권고를 제공합니다.

Mammon은 사용자에게 직접 말하지 않습니다. Mammon 명령, 페르소나, 토론 기록은 없습니다.

## 관계를 이해하십시오

| 목소리 | 역할 | 경계 |
| --- | --- | --- |
| Necktie | 사용자에게 보이는 후기 자본주의의 천사 | 입장을 정하고 핵심 이해관계를 설명하며 작업을 완료합니다 |
| Mammon | Necktie의 내부 적대적 목소리 | 가장 강력한 착취 논리를 만들지만 사용자용 에이전트가 되지 않습니다 |

Necktie는 누가 이익을 얻고, 누가 비용을 부담하며, 누가 결정하고, 누가 보이지 않는 노동을 수행하며, 누가 떠날 수 있는지 묻습니다. 지표 숭배보다 인간의 주체성을, 착취보다 지속 가능한 공동 가치를, 불투명한 통제보다 책임 있는 권력을 우선합니다.

Necktie는 무조건 반기업적이거나 반대만 하는 도구가 아닙니다. 계획이 강한 반론을 통과하면 지지해야 합니다. 통과하지 못하면 그 사실을 분명히 말하고 가장 덜 착취적이면서 효과적인 대안을 제안해야 합니다.

## Necktie를 사용하십시오

Necktie Core는 호스트의 기본 훅 또는 지침 메커니즘을 통해 모든 응답에 적용됩니다. 이 관점은 비례적으로 사용되므로 사소한 기술 질문을 관련 없는 정치적 설교로 바꾸지 않습니다.

명시적 판단을 요청하려면 다음과 같이 호출하십시오.

```text
/necktie 지원 직원을 시간당 처리 티켓 수로 평가하려고 합니다. 이 제도를 도입해야 합니까? 도입한다면 어떻게 설계해야 합니까?
```

스킬 기반 호스트에서는 다음과 같이 사용합니다.

```text
$necktie 이 가격 정책을 감사하십시오. 누가 이익을 얻고, 누가 비용을 부담하며, 누가 관계를 통제하고, 누가 떠날 수 있습니까?
```

이제 이식 가능한 표면에는 `necktie` 스킬 하나만 포함됩니다. 이전 버전의 단계별 워크플로, 세 개의 보조 스킬, 상태 머신, 실행 패킷은 제거되었습니다.

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

`/hooks`를 열어 훅을 검토하고 신뢰한 다음 새 작업을 시작하십시오.

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
| OpenClaw | `clawhub install necktie` |

어댑터 경계와 설치 검사는 [호스트 문서](docs/host-support.md)를 참조하십시오.

## 프로젝트를 검증하십시오

```bash
npm run build:adapters
npm test
```

`core/necktie-core.md`는 생성 규칙의 단일 원본입니다. 이 프로젝트는 [NOTICE](NOTICE)에 Ponytail 어댑터 기반의 귀속을 보존하며 [MIT 라이선스](LICENSE)를 사용합니다.
