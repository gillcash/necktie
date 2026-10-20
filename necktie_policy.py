"""Load the host-independent Necktie policy."""

from pathlib import Path

ROOT = Path(__file__).resolve().parent


def build_injected_context() -> str:
    return (ROOT / "skills" / "necktie" / "references" / "policy.md").read_text(encoding="utf-8-sig").strip()
