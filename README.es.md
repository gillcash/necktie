<p align="center"><img src="assets/logo-dark.png" width="220" alt="Logotipo de Necktie"></p>

<h1 align="center">Necktie</h1>

<p align="center"><em>the angel of late-stage capitalism for your AI agent</em></p>

Necktie añade una revisión breve a cada respuesta del agente y ofrece un flujo explícito y limitado para trabajo importante. Invoque `/necktie` para encuadrar, establecer una línea base, criticar, revertir, ejecutar, revisar y verificar un objetivo.

## Distinga las dos capas

| Capa | Activación | Resultado |
| --- | --- | --- |
| Necktie Core | En cada respuesta, mediante el mecanismo nativo del host | Comprueba el objetivo y el trabajo, corrige errores materiales e identifica omisiones y la pregunta experta no formulada más importante |
| Necktie Loop | Solo con `/necktie`, `$necktie`, `@necktie` o una petición explícita | Ejecuta siete fases con cuatro skills y una puerta de revisión finita |

Necktie no usa un modo de encendido o apagado, un servicio de fondo ni niveles persistentes. Desinstale o desactive el plugin para dejar de usar Core.

## Ejecute el ejemplo

```text
/necktie Evalúa la fiabilidad de los datos KPI de una tienda de alquiler de herramientas y equipos. Crea un plan de controles apto para decisiones a partir de evidencia admisible y verifica cada afirmación material.
```

```text
frame -> baseline -> critique -> reverse -> execute -> review -> verify
                                                   ^          |
                                                   |          v
                                                 revise <- REVISE
```

Las decisiones son `APPROVE`, `REVISE` y `BLOCK`. El ciclo se detiene después de tres decisiones de revisión, cuando el mismo problema sobrevive tres revisiones consecutivas o cuando falta evidencia, autoridad o una decisión material del usuario.

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

Abra `/hooks`, revise y autorice los hooks, y después inicie un hilo nuevo.

### Otros hosts

| Host | Instalación o mecanismo |
| --- | --- |
| GitHub Copilot CLI | `copilot plugin marketplace add gillcash/necktie`, luego `copilot plugin install necktie@necktie` |
| Pi | `pi install git:github.com/gillcash/necktie` |
| OpenCode | `{"plugin":["@gillcash/necktie"]}` |
| Gemini CLI | `gemini extensions install https://github.com/gillcash/necktie` |
| Antigravity | `agy plugin install https://github.com/gillcash/necktie` |
| Hermes | `hermes plugins install gillcash/necktie --enable` |
| Devin | `devin plugins install gillcash/necktie` |
| Grok Build | `grok plugin install gillcash/necktie --trust` |
| Swival | `swival skills add --global https://github.com/gillcash/necktie` |
| OpenClaw | Instale los cuatro skills desde `.openclaw/skills/` o ClawHub |

Cursor, Windsurf, Cline, Copilot Chat, Kiro, Qoder, Aider, Zed, CodeWhale, Junie, Amp y Jules usan el archivo de reglas correspondiente incluido en el repositorio. Consulte [la documentación de hosts](docs/host-support.md). Una regla estática proporciona Core, pero no crea comandos.

## Use los cuatro skills

- `necktie`: controla el ciclo completo.
- `necktie-critique`: cuestiona la consulta y las omisiones materiales.
- `necktie-reverse`: compila el recorrido en una instrucción ejecutable independiente.
- `necktie-review`: devuelve `APPROVE`, `REVISE` o `BLOCK`.

## Valide el proyecto

```bash
npm run build:adapters
npm test
```

`core/necktie-core.md` es la única fuente de las reglas generadas. El proyecto conserva la atribución de la base de adaptadores Ponytail en [NOTICE](NOTICE) y usa la [licencia MIT](LICENSE).

Esta documentación sigue principalmente una práctica orientada a ISO 24495-1 para las tareas del lector y se complementa con controles orientados a ASD-STE100 para términos, comandos, condiciones y estados. Esto no es una declaración de conformidad.
