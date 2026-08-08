# Necktie for Hermes installed

Enable the plugin if installation did not enable it:

```bash
hermes plugins enable necktie
```

Restart Hermes or its gateway. Necktie Core is then injected before each model call. Invoke the bounded loop with `/necktie [goal]`.

Commands:

- `/necktie [goal]`
- `/necktie-critique [inquiry]`
- `/necktie-reverse [session or brief]`
- `/necktie-review [candidate and criteria]`

On a shared gateway, restrict slash-command access to trusted users with Hermes access controls.
