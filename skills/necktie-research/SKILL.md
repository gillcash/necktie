---
name: necktie-research
description: Build a self-contained, copy-ready research prompt through a bounded prompt-reversal, critique, schema, review, and verification loop. Use when the user invokes $necktie-research; asks for a deep-research prompt, research brief, controlling brief, or reusable prompt; wants to reverse-engineer a successful conversation or deliverable into one prompt; or accepts Necktie's offer to draft a research prompt.
---

# Necktie Research

Turn an initial question, iterative conversation, prior research, or reference deliverable into one portable prompt that a capable researcher can execute without hidden session context.

## Start the loop

1. Treat an explicit invocation or the user's acceptance of a Necktie offer as authorization to begin. Recover the approved topic and intended artifact from the conversation; do not ask for permission again.
2. Read [references/research-prompt-protocol.md](references/research-prompt-protocol.md) completely before drafting.
3. Use `standard` depth unless the user asks for deep, exhaustive, multi-pass, or reference-matching work; then use `deep`.
4. Infer the originating perspective from the active Necktie mode: `full` by default or `mammon` when selected. The perspective shapes the research objective, not the evidence standard.
5. Ask only for a missing answer that would materially change the research objective or required output. Otherwise label a reasonable assumption and continue in the same turn.

## Build the prompt

Run every protocol phase: discover, fingerprint, critique, blueprint, draft, review, revise if necessary, and verify. Scan all relevant sources inside the user-authorized workspace, attachments, named paths, and referenced packages before declaring context absent. Do not silently search unrelated private locations.

Make the prompt:

- self-contained and independent of this conversation;
- tool-neutral unless the user names a tool;
- explicit about outcome, audience, default case, scope, sources, hypotheses, deliverables, schemas, evidence rules, quality checks, and stopping conditions where those elements matter;
- proportionate to the requested research depth rather than artificially short;
- easy to copy as one fenced text block.

Do not request hidden chain-of-thought. Request concise assumptions, decisions, evidence, calculations, citations, checks, and limitations instead.

## Review and hand off

Freeze the draft before each review. Return `APPROVE`, `REVISE`, or `BLOCK` internally, fix only material findings, and respect the protocol's circuit breaker. Verify fresh-session completeness and compare the structure with a reference deliverable when one exists.

Lead the handoff with the final prompt in one `text` code block. Then list only material usage instructions, assumed inputs, and unresolved limitations. Save the prompt to a file only when the user requests a file or the surrounding task already authorizes artifact creation.

For an audit trail or resumable run, use:

```text
python skills/necktie-research/scripts/research_prompt_loop.py init --goal "..." --depth standard --origin-mode full --output .necktie/research-prompt.json
python skills/necktie-research/scripts/research_prompt_loop.py transition --file .necktie/research-prompt.json --to discover --note "Candidate context located"
python skills/necktie-research/scripts/research_prompt_loop.py review --file .necktie/research-prompt.json --decision REVISE --reason "Output schema is underspecified" --issue-signature schema-gap
python skills/necktie-research/scripts/research_prompt_loop.py verify --file .necktie/research-prompt.json --result PASS --reason "Fresh-session completeness check passed"
```

The controller records phase decisions, not private reasoning. Persistence is optional; the bounded process is not.
