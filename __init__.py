"""Hermes commands and hooks; shared mode policy lives in necktie_policy."""

from functools import partial
import sys
from typing import Any

from .necktie_policy import (
    ROOT, MODES, DEFAULT_MODE, normalize_mode, config_path, resolve_default_mode,
    resolve_mode, write_default_mode, build_injected_context,
)

SKILLS_DIR = ROOT / "skills"
SKILL_DESCRIPTION = "Apply Necktie's judgment to the supplied decision, plan, or artifact."
MODE_USAGE = "Usage: /necktie-mode [status|lite|full|default <lite|full>]"
_current_mode: str | None = None


def _pre_llm_call(session_id: str = "", **_: Any) -> dict[str, str]:
    global _current_mode
    resolution = resolve_mode(session_mode=_current_mode)
    _current_mode = resolution["mode"]
    for warning in resolution["warnings"]:
        print(warning, file=sys.stderr)
    return {"context": build_injected_context(resolution["mode"])}


def _skill_prompt(args: str = "") -> str:
    target = f"\n\nUser arguments: {args.strip()}" if args.strip() else ""
    return f"Load and follow the Hermes plugin skill `necktie:necktie`. {SKILL_DESCRIPTION}{target}"


def _slash_access_denied(event: Any, gateway: Any, command: str) -> bool:
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
    if command != "necktie" or _slash_access_denied(event, gateway, command):
        return None
    return {"action": "rewrite", "text": _skill_prompt(rest)}


def _handle_mode_command(raw_args: str) -> str:
    global _current_mode
    parts = (raw_args or "").lower().split()
    current = resolve_mode(session_mode=_current_mode)
    _current_mode = current["mode"]
    if not parts or parts == ["status"]:
        override = f" Environment override: {current['environment_override']}." if current["environment_override"] else ""
        warning = f" Warning: {' '.join(current['warnings'])}" if current["warnings"] else ""
        return f"Necktie mode: current {_current_mode}; configured default {current['configured_default_mode']}.{override}{warning}"
    mode = normalize_mode(parts[-1])
    if not mode:
        return MODE_USAGE
    if len(parts) == 1:
        _current_mode = mode
        return f"Necktie mode set to {mode} for this session."
    if len(parts) != 2 or parts[0] != "default":
        return MODE_USAGE
    try:
        written = write_default_mode(mode)
        message = (f"Saved default {mode}, but NECKTIE_DEFAULT_MODE keeps the effective default at {written['mode']}."
                   if written["environment_override"] else f"Default Necktie mode set to {mode} for new sessions.")
    except Exception as error:
        message = f"Failed to save Necktie default: {error}."
    return f"{message} Current session remains {_current_mode}."


def _skill_command(ctx: Any, raw_args: str) -> str:
    prompt = _skill_prompt(raw_args or "")
    try:
        if ctx.inject_message(prompt):
            return "Queued `necktie` for the agent."
    except Exception:
        pass
    return prompt


def register(ctx: Any) -> None:
    """Register the Necktie skills, commands, and hooks."""
    for skill_md in sorted(SKILLS_DIR.glob("*/SKILL.md")):
        ctx.register_skill(skill_md.parent.name, skill_md)
    ctx.register_hook("pre_llm_call", _pre_llm_call)
    ctx.register_hook("pre_gateway_dispatch", rewrite_gateway_command)
    ctx.register_command(
        "necktie", partial(_skill_command, ctx), description=SKILL_DESCRIPTION,
        args_hint="[decision, plan, artifact, or question]",
    )
    ctx.register_command(
        "necktie-mode", _handle_mode_command, description="Inspect or change Necktie mode (lite or full).",
        args_hint="[status|lite|full|default <mode>]",
    )
