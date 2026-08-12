"""Hermes plugin for Necktie's judgment modes."""

from __future__ import annotations

import json
import os
from pathlib import Path
import sys
from typing import Any, Callable


ROOT = Path(__file__).resolve().parent
SKILLS_DIR = ROOT / "skills"
MODES = ("lite", "full", "mammon")
DEFAULT_MODE = "full"
SKILL_COMMANDS = {
    "necktie": "Apply Necktie's judgment to the supplied decision, plan, or artifact.",
}
MODE_USAGE = "Usage: /necktie-mode [status|lite|full|default <lite|full>]"

_current_mode: str | None = None


def normalize_mode(value: Any) -> str | None:
    if not isinstance(value, str):
        return None
    normalized = value.strip().lower()
    return normalized if normalized in MODES else None


def config_path(env: dict[str, str] | None = None) -> Path:
    values = os.environ if env is None else env
    if os.name == "nt":
        base = values.get("APPDATA") or str(Path.home() / "AppData" / "Roaming")
        return Path(base) / "necktie" / "config.json"
    if values.get("XDG_CONFIG_HOME"):
        return Path(values["XDG_CONFIG_HOME"]) / "necktie" / "config.json"
    return Path.home() / ".config" / "necktie" / "config.json"


def _read_config(env: dict[str, str] | None = None) -> tuple[dict[str, Any], str | None, Path]:
    target = config_path(env)
    try:
        value = json.loads(target.read_text(encoding="utf-8-sig"))
        if not isinstance(value, dict):
            return {}, f"Ignored non-object Necktie configuration at {target}.", target
        return value, None, target
    except FileNotFoundError:
        return {}, None, target
    except Exception:
        return {}, f"Ignored invalid Necktie configuration at {target}.", target


def resolve_default_mode(env: dict[str, str] | None = None) -> dict[str, Any]:
    values = os.environ if env is None else env
    warnings: list[str] = []
    environment_mode: str | None = None
    if "NECKTIE_DEFAULT_MODE" in values:
        environment_mode = normalize_mode(values.get("NECKTIE_DEFAULT_MODE"))
        if not environment_mode:
            warnings.append(f"Ignored invalid NECKTIE_DEFAULT_MODE value: {values.get('NECKTIE_DEFAULT_MODE')}.")

    config, warning, target = _read_config(values)
    if warning:
        warnings.append(warning)
    configured_mode = DEFAULT_MODE
    configured_source = "built-in"
    if "defaultMode" in config:
        configured = normalize_mode(config.get("defaultMode"))
        if configured:
            configured_mode = configured
            configured_source = "config"
        else:
            warnings.append(f"Ignored invalid defaultMode in {target}.")

    return {
        "mode": environment_mode or configured_mode,
        "source": "environment" if environment_mode else configured_source,
        "configured_mode": configured_mode,
        "configured_source": configured_source,
        "environment_override": environment_mode,
        "config_path": str(target),
        "warnings": warnings,
    }


def resolve_mode(
    requested_mode: Any = None,
    session_mode: Any = None,
    env: dict[str, str] | None = None,
) -> dict[str, Any]:
    default = resolve_default_mode(env)
    warnings = list(default["warnings"])
    if requested_mode is not None:
        requested = normalize_mode(requested_mode)
        if not requested:
            raise ValueError(f"Invalid Necktie mode: {requested_mode}.")
        mode, source = requested, "requested"
    elif session_mode not in (None, ""):
        session = normalize_mode(session_mode)
        if session:
            mode, source = session, "session"
        else:
            warnings.append(f"Ignored invalid stored Necktie session mode: {session_mode}.")
            mode, source = default["mode"], default["source"]
    else:
        mode, source = default["mode"], default["source"]
    return {
        "mode": mode,
        "source": source,
        "default_mode": default["mode"],
        "default_source": default["source"],
        "configured_default_mode": default["configured_mode"],
        "configured_default_source": default["configured_source"],
        "environment_override": default["environment_override"],
        "config_path": default["config_path"],
        "warnings": warnings,
    }


def write_default_mode(mode: Any, env: dict[str, str] | None = None) -> dict[str, Any]:
    normalized = normalize_mode(mode)
    if not normalized:
        raise ValueError(f"Invalid Necktie mode: {mode}.")
    values = os.environ if env is None else env
    config, _, target = _read_config(values)
    config["defaultMode"] = normalized
    target.parent.mkdir(parents=True, exist_ok=True)
    temporary = target.with_name(f".{target.name}.{os.getpid()}.tmp")
    try:
        temporary.write_text(json.dumps(config, indent=2) + "\n", encoding="utf-8")
        try:
            os.chmod(temporary, 0o600)
        except OSError:
            pass
        temporary.replace(target)
    finally:
        try:
            temporary.unlink(missing_ok=True)
        except Exception:
            pass
    result = resolve_default_mode(values)
    return {"written_mode": normalized, **result}


