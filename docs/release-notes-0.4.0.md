# Necktie 0.4.0 release notes

Necktie 0.4.0 introduces Lite, Full, and Ultra analysis modes while preserving one public Necktie voice.

- Full is now the default and adds a private ambition pass for the highest-leverage authorized build.
- Lite preserves the focused v0.3 Mammon challenge and Necktie rebuttal.
- Ultra adds a hidden counter-rebuttal that stress-tests Necktie's preliminary restraint before final adjudication.
- `/necktie-mode` manages session and configured defaults on dynamic hosts; `$necktie --mode ...` is a one-shot skill override.
- The optional stdio MCP adapter now serves all three modes through prompt `necktie` and read-only tool `necktie_instructions`.
- Static adapters remain Full, generated policy output is LF-stable, and CI now verifies Windows and Ubuntu checkouts.

There is no off mode and no public Mammon persona. Full and Ultra do not broaden permissions, authority, security risk, or consent boundaries.

Migration: v0.3 behavior is Lite. Select `/necktie-mode lite` for a dynamic session or use `$necktie --mode lite <decision>` for a one-shot invocation.
