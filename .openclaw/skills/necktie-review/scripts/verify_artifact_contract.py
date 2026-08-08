#!/usr/bin/env python3
"""Verify an artifact tree against a deterministic Necktie deliverable contract."""

from __future__ import annotations

import argparse
import csv
import json
import os
from pathlib import Path, PurePosixPath
import re
import stat
import sys


CONTRACT_SCHEMA_VERSION = "1.0"
TOP_LEVEL_KEYS = {
    "schema_version", "reference_sources", "required_files", "markdown", "csv",
    "evidence_rules",
}
FILE_KEYS = {"path", "kind", "min_bytes"}
MARKDOWN_KEYS = {"path", "required_headings", "min_words"}
CSV_KEYS = {"path", "required_columns", "min_data_rows"}


class ContractError(ValueError):
    """Raised when a deliverable contract is invalid or unsafe."""


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


def _path_key(path: Path) -> str:
    return os.path.normcase(str(path.resolve(strict=False)))


def _is_within(path: Path, root: Path) -> bool:
    try:
        return os.path.commonpath([_path_key(path), _path_key(root)]) == _path_key(root)
    except ValueError:
        return False


def _safe_relative_path(value: object) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ContractError("contract path must be a non-empty string")
    normalized = value.replace("\\", "/")
    path = PurePosixPath(normalized)
    if (
        "\x00" in normalized
        or path.is_absolute()
        or ".." in path.parts
        or re.match(r"^[A-Za-z]:", normalized)
        or any(":" in part for part in path.parts)
    ):
        raise ContractError(f"contract path must stay relative: {value}")
    return path.as_posix()


def _require_closed_keys(value: dict[str, object], allowed: set[str], label: str) -> None:
    unknown = sorted(set(value) - allowed)
    if unknown:
        raise ContractError(f"unknown {label} fields: {', '.join(unknown)}")


def _validate_string_list(value: object, label: str) -> list[str]:
    if not isinstance(value, list) or not all(isinstance(item, str) and item.strip() for item in value):
        raise ContractError(f"{label} must be an array of non-empty strings")
    return list(value)


def _nonnegative_integer(value: object, label: str) -> int:
    if isinstance(value, bool) or not isinstance(value, int) or value < 0:
        raise ContractError(f"{label} must be a non-negative integer")
    return value


def validate_contract(value: object) -> dict[str, object]:
    if not isinstance(value, dict):
        raise ContractError("deliverable contract must be an object")
    _require_closed_keys(value, TOP_LEVEL_KEYS, "contract")
    if value.get("schema_version") != CONTRACT_SCHEMA_VERSION:
        raise ContractError(f"unsupported contract schema_version: {value.get('schema_version')}")
    references = _validate_string_list(value.get("reference_sources", []), "reference_sources")
    evidence_rules = _validate_string_list(value.get("evidence_rules", []), "evidence_rules")

    required_files = value.get("required_files", [])
    markdown = value.get("markdown", [])
    csv_specs = value.get("csv", [])
    if not all(isinstance(group, list) for group in (required_files, markdown, csv_specs)):
        raise ContractError("required_files, markdown, and csv must be arrays")

    normalized_files: list[dict[str, object]] = []
    for raw in required_files:
        if not isinstance(raw, dict):
            raise ContractError("required_files entries must be objects")
        _require_closed_keys(raw, FILE_KEYS, "required_files entry")
        kind = raw.get("kind", "file")
        if kind not in {"file", "directory"}:
            raise ContractError("required_files kind must be file or directory")
        minimum = _nonnegative_integer(raw.get("min_bytes", 0), "required_files min_bytes")
        normalized_files.append({
            "path": _safe_relative_path(raw.get("path")),
            "kind": kind,
            "min_bytes": minimum,
        })

    normalized_markdown: list[dict[str, object]] = []
    for raw in markdown:
        if not isinstance(raw, dict):
            raise ContractError("markdown entries must be objects")
        _require_closed_keys(raw, MARKDOWN_KEYS, "markdown entry")
        minimum = _nonnegative_integer(raw.get("min_words", 0), "markdown min_words")
        normalized_markdown.append({
            "path": _safe_relative_path(raw.get("path")),
            "required_headings": _validate_string_list(
                raw.get("required_headings", []), "required_headings"
            ),
            "min_words": minimum,
        })

    normalized_csv: list[dict[str, object]] = []
    for raw in csv_specs:
        if not isinstance(raw, dict):
            raise ContractError("csv entries must be objects")
        _require_closed_keys(raw, CSV_KEYS, "csv entry")
        minimum = _nonnegative_integer(raw.get("min_data_rows", 0), "csv min_data_rows")
        normalized_csv.append({
            "path": _safe_relative_path(raw.get("path")),
            "required_columns": _validate_string_list(
                raw.get("required_columns", []), "required_columns"
            ),
            "min_data_rows": minimum,
        })

    return {
        "schema_version": CONTRACT_SCHEMA_VERSION,
        "reference_sources": references,
        "required_files": normalized_files,
        "markdown": normalized_markdown,
        "csv": normalized_csv,
        "evidence_rules": evidence_rules,
    }


