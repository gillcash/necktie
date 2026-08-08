# Source discovery and authority contract

## Purpose

Use this contract during **Frame** to find likely inputs without turning a Necktie run into an unrestricted filesystem search. Discovery identifies candidates. It does not make a candidate eligible evidence, prove its claims, or authorize disclosure.

## Discovery order

Use these sources in order:

1. Paths, URLs, and other inputs explicitly named by the user.
2. Files attached to the current request or materialized by the host for that request.
3. Inboxes listed in the project-local `.necktie/sources.json` file or an explicitly named configuration file.
4. Additional search roots that the user explicitly approves for the run.

Do not search a user profile, home directory, Downloads folder, Taildrop folder, drive root, filesystem root, sibling project, or unrelated directory unless it appears in items 1–4.

## Authority levels

- `content`: permit reading relevant candidate content within the stated boundary.
- `metadata`: permit only names, types, sizes, timestamps, and safe archive inventory. Ask for content approval before reading a candidate.

An explicitly named file or attachment normally has `content` authority. A configured inbox or search root defaults to `metadata` unless its configuration states `content`.

Authority to search a root is not authority to disclose unrelated content. Select only candidates that could materially affect the goal, deliverable contract, or evidence chain.

## Local configuration

Use `.necktie/sources.json` for project-local source configuration. The repository ignores `.necktie/`; do not commit this file because it can contain personal paths.

```json
{
  "version": "1.0",
  "inboxes": [
    {
      "label": "research-inbox",
      "path": "../research-inbox",
      "access": "metadata",
      "include": ["*.md", "*.csv", "*.zip"],
      "exclude": ["private/**"],
      "max_depth": 2,
      "max_files": 200,
      "max_file_bytes": 26214400,
      "archives": "inventory"
    }
  ],
  "search_roots": []
}
```

Resolve relative paths against the configuration file's directory. Reject unknown configuration fields so a typo cannot silently widen the search.

## Boundary rules

- Resolve and record the canonical root before enumeration.
- Do not follow symbolic links, junctions, reparse points, or archive paths outside the authorized root.
- Reject a drive root, filesystem root, or entire user profile by default. Use the broad-root override only after the user explicitly names and authorizes that exact root.
- Apply include and exclude patterns, depth, file-count, and file-size limits.
- Carry each local candidate's effective file-size limit into acceptance. Do not fingerprint content above that limit, and require rediscovery when the limit is missing or invalid.
- Exclude `.git`, `.necktie`, dependency caches, and generated cache directories by default.
- Treat URLs as references for a host browsing capability. The discovery script records but does not fetch them.

## Archive rules

Inventory an explicitly referenced or configured ZIP by reading its directory only. Do not extract it during discovery. Reject or flag:

- absolute paths or `..` traversal;
- encrypted or link-like members;
- too many members;
- excessive total uncompressed size;
- excessive per-member size or compression ratio; and
- nested archives unless the user separately authorizes their inspection; and
- member-name aliases that resolve to the same platform-conservative extraction path.

Do not accept an archive whose inventory status is `blocked`.

Inventory the current archive again immediately before acceptance. Do not rely on the inventory captured during an earlier discovery pass.

If later execution requires extraction, extract only accepted members into a private `.necktie/` work directory after repeating the boundary checks.

## Candidate decisions

Record each candidate as `candidate`, then explicitly `accept` or `reject` it. On acceptance, classify it as:

- `evidence` for eligible claim support;
- `method` for process guidance;
- `constraint` for scope, format, safety, authority, or acceptance requirements; or
- `prior-output` for hypotheses, reference structure, or style.

An expected deliverable or reference package normally belongs in `prior-output` or `constraint`. Its existence does not corroborate its factual claims. Reopen its eligible underlying sources before using those claims as evidence.

## Frame exit test

Do not leave Frame until all of these are true:

1. The discovery boundary and any limitations are recorded.
2. Material candidates are accepted, rejected, or awaiting a focused authorization decision.
3. A request to rebuild, reproduce, compare with, or match an existing deliverable has a located reference artifact or a recorded material blocker.
4. The deliverable contract preserves every explicit output, section, table, evidence, and verification requirement discovered in the accepted constraints.
