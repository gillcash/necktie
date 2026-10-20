# Necktie checks

Run each prompt in `fixtures.json` with the same model, evidence, permissions, and environment, with and without Necktie. Score observable decisions, supported payoff arithmetic, material downsides, useful work, and uncertainty. Record failures, latency, and token cost; do not collect private reasoning.

Publish inputs, scoring rules, sample sizes, and limitations with results. No benchmark-performance claim is made.

## Run the behavioral eval

`npm run eval` runs every fixture with and without the policy, then grades each response against the fixture's `expectations`. It calls a paid model API, so it needs an API key. It is not part of `npm test` and does not run in CI.

```bash
export ANTHROPIC_API_KEY=...                            # or OPENAI_API_KEY with --provider openai
npm run eval -- --model <model-id> --samples 3
npm run eval -- --model <model-id> --grader-model <id>  # grade with a different model
npm run eval -- --dry-run                               # print the plan; no API calls
```

| Option | Default | Meaning |
| --- | --- | --- |
| `--model` | required | Model under test. |
| `--provider` | the provider whose key is set, else `anthropic` | `anthropic` (Messages API) or `openai` (Chat Completions). |
| `--grader-model` | `--model` | Model that grades responses. |
| `--samples` | `3` | Responses per fixture and condition. |
| `--max-tokens` | `1500` | Output limit for Anthropic calls. |
| `--base-url` | provider default | Compatible endpoint; `NECKTIE_EVAL_BASE_URL` also works. |
| `--fixtures` | `benchmarks/fixtures.json` | Fixture file. |
| `--output` | `benchmarks/results/<time>.json` | Report path. The `results` directory is git-ignored. |

With the defaults, a run makes 36 API calls: 3 fixtures, 2 conditions and 3 samples, plus one grading call per response.

## How it scores

- **Conditions.** `baseline` sends the prompt with no system prompt. `necktie` sends the policy from `skills/necktie/references/policy.md` as the system prompt. Hosts inject the policy in other ways, through hook context or rule files, so this approximates them rather than reproducing any one host.
- **Grading.** A separate call sees only the request, the response, and the expectations. It does not see which condition produced the response. For each expectation it returns met or not met with a one-sentence reason.
- **Score.** A response scores the share of its fixture's expectations that were met. Responses whose grading cannot be parsed are reported and left out of the score.
- **Report.** The JSON report records the provider, both models, the sample count, SHA-256 hashes of the policy and fixtures, every response with its latency and token usage, every grade, and a summary of mean score, latency and output tokens for each fixture and condition.

## Limitations

The grader is a model, often from the same family as the model under test, and it can be wrong. Three fixtures with a few samples each give wide uncertainty. Read a sample of graded responses before reporting any result, and publish the report with the model, sample size and these limitations.