def load_contract(path: Path) -> dict[str, object]:
    try:
        return validate_contract(json.loads(path.read_text(encoding="utf-8")))
    except FileNotFoundError as exc:
        raise ContractError(f"contract not found: {path}") from exc
    except json.JSONDecodeError as exc:
        raise ContractError(f"invalid JSON in {path}: {exc}") from exc


def _target(root: Path, relative: str) -> tuple[Path | None, str]:
    path = root.joinpath(*PurePosixPath(relative).parts)
    if _contains_link_component(path):
        return None, "link-like target is not allowed"
    resolved = path.resolve(strict=False)
    if not _is_within(resolved, root):
        return None, "target escapes artifact root"
    return resolved, ""


def _check(identifier: str, passed: bool, requirement: str, evidence: str) -> dict[str, object]:
    return {
        "id": identifier,
        "passed": passed,
        "requirement": requirement,
        "evidence": evidence,
    }


def verify_contract(contract: dict[str, object], artifact_root: Path) -> dict[str, object]:
    contract = validate_contract(contract)
    unresolved_root = Path(os.path.abspath(artifact_root))
    if _contains_link_component(unresolved_root):
        raise ContractError(f"artifact root cannot contain a link or junction: {unresolved_root}")
    root = unresolved_root.resolve(strict=False)
    if not root.is_dir():
        raise ContractError(f"artifact root is not a directory: {root}")
    checks: list[dict[str, object]] = []
    sequence = 0

    def add(passed: bool, requirement: str, evidence: str) -> None:
        nonlocal sequence
        sequence += 1
        checks.append(_check(f"V{sequence:03d}", passed, requirement, evidence))

    for spec in contract["required_files"]:
        relative = str(spec["path"])
        path, error = _target(root, relative)
        if error:
            add(False, f"required {spec['kind']}: {relative}", error)
            continue
        exists = path.is_file() if spec["kind"] == "file" else path.is_dir()
        add(exists, f"required {spec['kind']}: {relative}", str(path))
        if exists and spec["kind"] == "file" and int(spec["min_bytes"]):
            size = path.stat().st_size
            add(size >= int(spec["min_bytes"]),
                f"minimum bytes for {relative}: {spec['min_bytes']}", f"actual={size}")

    for spec in contract["markdown"]:
        relative = str(spec["path"])
        path, error = _target(root, relative)
        if error or path is None or not path.is_file():
            add(False, f"markdown file readable: {relative}", error or "missing file")
            continue
        try:
            headings: set[str] = set()
            words = 0
            with path.open("r", encoding="utf-8") as handle:
                for line in handle:
                    match = re.match(r"^#{1,6}\s+(.+?)\s*$", line)
                    if match:
                        headings.add(match.group(1).strip().casefold())
                    words += len(re.findall(r"\b[\w'-]+\b", line, re.UNICODE))
        except (OSError, UnicodeError) as exc:
            add(False, f"markdown file readable: {relative}", str(exc))
            continue
        for heading in spec["required_headings"]:
            add(heading.strip().casefold() in headings,
                f"markdown heading in {relative}: {heading}",
                f"headings={len(headings)}")
        if int(spec["min_words"]):
            add(words >= int(spec["min_words"]),
                f"minimum words for {relative}: {spec['min_words']}", f"actual={words}")

    for spec in contract["csv"]:
        relative = str(spec["path"])
        path, error = _target(root, relative)
        if error or path is None or not path.is_file():
            add(False, f"CSV file readable: {relative}", error or "missing file")
            continue
        try:
            with path.open("r", encoding="utf-8-sig", newline="") as handle:
                reader = csv.reader(handle)
                header = next(reader, [])
                data_rows = sum(1 for _ in reader)
        except (OSError, UnicodeError, csv.Error) as exc:
            add(False, f"CSV file readable: {relative}", str(exc))
            continue
        for column in spec["required_columns"]:
            add(column in header, f"CSV column in {relative}: {column}",
                f"columns={header}")
        add(data_rows >= int(spec["min_data_rows"]),
            f"minimum data rows for {relative}: {spec['min_data_rows']}",
            f"actual={data_rows}")

    failures = [item for item in checks if not item["passed"]]
    return {
        "decision": "PASS" if not failures else "FAIL",
        "artifact_root": str(root),
        "checks": checks,
        "failure_count": len(failures),
        "evidence_rules": contract["evidence_rules"],
    }


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--contract", type=Path, required=True)
    parser.add_argument("--artifact-root", type=Path, required=True)
    parser.add_argument("--output", type=Path)
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        result = verify_contract(load_contract(args.contract), args.artifact_root)
        rendered = json.dumps(result, indent=2, ensure_ascii=False) + "\n"
        if args.output:
            args.output.parent.mkdir(parents=True, exist_ok=True)
            args.output.write_text(rendered, encoding="utf-8")
        else:
            sys.stdout.write(rendered)
        return 0 if result["decision"] == "PASS" else 1
    except ContractError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
