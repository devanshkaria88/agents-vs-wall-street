---
name: hackathon-rules
description: >
  Agents vs Wall Street hackathon rules, deadlines, scoring formula, judging
  scorecard, and submission mechanics. Consult BEFORE any decision involving
  timing, deadlines, what to build next, scoring trade-offs, whether something
  is allowed, uploads, entry.json, the architecture HTML, or the final run.
  If a choice could affect points or eligibility, this skill is the authority.
---

# Hackathon rules (verified 2026-08-16 against repo files + openstocks.com/hackathon)

All facts below were read from the rule files this session. Web page matches repo. `file:line` refs are clickable.

## Deadlines (London time, today — SCHEDULE.md:12-15)

| Time | Event |
|---|---|
| 17:00 | Social competition closes |
| 17:15 | **Architecture HTML locks** and the 45-minute final-run window opens |
| 17:30 | OpenStocks opens for challenge uploads; private entry form opens |
| 18:00 | **Hard deadline** — all four workbooks uploaded AND private team entry recorded |

"The 17:00, 17:15, 17:30 and 18:00 deadlines do not move unless the organisers announce a change to everyone." (SCHEDULE.md:22)

## Accuracy formula (JUDGING.md:66-70, verbatim)

```text
metric score = min(5.0, team absolute miss / max(Wall Street absolute miss, floor))
final score  = average of the 12 metric scores
```

Lowest average wins (JUDGING.md:55). Floors and special cases (JUDGING.md:74-79):

- Percentage metric → "The denominator floor is 0.5 percentage points."
- Money or EPS metric → "The denominator floor is 0.5% of the absolute reported result, with a small fixed fallback if the reported result is zero."
- Missing forecast → "That metric scores 5.0 rather than disqualifying the whole entry."
- Tie → first compare how many of the 12 metrics each team beat Wall Street on.

Worked example (JUDGING.md:81): reported 110, WS forecast 100, team 106 → team miss 4 / WS miss 10 = 0.40.

"The Wall Street benchmark for each metric is frozen internally at the 18:00 submission deadline and is not supplied to teams." (JUDGING.md:83)

**Strategic implications (arithmetic, not opinion):**
- A blank cell scores 5.0 — the worst possible. NEVER leave a blank.
- Score is capped at 5.0 but unbounded effort below 1.0 — one blowup costs as much as five solid metrics earn. Anchor conservatively; no hero calls.
- Each company is exactly 25% of the score (JUDGING.md:55); each metric 1/12.

## Architecture & Design: 100-point overlay (JUDGING.md:31-51)

The system, 70 pts (JUDGING.md:35-40): Forecasting approach **16**, Model quality **12**, Data approach **12**, Validation & reliability **12**, Agent harness **9**, Tooling & ergonomics **9**.

The write-up, 30 pts (JUDGING.md:46-49): Clarity **10**, Diagram & accuracy **10**, Honesty & self-knowledge **6**, Craft **4**.

"The scorecard is an overlay rather than a ranking formula." (JUDGING.md:51) The 5-minute judge conversation at 16:00-17:15 "is the most important part of the architecture judging" (JUDGING.md:23). "We score the system, not the forecasts." (JUDGING.md:27)

## Submission mechanics

Required output (SUBMISSION.md:19-24): `submission/HD-FY2026Q2.xlsx`, `submission/ADI-FY2026Q3.xlsx`, `submission/HAS-FY2026.xlsx`, `submission/DE-FY2026Q3.xlsx`.

- `npm run check:submission` = check-entry + check-forecasts (package.json). What it actually enforces is in the output-validation skill.
- "Uploads are manual. The agent must not submit to OpenStocks programmatically." (RULES.md:55)
- "If you upload more than once, the last valid workbook received before the deadline counts." (RULES.md:56)
- Private form (SUBMISSION.md:54): agent name + primary contact name/email + repo URL must match entry.json; attach entry.json + architecture/index.html; resubmitting whole form before 18:00 replaces it.
- "Do not submit forecasts made by hand outside the system you describe." (RULES.md:40)
- Keep final clear-run log (in `logs/`) and identify the final commit (RULES.md:39, SUBMISSION.md:67).

entry.json hard validation (scripts/check-entry.mjs, read this session): ≤64KB; 1-4 teamMembers with valid unique emails; buildStyle ∈ {headless-agent, coding-harness, hybrid, other}; primaryModels + languagesAndFrameworks non-empty lists; repositoryUrl must be the ROOT of an https://github.com repo (check-entry.mjs:109-118); finalCommit 7-40 hex chars; finalCommand ≤500 chars; emailUseConfirmed === true; architecture/index.html must exist, be 1B-2MB text, and contain `<html` (check-entry.mjs:129-142).

- "Do not commit `entry.json` or publish email addresses in the architecture HTML." (RULES.md:65) — it is already gitignored.
- HTML: "Keep it self-contained and no larger than 2 MB. Scripts, external assets and network requests do not run in the judging preview. Do not include secrets." (RULES.md:48)

## Built-during-event + fair play

- "The competition entry must be built after the challenge officially starts on Sunday." (RULES.md:26)
- Off-the-shelf models/libraries/harnesses allowed; declare pre-existing components in entry.json (RULES.md:28).
- The supplied document-search helper (`starter/search.py`) is allowed (RULES.md:29).
- "Keep the repository history and run logs so the organisers can see when the work was created." (RULES.md:30) — commit frequently, real messages.
- Final run (RULES.md:36-39): window 17:15 + 45 min; one clear run of the final command producing all four workbooks; retries allowed after crashes; complete before 18:00.
- Corpus + public web info both allowed (RULES.md:22).

Longer verbatim excerpts: [references/verbatim.md](references/verbatim.md)
