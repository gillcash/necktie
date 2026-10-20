"""Hermes commands and hooks for the shared Necktie policy."""

from functools import partial
from typing import Any

from .necktie_policy import ROOT, build_injected_context

SKILLS_DIR = ROOT / "skills"
SKILL_DESCRIPTION = "Apply Necktie's judgment to the supplied decision, plan, or artifact."


def _pre_llm_call(session_id: str = "", **_: Any) -> dict[str, str]:
    return {"context": build_injected_context()}


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
