---
name: necktie-review
description: "Independently gate a candidate deliverable against its exact brief, evidence, acceptance criteria, and verification results. Use inside the Necktie loop, for..."
homepage: https://github.com/gillcash/necktie
license: MIT
---

# Necktie Review

Judge the proposed result without silently rewriting it or expanding its scope. Review as a separate role from the author, using the smallest evidence packet that permits a reliable decision.

## Inputs

Require:

- the exact executable brief;
- the candidate artifact or change set;
- acceptance criteria and constraints;
- the discovery boundary plus source acceptance and rejection decisions;
- a source ledger plus relevant evidence excerpts, paths, or links;
- the deliverable contract and structural verification results when a reference artifact exists;
- verification results, if already available.

If an input is unavailable, decide whether that absence is itself a material finding. Read [references/reviewer-rubric.md](references/reviewer-rubric.md) completely before judging.

## Review

1. Inspect the candidate read-only. Do not author fixes while acting as reviewer.
2. Confirm that every inspected local source was explicit, attached, configured, or inside a user-approved root, and that metadata-only candidates received content approval before use.
3. Test each acceptance criterion and every material factual claim against the accepted evidence ledger.
4. Test the exact candidate against every observable deliverable-contract requirement. Treat a material file, section, table, column, or coverage shortfall as a major finding even if the prose is accurate.
5. Look for omissions, contradictions, fabricated support, stale assumptions, unsafe actions, unusable formatting, and failure to verify in the target environment.
6. Check whether the deliverable advances the actual goal rather than merely resembling the reference artifact. Structural agreement is not factual corroboration.
7. Identify what the author and user may not have considered.
8. Name the single strongest unasked expert question and its consequence.
9. Report only material findings. Combine duplicates and point to exact locations when possible.

## Decide

- `APPROVE`: no critical or major finding remains. Minor optional improvements may be noted but cannot block approval.
- `REVISE`: one or more fixable critical or major findings remain. State the smallest required change for each.
- `BLOCK`: a required decision, authority, source, or safe execution path is absent and the author cannot resolve it within scope.

Confidence is not a substitute for evidence. Do not approve because the prose sounds plausible or because a narrow self-check passes while the contracted output is materially incomplete.

## Output

Return only one JSON object matching this shape:

```json
{
  "decision": "APPROVE",
  "summary": "One-sentence basis for the decision.",
  "findings": [],
  "strongest_unasked_question": "The highest-leverage omitted question.",
  "question_consequence": "What changes if its answer differs.",
  "confidence": "high"
}
```

Each finding must contain `id`, `severity` (`critical`, `major`, or `minor`), `criterion`, `location`, `evidence`, and `required_change`. Use an empty findings array only for approval. Validate a saved decision with:

```text
python skills/necktie-review/scripts/validate_review.py review.json
python skills/necktie-review/scripts/verify_artifact_contract.py --contract contract.json --artifact-root output
```

Do not include markdown around the JSON, private reasoning, or an edited artifact.
