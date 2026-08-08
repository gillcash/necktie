# Necktie loop protocol

## Purpose

Use this protocol to transform an initial request and its source context into a reusable brief and a verified final artifact. The loop combines prompt reversal, inquiry critique, blueprint-first execution, independent review, and a finite circuit breaker.

## State model

```text
frame -> baseline -> critique -> reverse -> execute -> review
                                                  ^         |
                                                  |         v
                                                revise <- REVISE
                                                            |
                                        APPROVE -> verify -> complete
                                                            |
                                        BLOCK  ----------> blocked
```

Verification failure returns to `revise` only while review budget remains. A blocked run resumes only when new evidence, authority, or a material user decision changes the conditions.

## Run packet

Maintain only information needed to reproduce and audit decisions:

```json
{
  "goal": "Desired real-world outcome",
  "state": "frame",
  "audience": "Who will use the result",
  "deliverables": [],
  "acceptance_criteria": [],
  "constraints": [],
  "non_goals": [],
  "discovery": {
    "policy_version": "1.0",
    "authorizations": [],
    "candidates": [],
    "decisions": [],
    "errors": [],
    "runs": []
  },
  "sources": [
    {"id": "S1", "kind": "evidence", "location": "...", "use": "..."}
  ],
  "deliverable_contract": {
    "schema_version": "1.0",
    "reference_sources": [],
    "required_files": [],
    "markdown": [],
    "csv": [],
    "evidence_rules": []
  },
  "assumptions": [],
  "strongest_unasked_question": "",
  "review_history": [],
  "verification": []
}
```

Do not store secrets or private reasoning. Record concise rationales, citations, hashes, commands, or test results when useful.

## Source authority

Perform source discovery inside `frame`; it is not a separate operating state. Follow [source-discovery.md](source-discovery.md). Inspect only explicit inputs, current-request attachments, configured inboxes, and search roots the user approved. A configured metadata-only root permits inventory, not content access. Record approval before reading a selected candidate.

Do not infer authority from proximity, file modification time, a familiar filename, or the fact that a path exists on the same machine. An empty working directory does not authorize a home-directory search. A request that depends on an existing deliverable must locate that deliverable inside the authorized boundary or pause for one focused authorization decision.

## Role separation

The author creates and revises. The critic challenges the inquiry before execution. The reviewer judges the exact candidate after execution. Prefer separate agent contexts when the host provides them, but never broaden permissions or expose more evidence than the role requires.

If only one agent is available, emulate separation by finishing and freezing the author packet, then starting a read-only review pass from the exact brief and evidence index. Do not edit until the decision has been recorded.

## Source discipline

- `evidence` supports domain claims.
- `method` describes how to reason or work.
- `constraint` controls behavior, authority, scope, or form.
- `prior-output` preserves preferences or hypotheses but cannot corroborate itself.

Record source origin separately from source class. An explicit file can still be `method`; a reference package can still be `prior-output`; and a configured-inbox candidate does not become evidence until accepted and classified.

When executing the reversed brief, return to raw evidence rather than paraphrasing the baseline. This prevents iterative wording from turning into false support.

## Deliverable contract

Compile observable requirements from accepted constraints and reference artifacts before execution. Preserve required files, sections, tables, columns, minimum coverage, evidence rules, and target-environment checks. The baseline and minimum-intervention rule may simplify machinery, but they must not shrink this contract.

Use structural checks to test conformance and evidence review to test truth. A matching file inventory does not prove factual accuracy, and an accurate paragraph does not satisfy a required multi-file package.

When the contract contains machine-checkable file, Markdown, or CSV requirements, the controller requires the latest artifact-contract verification to return `PASS` before it records `APPROVE` or completes the run.

## Bounded improvement

The loop permits at most three `REVISE` decisions.

Open the circuit and block when any condition occurs:

- the same issue signature survives three consecutive reviews;
- three revision decisions have been recorded;
- the next step needs new authority, unavailable evidence, or a material user choice;
- further work would expand beyond the agreed goal.

Do not evade a denial by renaming the same action or changing only its presentation. A new pass must make a material change tied to a finding.

## Completion contract

A run is complete only when:

1. the artifact and executable brief exist;
2. every material deliverable-contract requirement passes or is explicitly blocked;
3. all critical and major findings are resolved;
4. relevant verification passes in the target environment;
5. remaining limitations are explicit;
6. the handoff identifies the strongest unasked question when it could change future action.

Necktie has no persistent operating mode. The run packet records one explicitly invoked loop; it does not turn Necktie Core on or off.
