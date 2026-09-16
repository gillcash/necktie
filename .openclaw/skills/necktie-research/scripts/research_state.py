"""Research packet persistence and bounded review/verification transitions."""

from contextlib import suppress
from datetime import datetime, timezone
import json
import os
from pathlib import Path
from tempfile import mkstemp
import uuid

SCHEMA_VERSION = "1.0"
REVISION_LIMITS = {"standard": 3, "deep": 5}
ORIGIN_MODES = {"full", "mammon"}
PHASES = "intake discover fingerprint critique blueprint draft review".split()
ALLOWED_TRANSITIONS = {current: {target} for current, target in zip(PHASES, PHASES[1:])}
ALLOWED_TRANSITIONS["revise"] = {"review"}
STATES = set(PHASES) | {"revise", "verify", "complete", "blocked"}
OUTCOMES = {
    "review": {"APPROVE": "verify", "REVISE": "revise", "BLOCK": "blocked"},
    "verification": {"PASS": "complete", "FAIL": "revise"},
}


class LoopError(ValueError):
    """Invalid run packet or state transition."""


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def event(kind: str, **details) -> dict:
    return {"at": utc_now(), "kind": kind, **details}


def new_packet(goal: str, depth: str, origin_mode: str) -> dict:
    now = utc_now()
    return validate_packet({
        "schema_version": SCHEMA_VERSION, "run_id": str(uuid.uuid4()),
        "created_at": now, "updated_at": now, "goal": goal.strip() if isinstance(goal, str) else goal,
        "depth": depth, "origin_mode": origin_mode, "state": "intake",
        **dict.fromkeys(("audience", "strongest_unasked_question", "prompt_path"), ""),
        **{key: [] for key in (
            "target_deliverables", "acceptance_criteria", "constraints", "non_goals",
            "sources", "assumptions", "review_history", "verification_history",
        )},
        "reference_fingerprint": {}, "circuit_breaker": None,
        "history": [event("initialized", state="intake")],
    })


def validate_packet(packet: object) -> dict:
    if not isinstance(packet, dict):
        raise LoopError("run packet must be a JSON object")
    choices = {"schema_version": {SCHEMA_VERSION}, "depth": REVISION_LIMITS,
               "origin_mode": ORIGIN_MODES, "state": STATES}
    for key in (*choices, "run_id", "goal"):
        value = packet.get(key)
        if not isinstance(value, str) or not value.strip():
            raise LoopError(f"{key} must be a nonempty string")
        if key in choices and value not in choices[key]:
            raise LoopError(f"unsupported {key}: {value}")
    for kind in ("review", "verification", ""):
        key = f"{kind}_history" if kind else "history"
        records = packet.get(key)
        if not isinstance(records, list) or any(not isinstance(record, dict) for record in records):
            raise LoopError(f"{key} must be an array of objects")
        if kind:
            field = "decision" if kind == "review" else "result"
            for record in records:
                value = record.get(field)
                if not isinstance(value, str) or value not in OUTCOMES[kind]:
                    raise LoopError(f"invalid {field} in {key}")
                signature = record.get("issue_signature")
                if not isinstance(signature, str) or (value in {"REVISE", "FAIL"} and not signature.strip()):
                    raise LoopError(f"invalid issue_signature in {key}")
    return packet


def load_packet(path: Path) -> dict:
    try:
        return validate_packet(json.loads(path.read_text(encoding="utf-8-sig")))
    except (OSError, ValueError) as exc:
        raise LoopError(f"cannot load run packet {path}: {exc}") from exc


def save_packet(path: Path, packet: dict) -> None:
    validate_packet(packet)
    packet["updated_at"] = utc_now()
    path.parent.mkdir(parents=True, exist_ok=True)
    descriptor, name = mkstemp(dir=path.parent, prefix=f".{path.name}.", suffix=".tmp")
    pending = Path(name)
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8") as temporary:
            json.dump(packet, temporary, indent=2, ensure_ascii=False)
            temporary.write("\n")
        pending.replace(path)
    finally:
        with suppress(OSError):
            pending.unlink(missing_ok=True)


def transition(packet: dict, target: str, note: str) -> None:
    current = packet["state"]
    allowed = ALLOWED_TRANSITIONS.get(current, set())
    if target not in allowed:
        raise LoopError(f"cannot transition from {current} to {target}; allowed: {', '.join(sorted(allowed)) or 'none'}")
    packet["state"] = target
    packet["history"].append(event("transition", previous=current, state=target, note=note.strip()))


def revision_count(packet: dict) -> int:
    return (sum(review["decision"] == "REVISE" for review in packet["review_history"])
            + sum(check["result"] == "FAIL" for check in packet["verification_history"]))


def _record(packet: dict, kind: str, value: str, reason: str, signature: str) -> None:
    phase, field = ("review", "decision") if kind == "review" else ("verify", "result")
    if packet["state"] != phase:
        raise LoopError(f"{kind} requires state={phase}, found {packet['state']}")
    value, reason, signature = value.upper(), reason.strip(), signature.strip()
    if value not in OUTCOMES[kind]:
        raise LoopError(f"unsupported {kind} {field}: {value}")
    if not reason:
        raise LoopError(f"{kind} reason must not be empty")
    if value in {"REVISE", "FAIL"} and not signature:
        raise LoopError(f"{value} requires --issue-signature")
    records = packet[f"{kind}_history"]
    records.append(event(kind, attempt=len(records) + 1, **{field: value}, reason=reason, issue_signature=signature))
    breaker = None
    revisions, limit = revision_count(packet), REVISION_LIMITS[packet["depth"]]
    if value == "BLOCK":
        breaker = "reviewer-blocked"
    elif value == "REVISE":
        if len(records) >= 3 and all(r["decision"] == "REVISE" and r["issue_signature"] == signature for r in records[-3:]):
            breaker = "same-issue-three-times"
        elif revisions > limit:
            breaker = "revision-limit-exceeded"
    elif value == "FAIL" and revisions > limit:
        breaker = "verification-failed-after-revision-limit"
    packet["state"] = "blocked" if breaker else OUTCOMES[kind][value]
    if breaker:
        packet["circuit_breaker"] = breaker
    packet["history"].append(event(f"{kind}-{field}", **{field: value}, state=packet["state"], reason=reason))


def record_review(packet: dict, decision: str, reason: str, issue_signature: str) -> None:
    _record(packet, "review", decision, reason, issue_signature)


def record_verification(packet: dict, result: str, reason: str, issue_signature: str) -> None:
    _record(packet, "verification", result, reason, issue_signature)
