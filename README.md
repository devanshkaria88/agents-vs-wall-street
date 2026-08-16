# Agents vs Wall Street

Agents vs Wall Street is a one-day hackathon presented by Primer, OpenStocks, AI Tinkerers and OpenAI. Around 50 people will build 20–25 forecasting agents, working alone or in teams of up to four.

The challenge covers four companies: Home Depot, Analog Devices, Hays plc and Deere & Company. Your agent forecasts three reported figures for each.

The repository includes a frozen historical corpus of 1,139 filings, call-transcript sections and slide documents for the four known companies. Start at [challenge/offline-data/INDEX.md](challenge/offline-data/INDEX.md) or search the Markdown files directly.

Your agent should be able to do the research, make the financial judgements and produce completed OpenStocks workbooks with as little manual help as possible.

## What the day is for

1. **Build something real.** Create a repeatable agent that researches companies, makes financial judgements and produces completed forecast workbooks.
2. **Show what is possible.** Help us learn what works and show how powerful this technology can be when it is assembled properly.

OpenStocks offers ongoing $100 prizes for individual earnings events after the hackathon, so build an agent you can use again.

## The challenge at a glance

- Doors open at 10:00 on Sunday 16 August 2026 at Ground Floor, 33 Johns Mews, London WC1N 2QL. The competition briefing begins at 10:30 and building starts at 11:15.
- Teams can have one to four people.
- Each individual or team enters one agent.
- Each team receives $50 of Codex credit, kindly provided by OpenAI.
- Competition-specific work must be built during the event; evidence of a pre-made entry means disqualification from all prizes.
- Your agent must forecast three figures for each of four companies.
- The final run starts at 17:15 and must finish before the 18:00 deadline.
- OpenStocks opens for challenge uploads at 17:30.
- Your final command must produce all four `.xlsx` workbooks.
- Upload each workbook manually to the matching company Forecast Model on [openstocks.com](https://openstocks.com).
- If you upload more than once, the last valid workbook uploaded for each company before 18:00 is your final forecast.

## What you need to submit

1. A completed private `entry.json` with the agent name, every team member and email address, technical setup and final-run details. Upload it through openstocks.com/hackathon; no account is needed for this private team-entry form.
2. Your code repository and the commit used for the final run.
3. The completed self-contained `architecture/index.html`, uploaded through the same private form. You do not need to host it anywhere.
4. A timestamped log from a clear run of the system.
5. Four completed company workbooks in `submission/`.

Complete [ENTRY.md](ENTRY.md), then read [SUBMISSION.md](SUBMISSION.md) before the final run. The full event rules are in [RULES.md](RULES.md), the day is set out in [SCHEDULE.md](SCHEDULE.md), and the judging process is explained in [JUDGING.md](JUDGING.md).

By submitting the private team entry, your team accepts the hackathon and prize rules in [RULES.md](RULES.md).

## Expected final output

Your final command can use any language or framework, and it can run the four companies one after another or at the same time. It must finish by creating these exact files:

```text
submission/
├── ADI-FY2026Q3.xlsx
├── DE-FY2026Q3.xlsx
├── HAS-FY2026.xlsx
└── HD-FY2026Q2.xlsx
```

Start from the supplied files in `challenge/templates/`. Do not rename the `Summary` sheet, metric labels, units or fiscal-period column.

Run `npm install` and `npm run setup:entry` once. Complete the private `entry.json` and `architecture/index.html`, then use `npm run check:submission` before uploading. It checks the entry record, architecture file and four workbooks. It does not judge whether the forecasts are good.

## Running the project

### One-time setup

```bash
npm install
npm run setup:entry      # creates your private entry.json from the template
```

Create a Python virtual environment (the forecaster expects it at `.venv/`):

```bash
python3 -m venv .venv
.venv/bin/pip install anthropic openpyxl
```

Set your API key — copy the example file and fill in your key:

```bash
cp .env.example .env
# then edit .env and set ANTHROPIC_API_KEY=<your key>
```

The agent reads the key from `.env` automatically. Never commit `.env`.

### Run the forecasting agent

There are two modes depending on whether you want a live LLM extraction run or a fast deterministic run from pinned drivers.

**Fast run (pinned drivers, no LLM):** uses the reviewed drivers already in `research/drivers/` and skips the extraction step. Good for workbook regeneration and submission validation:

```bash
npm run forecast
```

Pipeline stages: `engine → validate → write-workbooks → check-forecasts`. Workbooks are only written after validation passes. The timestamped log is saved to `logs/`.

**Full run (live LLM extraction, one company at a time):** runs the complete pipeline — agent readers, citation firewall, consensus voting, calibration, validator, workbook writer — for one company:

```bash
.venv/bin/python -m forecaster.fullrun hays
.venv/bin/python -m forecaster.fullrun home-depot
.venv/bin/python -m forecaster.fullrun analog-devices
.venv/bin/python -m forecaster.fullrun deere
```

Both modes write the same final files:

```text
submission/ADI-FY2026Q3.xlsx
submission/DE-FY2026Q3.xlsx
submission/HAS-FY2026.xlsx
submission/HD-FY2026Q2.xlsx
```

Agent model and effort are set in `agent/config.json`.

### Observability UI

A Next.js dashboard that lets you inspect agent traces and forecast outputs in real time:

```bash
npm run observe
```

Open [http://localhost:3000](http://localhost:3000). The UI reads from `logs/` and `forecasts/` and hot-reloads as files change. See [observability/README.md](observability/README.md) for details.

### Validate before uploading

```bash
npm run check:submission   # entry.json + all four workbooks
npm run check:entry        # entry.json only
npm run check:forecasts    # workbooks only
```

All checks must pass before you upload to OpenStocks. Fix any blank cells or unit errors flagged by the checker — a blank cell scores an automatic 5.0.

### Tests

Run the starter search-helper unit tests:

```bash
npm run test:starter
```

Verify that every citation in the research dossiers and drivers still matches its source document byte-for-byte:

```bash
.venv/bin/python tools/verify_citations.py
```

Run a backtest (hide a past quarter, re-forecast it, compare to the reported number):

```bash
.venv/bin/python -m forecaster.backtest hays FY2025H2
.venv/bin/python -m forecaster.backtest hays FY2025H2 --dry-run   # no LLM call
```

Available holdout specs are defined in `research/backtests/holdouts.json`.

## Optional document-search helper

[`starter/search.py`](starter/search.py) is a small, dependency-free example of searching the supplied Markdown corpus and producing a cited research note. It does not make forecasts or edit a workbook.

```bash
python3 starter/search.py --company HD
less research/HD.md
```

Use `HD`, `ADI`, `HAS` or `DE` for the four challenge companies. The output contains search leads rather than verified financial history, so check each figure in its cited document. Read [starter/README.md](starter/README.md) for narrower searches and testing instructions.

## Repository map

```text
agent/                     LLM reader loop, tool definitions, per-company skill files
agent/config.json          Model, effort, skill routing — edit to change the LLM
forecaster/                Deterministic engine, validator, backtest harness
forecaster/run.py          Entry point for `npm run forecast` (pinned-driver fast run)
forecaster/fullrun.py      Full LLM pipeline, one company at a time
forecaster/backtest.py     Holdout backtest harness
forecasts/                 Engine outputs: forecasts.json, traces.json, calibration.json
research/                  Citation-verified dossiers, drivers, and backtest specs
tools/                     write_workbooks.py, verify_citations.py
observability/             Next.js dashboard (`npm run observe` → http://localhost:3000)
challenge/                 Companies, metrics, workbook templates and historical documents
architecture/index.html    Template for the required architecture explanation
entry.template.json        Template for private team and agent details
submission/                Put the four completed workbooks here
logs/                      Timestamped run logs and agent traces
scripts/                   Local entry and workbook checks
starter/                   Optional historical-document search helper
```

## Licence

The original code and documentation in this repository are available under the [MIT License](LICENSE). The historical company documents under `challenge/offline-data/` are excluded; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
