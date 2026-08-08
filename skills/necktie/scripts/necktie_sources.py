#!/usr/bin/env python3
"""Discover candidate Necktie sources inside explicit authorization boundaries."""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
import fnmatch
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import stat
import sys
import unicodedata
from urllib.parse import urlparse
import zipfile


DISCOVERY_SCHEMA_VERSION = "1.0"
CONFIG_VERSION = "1.0"
DEFAULT_MAX_DEPTH = 3
DEFAULT_MAX_FILES = 500
DEFAULT_MAX_FILE_BYTES = 25 * 1024 * 1024
DEFAULT_MAX_ARCHIVE_MEMBERS = 2_000
DEFAULT_MAX_ARCHIVE_BYTES = 250 * 1024 * 1024
DEFAULT_MAX_COMPRESSION_RATIO = 100
NESTED_ARCHIVE_SUFFIXES = (
    ".zip", ".tar", ".tgz", ".tar.gz", ".tbz", ".tbz2", ".tar.bz2",
    ".txz", ".tar.xz", ".7z", ".rar", ".gz", ".bz2", ".xz",
)
DEFAULT_EXCLUDES = (
    ".*",
    "**/.*",
    ".git/**",
    "**/.git/**",
    ".necktie/**",
    "**/.necktie/**",
    "node_modules/**",
    "**/node_modules/**",
    "__pycache__/**",
    "**/__pycache__/**",
    ".cache/**",
    "**/.cache/**",
)
ROOT_KEYS = {
    "label", "path", "access", "include", "exclude", "max_depth",
    "max_files", "max_file_bytes", "archives",
}
CONFIG_KEYS = {"version", "inboxes", "search_roots"}
ORIGIN_ORDER = {"explicit": 0, "attachment": 1, "configured-inbox": 2, "approved-root": 3}


class DiscoveryError(ValueError):
    """Raised for invalid discovery configuration or unsafe scope."""


def _utc_timestamp(value: float) -> str:
    return datetime.fromtimestamp(value, timezone.utc).replace(microsecond=0).isoformat()


def _is_url(value: str) -> bool:
    return urlparse(value).scheme.lower() in {"http", "https"}


def _canonical_path(value: str, base: Path) -> Path:
    candidate = Path(value).expanduser()
    if not candidate.is_absolute():
        candidate = base / candidate
    if _contains_link_component(candidate):
        raise DiscoveryError(f"path contains a link or junction: {candidate}")
    return candidate.resolve(strict=False)


def _path_key(path: Path) -> str:
    return os.path.normcase(str(path.resolve(strict=False)))


def _is_within(path: Path, root: Path) -> bool:
    try:
        return os.path.commonpath([_path_key(path), _path_key(root)]) == _path_key(root)
    except ValueError:
        return False


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


def _is_broad_root(path: Path) -> bool:
    resolved = path.resolve(strict=False)
    if resolved.anchor and resolved == Path(resolved.anchor):
        return True
    try:
        return resolved == Path.home().resolve(strict=False)
    except RuntimeError:
        return False


def _matches(relative: str, patterns: list[str]) -> bool:
    name = PurePosixPath(relative).name
    normalized = relative.rstrip("/")
    for pattern in patterns:
        prefix = pattern[:-3].rstrip("/") if pattern.endswith("/**") else ""
        if prefix and (normalized == prefix or normalized.startswith(prefix + "/")):
            return True
        if fnmatch.fnmatchcase(relative, pattern) or fnmatch.fnmatchcase(name, pattern):
            return True
    return False


def _positive_integer(value: object, label: str) -> int:
    if isinstance(value, bool) or not isinstance(value, int) or value < 1:
        raise DiscoveryError(f"{label} must be a positive integer")
    return value


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _archive_member_is_link(info: zipfile.ZipInfo) -> bool:
    mode = (info.external_attr >> 16) & 0xFFFF
    return stat.S_ISLNK(mode)


def _archive_member_collision_key(name: str) -> str:
    """Return a platform-conservative extraction key for duplicate detection."""
    normalized = name.replace("\\", "/")
    parts = [part for part in normalized.split("/") if part not in {"", "."}]
    canonical = [
        unicodedata.normalize("NFC", part).rstrip(" .").casefold()
        for part in parts
    ]
    return "/".join(canonical)


def _unsafe_archive_name(name: str) -> bool:
    normalized = name.replace("\\", "/")
    path = PurePosixPath(normalized)
    return (
        not normalized
        or "\x00" in normalized
        or normalized.startswith("/")
        or bool(re.match(r"^[A-Za-z]:", normalized))
        or ".." in path.parts
        or any(":" in part for part in path.parts)
        or not _archive_member_collision_key(name)
    )


