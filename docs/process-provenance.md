# Necktie process provenance

This document explains which context shaped Necktie, how the context was used, and which boundaries maintainers must preserve. It generalizes local session and asset provenance so the public repository does not disclose personal paths, account data, or private transcripts.

## Identify the starting context

The starting method context included a document commonly titled *The Prompt Reversal Method*. That document was important because it defined the central transformation: analyze the successful path through an iterative exchange, then compile the stable goal, useful corrections, constraints, evidence rules, and output requirements into one self-contained prompt for a fresh execution.

The method document governed process. It did not prove domain claims about KPI data, rental operations, technical-writing standards, software hosts, or plugin behavior.

Other important context included:

- an initial research session that separated ISO 24495 reader-centred document design from ASD-STE100 technical-language control;
- a later prompt-development session that converted rental-store KPI questions into a detailed investigation of source events, employee dependence, silent failures, and minimum controls;
- iterative requests to check the work, identify overlooked considerations relative to the goal, ask only material follow-up questions, and name the strongest unasked expert question;
- a prototype that implemented four skills, a Python state machine, a reviewer schema, documentation, and original branding; and
- Ponytail's cross-host adapter architecture, which supplied the packaging and compatibility baseline but not Necktie's behavior.

## Understand the session order

The research session came first. It established the writing-system analysis and produced substantive research from an initial brief. The prompt-development session came second. It used prompt reversal to preserve the first session's useful decisions, broaden the KPI inquiry, and turn the result into a reusable execution specification.

The final design combined them in this order:

```text
method context -> initial research -> critique and expert-question expansion
               -> reversed execution brief -> fresh execution
               -> independent review -> verification -> reusable plugin workflow
```

This order matters. Reversal occurs after useful feedback has exposed the successful trajectory, but execution returns to raw eligible evidence. A prior answer can guide scope or style; it cannot corroborate itself.

## Measure the influence of the critique prompt

The instruction to check the work, identify overlooked goal-relevant issues, ask follow-up questions, and supply the strongest unasked expert question was highly influential. It produced three permanent controls:

1. Necktie Core applies a proportional self-check to every response.
2. The critique phase challenges the inquiry before the agent optimizes an answer.
3. The review output records the strongest unasked question and its consequence.

The influence is deliberately bounded. Necktie asks the user only when an answer would change the objective, evidence, authority, or deliverable. It omits non-material follow-up ritual and does not turn every response into the full loop.

## Classify the sources

| Source class | Permitted use | Prohibited use |
| --- | --- | --- |
| Evidence | Support a relevant factual claim | Support a claim outside the source's scope |
| Method | Control how the agent works | Prove a domain claim |
| Constraint | Define scope, authority, safety, or format | Act as independent evidence |
| Prior output | Preserve a preference, hypothesis, or candidate passage | Corroborate itself |

The Prompt Reversal Method belongs in `method`. User instructions belong in `constraint`. Original records, standards, code, and test results may belong in `evidence` when they are eligible for the claim being made.

## Separate Core from Loop

Necktie Core is a small, always-on response policy. It checks work, surfaces material omissions, and asks the strongest unasked question when useful.

The Necktie Loop is an explicit workflow:

```text
frame -> baseline -> critique -> reverse -> execute -> review -> verify
```

The loop uses four skills: `necktie`, `necktie-critique`, `necktie-reverse`, and `necktie-review`. A deterministic Python controller can record the state and enforce the review gate. No background service, lifecycle-dependent operating mode, or persistent intensity setting is required.

## Keep the roles separate

| Role | Responsibility | Boundary |
| --- | --- | --- |
| Author | Create and revise the artifact | Does not approve while authoring |
| Critic | Challenge the inquiry before execution | Does not replace evidence with speculation |
| Reviewer | Judge the frozen candidate | Does not edit during the review pass |
| Verifier | Exercise the artifact in its target environment | Does not treat an untested claim as passed |

Use separate agent contexts when the host supports them and policy permits. Otherwise freeze the author packet, perform a read-only review pass, record the decision, and only then resume authoring.

## Preserve the stop conditions

Complete only after the artifact and brief exist, no critical or major finding remains, relevant verification passes, and limitations are explicit.

Block when the same issue survives three consecutive reviews, three revision decisions have been recorded, required evidence or authority is unavailable, or a material user decision is necessary. Do not rename a denied action to evade the gate.

## Record asset and code provenance

The Necktie logo and related brand assets are original works whose publication rights were confirmed by the project owner. This repository records that general fact without embedding private correspondence or personal filesystem metadata.

The cross-host packaging and adapter foundation was derived from Ponytail by Dietrich Gebert under the MIT License. Necktie retains the upstream license notice and a public `NOTICE` while replacing Ponytail's mode behavior, commands, skills, documentation, tests, and branding.

## Apply the documentation profile

This document is governed primarily by ISO 24495-1-oriented plain-language practice because its intended readers must understand, evaluate, and safely modify the Necktie workflow, misunderstanding could cause invalid state transitions, evidence leakage, weakened review independence, or unreliable deliverables, and the document requires both reader-level organization and technical semantic control. It is supplemented by ASD-STE100-oriented controls for consistent terms, explicit conditions, action instructions, decision values, and stopping rules.

This is an ISO-oriented and ASD-STE100-oriented writing profile. It is not a claim of conformity or certification.
