# Verbatim excerpts (copied this session, 2026-08-16)

## SCHEDULE.md:5-18 — order of the day

| Time | What happens |
| --- | --- |
| 10:00–10:30 | Doors open, coffee and registration. |
| 10:30–11:15 | Welcome, challenge briefing, rules, tools and questions. |
| 11:15 | Building starts. |
| 13:00 | Lunch is served. Teams can keep working. |
| 16:00–17:15 | First judging pass. Every team gets five minutes with one judge pair. |
| 17:00 | Social competition closes. |
| 17:15 | Architecture HTML locks and the 45-minute final-run window opens. |
| 17:30 | OpenStocks opens for challenge uploads. |
| 18:00 | Hard deadline. All four workbooks must be uploaded to OpenStocks and the private team entry must be recorded. |
| 18:00–19:00 | Judges complete the architecture decision and confirm valid entries. |
| Around 19:00 | Results, closing remarks and what happens next. |

## JUDGING.md:53-83 — forecast accuracy (full section)

For each metric:

1. Calculate the team's absolute miss: `|team forecast - reported result|`.
2. Calculate Wall Street's absolute miss on the same metric.
3. Divide the team miss by the larger of Wall Street's miss and the denominator floor.
4. Cap that metric's score at `5.0`.
5. Average all 12 metric scores.

```text
metric score = min(5.0, team absolute miss / max(Wall Street absolute miss, floor))
final score  = average of the 12 metric scores
```

A score below `1.0` means the team beat Wall Street on that metric. A score of `1.0` means the misses were equal. A score above `1.0` means Wall Street was closer.

| Situation | Treatment |
| --- | --- |
| Percentage metric | The denominator floor is 0.5 percentage points. |
| Money or EPS metric | The denominator floor is 0.5% of the absolute reported result, with a small fixed fallback if the reported result is zero. |
| Missing forecast | That metric scores 5.0 rather than disqualifying the whole entry. |
| Accuracy tie | First compare how many of the 12 metrics each team beat Wall Street on. If still tied, split the relevant Accuracy Prize. |

Worked example: if the reported result is `110`, Wall Street forecast `100` and the team forecast `106`, Wall Street's miss is `10` and the team's miss is `4`. The team's metric score is `4 / 10 = 0.40`, so it beat Wall Street on that metric.

The Wall Street benchmark for each metric is frozen internally at the 18:00 submission deadline and is not supplied to teams. Forecasts cannot change after the deadline.

## JUDGING.md:33-40 — the system: 70-point overlay

| Category | Points | The question judges ask |
| --- | ---: | --- |
| Forecasting approach | 16 | How does the system reason its way to a forecast instead of simply asking an AI model for a number? |
| Model quality | 12 | Can the judges follow how evidence and assumptions become each of the 12 final numbers, or are the numbers simply asserted? |
| Data approach | 12 | What information does the system use, where does it come from and how does it check that the information is current and trustworthy? |
| Validation and reliability | 12 | Does the system check units, unusual values, conflicting information and other mistakes before it produces the workbooks? |
| Agent harness | 9 | Does the way the agent is organised help it complete the task reliably, and can the team explain how it works? |
| Tooling and ergonomics | 9 | Did the team build useful tools around the agent, such as search, extraction or checking tools, that help it do better work? |

## JUDGING.md:44-49 — the architecture write-up: 30-point overlay

| Category | Points | The question judges ask |
| --- | ---: | --- |
| Clarity | 10 | Can a technically minded outsider understand what the system does and why after reading the page for five minutes? |
| Diagram and accuracy | 10 | Does the diagram match the real system, and can someone follow the repository instructions to reproduce the run? |
| Honesty and self-knowledge | 6 | Does the team explain what it tried, changed or abandoned, as well as where the system is weakest or may fail? |
| Craft | 4 | Is the page clear and well made enough to publish on the team's OpenStocks profile? |

## RULES.md:24-32 — it must be built during the event

- The competition entry must be built after the challenge officially starts on Sunday.
- You cannot arrive with a pre-built forecasting agent, challenge-specific code, system prompts, research, forecasts, workflows or architecture explanation.
- Off-the-shelf models, public libraries, agent frameworks, generic utilities and your normal unmodified coding harness are allowed. Declare any existing components you use in `entry.json`.
- The official document-search helper supplied in this repository is allowed. Any competition-specific retrieval, extraction, reasoning or forecasting work built on top of it must still be created during the event.
- Keep the repository history and run logs so the organisers can see when the work was created.
- If the organisers find credible evidence that the entry, or a substantial competition-specific part of it, was made before the challenge started, the entire entry is immediately disqualified from all prizes.

## RULES.md:34-40 — the final run

- The final-run window opens at 17:15 and lasts for 45 minutes.
- Your final command must process all four companies and produce all four required `.xlsx` workbooks.
- You can retry after a crash or failed run, provided you complete one clear run and all four manual uploads before 18:00.
- Keep the final clear-run log and identify the commit used for that run.
- Do not submit forecasts made by hand outside the system you describe.

## SUBMISSION.md:26-28 — units conventions

Each file must keep its supplied `Summary` sheet, three exact metric labels, units and fiscal-period header. Only the yellow forecast cells should be filled in.

For percentage metrics, enter percentage points: `4.5` means 4.5%, not 450% and not 0.045. For Hays EPS, enter pence: `6.2` means 6.2 pence.

## SUBMISSION.md:30-40 — a clear run

A clear run is one execution of your final command that:

- starts from the declared final commit;
- processes all four companies;
- records a timestamped log of what the system did;
- produces all four completed workbooks; and
- matches the system described in your architecture HTML closely enough for the explanation to remain honest.
