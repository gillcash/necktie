# Research-prompt protocol

## Contents

1. Completion contract
2. Phase 1 — Discover context
3. Phase 2 — Fingerprint the target
4. Phase 3 — Critique and reframe
5. Phase 4 — Build the blueprint
6. Phase 5 — Draft the controlling prompt
7. Phase 6 — Review and revise
8. Phase 7 — Verify and hand off
9. Lessons from the KPI research package

## Completion contract

The loop is complete only when the final prompt:

- can be executed in a fresh session without hidden conversation state;
- names the real-world outcome, intended reader, research scope, inputs, and required deliverables;
- distinguishes evidence from method guidance, constraints, prior output, and reference output;
- specifies observable quality and verification requirements;
- matches the requested research intensity and any reference artifact's material structure;
- appears in one copy-ready text block;
- has no unresolved critical or major review finding.

Use a maximum of three revision passes at `standard` depth and five at `deep`. Stop earlier on approval. Block when the same material issue survives three reviews or when progress requires unavailable evidence, new authority, or a material user choice.

## Phase 1 — Discover context

### Recover the actual goal

State privately in the run packet:

- the decision or real-world outcome the research must support;
- the intended reader or operator;
- the artifact the researcher must produce;
- jurisdiction, date, organization, scale, and operating case;
- depth, time, source, format, and tool constraints;
- explicit non-goals.

Treat the requested report or prompt as a means, not automatically as the underlying goal.

### Scan before declaring context absent

Within the user-authorized scope, inspect:

- attached and named files;
- relevant files in the current workspace;
- candidate prompts, briefs, research reports, transcripts, source registers, and prior outputs;
- referenced archives or packages, including their inventories and manifests;
- a reference deliverable when the user wants a result "like" an earlier artifact.

Search names such as `*prompt*`, `*brief*`, `*research*`, `*report*`, `*transcript*`, `*source*`, and relevant archives. Follow evidence into a sibling directory only when it is clearly part of the user-provided workspace or explicitly named. Do not scan unrelated home, cloud, or private locations merely because they are accessible.

### Classify every input

Use this ledger:

| Class | Permitted use | Prohibited use |
| --- | --- | --- |
| Evidence | Support factual claims within scope | Prove unrelated claims |
| Method | Control the research or prompt-building process | Prove a domain claim |
| Constraint | Define authority, scope, safety, or format | Masquerade as evidence |
| Prior output | Preserve hypotheses, preferences, or candidate language | Corroborate itself |
| Reference output | Define desired structure, usability, or coverage | Prove its own factual claims |

Record stable locations or exact attachment names. Do not write "use the uploaded files" when a fresh researcher will not know which files that means.

## Phase 2 — Fingerprint the target

Work backward from the intended deliverable. When a reference exists, record a structural fingerprint rather than merely describing it as "comprehensive":

- file inventory and formats;
- section hierarchy;
- required tables and exact columns;
- approximate coverage or row counts when material;
- hypotheses and verdict vocabulary;
- calculations or worked examples;
- citation and source-register design;
- operational checklists, roadmaps, or decision instruments;
- audience, language, visual, offline, and portability requirements;
- quality-control and acceptance tests.

Separate features that caused usefulness from incidental scale. Do not cargo-cult a 25-section report when a smaller schema fully supports the new goal. Do not reduce the schema merely because a shorter prompt is easier to write.

If an earlier prompt sequence exists, identify:

1. the initial request or prompt;
2. the result it produced;
3. the critique or newly discovered question;
4. the reframing that changed the inquiry;
5. the last prompt used for the target deliverable;
6. the target deliverable's observable strengths and defects.

Extract stable decisions from the whole trajectory. Prefer the latest explicit user instruction when iterations conflict.

## Phase 3 — Critique and reframe

Draft the smallest plausible inquiry, then challenge it before polishing.

Test:

- whether the framing blames a person for a system or incentive failure;
- hidden premises and false binaries;
- missing stakeholders, counterexamples, externalities, and failure modes;
- ambiguity in definitions, denominators, populations, jurisdictions, or time periods;
- missing data provenance, source hierarchy, and recency requirements;
- whether a correct-looking result could still produce a wrong decision;
- whether incentives could corrupt the evidence or metric;
- what information may disappear without leaving a record;
- burden, feasibility, privacy, safety, and implementation constraints;
- whether the requested scope or ambition is too small for the stated outcome;
- whether the artifact schema is detailed enough to reproduce the target.

Select relevant expert perspectives with distinct decision rights or failure knowledge. Ask for one reconciled result, not disconnected role-play opinions.

Identify the strongest unasked question: the omitted question whose answer would most change the conclusion, research design, or risk. Classify open questions as:

- `material-now`: different answers require materially different prompts;
- `assumption-safe`: proceed under an explicit default;
- `optional-later`: useful but outside scope.

Pause only for `material-now` questions that cannot safely be assumed.

## Phase 4 — Build the blueprint

Specify only applicable components, but decide each deliberately:

