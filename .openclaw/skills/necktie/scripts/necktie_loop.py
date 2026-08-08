#!/usr/bin/env python3
"""Create and advance an auditable, deterministic Necktie Loop packet."""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import stat
import sys
import uuid


SCHEMA_VERSION = "3.0"
LEGACY_SCHEMA_VERSION = "2.0"
REVISION_LIMIT = 3
DEFAULT_MAX_FILE_BYTES = 25 * 1024 * 1024
REMOTE_CANDIDATE_KINDS = {"remote-reference", "attachment-reference"}
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


def empty_discovery() -> dict[str, object]:
    return {
        "policy_version": "1.0",
        "authorizations": [],
        "candidates": [],
        "decisions": [],
        "errors": [],
        "runs": [],
    }


def empty_deliverable_contract() -> dict[str, object]:
    return {
        "schema_version": "1.0",
        "reference_sources": [],
        "required_files": [],
        "markdown": [],
        "csv": [],
        "evidence_rules": [],
    }


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
        "discovery": empty_discovery(),
        "deliverable_contract": empty_deliverable_contract(),
        "assumptions": [],
        "strongest_unasked_question": "",
        "review_history": [],
        "verification": [],
        "circuit_breaker": None,
        "history": [event("initialized", state="frame")],
    }


def migrate_packet(packet: dict[str, object]) -> dict[str, object]:
    """Upgrade a schema-2 packet without discarding its audit history."""
    if packet.get("schema_version") == LEGACY_SCHEMA_VERSION:
        packet["schema_version"] = SCHEMA_VERSION
        packet.setdefault("discovery", empty_discovery())
        packet.setdefault("deliverable_contract", empty_deliverable_contract())
        packet.setdefault("verification", [])
        history = packet.setdefault("history", [])
        if isinstance(history, list):
            history.append(event("schema-migrated", previous=LEGACY_SCHEMA_VERSION,
                                 schema_version=SCHEMA_VERSION))
    return packet


def validate_packet(packet: object) -> dict[str, object]:
    if not isinstance(packet, dict):
        raise LoopError("run packet must be a JSON object")
    packet = migrate_packet(packet)
    required = {
        "schema_version", "run_id", "goal", "state", "sources", "discovery",
        "deliverable_contract", "review_history", "verification", "history",
    }
    missing = sorted(required - packet.keys())
    if missing:
        raise LoopError(f"run packet is missing: {', '.join(missing)}")
    if packet["schema_version"] != SCHEMA_VERSION:
        raise LoopError(f"unsupported schema_version: {packet['schema_version']}")
    if packet["state"] not in STATES:
        raise LoopError(f"unsupported state: {packet['state']}")
    if not all(isinstance(packet[key], list) for key in ("review_history", "verification", "history")):
        raise LoopError("review_history, verification, and history must be arrays")
    if not isinstance(packet["sources"], list):
        raise LoopError("sources must be an array")
    discovery = packet["discovery"]
    if not isinstance(discovery, dict):
        raise LoopError("discovery must be an object")
    for key in ("authorizations", "candidates", "decisions", "errors", "runs"):
        if not isinstance(discovery.get(key), list):
            raise LoopError(f"discovery.{key} must be an array")
    if not isinstance(packet["deliverable_contract"], dict):
        raise LoopError("deliverable_contract must be an object")
    contract = packet["deliverable_contract"]
    if contract.get("schema_version") != "1.0":
        raise LoopError(f"unsupported deliverable_contract schema: {contract.get('schema_version')}")
    for key in ("reference_sources", "required_files", "markdown", "csv", "evidence_rules"):
        if not isinstance(contract.get(key), list):
            raise LoopError(f"deliverable_contract.{key} must be an array")
    try:
        packet["deliverable_contract"] = _load_contract_verifier_module().validate_contract(contract)
    except ValueError as exc:
        raise LoopError(f"invalid deliverable contract in run packet: {exc}") from exc
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
    if target == "complete":
        reviews = packet["review_history"]
        latest_review = reviews[-1] if reviews and isinstance(reviews[-1], dict) else {}
        if latest_review.get("decision") != "APPROVE":
            raise LoopError("completion requires a recorded APPROVE review decision")
        _require_passing_structural_verification(packet, "completion")
    packet["state"] = target
    packet["history"].append(event("transition", previous=current, state=target, note=note.strip()))