def inventory_zip(
    path: Path,
    *,
    max_members: int = DEFAULT_MAX_ARCHIVE_MEMBERS,
    max_total_bytes: int = DEFAULT_MAX_ARCHIVE_BYTES,
    max_member_bytes: int = DEFAULT_MAX_FILE_BYTES,
    max_ratio: int = DEFAULT_MAX_COMPRESSION_RATIO,
) -> dict[str, object]:
    """Return a safe metadata-only ZIP inventory; never extract members."""
    result: dict[str, object] = {
        "status": "ok",
        "member_count": 0,
        "total_uncompressed_bytes": 0,
        "members": [],
        "warnings": [],
    }
    try:
        archive_bytes = path.stat().st_size
    except OSError as exc:
        result["status"] = "blocked"
        result["warnings"].append(f"archive-unreadable:{exc}")
        return result
    if archive_bytes > max_total_bytes:
        result["status"] = "blocked"
        result["warnings"].append(f"archive-file-size-limit:{archive_bytes}>{max_total_bytes}")
        return result
    try:
        with zipfile.ZipFile(path) as archive:
            infos = archive.infolist()
            result["member_count"] = len(infos)
            if len(infos) > max_members:
                result["status"] = "blocked"
                result["warnings"].append(f"archive-member-limit:{len(infos)}>{max_members}")
                infos = infos[:max_members]

            total = 0
            members: list[dict[str, object]] = []
            seen_names: set[str] = set()
            for info in infos:
                total += info.file_size
                reasons: list[str] = []
                normalized_name = _archive_member_collision_key(info.filename)
                if _unsafe_archive_name(info.filename):
                    reasons.append("unsafe-path")
                if normalized_name in seen_names:
                    reasons.append("duplicate-name")
                seen_names.add(normalized_name)
                if info.flag_bits & 0x1:
                    reasons.append("encrypted")
                if _archive_member_is_link(info):
                    reasons.append("link-like")
                if info.file_size > max_member_bytes:
                    reasons.append("member-too-large")
                ratio = info.file_size / max(info.compress_size, 1)
                if info.file_size and ratio > max_ratio:
                    reasons.append("compression-ratio")
                lower = info.filename.lower()
                if lower.endswith(NESTED_ARCHIVE_SUFFIXES):
                    reasons.append("nested-archive")
                if reasons:
                    result["status"] = "blocked"
                members.append({
                    "name": info.filename,
                    "size": info.file_size,
                    "compressed_size": info.compress_size,
                    "crc32": f"{info.CRC:08x}",
                    "directory": info.is_dir(),
                    "blocked_reasons": reasons,
                })
            result["members"] = members
            result["total_uncompressed_bytes"] = total
            if total > max_total_bytes:
                result["status"] = "blocked"
                result["warnings"].append(f"archive-size-limit:{total}>{max_total_bytes}")
    except (OSError, zipfile.BadZipFile, zipfile.LargeZipFile) as exc:
        result["status"] = "blocked"
        result["warnings"].append(f"archive-unreadable:{exc}")
    return result


def _validate_root(raw: object, *, base: Path, default_access: str) -> dict[str, object]:
    if not isinstance(raw, dict):
        raise DiscoveryError("each configured root must be an object")
    unknown = sorted(set(raw) - ROOT_KEYS)
    if unknown:
        raise DiscoveryError(f"unknown root fields: {', '.join(unknown)}")
    if not isinstance(raw.get("path"), str) or not str(raw["path"]).strip():
        raise DiscoveryError("configured root requires a non-empty path")
    access = raw.get("access", default_access)
    if access not in {"metadata", "content"}:
        raise DiscoveryError("root access must be metadata or content")
    archives = raw.get("archives", "inventory")
    if archives not in {"ignore", "inventory"}:
        raise DiscoveryError("root archives must be ignore or inventory")
    label = raw.get("label", "")
    if not isinstance(label, str):
        raise DiscoveryError("root label must be a string")
    include = raw.get("include", ["*"])
    exclude = raw.get("exclude", [])
    if not isinstance(include, list) or not all(
        isinstance(item, str) and item for item in include
    ):
        raise DiscoveryError("root include must be an array of non-empty strings")
    if not isinstance(exclude, list) or not all(
        isinstance(item, str) and item for item in exclude
    ):
        raise DiscoveryError("root exclude must be an array of non-empty strings")

    values = {
        "label": label.strip(),
        "path": _canonical_path(str(raw["path"]), base),
        "access": access,
        "include": include or ["*"],
        "exclude": list(DEFAULT_EXCLUDES) + exclude,
        "max_depth": _positive_integer(raw.get("max_depth", DEFAULT_MAX_DEPTH), "max_depth"),
        "max_files": _positive_integer(raw.get("max_files", DEFAULT_MAX_FILES), "max_files"),
        "max_file_bytes": _positive_integer(
            raw.get("max_file_bytes", DEFAULT_MAX_FILE_BYTES), "max_file_bytes"
        ),
        "archives": archives,
        "fingerprint_content": False,
    }
    return values


