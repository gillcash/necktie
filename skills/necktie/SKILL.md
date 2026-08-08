---
name: necktie
description: Run a goal from raw context to a reviewed, verified final deliverable through the explicit, bounded Necktie Loop. Use when the user invokes /necktie, $necktie, or @necktie; asks to reverse-engineer an iterative conversation into one reusable prompt; wants an independent critique and review gate; or explicitly requests the Necktie workflow.
---

# Necktie

*the angel of late-stage capitalism for your AI agent*

Turn an underspecified or iterative request into one evidence-grounded deliverable and a reusable execution brief. Separate method context from domain evidence, critique the inquiry before optimizing the answer, and stop only at a verified result, a material blocker, or the circuit breaker.

## Start the run

1. Treat the text following `/necktie` or `$necktie` as the goal and any attached files, links, or named paths as candidate sources.
2. Read [references/loop-protocol.md](references/loop-protocol.md) completely before running the loop.
3. Maintain a compact run packet in memory. When the user requests an audit trail, resumability, or files, initialize `.necktie/run.json` with `scripts/necktie_loop.py` and update it at phase boundaries.
4. Ask a question only when the answer would materially change the objective, evidence, authority, or deliverable. Otherwise record the assumption and proceed.

## Run the loop

### 1. Frame

State the outcome, intended audience, acceptance criteria, constraints, and non-goals. Build a source ledger that labels every input as one of:

- `evidence`: may support claims in the final output.
- `method`: controls how to work but does not prove domain claims.
- `constraint`: governs scope, format, safety, or authority.
- `prior-output`: useful as a hypothesis or preference, not independent evidence.

### 2. Establish a baseline

Inspect the relevant sources and sketch the smallest plausible answer or approach. Record its assumptions and known weaknesses. Do not polish it into the final artifact yet.

### 3. Critique

Apply the `$necktie-critique` skill to the goal, baseline, source ledger, and acceptance criteria. Require it to challenge the framing, identify what the user may have overlooked relative to the goal, name the strongest unasked expert question, and distinguish material questions from optional improvements.

### 4. Reverse

Resolve critique findings with evidence or explicit assumptions. Then apply `$necktie-reverse` to compile the complete successful trajectory into one executable brief. The brief must be usable in a fresh session without relying on hidden conversation state.

### 5. Execute

Produce the requested artifact from the executable brief and the raw evidence sources. Do not treat the baseline, critique, or previous answer as proof. Follow any applicable artifact skill and perform proportional checks while building.

### 6. Review

Apply `$necktie-review` with the exact executable brief, candidate artifact, acceptance criteria, source ledger, and compact evidence packet. Use a separate reviewer agent when the host supports it and policy permits; otherwise perform a fresh-context review that does not edit the artifact while judging it.

Handle the decision exactly:

- `APPROVE`: proceed to verification.
- `REVISE`: fix the cited material findings, then return the changed artifact to review.
- `BLOCK`: stop and report the missing evidence, authority, or user decision.

Never route around a reviewer denial by restating the same action. Stop after three revision decisions or after three consecutive reviews with the same unresolved issue.

### 7. Verify

Test, render, calculate, inspect, or otherwise exercise the artifact in the environment where it will be used. If verification exposes a material defect and budget remains, revise and review again. Otherwise block with the concrete failure.

Deliver:

1. The final artifact or a precise link/path to it.
2. The reusable executable brief.
3. A concise verification record and any limitations.
4. What the user may not have considered, if material.
5. The strongest unasked question, with its practical consequence.

Do not reveal private chain-of-thought. Provide concise decisions, evidence, assumptions, and test results instead.

## Use the minimum sufficient intervention

At every phase, prefer the earliest option that meets the acceptance criteria:

1. Do not create anything if explanation or a decision is enough.
2. Reuse a trusted existing asset.
3. Use the host's built-in capability or an installed skill.
4. Use standard-library automation.
5. Add the smallest new implementation.

Do not expand scope merely because the loop discovers an attractive adjacent task.

## Audit the state machine

Use the bundled controller only when persistence is useful:

```text
python skills/necktie/scripts/necktie_loop.py init --goal "..." --output .necktie/run.json
python skills/necktie/scripts/necktie_loop.py transition --file .necktie/run.json --to baseline --note "Sources classified"
python skills/necktie/scripts/necktie_loop.py review --file .necktie/run.json --decision REVISE --reason "Unsupported claim" --issue-signature evidence-gap
python skills/necktie/scripts/necktie_loop.py show --file .necktie/run.json
```

The controller records decisions, not hidden reasoning. It enforces valid transitions and the review circuit breaker; it does not generate or judge the artifact.