def _load_source_discovery_module():
    path = Path(__file__).with_name("necktie_sources.py")
    spec = importlib.util.spec_from_file_location("necktie_sources_runtime", path)
    if spec is None or spec.loader is None:
        raise LoopError(f"cannot load source discovery utility: {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _load_contract_verifier_module():
    path = Path(__file__).parents[2] / "necktie-review" / "scripts" / "verify_artifact_contract.py"
    spec = importlib.util.spec_from_file_location("necktie_contract_runtime", path)
    if spec is None or spec.loader is None:
        raise LoopError(f"cannot load artifact-contract verifier: {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _next_identifier(items: list[object], prefix: str) -> str:
    largest = 0
    for item in items:
        if not isinstance(item, dict):
            continue
        value = str(item.get("id", ""))
        if value.startswith(prefix) and value[len(prefix):].isdigit():
            largest = max(largest, int(value[len(prefix):]))
    return f"{prefix}{largest + 1:03d}"


def _is_link_like(path: Path) -> bool:
    if path.is_symlink():
        return True
    checker = getattr(path, "is_junction", None)
    if checker and checker():
        return True
    try:
        attributes = getattr(path.lstat(), "st_file_attributes", 0)
    except OSError:
        return False
    marker = getattr(stat, "FILE_ATTRIBUTE_REPARSE_POINT", 0)
    return bool(marker and attributes & marker)


def _contains_link_component(path: Path) -> bool:
    absolute = Path(os.path.abspath(path))
    parts = absolute.parts
    if not parts:
        return False
    current = Path(parts[0])
    for part in parts[1:]:
        current = current / part
        if _is_link_like(current):
            return True
    return False


def _is_remote_candidate(candidate: dict[str, object]) -> bool:
    location = str(candidate.get("location", ""))
    return (
        not location
        or candidate.get("kind") in REMOTE_CANDIDATE_KINDS
        or location.lower().startswith(("http://", "https://"))
    )


def _candidate_max_file_bytes(candidate: dict[str, object]) -> int:
    value = candidate.get("max_file_bytes")
    if isinstance(value, bool) or not isinstance(value, int) or value < 1:
        raise LoopError(
            "local candidate has no valid max_file_bytes limit; rediscover it before acceptance"
        )
    return value


def _candidate_warnings(candidate: dict[str, object]) -> list[str]:
    warnings = candidate.setdefault("warnings", [])
    if not isinstance(warnings, list) or not all(isinstance(item, str) for item in warnings):
        raise LoopError("source candidate warnings must be an array of strings")
    return warnings


def _accepted_local_path(candidate: dict[str, object]) -> Path | None:
    """Validate and return a bounded local candidate path."""
    if _is_remote_candidate(candidate):
        return None
    location = str(candidate.get("location", ""))
    path = Path(location)
    if _contains_link_component(path):
        raise LoopError(f"accepted candidate contains a link or junction: {location}")
    if not path.is_file():
        raise LoopError(f"accepted candidate is not a readable file: {location}")
    resolved = path.resolve(strict=True)
    root_text = str(candidate.get("root", ""))
    if root_text:
        try:
            root = Path(root_text).resolve(strict=False)
            if os.path.commonpath([
                os.path.normcase(str(resolved)), os.path.normcase(str(root)),
            ]) != os.path.normcase(str(root)):
                raise LoopError(f"accepted candidate escaped its root: {location}")
        except ValueError as exc:
            raise LoopError(f"accepted candidate escaped its root: {location}") from exc
    return resolved


def _fingerprint_accepted_candidate(candidate: dict[str, object]) -> str:
    """Fingerprint an accepted bounded local file; never fetch remote references."""
    path = _accepted_local_path(candidate)
    if path is None:
        return str(candidate.get("sha256", ""))
    limit = _candidate_max_file_bytes(candidate)
    warnings = _candidate_warnings(candidate)
    warning = "content-not-read:file-too-large"
    with path.open("rb") as handle:
        initial = os.fstat(handle.fileno())
        candidate["size"] = initial.st_size
        if initial.st_size > limit:
            candidate["sha256"] = ""
            if warning not in warnings:
                warnings.append(warning)
            return ""
        if warning in warnings:
            warnings.remove(warning)
        signature = (initial.st_dev, initial.st_ino, initial.st_size, initial.st_mtime_ns)
        remaining = initial.st_size
        digest = hashlib.sha256()
        while remaining:
            chunk = handle.read(min(1024 * 1024, remaining))
            if not chunk:
                raise LoopError(f"accepted candidate changed while fingerprinting: {path}")
            digest.update(chunk)
            remaining -= len(chunk)
        final = os.fstat(handle.fileno())
        if signature != (final.st_dev, final.st_ino, final.st_size, final.st_mtime_ns):
            raise LoopError(f"accepted candidate changed while fingerprinting: {path}")
    return digest.hexdigest()


def _refresh_archive_inventory(candidate: dict[str, object]) -> None:
    """Revalidate the current bytes of a local ZIP immediately before acceptance."""
    if _is_remote_candidate(candidate):
        return
    location = str(candidate.get("location", ""))
    is_archive = (
        candidate.get("kind") == "archive"
        or isinstance(candidate.get("archive"), dict)
        or Path(location).suffix.lower() == ".zip"
    )
    if not is_archive:
        return
    path = _accepted_local_path(candidate)
    if path is None:
        return
    limit = _candidate_max_file_bytes(candidate)
    inventory = _load_source_discovery_module().inventory_zip(
        path, max_member_bytes=limit,
    )
    candidate["archive"] = inventory
    if inventory.get("status") == "blocked":
        raise LoopError("blocked archive candidate cannot be accepted")


def _candidate_location_key(candidate: dict[str, object]) -> tuple[str, str]:
    location = str(candidate.get("location", ""))
    if _is_remote_candidate(candidate):
        return ("opaque", location)
    return ("local", os.path.normcase(os.path.normpath(location)))


def record_discovery(packet: dict[str, object], result: dict[str, object]) -> None:
    """Merge a bounded discovery result into a packet while it is in Frame."""
    if packet["state"] != "frame":
        raise LoopError(f"source discovery requires state=frame, found {packet['state']}")
    discovery = packet["discovery"]
    existing = discovery["candidates"]
    by_location = {
        _candidate_location_key(item): item
        for item in existing if isinstance(item, dict)
    }
    added = 0
    for raw in result.get("candidates", []):
        if not isinstance(raw, dict):
            continue
        key = _candidate_location_key(raw)
        if key in by_location:
            current = by_location[key]
            origins = current.setdefault("also_discovered_as", [])
            origin = raw.get("origin")
            if origin and origin != current.get("origin") and origin not in origins:
                origins.append(origin)
            continue
        candidate = dict(raw)
        candidate["id"] = _next_identifier(existing, "C")
        existing.append(candidate)
        by_location[key] = candidate
        added += 1
    discovery["authorizations"].extend(result.get("authorizations", []))
    discovery["errors"].extend(
        error for error in result.get("errors", []) if error not in discovery["errors"]
    )
    discovery["runs"].append(event(
        "source-discovery",
        workspace=result.get("workspace", ""),
        config=result.get("config", ""),
        candidates_added=added,
        errors=len(result.get("errors", [])),
    ))
    packet["history"].append(event("sources-discovered", candidates_added=added))


def decide_source(
    packet: dict[str, object], candidate_id: str, decision: str, kind: str,
    use: str, approve_content: bool,
) -> None:
    """Accept or reject a discovered candidate and record the evidence class."""
    if packet["state"] != "frame":
        raise LoopError(f"source decisions require state=frame, found {packet['state']}")
    decision = decision.upper()
    if decision not in {"ACCEPT", "REJECT"}:
        raise LoopError(f"unsupported source decision: {decision}")
    candidates = packet["discovery"]["candidates"]
    candidate = next(
        (item for item in candidates if isinstance(item, dict) and item.get("id") == candidate_id),
        None,
    )
    if candidate is None:
        raise LoopError(f"source candidate not found: {candidate_id}")
    if candidate.get("status") in {"accepted", "rejected"}:
        raise LoopError(f"source candidate already decided: {candidate_id}")

    record = event("source-decision", candidate_id=candidate_id, decision=decision)
    if decision == "REJECT":
        candidate["status"] = "rejected"
        packet["discovery"]["decisions"].append(record)
        packet["history"].append(record)
        return

    if kind not in {"evidence", "method", "constraint", "prior-output"}:
        raise LoopError("ACCEPT requires a valid --kind")
    if not use.strip():
        raise LoopError("ACCEPT requires a non-empty --use")
    if candidate.get("access") == "metadata" and not approve_content:
        raise LoopError("metadata-only candidate requires --approve-content before acceptance")
    _refresh_archive_inventory(candidate)
    fingerprint = _fingerprint_accepted_candidate(candidate)
    source_id = _next_identifier(packet["sources"], "S")
    source = {
        "id": source_id,
        "kind": kind,
        "location": candidate.get("location", ""),
        "use": use.strip(),
        "origin": candidate.get("origin", ""),
        "candidate_id": candidate_id,
        "sha256": fingerprint,
    }
    packet["sources"].append(source)
    candidate["status"] = "accepted"
    candidate["source_id"] = source_id
    candidate["sha256"] = fingerprint
    candidate["content_approved"] = bool(
        approve_content or candidate.get("access") == "content"
    )
    record.update({"source_id": source_id, "kind": kind})
    packet["discovery"]["decisions"].append(record)
    packet["history"].append(record)


def record_contract(packet: dict[str, object], contract: dict[str, object]) -> None:
    """Freeze or update the observable deliverable contract before execution."""
    if packet["state"] not in {"frame", "baseline", "critique", "reverse"}:
        raise LoopError(f"deliverable contract cannot change in state={packet['state']}")
    try:
        contract = _load_contract_verifier_module().validate_contract(contract)
    except ValueError as exc:
        raise LoopError(f"invalid deliverable contract: {exc}") from exc
    known_sources = {
        str(item.get("id", "")): str(item.get("kind", ""))
        for item in packet["sources"] if isinstance(item, dict)
    }
    missing = sorted(set(contract.get("reference_sources", [])) - set(known_sources))
    if missing:
        raise LoopError(f"contract references unknown sources: {', '.join(missing)}")
    invalid = sorted(
        source_id for source_id in contract.get("reference_sources", [])
        if known_sources[source_id] not in {"constraint", "prior-output"}
    )
    if invalid:
        raise LoopError(
            "contract reference sources must be constraint or prior-output: "
            + ", ".join(invalid)
        )
    packet["deliverable_contract"] = contract
    packet["history"].append(event(
        "deliverable-contract-recorded",
        reference_sources=len(contract.get("reference_sources", [])),
        required_files=len(contract.get("required_files", [])),
        markdown=len(contract.get("markdown", [])),
        csv=len(contract.get("csv", [])),
    ))


def record_contract_verification(packet: dict[str, object], result: dict[str, object]) -> None:
    if packet["state"] not in {"execute", "review", "verify"}:
        raise LoopError(f"artifact contract verification is not valid in state={packet['state']}")
    checks = result.get("checks")
    if not isinstance(checks, list) or not all(isinstance(item, dict) for item in checks):
        raise LoopError("artifact contract verification checks must be an array of objects")
    if not all(isinstance(item.get("passed"), bool) for item in checks):
        raise LoopError("artifact contract verification check passed values must be Boolean")
    failed = [item for item in checks if not item.get("passed")]
    decision = result.get("decision")
    if decision not in {"PASS", "FAIL"}:
        raise LoopError("artifact contract verification decision must be PASS or FAIL")
    failure_count = result.get("failure_count")
    if isinstance(failure_count, bool) or not isinstance(failure_count, int):
        raise LoopError("artifact contract verification failure_count must be an integer")
    if failure_count != len(failed):
        raise LoopError("artifact contract verification failure_count is inconsistent")
    expected = "FAIL" if failed else "PASS"
    if decision != expected:
        raise LoopError("artifact contract verification decision is inconsistent with its checks")
    failed_checks = [
        {
            "id": item.get("id", ""),
            "requirement": item.get("requirement", ""),
            "evidence": item.get("evidence", ""),
        }
        for item in checks if not item.get("passed")
    ]
    packet["verification"].append({
        **event("artifact-contract-verification"),
        "decision": decision,
        "artifact_root": result.get("artifact_root", ""),
        "checks": len(checks),
        "failure_count": len(failed),
        "failed_checks": failed_checks,
    })
    packet["history"].append(event(
        "artifact-contract-verified",
        decision=decision,
        failure_count=len(failed),
    ))


def _contract_has_structural_checks(packet: dict[str, object]) -> bool:
    contract = packet["deliverable_contract"]
    return any(contract.get(key) for key in ("required_files", "markdown", "csv"))


def _require_passing_structural_verification(
    packet: dict[str, object], action: str,
) -> None:
    if not _contract_has_structural_checks(packet):
        return
    verifications = [
        item for item in packet["verification"]
        if isinstance(item, dict) and item.get("kind") == "artifact-contract-verification"
    ]
    if not verifications or verifications[-1].get("decision") != "PASS":
        raise LoopError(f"{action} requires the latest artifact contract verification to PASS")


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
    if decision == "APPROVE":
        _require_passing_structural_verification(packet, "APPROVE")

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
    discover = subparsers.add_parser("discover", help="inventory authorized candidate sources")
    discover.add_argument("--file", type=Path, required=True)
    discover.add_argument("--workspace", type=Path, default=Path.cwd())
    discover.add_argument("--config", type=Path)
    discover.add_argument("--input", action="append", default=[])
    discover.add_argument("--attachment", action="append", default=[])
    discover.add_argument("--attachment-ref", action="append", default=[])
    discover.add_argument("--inbox", action="append", default=[])
    discover.add_argument("--search-root", action="append", default=[])
    discover.add_argument("--allow-broad-root", action="store_true")
    discover.add_argument("--max-depth", type=int, default=3)
    discover.add_argument("--max-files", type=int, default=500)
    discover.add_argument("--max-file-bytes", type=int, default=DEFAULT_MAX_FILE_BYTES)
    source = subparsers.add_parser("source", help="accept or reject a discovered source")
    source.add_argument("--file", type=Path, required=True)
    source.add_argument("--candidate", required=True)
    source.add_argument("--decision", choices=["ACCEPT", "REJECT"], required=True)
    source.add_argument("--kind", choices=["evidence", "method", "constraint", "prior-output"], default="")
    source.add_argument("--use", default="")
    source.add_argument("--approve-content", action="store_true")
    contract = subparsers.add_parser("contract", help="record a validated deliverable contract")
    contract.add_argument("--file", type=Path, required=True)
    contract.add_argument("--input", type=Path, required=True)
    verify_contract = subparsers.add_parser(
        "verify-contract", help="verify an artifact and record the result"
    )
    verify_contract.add_argument("--file", type=Path, required=True)
    verify_contract.add_argument("--artifact-root", type=Path, required=True)
    verify_contract.add_argument("--output", type=Path)
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
        elif args.command == "discover":
            packet = load_packet(args.file)
            source_discovery = _load_source_discovery_module()
            result = source_discovery.discover(
                workspace=args.workspace,
                config_path=args.config,
                inputs=args.input,
                attachments=args.attachment,
                attachment_refs=args.attachment_ref,
                inboxes=args.inbox,
                search_roots=args.search_root,
                allow_broad_root=args.allow_broad_root,
                max_depth=args.max_depth,
                max_files=args.max_files,
                max_file_bytes=args.max_file_bytes,
            )
            record_discovery(packet, result)
            save_packet(args.file, packet)
            print(f"candidates={len(packet['discovery']['candidates'])}")
        elif args.command == "source":
            packet = load_packet(args.file)
            decide_source(packet, args.candidate, args.decision, args.kind,
                          args.use, args.approve_content)
            save_packet(args.file, packet)
            print(f"sources={len(packet['sources'])}")
        elif args.command == "contract":
            packet = load_packet(args.file)
            verifier = _load_contract_verifier_module()
            contract_value = verifier.load_contract(args.input)
            record_contract(packet, contract_value)
            save_packet(args.file, packet)
            print(f"required_files={len(contract_value['required_files'])}")
        elif args.command == "verify-contract":
            packet = load_packet(args.file)
            verifier = _load_contract_verifier_module()
            result = verifier.verify_contract(packet["deliverable_contract"], args.artifact_root)
            record_contract_verification(packet, result)
            save_packet(args.file, packet)
            rendered = json.dumps(result, indent=2, ensure_ascii=False) + "\n"
            if args.output:
                args.output.parent.mkdir(parents=True, exist_ok=True)
                args.output.write_text(rendered, encoding="utf-8")
            else:
                sys.stdout.write(rendered)
            return 0 if result["decision"] == "PASS" else 1
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
    except (LoopError, OSError, ValueError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
