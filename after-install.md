# Necktie for Hermes installed

Enable the plugin if installation did not enable it:

```bash
hermes plugins enable necktie
```

Restart Hermes or its gateway. Necktie Core is then injected before each model call.

Full is the default. Inspect or change the process-session mode with:

```text
/necktie-mode [status|lite|full|mammon|default <mode>]
```

Invoke the explicit judgment with:

```text
/necktie [decision, plan, policy, metric, or artifact]
```

Build a copy-ready research prompt directly with:

```text
$necktie-research [question, conversation, or reference deliverable]
```

Full is Necktie's useful default. Mammon is a selectable mode whose conclusion is not rebutted by Necktie. Neither mode expands authority or relaxes safety boundaries.

On a shared gateway, restrict slash-command access to trusted users with Hermes access controls.
