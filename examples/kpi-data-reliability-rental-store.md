# Example: KPI data reliability for a tool and equipment rental store

Invoke the complete workflow with:

```text
/necktie Assess whether a tool and equipment rental store can trust its utilization, dollar utilization, turnaround, maintenance cost, damage recovery, receivables, forward-booking, and repeat-business KPIs. Trace each KPI to source events, identify human and system dependencies, find silent failure modes, propose the least burdensome effective controls, and verify every material claim against eligible evidence.
```

The frame must identify the store type, readers, decisions, systems, data horizon, and risk tolerance. If those details are unavailable, state a narrow default operating case and do not imply that it describes the user's actual business.

The strongest unasked question is usually which source event can fail silently while several downstream KPIs remain plausible. Its answer determines where the first preventive or detective control belongs.
