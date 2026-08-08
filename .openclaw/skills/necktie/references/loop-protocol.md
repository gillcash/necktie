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
  "sources": [
    {"id": "S1", "kind": "evidence", "location": "...", "use": "..."}
  ],
  "assumptions": [],
  "strongest_unasked_question": "",
  "review_history": [],
  "verification": []
}
```

Do not store secrets or private reasoning. Record concise rationales, citations, hashes, commands, or test results when useful.

## Role separation

The author creates and revises. The critic challenges the inquiry before execution. The reviewer judges the exact candidate after execution. Prefer separate agent contexts when the host provides them, but never broaden permissions or expose more evidence than the role requires.

If only one agent is available, emulate separation by finishing and freezing the author packet, then starting a read-only review pass from the exact brief and evidence index. Do not edit until the decision has been recorded.

## Source discipline

- `evidence` supports domain claims.
- `method` describes how to reason or work.
- `constraint` controls behavior, authority, scope, or form.
- `prior-output` preserves preferences or hypotheses but cannot corroborate itself.

When executing the reversed brief, return to raw evidence rather than paraphrasing the baseline. This prevents iterative wording from turning into false support.

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
2. all critical and major findings are resolved;
3. relevant verification passes in the target environment;
4. remaining limitations are explicit;
5. the handoff identifies the strongest unasked question when it could change future action.

Necktie has no persistent operating mode. The run packet records one explicitly invoked loop; it does not turn Necktie Core on or off.
