#!/usr/bin/env python3
"""Validate the JSON decision emitted by the Necktie reviewer skill."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys


TOP_LEVEL_KEYS = {
    "decision",
    "summary",
    "findings",
    "strongest_unasked_question",
    "question_consequence",
    "confidence",
}
FINDING_KEYS = {"id", "severity", "criterion", "location", "evidence", "required_change"}
DECISIONS = {"APPROVE", "REVISE", "BLOCK"}
SEVERITIES = {"critical", "major", "minor"}
CONFIDENCE = {"high", "medium", "low"}


def nonempty_string(value: object) -> bool:
    return isinstance(value, str) and bool(value.strip())


def validate_review(value: object) -> list[str]:
    errors: list[str] = []
    if not isinstance(value, dict):
        return ["review must be a JSON object"]

    missing = sorted(TOP_LEVEL_KEYS - value.keys())
    extra = sorted(value.keys() - TOP_LEVEL_KEYS)
    if missing:
        errors.append(f"missing top-level keys: {', '.join(missing)}")
    if extra:
        errors.append(f"unexpected top-level keys: {', '.join(extra)}")
    if missing:
        return errors

    decision = value["decision"]
    if decision not in DECISIONS:
        errors.append(f"decision must be one of: {', '.join(sorted(DECISIONS))}")
    for field in ("summary", "strongest_unasked_question", "question_consequence"):
        if not nonempty_string(value[field]):
            errors.append(f"{field} must be a non-empty string")
    if value["confidence"] not in CONFIDENCE:
        errors.append(f"confidence must be one of: {', '.join(sorted(CONFIDENCE))}")

    findings = value["findings"]
    if not isinstance(findings, list):
        errors.append("findings must be an array")
        return errors

    blocking_findings = 0
    seen_ids: set[str] = set()
    for index, finding in enumerate(findings):
        prefix = f"findings[{index}]"
        if not isinstance(finding, dict):
            errors.append(f"{prefix} must be an object")
            continue
        missing_finding = sorted(FINDING_KEYS - finding.keys())
        extra_finding = sorted(finding.keys() - FINDING_KEYS)
        if missing_finding:
            errors.append(f"{prefix} missing keys: {', '.join(missing_finding)}")
        if extra_finding:
            errors.append(f"{prefix} unexpected keys: {', '.join(extra_finding)}")
        if missing_finding:
            continue
        for field in FINDING_KEYS - {"severity"}:
            if not nonempty_string(finding[field]):
                errors.append(f"{prefix}.{field} must be a non-empty string")
        if finding["severity"] not in SEVERITIES:
            errors.append(f"{prefix}.severity must be one of: {', '.join(sorted(SEVERITIES))}")
        elif finding["severity"] in {"critical", "major"}:
            blocking_findings += 1
        if finding["id"] in seen_ids:
            errors.append(f"duplicate finding id: {finding['id']}")
        seen_ids.add(finding["id"])

    if decision == "APPROVE" and blocking_findings:
        errors.append("APPROVE cannot contain critical or major findings")
    if decision in {"REVISE", "BLOCK"} and blocking_findings == 0:
        errors.append(f"{decision} requires at least one critical or major finding")
    return errors


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("review", type=Path)
    args = parser.parse_args(argv)
    try:
        value = json.loads(args.review.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        print(f"invalid: {exc}", file=sys.stderr)
        return 2
    errors = validate_review(value)
    if errors:
        for error in errors:
            print(f"invalid: {error}", file=sys.stderr)
        return 1
    print("valid Necktie review")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