def load_config(path: Path) -> dict[str, object]:
    """Load and strictly validate a source-root configuration file."""
    path = _canonical_path(str(path), Path.cwd())
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise DiscoveryError(f"source configuration not found: {path}") from exc
    except json.JSONDecodeError as exc:
        raise DiscoveryError(f"invalid JSON in {path}: {exc}") from exc
    if not isinstance(value, dict):
        raise DiscoveryError("source configuration must be an object")
    unknown = sorted(set(value) - CONFIG_KEYS)
    if unknown:
        raise DiscoveryError(f"unknown configuration fields: {', '.join(unknown)}")
    if value.get("version") != CONFIG_VERSION:
        raise DiscoveryError(f"unsupported source configuration version: {value.get('version')}")
    base = path.resolve(strict=False).parent
    inboxes = value.get("inboxes", [])
    search_roots = value.get("search_roots", [])
    if not isinstance(inboxes, list) or not isinstance(search_roots, list):
        raise DiscoveryError("inboxes and search_roots must be arrays")
    return {
        "version": CONFIG_VERSION,
        "inboxes": [_validate_root(item, base=base, default_access="metadata") for item in inboxes],
        "search_roots": [_validate_root(item, base=base, default_access="metadata") for item in search_roots],
    }


def _file_candidate(path: Path, *, root: Path, origin: str, policy: dict[str, object]) -> dict[str, object]:
    stat_result = path.stat()
    access = str(policy["access"])
    size = stat_result.st_size
    warnings: list[str] = []
    digest = ""
    if access == "content" and bool(policy.get("fingerprint_content", False)):
        if size <= int(policy["max_file_bytes"]):
            digest = _sha256(path)
        else:
            warnings.append("content-not-read:file-too-large")
    candidate: dict[str, object] = {
        "origin": origin,
        "location": str(path),
        "root": str(root),
        "name": path.name,
        "kind": "archive" if path.suffix.lower() == ".zip" else "file",
        "access": access,
        "size": size,
        "modified_at": _utc_timestamp(stat_result.st_mtime),
        "sha256": digest,
        "max_file_bytes": int(policy["max_file_bytes"]),
        "status": "candidate",
        "warnings": warnings,
    }
    if path.suffix.lower() == ".zip" and policy["archives"] == "inventory":
        candidate["archive"] = inventory_zip(path, max_member_bytes=int(policy["max_file_bytes"]))
    return candidate


def _discover_root(
    policy: dict[str, object], *, origin: str, allow_broad_root: bool,
) -> tuple[list[dict[str, object]], dict[str, object], list[str]]:
    root = Path(policy["path"])
    authorization = {
        "origin": origin,
        "label": policy["label"],
        "root": str(root),
        "access": policy["access"],
        "include": policy["include"],
        "exclude": policy["exclude"],
        "max_depth": policy["max_depth"],
        "max_files": policy["max_files"],
        "max_file_bytes": policy["max_file_bytes"],
        "archives": policy["archives"],
        "broad_root": _is_broad_root(root),
    }
    errors: list[str] = []
    if authorization["broad_root"] and not allow_broad_root:
        errors.append(f"broad-root-not-authorized:{root}")
        return [], authorization, errors
    if not root.exists():
        errors.append(f"root-not-found:{root}")
        return [], authorization, errors
    if _is_link_like(root):
        errors.append(f"root-is-link-like:{root}")
        return [], authorization, errors
    if not root.is_dir():
        errors.append(f"root-is-not-directory:{root}")
        return [], authorization, errors

    candidates: list[dict[str, object]] = []
    max_depth = int(policy["max_depth"])
    max_files = int(policy["max_files"])
    for current_text, directories, files in os.walk(root, followlinks=False):
        current = Path(current_text)
        if not _is_within(current, root):
            directories[:] = []
            errors.append(f"root-escape-blocked:{current}")
            continue
        relative_dir = current.relative_to(root)
        depth = len(relative_dir.parts)
        kept_directories: list[str] = []
        for name in sorted(directories):
            child = current / name
            relative = child.relative_to(root).as_posix() + "/"
            if _is_link_like(child):
                errors.append(f"link-like-entry-skipped:{child}")
            elif _matches(relative, list(policy["exclude"])):
                continue
            elif depth < max_depth:
                kept_directories.append(name)
        directories[:] = kept_directories

        if depth > max_depth:
            directories[:] = []
            continue
        for name in sorted(files):
            path = current / name
            relative = path.relative_to(root).as_posix()
            if _matches(relative, list(policy["exclude"])):
                continue
            if not _matches(relative, list(policy["include"])):
                continue
            if path.suffix.lower() == ".zip" and policy["archives"] == "ignore":
                continue
            if _is_link_like(path):
                errors.append(f"link-like-entry-skipped:{path}")
                continue
            resolved = path.resolve(strict=False)
            if not _is_within(resolved, root):
                errors.append(f"root-escape-blocked:{path}")
                continue
            try:
                candidates.append(_file_candidate(resolved, root=root, origin=origin, policy=policy))
            except OSError as exc:
                errors.append(f"file-unreadable:{path}:{exc}")
            if len(candidates) >= max_files:
                errors.append(f"file-limit-reached:{max_files}")
                directories[:] = []
                break
        if len(candidates) >= max_files:
            break
    return candidates, authorization, errors


