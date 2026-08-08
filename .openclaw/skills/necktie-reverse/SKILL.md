---
name: necktie-reverse
description: "Reverse-engineer an iterative conversation, critique, and successful refinements into one fresh-session executable brief. Use inside the Necktie loop, when t..."
homepage: https://github.com/gillcash/necktie
license: MIT
---

# Necktie Reverse

Compile the useful decisions from an iterative exchange into one self-contained brief that could have produced the desired result in a fresh session.

## Build the brief

1. Read [references/blueprint-template.md](references/blueprint-template.md) completely.
2. Extract the stable goal, audience, constraints, approved refinements, source hierarchy, required deliverables, acceptance criteria, and verification requirements.
3. Preserve explicit user choices. Resolve contradictions by favoring the latest explicit instruction, then higher-authority constraints, then the option best aligned with the stated goal.
4. Incorporate critique findings that materially improve correctness, usefulness, risk control, or verifiability.
5. Exclude conversational debris, abandoned approaches, praise, hidden reasoning, and claims that appeared only in prior outputs.
6. Require fresh execution from raw sources. Label prior outputs as hypotheses or style references unless independently supported.
7. Include a reviewer contract with an exact decision vocabulary and stopping rule.
8. Make the brief specific enough to execute yet independent of a particular model, tool name, or unavailable session state.

## Quality test

Before returning the brief, verify that a capable agent in a new session could answer all of these from the brief alone:

- What outcome matters, for whom, and why?
- Which sources can prove claims, and which only guide the method?
- What is in and out of scope?
- What must be delivered and in what form?
- What constitutes acceptance or failure?
- What should be checked, by whom, and when should the loop stop?

If a material answer is missing, ask one focused question or state a safe assumption. Do not smuggle unresolved ambiguity into vague language.

## Output

Return:

1. `Executable brief` in a single copyable block using the template headings.
2. `Compilation notes` listing only material assumptions, excluded prior-output claims, and unresolved limitations.

Do not include a transcript summary or chain-of-thought.
