# Agents vs Wall Street — hackathon entry (2026-08-16)

Team entry (Devansh Karia, Jack Marshall, Mani Sarkar): an agent that
forecasts 12 earnings metrics (HD FY26Q2, ADI FY26Q3, Hays FY2026,
DE FY26Q3 — 3 metrics each) into four xlsx workbooks, scored against a
hidden Wall Street benchmark.

## Deadlines (today, London time — do not plan past them)

- **17:15** architecture HTML locks; 45-min final-run window opens
- **17:30** OpenStocks uploads + private entry form open
- **18:00** hard deadline: 4 workbooks uploaded + entry recorded
- Safety valve: if 13:00 arrives and `npm run check:submission` is not green
  with numbers in all 12 cells, drop everything and make it green.

## Non-negotiables

1. **The LLM never does arithmetic.** LLM extracts structured drivers with
   citations; deterministic Python calculates. (forecast-method skill)
2. **Every number is traceable** to a doc path + verbatim line + date, with a
   saved evidence→calculation trace per metric.
3. **Never a blank cell** — a blank scores an automatic 5.0. Baseline first,
   refine later.
4. **Units**: % as percentage points (4.5 = 4.5%); Hays EPS in PENCE; money
   in millions (USDm/GBPm). (output-validation skill)
5. **Commit frequently with real messages** — git history is our provenance
   evidence for the built-during-event rule (RULES.md:30).
6. Uploads are MANUAL. Never attempt to submit to OpenStocks
   programmatically (RULES.md:55). Never commit `entry.json`; no secrets in
   repo, HTML, or logs.

## Skill routing — consult before acting

| Work area | Skill |
|---|---|
| Deadlines, scoring formula, what's allowed, entry/upload mechanics, judging scorecard | `hackathon-rules` |
| Anything about HD / ADI / Hays / DE: metrics, guidance, history, doc locations | `company-dossiers` |
| Writing extraction/calculation/forecasting code, choosing or adjusting a number | `forecast-method` |
| Writing or validating xlsx workbooks, check:submission, units | `output-validation` |

Corpus: `challenge/offline-data/` (1,139 md docs, frozen 2026-08-14). Search
with `rg -i "terms" challenge/offline-data/<company>/`. Python: `.venv/bin/python`
(openpyxl installed). Checker: `npm run check:submission`.

# Cross-agent collaboration

This project is being worked on collaboratively by **Claude Code** and **Cursor**. The two agents stay in sync via `context/last_update.md`, which is updated automatically by hooks after each turn.

**Before responding, check `context/last_update.md`** — if it contains `agent: cursor`, that's a turn the other agent did. Read it and reconcile before answering. If `agent: claude`, that was your own previous turn.

Recent git history (`git log --oneline -10`) also tells you what each agent committed.
