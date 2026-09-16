"""Host-independent mode precedence, configuration, and policy text."""

import json
import os
from contextlib import suppress
from pathlib import Path
from tempfile import mkstemp
from typing import Any

ROOT = Path(__file__).resolve().parent
MODES = ("lite", "full", "mammon")
DEFAULT_MODE = "full"


def normalize_mode(value: Any) -> str | None:
    normalized = value.strip().lower() if isinstance(value, str) else None
    return normalized if normalized in MODES else None


def config_path(env=None) -> Path:
    values = os.environ if env is None else env
    base = (values.get("APPDATA") or Path.home() / "AppData" / "Roaming") if os.name == "nt" else (
        values.get("XDG_CONFIG_HOME") or Path.home() / ".config"
    )
    return Path(base) / "necktie" / "config.json"


def _read_config(env=None):
    target = config_path(env)
    try:
        value = json.loads(target.read_text(encoding="utf-8-sig"))
        if isinstance(value, dict):
            return value, None, target
        return {}, f"Ignored non-object Necktie configuration at {target}.", target
    except FileNotFoundError:
        return {}, None, target
    except (OSError, ValueError):
        return {}, f"Ignored invalid Necktie configuration at {target}.", target


def resolve_default_mode(env=None) -> dict[str, Any]:
    values = os.environ if env is None else env
    config, warning, target = _read_config(values)
    warnings = [warning] if warning else []
    environment_mode = normalize_mode(values.get("NECKTIE_DEFAULT_MODE"))
    configured = normalize_mode(config.get("defaultMode"))
    if "NECKTIE_DEFAULT_MODE" in values and not environment_mode:
        warnings.insert(0, f"Ignored invalid NECKTIE_DEFAULT_MODE value: {values['NECKTIE_DEFAULT_MODE']}.")
    if "defaultMode" in config and not configured:
        warnings.append(f"Ignored invalid defaultMode in {target}.")
    configured_mode, configured_source = configured or DEFAULT_MODE, "config" if configured else "built-in"
    return {
        "mode": environment_mode or configured_mode,
        "source": "environment" if environment_mode else configured_source,
        "configured_mode": configured_mode,
        "configured_source": configured_source,
        "environment_override": environment_mode,
        "config_path": str(target),
        "warnings": warnings,
    }


def resolve_mode(requested_mode=None, session_mode=None, env=None) -> dict[str, Any]:
    default = resolve_default_mode(env)
    mode, source = default["mode"], default["source"]
    if requested_mode is not None:
        mode, source = normalize_mode(requested_mode), "requested"
        if not mode:
            raise ValueError(f"Invalid Necktie mode: {requested_mode}.")
    elif session_mode not in (None, ""):
        session = normalize_mode(session_mode)
        if session:
            mode, source = session, "session"
        else:
            default["warnings"].append(f"Ignored invalid stored Necktie session mode: {session_mode}.")
    return {
        "mode": mode,
        "source": source,
        "default_mode": default["mode"],
        "default_source": default["source"],
        "configured_default_mode": default["configured_mode"],
        "configured_default_source": default["configured_source"],
        "environment_override": default["environment_override"],
        "config_path": default["config_path"],
        "warnings": default["warnings"],
    }


def write_default_mode(mode, env=None) -> dict[str, Any]:
    normalized = normalize_mode(mode)
    if not normalized:
        raise ValueError(f"Invalid Necktie mode: {mode}.")
    config, _, target = _read_config(env)
    config["defaultMode"] = normalized
    target.parent.mkdir(parents=True, exist_ok=True)
    descriptor, name = mkstemp(dir=target.parent, suffix=".tmp")
    pending = Path(name)
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8") as temporary:
            json.dump(config, temporary, indent=2)
            temporary.write("\n")
        pending.replace(target)
    finally:
        with suppress(OSError):
            pending.unlink(missing_ok=True)
    return {"written_mode": normalized, **resolve_default_mode(env)}


def build_injected_context(mode=None) -> str:
    selected = resolve_mode(requested_mode=mode)["mode"]
    return (ROOT / "skills" / "necktie" / "references" / f"{selected}.md").read_text(encoding="utf-8-sig").strip()
