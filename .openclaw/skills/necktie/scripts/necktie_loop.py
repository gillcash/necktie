#!/usr/bin/env python3
"""Create and advance an auditable, deterministic Necktie Loop packet."""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import sys
import uuid


SCHEMA_VERSION = "2.0"
REVISION_LIMIT = 3
STATES = {
    "frame", "baseline", "critique", "reverse", "execute", "review",
    "revise", "verify", "complete", "blocked",
}
ALLOWED_TRANSITIONS = {
    "frame": {"baseline"},
    "baseline": {"critique"},
    "critique": {"reverse"},
    "reverse": {"execute"},
    "execute": {"review"},
    "revise": {"review"},
    "verify": {"complete", "revise"},
}


class LoopError(ValueError):
    """Raised for an invalid run packet or state transition."""


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def event(kind: str, **details: object) -> dict[str, object]:
    return {"at": utc_now(), "kind": kind, **details}


def new_packet(goal: str) -> dict[str, object]:
    goal = goal.strip()
    if not goal:
        raise LoopError("goal must not be empty")
    return {
        "schema_version": SCHEMA_VERSION,
        "run_id": str(uuid.uuid4()),
        "created_at": utc_now(),
        "updated_at": utc_now(),
        "goal": goal,
        "state": "frame",
        "audience": "",
        "deliverables": [],
        "acceptance_criteria": [],
        "constraints": [],
        "non_goals": [],
        "sources": [],
        "assumptions": [],
        "strongest_unasked_question": "",
        "review_history": [],
        "verification": [],
        "circuit_breaker": None,
        "history": [event("initialized", state="frame")],
    }


def validate_packet(packet: object) -> dict[str, object]:
    if not isinstance(packet, dict):
        raise LoopError("run packet must be a JSON object")
    required = {"schema_version", "run_id", "goal", "state", "review_history", "history"}
    missing = sorted(required - packet.keys())
    if missing:
        raise LoopError(f"run packet is missing: {', '.join(missing)}")
    if packet["schema_version"] != SCHEMA_VERSION:
        raise LoopError(f"unsupported schema_version: {packet['schema_version']}")
    if packet["state"] not in STATES:
        raise LoopError(f"unsupported state: {packet['state']}")
    if not isinstance(packet["review_history"], list) or not isinstance(packet["history"], list):
        raise LoopError("review_history and history must be arrays")
    return packet


def load_packet(path: Path) -> dict[str, object]:
    try:
        return validate_packet(json.loads(path.read_text(encoding="utf-8")))
    except FileNotFoundError as exc:
        raise LoopError(f"run packet not found: {path}") from exc
    except json.JSONDecodeError as exc:
        raise LoopError(f"invalid JSON in {path}: {exc}") from exc


def save_packet(path: Path, packet: dict[str, object]) -> None:
    validate_packet(packet)
    packet["updated_at"] = utc_now()
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(packet, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    temporary.replace(path)


def transition(packet: dict[str, object], target: str, note: str) -> None:
    current = str(packet["state"])
    if target not in ALLOWED_TRANSITIONS.get(current, set()):
        allowed = ", ".join(sorted(ALLOWED_TRANSITIONS.get(current, set()))) or "none"
        raise LoopError(f"cannot transition from {current} to {target}; allowed: {allowed}")
    packet["state"] = target
    packet["history"].append(event("transition", previous=current, state=target, note=note.strip()))


def record_review(packet: dict[str, object], decision: str, reason: str, issue_signature: str) -> None:
    if packet["state"] != "review":
        raise LoopError(f"review decisions require state=review, found {packet['state']}")
    decision = decision.upper()
    if decision not in {"APPROVE", "REVISE", "BLOCK"}:
        raise LoopError(f"unsupported review decision: {decision}")
    reason = reason.strip()
    if not reason:
        raise LoopError("review reason must not be empty")
    signature = issue_signature.strip()
    if decision == "REVISE" and not signature:
        raise LoopError("REVISE requires --issue-signature")

    reviews = packet["review_history"]
    reviews.append(event("review", attempt=len(reviews) + 1, decision=decision,
                         reason=reason, issue_signature=signature))
    if decision == "APPROVE":
        packet["state"] = "verify"
    elif decision == "BLOCK":
        packet["state"] = "blocked"
        packet["circuit_breaker"] = "reviewer-blocked"
    else:
        revision_count = sum(item["decision"] == "REVISE" for item in reviews)
        same_issue_count = 0
        for item in reversed(reviews):
            if item["decision"] == "REVISE" and item["issue_signature"] == signature:
                same_issue_count += 1
            else:
                break
        if same_issue_count >= 3:
            packet["state"] = "blocked"
            packet["circuit_breaker"] = "same-issue-three-times"
        elif revision_count >= REVISION_LIMIT:
            packet["state"] = "blocked"
            packet["circuit_breaker"] = "revision-limit-reached"
        else:
            packet["state"] = "revise"
    packet["history"].append(event("review-decision", decision=decision,
                                   state=packet["state"], reason=reason))


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    subparsers = parser.add_subparsers(dest="command", required=True)
    initialize = subparsers.add_parser("init", help="create a new run packet")
    initialize.add_argument("--goal", required=True)
    initialize.add_argument("--output", type=Path, required=True)
    advance = subparsers.add_parser("transition", help="advance to an allowed state")
    advance.add_argument("--file", type=Path, required=True)
    advance.add_argument("--to", choices=sorted(STATES), required=True)
    advance.add_argument("--note", default="")
    review = subparsers.add_parser("review", help="record an independent review decision")
    review.add_argument("--file", type=Path, required=True)
    review.add_argument("--decision", choices=["APPROVE", "REVISE", "BLOCK"], required=True)
    review.add_argument("--reason", required=True)
    review.add_argument("--issue-signature", default="")
    show = subparsers.add_parser("show", help="validate and print a run packet")
    show.add_argument("--file", type=Path, required=True)
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        if args.command == "init":
            packet = new_packet(args.goal)
            save_packet(args.output, packet)
            print(f"initialized {packet['run_id']} at {args.output}")
        elif args.command == "transition":
            packet = load_packet(args.file)
            transition(packet, args.to, args.note)
            save_packet(args.file, packet)
            print(f"state={packet['state']}")
        elif args.command == "review":
            packet = load_packet(args.file)
            record_review(packet, args.decision, args.reason, args.issue_signature)
            save_packet(args.file, packet)
            print(f"state={packet['state']}")
        else:
            print(json.dumps(load_packet(args.file), indent=2, ensure_ascii=False))
    except LoopError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
