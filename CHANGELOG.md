# Changelog

This file records material user-facing changes to Necktie. Version 0.2.0 is the first published baseline in the current GitHub and npm history; neither currently contains a Necktie 0.1.0 release or package.

## [0.3.0] - Unreleased

### Added

- Permission-aware source discovery for named inputs, current-request attachments, configured inboxes, and user-approved search roots.
- Strict `.necktie/sources.json` configuration with separate `metadata` and `content` authority.
- Safe, metadata-only ZIP inventory with traversal, link, encryption, nesting, size, member-count, duplication, and compression-ratio controls.
- Run-packet schema 3.0 with discovery records, source decisions, and deliverable contracts.
- Automatic in-memory migration from run-packet schema 2.0. The next controller command that saves the packet writes schema 3.0.
- A deterministic verifier for required files, Markdown headings and coverage, and CSV columns and row counts.
- A passing-contract gate before `APPROVE` and completion when the contract contains machine-checkable requirements.
- English upgrade guidance plus synchronized Spanish and Korean README summaries.

### Changed

- Necktie Core now prohibits ambient local-file inspection and protects explicit breadth, depth, and deliverables from scope collapse.
- Frame now records the discovery boundary, accepted source classes, and complete deliverable contract.
- Critique, Reverse, Review, and Verify now distinguish reference structure from factual evidence.
- The npm package now includes `docs/` and this changelog.

### Compatibility

- The public workflow remains four skills and seven phases.
- Existing simple invocations require no configuration change.
- The release adds no background service, persistent operating mode, or required MCP server.

## [0.2.0] - 2026-08-08

### Added

- The first published Necktie package and GitHub release.
- Necktie Core for proportional checks on every response.
- The explicit Frame, Baseline, Critique, Reverse, Execute, Review, and Verify workflow.
- Four cooperating skills and a bounded three-revision review circuit.
- Cross-host hooks, static rules, commands, adapters, and an optional MCP retrieval fallback.
- A deterministic schema-2 Python controller and independent review validator.
- Generalized process, adapter, asset, and code provenance documentation.