1. Role or integrated expert panel.
2. Outcome and primary management or research question.
3. Central premise to test rather than defend.
4. Intended reader and default operating case.
5. Scope, exclusions, definitions, and required distinctions.
6. Truth chain, system model, taxonomy, or other organizing framework.
7. Hypotheses with a defined verdict scale and counterevidence requirement.
8. Source hierarchy, currency, jurisdiction, conflict, and citation rules.
9. Research methods: walkthrough, comparison, calculation, sampling, anomaly testing, or other appropriate method.
10. Required deliverables, file formats, section order, tables, and exact schemas.
11. Quantitative examples, scenarios, edge cases, or failure propagation.
12. Implementation instruments such as checklists, controls, decision rules, or roadmaps.
13. Writing, accessibility, portability, and audience rules.
14. Final quality-control checks and stopping rule.

For research that may generate a package, distinguish the human-readable report from machine-readable tables and reusable implementation artifacts.

## Phase 5 — Draft the controlling prompt

Write one self-contained prompt in imperative language. A capable researcher must be able to determine from it:

- what to investigate and why;
- which assumptions to test;
- which sources may support claims;
- how current or local facts must be verified;
- what to calculate, compare, or falsify;
- what exactly to deliver;
- how the result will be judged;
- when to state uncertainty or stop.

Use explicit schemas where repeatability matters. Replace adjectives such as "excellent", "deep", or "comprehensive" with observable requirements.

Require citations close to material claims and a source register when the task warrants it. Require the researcher to distinguish external requirements, documented practices, empirical findings, vendor claims, expert inference, and proposed policy.

Tell the researcher to state assumptions and complete the work when unanswered questions are not material. Do not create ceremonial follow-up questions. Do not ask for hidden reasoning; ask for concise rationale, evidence, calculations, and checks.

For Mammon-origin prompts, preserve the user's chosen objective around growth, control, extraction, or leverage. Do not weaken evidence standards or conceal downside risk. For Full-origin prompts, include Necktie's agency, recourse, externality, and durability concerns when material.

## Phase 6 — Review and revise

Freeze the candidate and review it read-only against this rubric:

1. Goal fit — will the research support the real decision?
2. Fresh-session completeness — are context, named inputs, assumptions, and outputs self-contained?
3. Source integrity — are evidence and method separated, with freshness and conflict rules?
4. Inquiry quality — are hidden premises, strongest unasked question, and material countercases addressed?
5. Reproducibility — are deliverables, schemas, calculations, and verdicts observable?
6. Scope and intensity — is depth sufficient without irrelevant bulk?
7. Feasibility — can the requested tool or researcher actually perform the work?
8. Decision safety — are uncertainty, suppression, escalation, or limitation rules present when needed?
9. Usability — is the final prompt copy-ready and understandable?
10. Reference fit — when a target artifact exists, does the prompt encode its material structural fingerprint?

Choose one decision:

- `APPROVE`: no critical or major defect remains.
- `REVISE`: a material, fixable defect remains; identify the smallest required change and an issue signature.
- `BLOCK`: missing evidence, authority, or a user choice prevents a responsible prompt.

After `REVISE`, leave reviewer role, change the draft, then freeze and review it again. Do not approve plausible prose without checking its actual schema.

## Phase 7 — Verify and hand off

Run a fresh-session completeness simulation. Confirm that the prompt answers:

- Outcome for whom?
- Inputs by exact name or description?
- Default case and material assumptions?
- Evidence hierarchy and currency?
- Scope and exclusions?
- Questions, hypotheses, and methods?
- Exact deliverables and schemas?
- Acceptance and quality-control tests?
- Limits and stopping rule?

When a reference output exists, compare the prompt blueprint against its structural fingerprint. Record mismatches as review findings rather than quietly accepting them.

Return:

1. the prompt in one fenced `text` block;
2. a short instruction naming the files to attach or facts to replace;
3. material assumptions and limitations only.

## Lessons from the KPI research package

The KPI benchmark improved because the process did more than add detail:

- A broad KPI question became a decision-safety question about whether source events were trustworthy.
- "Employee diligence" was reframed as workflow, control, and incentive design.
- The prompt defined a default operating case instead of leaving the researcher to invent one.
- A cross-functional panel covered operational, financial, technical, frontline, safety, data, and incentive failure knowledge, then had to reconcile its views.
- A truth chain and data-provenance classes gave the research an organizing model.
- Explicit hypotheses forced verdicts, limitations, confidence, and practical implications.
- Exact master-table schemas converted vague coverage into reproducible analysis.
- Quantitative failure examples showed how bad source events changed downstream decisions.
- Startup and mature-state frameworks made recommendations implementable at different levels of capability.
- A numbered source register, final error checks, strongest unasked question, and expert objections made the output auditable.
- The prompt required a human-readable report plus machine-readable tables and implementation artifacts.

Reuse these design moves when they serve the new outcome. Do not blindly reuse the KPI topic, counts, or section names.
