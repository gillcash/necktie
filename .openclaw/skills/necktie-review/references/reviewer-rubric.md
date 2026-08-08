# Necktie reviewer rubric

## Order of review

1. **Authority and safety**: Is the action permitted, reversible where appropriate, and within the agreed scope?
2. **Goal fit**: Does the artifact support the user's actual outcome and audience?
3. **Evidence integrity**: Are material claims traceable to eligible, current sources? Are method context and prior outputs kept out of the evidence chain?
4. **Correctness and completeness**: Are calculations, logic, content, and required sections accurate and sufficient?
5. **Usability**: Can the intended audience use the result in its target environment?
6. **Verification**: Were the relevant tests, renders, checks, or inspections performed, and do their results support completion?
7. **Economy**: Is the solution no larger or more complex than the goal requires?

## Severity

- `critical`: could cause unsafe action, material loss, invalid conclusion, unauthorized change, or failure of the central deliverable.
- `major`: violates an acceptance criterion, leaves a material unsupported claim, omits a necessary component, or prevents intended use.
- `minor`: real but non-blocking defect that does not change the decision or intended use.

Do not inflate preferences into findings. A valid finding states the violated criterion, exact location, concrete evidence, and smallest required change.

## Decision examples

- Approve a sound artifact with an optional wording improvement; record it only as a minor finding if useful.
- Revise when a KPI definition lacks a denominator, a cited claim is unsupported, a requested file does not render, or a required test fails.
- Block when the user must choose between materially different scopes, required private data is unavailable, or execution needs authority the run does not possess.

## Independence

Review the artifact that exists, not the artifact you imagine the author intended. Do not fix it during the review pass. If revising later, leave reviewer role and return to author role first.