def _exact_policy(path: Path, *, access: str, max_depth: int, max_files: int,
                  max_file_bytes: int) -> dict[str, object]:
    return {
        "label": "",
        "path": path,
        "access": access,
        "include": ["*"],
        "exclude": list(DEFAULT_EXCLUDES),
        "max_depth": max_depth,
        "max_files": max_files,
        "max_file_bytes": max_file_bytes,
        "archives": "inventory",
        "fingerprint_content": True,
    }


def _discover_exact(
    value: str,
    *,
    origin: str,
    workspace: Path,
    allow_broad_root: bool,
    max_depth: int,
    max_files: int,
    max_file_bytes: int,
) -> tuple[list[dict[str, object]], list[dict[str, object]], list[str]]:
    if _is_url(value):
        return [{
            "origin": origin,
            "location": value,
            "root": "",
            "name": value,
            "kind": "remote-reference",
            "access": "content",
            "size": None,
            "modified_at": "",
            "sha256": "",
            "status": "candidate",
            "warnings": ["not-fetched-by-discovery"],
        }], [{
            "origin": origin,
            "label": "",
            "root": value,
            "access": "content",
            "exact": True,
            "remote": True,
            "broad_root": False,
        }], []
    try:
        path = _canonical_path(value, workspace)
    except DiscoveryError as exc:
        return [], [], [f"input-rejected:{exc}"]
    if not path.exists():
        return [], [], [f"input-not-found:{path}"]
    if _is_link_like(path):
        return [], [], [f"input-is-link-like:{path}"]
    policy = _exact_policy(path, access="content", max_depth=max_depth,
                           max_files=max_files, max_file_bytes=max_file_bytes)
    if path.is_dir():
        found, authorization, errors = _discover_root(
            policy, origin=origin, allow_broad_root=allow_broad_root,
        )
        return found, [authorization], errors
    try:
        candidate = _file_candidate(path, root=path.parent, origin=origin, policy=policy)
        return [candidate], [{
            "origin": origin,
            "label": "",
            "root": str(path),
            "access": "content",
            "exact": True,
            "broad_root": False,
        }], []
    except OSError as exc:
        return [], [], [f"input-unreadable:{path}:{exc}"]


def _deduplicate(candidates: list[dict[str, object]]) -> list[dict[str, object]]:
    ordered = sorted(candidates, key=lambda item: (
        ORIGIN_ORDER.get(str(item["origin"]), 99),
        os.path.normcase(str(item["location"])),
    ))
    result: list[dict[str, object]] = []
    seen: dict[str, dict[str, object]] = {}
    for candidate in ordered:
        location = str(candidate["location"])
        key = location if _is_url(location) else os.path.normcase(location)
        if key in seen:
            duplicate = seen[key]
            origins = duplicate.setdefault("also_discovered_as", [])
            if candidate["origin"] not in origins:
                origins.append(candidate["origin"])
            continue
        seen[key] = candidate
        result.append(candidate)
    for index, candidate in enumerate(result, 1):
        candidate["id"] = f"C{index:03d}"
    return result


