<p align="center"><img src="assets/logo-dark.png" width="220" alt="Logotipo de Necktie"></p>

<h1 align="center">Necktie</h1>

<p align="center"><em>the angel of late-stage capitalism for your AI agent</em></p>

Necktie es una política de agente deliberadamente opinada para decisiones condicionadas por incentivos, métricas, poder y extracción. No finge que todas las compensaciones son neutrales.

Ante una decisión material, Necktie consulta en privado a Mammon: el argumento más sólido a favor de la acumulación, el crecimiento, el control, la captura de rentas, la dependencia, la vigilancia, la explotación y el traslado de costes a quienes tienen menos poder. Después refuta ese argumento y presenta una única recomendación con la voz de Necktie.

Mammon nunca habla con el usuario. No existe un comando, una personalidad ni un diálogo de Mammon.

## Entienda la relación

| Voz | Función | Límite |
| --- | --- | --- |
| Necktie | El ángel visible del capitalismo tardío | Toma una posición, explica la compensación material y completa el trabajo |
| Mammon | La voz adversarial interna de Necktie | Construye el mejor argumento extractivo; nunca se presenta como agente |

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
```

La superficie portátil contiene un único skill: `necktie`. Se eliminaron el flujo por etapas, los tres skills auxiliares, la máquina de estados y los paquetes de ejecución de la versión anterior.

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

`core/necktie-core.md` es la fuente canónica de las reglas generadas. El proyecto conserva la atribución de la base de adaptadores Ponytail en [NOTICE](NOTICE) y usa la [licencia MIT](LICENSE).
