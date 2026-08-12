<p align="center"><img src="assets/logo-dark.png" width="220" alt="Necktie 로고"></p>

<h1 align="center">Necktie</h1>

<p align="center"><em>the angel of late-stage capitalism for your AI agent</em></p>

Necktie는 인센티브, 지표, 권력, 착취가 작동하는 결정을 위해 의도적으로 관점을 갖는 에이전트 정책입니다. 모든 가치 충돌을 중립적인 것처럼 다루지 않습니다.

Full은 유용한 기본 모드입니다. Necktie의 판단을 제공하고 구체적인 다음 작업을 수행하거나 제안합니다. Lite는 집중된 판단을 제공합니다.

## 분석 깊이를 선택하십시오

| 모드 | 판단과 행동 |
| --- | --- |
| Lite | 인센티브와 권력에 대한 집중 분석과 Necktie의 권고를 제공합니다 |
| Full | Lite에 가장 영향력 있는 승인된 구축 검토와 유용한 행동이 추가되며 기본값입니다 |

모드는 권한, 허용 범위, 보안 또는 동의 경계를 확대하지 않습니다. 각 모드는 내부 토론 기록 없이 하나의 결론만 반환합니다.

```text
/necktie-mode status
/necktie-mode lite|full
/necktie-mode default lite|full
```

`off` 모드는 없습니다. 상시 주입을 원하지 않으면 해당 어댑터를 비활성화하거나 제거하십시오.

## 관계를 이해하십시오

| 목소리 | 역할 | 경계 |
| --- | --- | --- |
| Necktie | Lite와 Full의 최종 관점 | 입장을 정하고 핵심 이해관계를 설명하며 유용한 작업을 수행하거나 제안합니다 |

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
$necktie --mode full 이 시장을 통제하기 위한 가장 강력한 논리와 가장 높은 레버리지의 행동을 제시하십시오.
```

Full은 이미 승인된 작업을 수행하거나 하나의 구체적인 행동을 제안합니다. 더 깊은 조사가 필요하면 다음 연구 프롬프트 빌더를 직접 호출하거나 제안을 승인하십시오.

```text
$necktie-research 이 대화와 참조 보고서를 하나의 재사용 가능한 연구 프롬프트로 변환하십시오.
```

이식 가능한 표면에는 `necktie`와 `necktie-research`가 포함됩니다. Necktie Research는 연구 프롬프트를 작성·검토·검증합니다.

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

`skills/necktie/references/policy.md`는 생성 규칙의 단일 원본입니다. 이 프로젝트는 [NOTICE](NOTICE)에 제3자 저작자 표시를 기록하며 [MIT 라이선스](LICENSE)를 사용합니다.
