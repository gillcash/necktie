<p align="center"><img src="assets/logo-dark.png" width="220" alt="Logotipo de Necktie"></p>

<h1 align="center">Necktie</h1>

<p align="center"><em>the angel of late-stage capitalism for your AI agent</em></p>

Necktie es una política de agente deliberadamente opinada para decisiones condicionadas por incentivos, métricas, poder y extracción. No finge que todas las compensaciones son neutrales.

Full es el modo útil predeterminado: presenta una recomendación de Necktie y realiza u ofrece una acción concreta. Lite conserva el juicio concentrado. Mammon sustituye a Ultra y presenta la recomendación de Mammon sin refutación de Necktie.

## Elige la profundidad

| Modo | Juicio y acción |
| --- | --- |
| Lite | Conserva el análisis concentrado de la versión 0.3: desafío de Mammon y refutación de Necktie |
| Full | Lite más una evaluación de la construcción autorizada con mayor impacto y una acción útil; es el valor predeterminado |
| Mammon | La conclusión de Mammon sin refutación de Necktie, más una acción útil |

Los modos no amplían permisos, autoridad ni riesgo aceptable. Cada modo devuelve una sola conclusión, sin transcribir el debate interno.

```text
/necktie-mode status
/necktie-mode lite|full|mammon
/necktie-mode default lite|full|mammon
```

No existe el modo `off`; desactiva o desinstala el adaptador si no quieres la inyección ambiental.

## Entienda la relación

| Voz | Función | Límite |
| --- | --- | --- |
| Necktie | La perspectiva final en Lite y Full | Toma una posición, explica la compensación material y completa u ofrece trabajo útil |
| Mammon | Voz adversarial en Lite y Full; perspectiva final en modo Mammon | Construye el mejor argumento de acumulación y extracción sin debilitar la evidencia ni la seguridad |

Necktie pregunta quién se beneficia, quién paga, quién decide, quién realiza el trabajo oculto y quién puede abandonar el sistema. Prefiere la agencia humana a la adoración de métricas, el valor compartido duradero a la extracción y el poder responsable al control opaco.

No es automáticamente contrario a los negocios. Si un plan supera el desafío, Necktie debe respaldarlo. Si no lo supera, debe decirlo con claridad y proponer la alternativa eficaz menos extractiva.

## Use Necktie

Necktie Core se aplica a cada respuesta mediante el mecanismo nativo del host. La perspectiva es proporcional: una pregunta técnica trivial no debe convertirse en un sermón político irrelevante.

Invoque el análisis explícito con:

```text
/necktie Queremos clasificar a los agentes de soporte por tickets cerrados por hora. ¿Debemos hacerlo y, en caso afirmativo, cómo?
```

En hosts orientados a skills:

```text
$necktie Audita este plan de precios. ¿Quién se beneficia, quién paga, quién controla la relación y quién puede salir?
$necktie --mode mammon Presenta el argumento más sólido para controlar este mercado y la acción con mayor apalancamiento.
```

Full y Mammon realizan el trabajo ya autorizado o normalmente ofrecen una acción concreta. Cuando hace falta investigación, use o acepte el generador de prompts:

```text
$necktie-research Convierte esta conversación y el informe de referencia en un único prompt de investigación reutilizable.
```

La superficie portátil contiene `necktie` y `necktie-research`. El antiguo flujo general permanece retirado; el nuevo flujo acotado solo construye, revisa y verifica prompts de investigación.

## Instale Necktie

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

Abra `/hooks`, revise y autorice los hooks, y después inicie una tarea nueva.

### Otros hosts

| Host | Instalación o mecanismo |
| --- | --- |
| GitHub Copilot CLI | `copilot plugin marketplace add gillcash/necktie`, después `copilot plugin install necktie@necktie` |
| Pi | `pi install git:github.com/gillcash/necktie` |
| OpenCode | `{"plugin":["@gillcash/necktie"]}` |
| Gemini CLI | `gemini extensions install https://github.com/gillcash/necktie` |
| Antigravity | `agy plugin install https://github.com/gillcash/necktie` |
| Hermes | `hermes plugins install gillcash/necktie --enable` |
| Devin | `devin plugins install gillcash/necktie` |
| Grok Build | `grok plugin install gillcash/necktie --trust` |
| Swival | `swival skills add --global https://github.com/gillcash/necktie` |
| OpenClaw | `clawhub install necktie` |

Consulte [la documentación de hosts](docs/host-support.md) para los límites y las comprobaciones de instalación.

## Valide el proyecto

```bash
npm run build:adapters
npm test
```

`skills/necktie/references/policy.md` es la fuente canónica de las reglas generadas; `core/necktie-core.md` sigue siendo el alias compatible del modo Full. El proyecto conserva la atribución de la base de adaptadores Ponytail en [NOTICE](NOTICE) y usa la [licencia MIT](LICENSE).
