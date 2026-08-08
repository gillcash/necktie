# Source discovery and authority

Use this guide to give a Necktie run the sources it needs without authorizing an unrestricted filesystem search.

This capability is new in version 0.3.0. Existing 0.2.0 invocations continue to work without a source configuration file. For the complete version transition, read [Upgrading from 0.2.0 to 0.3.0](upgrading-to-0.3.0.md).

## Know what Necktie can inspect

| Source | Discovery authority | Content authority |
| --- | --- | --- |
| Explicitly named file or URL | Exact named input | Yes, within the user request and host permissions |
| Current-request attachment | Exact attachment | Yes, when the host exposes it |
| Configured inbox with `metadata` | Bounded names and metadata | No; approve a selected candidate first |
| Configured inbox with `content` | Bounded inventory | Yes, for relevant files inside the configured limits |
| User-approved search root | Exact approved root and limits | Metadata by default; content only when explicitly approved |
| Any other local path | None | None |

Authority to search a directory does not authorize Necktie to disclose unrelated content. The agent must select only sources that can materially affect the goal, evidence chain, or deliverable contract.

## Configure a local inbox

Create `.necktie/sources.json` in the project where you run Necktie. The repository ignores `.necktie/`. Do not commit this file because it can contain personal paths.

```json
{
  "version": "1.0",
  "inboxes": [
    {
      "label": "research-inbox",
      "path": "../research-inbox",
      "access": "metadata",
      "include": ["*.md", "*.txt", "*.csv", "*.zip"],
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

Resolve a relative `path` from the directory that contains `sources.json`.

Use these fields:

| Field | Required | Meaning |
| --- | --- | --- |
| `label` | No | Local name for the boundary |
| `path` | Yes | Directory to inventory |
| `access` | No | `metadata` by default, or explicit `content` authority |
| `include` | No | Filename or relative-path patterns; default is `*` |
| `exclude` | No | Additional relative-path patterns to omit |
| `max_depth` | No | Maximum directory nesting; default is 3 |
| `max_files` | No | Maximum candidates; default is 500 |
| `max_file_bytes` | No | Maximum file size that content access may hash; default is 25 MiB |
| `archives` | No | `inventory` by default; `ignore` omits ZIP candidates from that root |

The loader rejects unknown fields. This behavior prevents a misspelled limit from silently widening discovery.

Each local candidate records its effective `max_file_bytes` value. Acceptance fingerprints only a current file at or below that limit. A larger file remains accepted with an empty digest and a `content-not-read:file-too-large` warning. Rediscover a pre-release candidate that does not contain a valid limit; the controller does not assume broader authority.

## Inventory a run

Initialize a packet and inventory named inputs:

```text
python skills/necktie/scripts/necktie_loop.py init --goal "Rebuild the research package" --output .necktie/run.json
python skills/necktie/scripts/necktie_loop.py discover --file .necktie/run.json --input research-brief.md --attachment reference-package.zip
```

The `discover` command also reads `.necktie/sources.json` when the file exists. Use `--config PATH` to select another configuration file. Use `--search-root PATH` only after the user approves that exact root.

The command rejects a drive root, filesystem root, or entire user profile unless `--allow-broad-root` is present. Use that override only when the user explicitly names and authorizes the broad root. Prefer a narrower directory.

## Accept or reject candidates

Inspect the candidate manifest in the run packet. Then record each material decision:

```text
python skills/necktie/scripts/necktie_loop.py source --file .necktie/run.json --candidate C001 --decision ACCEPT --kind constraint --use "Defines required files and sections"
python skills/necktie/scripts/necktie_loop.py source --file .necktie/run.json --candidate C002 --decision ACCEPT --kind evidence --use "Supports the operating-control claims" --approve-content
python skills/necktie/scripts/necktie_loop.py source --file .necktie/run.json --candidate C003 --decision REJECT
```

Use `--approve-content` when a configured boundary granted metadata access only. Acceptance does not change evidence class:

- `evidence` can support claims within its scope;
- `method` controls how the agent works;
- `constraint` defines authority, scope, form, or acceptance; and
- `prior-output` supplies hypotheses, structure, or style but cannot corroborate itself.

## Inspect archives safely

Discovery reads a ZIP directory but does not extract members. It blocks or flags path traversal, absolute paths, encryption, links, nested archives, excessive member size, excessive total size, excessive compression ratios, and member names that resolve to the same platform-conservative extraction path.

Do not accept a candidate when its archive inventory status is `blocked`.

Acceptance inventories the current ZIP again before it records the source. Replacing a previously safe archive with unsafe bytes therefore blocks acceptance.

If execution needs archive contents, first accept the archive. Then extract only validated members into a private `.necktie/` work directory. Repeat the boundary checks during extraction.

## Match a reference without copying its claims

When the user supplies an expected package, classify it as `constraint` or `prior-output`. Compile its observable requirements into a contract:

- filenames and formats;
- document sections;
- table names, columns, and minimum coverage;
- citation and source-register rules; and
- rendering, calculation, or runtime checks.

Build the new result from independently eligible evidence. Structural agreement with the reference does not prove factual accuracy.

The deterministic verifier treats ATX headings outside backtick or tilde fenced blocks as Markdown structure. Fenced content does not contribute to `min_words`. CSV `min_data_rows` counts only records with at least one non-whitespace cell; it does not impose row-width or per-cell completeness rules.

For example, a KPI data-reliability run can use a detailed research brief as a constraint, underlying standards and records as evidence, and an earlier multi-file package as the reference contract. A short methodology must receive `REVISE` when the contract requires a full report and machine-readable tables.

## Understand the limits

- Agent Plugins does not define a portable runtime filesystem-permission field. Source configuration therefore belongs in the local run context, not portable `plugin.json`.
- Hosts expose attachments differently. Record the host attachment identifier when no local path exists, and use the host's approved attachment reader.
- Discovery finds candidates. It does not prove relevance, evidence eligibility, freshness, or truth.
- The run packet can contain local paths. Keep `.necktie/` private and generalize paths before publishing an audit record.

This document is governed primarily by ISO 24495-1-oriented plain-language practice because its intended readers must authorize, configure, and audit bounded source discovery, misunderstanding could expose unrelated local information or omit material evidence, and the document requires both reader-level organization and technical semantic control. It is supplemented by ASD-STE100-oriented controls for commands, access values, limits, conditions, and stop rules.

This is a writing profile, not a claim of conformity.