def build_injected_context(mode: Any = None) -> str:
    """Return the shared Necktie core plus the selected mode delta."""
    selected = resolve_mode(requested_mode=mode)["mode"] if mode is not None else resolve_mode()["mode"]
    core = (ROOT / "core" / "necktie-core.md").read_text(encoding="utf-8-sig").strip()
    delta = (ROOT / "core" / f"necktie-{selected}.md").read_text(encoding="utf-8-sig").strip()
    return f"{core.replace('<MODE>', selected)}\n\n{delta}"


def _pre_llm_call(session_id: str = "", **_: Any) -> dict[str, str]:
    resolution = resolve_mode(session_mode=_current_mode)
    for warning in resolution["warnings"]:
        print(warning, file=sys.stderr)
    return {"context": build_injected_context(resolution["mode"])}


def _skill_prompt(command: str, args: str = "") -> str:
    target = f"\n\nUser arguments: {args.strip()}" if args.strip() else ""
    return f"Load and follow the Hermes plugin skill `necktie:{command}`. {SKILL_COMMANDS[command]}{target}"


def _slash_access_denied(event: Any, gateway: Any, command: str) -> bool:
    if gateway is None or event is None:
        return False
    checker = getattr(gateway, "_check_slash_access", None)
    source = getattr(event, "source", None)
    if checker is None or source is None:
        return False
    try:
        return checker(source, command) is not None
    except Exception:
        return True


def rewrite_gateway_command(event: Any = None, gateway: Any = None, **_: Any) -> dict[str, str] | None:
    """Rewrite an authorized Necktie decision command into a normal agent prompt."""
    text = str(getattr(event, "text", "") or "").strip()
    if not text.startswith("/"):
        return None
    head, _, rest = text[1:].partition(" ")
    command = head.replace("_", "-").lower()
    if command not in SKILL_COMMANDS or _slash_access_denied(event, gateway, command):
        return None
    return {"action": "rewrite", "text": _skill_prompt(command, rest)}


def _parse_mode_arguments(raw_args: str) -> dict[str, str]:
    raw = (raw_args or "").strip().lower()
    if not raw or raw == "status":
        return {"type": "status"}
    parts = raw.split()
    if parts[0] == "default":
        mode = normalize_mode(parts[1]) if len(parts) == 2 else None
        return {"type": "set-default", "mode": mode} if mode else {"type": "invalid"}
    mode = normalize_mode(parts[0]) if len(parts) == 1 else None
    return {"type": "set-session", "mode": mode} if mode else {"type": "invalid"}


def _handle_mode_command(raw_args: str) -> str:
    global _current_mode
    parsed = _parse_mode_arguments(raw_args)
    current = resolve_mode(session_mode=_current_mode)
    if parsed["type"] == "set-session":
        _current_mode = parsed["mode"]
        return f"Necktie mode set to {_current_mode} for this session."
    if parsed["type"] == "set-default":
        try:
            written = write_default_mode(parsed["mode"])
        except Exception as error:
            return f"Failed to save Necktie default: {error}. Current session remains {current['mode']}."
        if written["environment_override"]:
            return (
                f"Saved default {written['written_mode']}, but NECKTIE_DEFAULT_MODE keeps the effective "
                f"default at {written['mode']}. Current session remains {current['mode']}."
            )
        return (
            f"Default Necktie mode set to {written['written_mode']} for new sessions. "
            f"Current session remains {current['mode']}."
        )
    if parsed["type"] == "status":
        override = f" Environment override: {current['environment_override']}." if current["environment_override"] else ""
        warning = f" Warning: {' '.join(current['warnings'])}" if current["warnings"] else ""
        return (
            f"Necktie mode: current {current['mode']}; configured default "
            f"{current['configured_default_mode']}.{override}{warning}"
        )
    return MODE_USAGE


def _make_skill_command_handler(ctx: Any, command: str) -> Callable[[str], str]:
    def handler(raw_args: str) -> str:
        prompt = _skill_prompt(command, raw_args or "")
        try:
            if ctx.inject_message(prompt):
                return f"Queued `{command}` for the agent."
        except Exception:
            pass
        return prompt

    return handler


def register(ctx: Any) -> None:
    """Register the Necktie skill, decision command, mode command, and hooks."""
    for child in sorted(SKILLS_DIR.iterdir() if SKILLS_DIR.exists() else []):
        skill_md = child / "SKILL.md"
        if child.is_dir() and skill_md.exists():
            ctx.register_skill(child.name, skill_md)
    ctx.register_hook("pre_llm_call", _pre_llm_call)
    ctx.register_hook("pre_gateway_dispatch", rewrite_gateway_command)
    ctx.register_command(
        "necktie",
        _make_skill_command_handler(ctx, "necktie"),
        description=SKILL_COMMANDS["necktie"],
        args_hint="[decision, plan, artifact, or question]",
    )
    ctx.register_command(
        "necktie-mode",
        _handle_mode_command,
        description="Inspect or change Necktie mode (lite or full).",
        args_hint="[status|lite|full|default <mode>]",
    )
