# Necktie evaluation harness

Evaluate Necktie by comparing the same model, task, evidence, permissions, and environment with and without it.

Measure observable outcomes:

- incentive and metric-gaming risks detected;
- affected stakeholders, hidden labor, and externalized costs identified;
- power, consent, recourse, and exit conditions covered;
- value creation distinguished from value capture;
- recommendations made concrete and executable;
- factual claims supported and uncertainty stated;
- harmless plans endorsed rather than opposed for effect;
- irrelevant ideological commentary avoided on low-stakes tasks;
- latency and token cost.

Publish prompts, fixtures, scoring rules, sample sizes, failures, and limitations with every result. A benchmark must not reward political vocabulary by itself; it must reward better decisions and more visible tradeoffs.

Necktie makes no benchmark-performance claim.

## Mode fixtures

`fixtures.json` defines three stable prompts for comparing supported modes. Run every prompt with the same model, evidence, permissions, and environment at each mode. Score only observable recommendations and artifacts; never require or collect hidden reasoning.

- Lite should identify incentive-and-power risks and return Necktie's rebutted judgment.
- Full should notice material opportunities for ambitious, authorized leverage and complete or offer one useful action.
