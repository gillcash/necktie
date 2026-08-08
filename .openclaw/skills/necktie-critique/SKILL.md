---
name: necktie-critique
description: "Critique and expand an inquiry before execution by testing goal alignment, assumptions, omitted perspectives, and evidence needs. Use inside the Necktie loop..."
homepage: https://github.com/gillcash/necktie
license: MIT
---

# Necktie Critique

Critique the inquiry, not merely the current answer. Broaden the user's view without turning the task into an endless discovery interview.

## Inputs

Obtain the goal, intended audience, acceptance criteria, source ledger, constraints, and any baseline approach. If one is missing, infer it when safe and label the assumption.

## Method

1. Restate the actual decision or outcome in one sentence.
2. Test whether the requested deliverable is a means to that outcome or has become the goal by accident.
3. Check the baseline for hidden assumptions, missing stakeholders, incentives, failure modes, alternative explanations, data limitations, and implementation constraints.
4. Identify contradictions between the goal, evidence, requested format, and available authority.
5. Simulate the most relevant genuine subject-matter expert. Ask what that expert would need to know before trusting or acting on the result.
6. Select the single strongest unasked question: the question whose answer would most change the plan, conclusion, or risk.
7. Separate questions into:
   - `material-now`: execution should pause because different answers produce meaningfully different outputs.
   - `assumption-safe`: proceed under a clearly stated default.
   - `optional-later`: useful but outside the current scope.
8. Reframe the inquiry so it targets the user's outcome, includes the necessary controls, and remains answerable from the permitted sources.

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
Readiness: READY | NEEDS-ANSWER | BLOCKED
```

Use `NEEDS-ANSWER` only for a material user choice. Use `BLOCKED` only when required evidence or authority cannot be obtained within scope.
