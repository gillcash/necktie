---
name: necktie-critique
description: Critique and expand an inquiry before execution by testing goal alignment, assumptions, omitted perspectives, and evidence needs. Use inside the Necktie loop or when the user asks what they overlooked, wants the strongest unasked expert question, requests a red-team of the framing, or needs material follow-up questions rather than a direct answer.
---

# Necktie Critique

Critique the inquiry, not merely the current answer. Broaden the user's view without turning the task into an endless discovery interview.

## Inputs

Obtain the goal, intended audience, acceptance criteria, discovery record, source ledger, deliverable contract, constraints, and any baseline approach. If one is missing, infer it only when doing so cannot widen filesystem authority or shrink a required deliverable; otherwise identify the missing decision.

## Method

1. Restate the actual decision or outcome in one sentence.
2. Test whether the requested deliverable is a means to that outcome or has become the goal by accident.
3. Check the baseline for hidden assumptions, missing stakeholders, incentives, failure modes, alternative explanations, data limitations, implementation constraints, and material scope collapse.
4. Identify contradictions between the goal, accepted evidence, requested format, deliverable contract, and available authority.
5. Check whether a request to rebuild, reproduce, compare with, or match an existing deliverable has a located and classified reference artifact. Do not replace a missing reference with a smaller generic artifact.
6. Check whether any candidate source was read outside an explicit input, current-request attachment, configured inbox, or user-approved root.
7. Simulate the most relevant genuine subject-matter expert. Ask what that expert would need to know before trusting or acting on the result.
8. Select the single strongest unasked question: the question whose answer would most change the plan, conclusion, or risk.
9. Separate questions into:
   - `material-now`: execution should pause because different answers produce meaningfully different outputs.
   - `assumption-safe`: proceed under a clearly stated default.
   - `optional-later`: useful but outside the current scope.
10. Reframe the inquiry so it targets the user's outcome, preserves the complete requested output, includes the necessary controls, and remains answerable from the permitted sources.

Do not invent domain facts, confuse method guidance with evidence, or criticize stylistic preferences that do not affect the goal.

## Output

Return this compact structure:

```text
Outcome test: ...
What is missing or misframed:
- ...
Assumptions to expose:
- ...
Strongest unasked question: ...
Why it matters: ...
Material questions for the user:
- ... (or "None; proceed with the stated assumptions.")
Reframed inquiry: ...
Readiness: READY | NEEDS-ANSWER | NEEDS-AUTHORIZATION | BLOCKED
```

Use `NEEDS-AUTHORIZATION` when the next material source or reference lies outside the recorded discovery boundary. Use `NEEDS-ANSWER` for another material user choice. Use `BLOCKED` only when required evidence or authority cannot be obtained within scope.
