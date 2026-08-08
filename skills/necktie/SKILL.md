---
name: necktie
description: Run a goal from raw context to a reviewed, verified final deliverable through the explicit, bounded Necktie Loop. Use when the user invokes /necktie, $necktie, or @necktie; asks to reverse-engineer an iterative conversation into one reusable prompt; wants an independent critique and review gate; or explicitly requests the Necktie workflow.
---

# Necktie

*the angel of late-stage capitalism for your AI agent*

Turn an underspecified or iterative request into one evidence-grounded deliverable and a reusable execution brief. Separate method context from domain evidence, critique the inquiry before optimizing the answer, and stop only at a verified result, a material blocker, or the circuit breaker.

## Start the run

1. Treat the text following `/necktie` or `$necktie` as the goal. Treat attached files, links, and named paths as candidate sources, not automatically as evidence.
2. Read [references/loop-protocol.md](references/loop-protocol.md) and [references/source-discovery.md](references/source-discovery.md) completely before running the loop.
3. Maintain a compact run packet in memory. When the user requests an audit trail, resumability, source discovery, reference matching, or files, initialize `.necktie/run.json` with `scripts/necktie_loop.py` and update it at phase boundaries.
4. Ask a question only when the answer would materially change the objective, evidence, authority, or deliverable. Otherwise record the assumption and proceed.

## Run the loop

### 1. Frame

State the outcome, intended audience, acceptance criteria, constraints, and non-goals. Discover candidates in this order: explicitly named inputs, current-request attachments, configured inboxes, then user-approved search roots. Do not search any other location. Inventory metadata first when a configured boundary does not grant content access.

Accept or reject each material candidate and label every accepted input as one of:

- `evidence`: may support claims in the final output.
- `method`: controls how to work but does not prove domain claims.
- `constraint`: governs scope, format, safety, or authority.
- `prior-output`: useful as a hypothesis or preference, not independent evidence.

When the request says to rebuild, reproduce, compare with, match, or continue an existing deliverable, locate the referenced artifact before leaving Frame. Extract its observable file, section, table, citation, and verification requirements into a deliverable contract. Treat the artifact as `prior-output` or `constraint` unless its underlying sources independently qualify as evidence.

Do not leave Frame while a material source or reference artifact is outside the authorized boundary. Ask one focused authorization question or record the concrete blocker.

### 2. Establish a baseline

Inspect the accepted sources and sketch the smallest plausible approach that could satisfy the entire deliverable contract. Record its assumptions and known weaknesses. Do not reduce requested research breadth, evidence depth, file inventory, or acceptance criteria to make the baseline smaller. Do not polish it into the final artifact yet.

### 3. Critique

Apply the `$necktie-critique` skill to the goal, baseline, discovery record, source ledger, deliverable contract, and acceptance criteria. Require it to challenge the framing, detect missing authorized inputs or scope collapse, identify what the user may have overlooked relative to the goal, name the strongest unasked expert question, and distinguish material questions from optional improvements.

### 4. Reverse

Resolve critique findings with evidence, an explicit authorization decision, or explicit assumptions. Then apply `$necktie-reverse` to compile the complete successful trajectory into one executable brief. Preserve the authorized discovery boundary and exact deliverable contract. The brief must be usable in a fresh session without relying on hidden conversation state.

### 5. Execute

Produce every contracted artifact from the executable brief and accepted raw evidence sources. Do not treat the baseline, critique, reference artifact, or previous answer as proof. Follow any applicable artifact skill and perform proportional checks while building.

### 6. Review

Apply `$necktie-review` with the exact executable brief, candidate artifact, discovery and source decisions, deliverable contract, acceptance criteria, and compact evidence packet. Run the artifact-contract verifier when the contract has machine-checkable requirements. Use a separate reviewer agent when the host supports it and policy permits; otherwise perform a fresh-context review that does not edit the artifact while judging it.

Handle the decision exactly:

- `APPROVE`: proceed to verification.
- `REVISE`: fix the cited material findings, then return the changed artifact to review.
- `BLOCK`: stop and report the missing evidence, authority, or user decision.

Never route around a reviewer denial by restating the same action. Stop after three revision decisions or after three consecutive reviews with the same unresolved issue.

### 7. Verify

Test, render, calculate, inspect, or otherwise exercise the artifact in the environment where it will be used. Verify observable reference requirements and factual claims separately: structural similarity cannot corroborate a claim. If verification exposes a material defect and budget remains, revise and review again. Otherwise block with the concrete failure.

Deliver:

1. The final artifact or a precise link/path to it.
2. The reusable executable brief.
3. A concise verification record and any limitations.
4. What the user may not have considered, if material.
5. The strongest unasked question, with its practical consequence.

Do not reveal private chain-of-thought. Provide concise decisions, evidence, assumptions, and test results instead.

## Use the minimum sufficient intervention

At every phase, prefer the earliest option that meets the complete acceptance criteria:

1. Do not create anything if explanation or a decision is enough.
2. Reuse a trusted existing asset.
3. Use the host's built-in capability or an installed skill.
4. Use standard-library automation.
5. Add the smallest new implementation.

Do not expand scope merely because the loop discovers an attractive adjacent task.

"Minimum" applies to implementation machinery, not to explicit research breadth, evidence depth, required sections, tables, files, or verification. Never shrink the deliverable contract to make the intervention smaller.

## Audit the state machine

Use the bundled controller only when persistence is useful:

```text
python skills/necktie/scripts/necktie_loop.py init --goal "..." --output .necktie/run.json
python skills/necktie/scripts/necktie_loop.py discover --file .necktie/run.json --input "brief.md" --attachment "reference.zip"
python skills/necktie/scripts/necktie_loop.py source --file .necktie/run.json --candidate C001 --decision ACCEPT --kind constraint --use "Defines required outputs"
python skills/necktie/scripts/necktie_loop.py contract --file .necktie/run.json --input .necktie/contract.json
python skills/necktie/scripts/necktie_loop.py transition --file .necktie/run.json --to baseline --note "Sources classified"
python skills/necktie/scripts/necktie_loop.py transition --file .necktie/run.json --to critique --note "Baseline recorded"
python skills/necktie/scripts/necktie_loop.py transition --file .necktie/run.json --to reverse --note "Critique resolved"
python skills/necktie/scripts/necktie_loop.py transition --file .necktie/run.json --to execute --note "Brief compiled"
python skills/necktie/scripts/necktie_loop.py verify-contract --file .necktie/run.json --artifact-root output
python skills/necktie/scripts/necktie_loop.py transition --file .necktie/run.json --to review --note "Candidate frozen"
python skills/necktie/scripts/necktie_loop.py review --file .necktie/run.json --decision APPROVE --reason "All material criteria pass"
python skills/necktie/scripts/necktie_loop.py transition --file .necktie/run.json --to complete --note "Verification passed"
python skills/necktie/scripts/necktie_loop.py show --file .necktie/run.json
```

The controller records decisions, not hidden reasoning. It enforces valid transitions and the review circuit breaker; it does not generate or judge the artifact.
