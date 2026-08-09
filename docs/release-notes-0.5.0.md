# Necktie 0.5.0 release notes

Necktie 0.5.0 replaces Ultra with Mammon and makes Full and Mammon useful beyond opinion.

- Lite retains the focused Mammon challenge followed by Necktie's rebuttal.
- Full remains the default, adds the private ambition pass, and now completes authorized work or normally offers one context-specific useful action.
- Mammon returns Mammon's evidence-based recommendation without a Necktie rebuttal. It does not relax authority, security, privacy, consent, accessibility, validation, or verification boundaries.
- `necktie-research` builds a portable research prompt through source discovery, reference fingerprinting, prompt reversal, inquiry critique, exact schema design, bounded review, and fresh-session verification.
- An explicit request or acceptance of a Full/Mammon research-prompt offer starts the process immediately; the agent must not ask for permission twice.
- The optional state controller records prompt-building phases, review decisions, and verification without storing private reasoning.

Migration: `ultra` is no longer a valid mode. Existing configuration or `NECKTIE_DEFAULT_MODE=ultra` safely falls back to Full with a warning. Select `/necktie-mode mammon` or `$necktie --mode mammon ...` explicitly because Mammon's final authority is materially different from the former Ultra policy.