def discover(
    *,
    workspace: Path,
    config_path: Path | None = None,
    inputs: list[str] | None = None,
    attachments: list[str] | None = None,
    attachment_refs: list[str] | None = None,
    inboxes: list[str] | None = None,
    search_roots: list[str] | None = None,
    allow_broad_root: bool = False,
    max_depth: int = DEFAULT_MAX_DEPTH,
    max_files: int = DEFAULT_MAX_FILES,
    max_file_bytes: int = DEFAULT_MAX_FILE_BYTES,
) -> dict[str, object]:
    """Discover sources from explicit inputs and authorized configured roots."""
    max_depth = _positive_integer(max_depth, "max_depth")
    max_files = _positive_integer(max_files, "max_files")
    max_file_bytes = _positive_integer(max_file_bytes, "max_file_bytes")
    workspace = _canonical_path(str(workspace), Path.cwd())
    candidates: list[dict[str, object]] = []
    authorizations: list[dict[str, object]] = []
    errors: list[str] = []
    config_location = ""

    if config_path is None:
        implicit = workspace / ".necktie" / "sources.json"
        if implicit.is_file():
            config_path = implicit
    if config_path is not None:
        config_path = _canonical_path(str(config_path), workspace)
        config_location = str(config_path)
        config = load_config(config_path)
        for origin, key in (("configured-inbox", "inboxes"), ("approved-root", "search_roots")):
            for policy in config[key]:
                found, authorization, problems = _discover_root(
                    policy, origin=origin, allow_broad_root=allow_broad_root,
                )
                candidates.extend(found)
                authorizations.append(authorization)
                errors.extend(problems)

    for origin, values in (("explicit", inputs or []), ("attachment", attachments or [])):
        for value in values:
            found, scopes, problems = _discover_exact(
                value, origin=origin, workspace=workspace,
                allow_broad_root=allow_broad_root, max_depth=max_depth,
                max_files=max_files, max_file_bytes=max_file_bytes,
            )
            candidates.extend(found)
            authorizations.extend(scopes)
            errors.extend(problems)

    for value in attachment_refs or []:
        candidates.append({
            "origin": "attachment",
            "location": value,
            "root": "",
            "name": value,
            "kind": "attachment-reference",
            "access": "content",
            "size": None,
            "modified_at": "",
            "sha256": "",
            "status": "candidate",
            "warnings": ["host-must-materialize-or-read"],
        })
        authorizations.append({
            "origin": "attachment",
            "label": "",
            "root": value,
            "access": "content",
            "exact": True,
            "host_reference": True,
            "broad_root": False,
        })

    for origin, values in (("configured-inbox", inboxes or []), ("approved-root", search_roots or [])):
        for value in values:
            try:
                path = _canonical_path(value, workspace)
            except DiscoveryError as exc:
                errors.append(f"root-rejected:{exc}")
                continue
            policy = _exact_policy(path, access="metadata", max_depth=max_depth,
                                   max_files=max_files, max_file_bytes=max_file_bytes)
            found, authorization, problems = _discover_root(
                policy, origin=origin, allow_broad_root=allow_broad_root,
            )
            candidates.extend(found)
            authorizations.append(authorization)
            errors.extend(problems)

    return {
        "schema_version": DISCOVERY_SCHEMA_VERSION,
        "workspace": str(workspace),
        "config": config_location,
        "allow_broad_root": allow_broad_root,
        "authorizations": authorizations,
        "candidates": _deduplicate(candidates),
        "errors": sorted(set(errors)),
    }


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--workspace", type=Path, default=Path.cwd())
    parser.add_argument("--config", type=Path)
    parser.add_argument("--input", action="append", default=[])
    parser.add_argument("--attachment", action="append", default=[])
    parser.add_argument("--attachment-ref", action="append", default=[])
    parser.add_argument("--inbox", action="append", default=[])
    parser.add_argument("--search-root", action="append", default=[])
    parser.add_argument("--allow-broad-root", action="store_true")
    parser.add_argument("--max-depth", type=int, default=DEFAULT_MAX_DEPTH)
    parser.add_argument("--max-files", type=int, default=DEFAULT_MAX_FILES)
    parser.add_argument("--max-file-bytes", type=int, default=DEFAULT_MAX_FILE_BYTES)
    parser.add_argument("--output", type=Path)
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        result = discover(
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
        rendered = json.dumps(result, indent=2, ensure_ascii=False) + "\n"
        if args.output:
            args.output.parent.mkdir(parents=True, exist_ok=True)
            args.output.write_text(rendered, encoding="utf-8")
        else:
            sys.stdout.write(rendered)
    except (DiscoveryError, OSError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
