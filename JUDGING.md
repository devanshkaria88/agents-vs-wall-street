# Judging and prizes

The cash prize pool totals $10,000. Architecture & Design and Forecast Accuracy each award $4,500. The X and LinkedIn social prizes each award $500. OpenAI has also provided three team prizes in credits for the Architecture & Design winners.

The current prize split is:

| Place | Architecture & Design cash | Architecture OpenAI credits | Forecast Accuracy cash |
| --- | ---: | ---: | ---: |
| First | $2,250 | $5,000 | $2,250 |
| Second | $1,350 | $2,500 | $1,350 |
| Third | $900 | $1,000 | $900 |

The cash and OpenAI credit awards in this table are per team, not per person. The two social prizes are individual awards. All prize claims will be processed and settled after the event. The same entry can win both main prize tracks.

The 100-point overlay below applies only to the Architecture & Design Prize. The Forecast Accuracy Prize is separate and is decided after the companies report.

## Architecture and design

This prize is decided on Sunday. The judges look at the design, financial reasoning, evidence and how easily another person could understand and run the system.

The four judges split into two pairs. From 16:00, every team gets five minutes with one pair to explain what they built and the decisions they made. The two pairs use the same questions and compare notes before the final decision.

The five-minute conversation is the most important part of the architecture judging. It gives every team a direct chance to show the work behind its entry, explain choices that may not be obvious in the code and answer questions. Teams do not need a polished pitch: the judges want to understand what was built and why. The repository, HTML and run log support that conversation and help verify the work.

Three principles apply throughout:

1. **We score the system, not the forecasts.** Whether the numbers prove accurate is covered by the separate Forecast Accuracy Prize. Architecture judges look at how the system produced them.
2. **No type of system starts with an advantage.** A simple loop, a fixed pipeline and a multi-agent system are judged on how well they work, not how complicated they are.
3. **Show what improves the result.** Judges look for visible ways the system finds better information, reasons carefully, calculates forecasts and catches mistakes.

### The system: 70-point overlay

| Category | Points | The question judges ask | Evidence they may use |
| --- | ---: | --- | --- |
| Forecasting approach | 16 | How does the system reason its way to a forecast instead of simply asking an AI model for a number? | The workflow, prompts, code and decision trail showing how research becomes a forecast. |
| Model quality | 12 | Can the judges follow how evidence and assumptions become each of the 12 final numbers, or are the numbers simply asserted? | Calculations, assumptions and traces connecting source evidence to the submitted figures. |
| Data approach | 12 | What information does the system use, where does it come from and how does it check that the information is current and trustworthy? | Sources, citations, retrieval code and the research record produced during the run. |
| Validation and reliability | 12 | Does the system check units, unusual values, conflicting information and other mistakes before it produces the workbooks? | Checks, tests, rejected values, handled failures and the final run log. |
| Agent harness | 9 | Does the way the agent is organised help it complete the task reliably, and can the team explain how it works? | The repository structure, final command, orchestration and evidence that the system ran as described. |
| Tooling and ergonomics | 9 | Did the team build useful tools around the agent, such as search, extraction or checking tools, that help it do better work? | Working tools in the repository and evidence of how they improved the run. |

### The architecture write-up: 30-point overlay

| Category | Points | The question judges ask | Evidence they may use |
| --- | ---: | --- | --- |
| Clarity | 10 | Can a technically minded outsider understand what the system does and why after reading the page for five minutes? | The uploaded HTML, including a plain-English explanation of the workflow and main decisions. |
| Diagram and accuracy | 10 | Does the diagram match the real system, and can someone follow the repository instructions to reproduce the run? | The architecture diagram checked against the code, final command and clear-run log. |
| Honesty and self-knowledge | 6 | Does the team explain what it tried, changed or abandoned, as well as where the system is weakest or may fail? | Specific trade-offs, failed approaches, limitations and known weaknesses. |
| Craft | 4 | Is the page clear and well made enough to publish on the team's OpenStocks profile? | A readable, self-contained page that works in the private judging preview without extra explanation. |

The scorecard is an overlay rather than a ranking formula. Its questions and point ranges help both judge pairs cover the same ground and compare notes. Totals do not automatically choose the winners or break a tie. The four judges make a shared, overall decision from the conversations and supporting evidence.

## Forecast accuracy

This prize is calculated after the four companies report their results. Each of the 12 submitted forecasts is compared with the actual number reported by the company and the frozen internal Wall Street benchmark for the same metric. Each metric has equal weight, so each company contributes 25% of the final score. The lowest average score wins.

For each metric:

1. Calculate the team's absolute miss: `|team forecast - reported result|`.
2. Calculate Wall Street's absolute miss on the same metric.
3. Divide the team miss by the larger of Wall Street's miss and the denominator floor.
4. Cap that metric's score at `5.0`.
5. Average all 12 metric scores.

In compact form:

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

## After the event

OpenStocks offers ongoing $100 prizes for individual earnings events, so teams can keep using their agents after the hackathon. We will also publish a live leaderboard as the four event companies report, with updates sent to attendees and posted on social media.
