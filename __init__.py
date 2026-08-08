"""Hermes plugin for Necktie Core and the explicit Necktie Loop."""

from __future__ import annotations

from pathlib import Path
from typing import Any, Callable


ROOT = Path(__file__).resolve().parent
SKILLS_DIR = ROOT / "skills"
CORE_FILE = ROOT / "core" / "necktie-core.md"
SKILL_COMMANDS = {
    "necktie": "Run the bounded Necktie Loop on the supplied goal.",
    "necktie-critique": "Challenge the inquiry and identify material blind spots.",
    "necktie-reverse": "Compile iterative context into one fresh-session brief.",
    "necktie-review": "Independently gate a candidate with APPROVE, REVISE, or BLOCK.",
}


def build_injected_context() -> str:
    """Return the canonical Necktie Core context."""
    return CORE_FILE.read_text(encoding="utf-8").strip()


def _pre_llm_call(session_id: str = "", **_: Any) -> dict[str, str]:
    return {"context": build_injected_context()}


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
    """Rewrite authorized Necktie slash commands into normal agent prompts."""
    text = str(getattr(event, "text", "") or "").strip()
    if not text.startswith("/"):
        return None
    head, _, rest = text[1:].partition(" ")
    command = head.replace("_", "-").lower()
    if command not in SKILL_COMMANDS or _slash_access_denied(event, gateway, command):
        return None
    return {"action": "rewrite", "text": _skill_prompt(command, rest)}


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
    """Register four skills, four commands, and stateless Core hooks."""
    for child in sorted(SKILLS_DIR.iterdir() if SKILLS_DIR.exists() else []):
        skill_md = child / "SKILL.md"
        if child.is_dir() and skill_md.exists():
            ctx.register_skill(child.name, skill_md)
    ctx.register_hook("pre_llm_call", _pre_llm_call)
    ctx.register_hook("pre_gateway_dispatch", rewrite_gateway_command)
    for command, description in SKILL_COMMANDS.items():
        ctx.register_command(
            command,
            _make_skill_command_handler(ctx, command),
            description=description,
            args_hint="[goal, target, or notes]",
        )
