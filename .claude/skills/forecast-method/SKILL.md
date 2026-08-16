---
name: forecast-method
description: >
  The forecasting architecture contract for Agents vs Wall Street. Consult
  BEFORE writing any extraction, calculation, or forecasting code, designing
  prompts, choosing a number, deviating from guidance, or explaining the
  method to judges. Defines the LLM/code division of labour, the anchoring
  rule, and the evidence-trace format. Non-negotiable within this repo.
---

# Forecast method — the architecture contract

Grounded in the scoring math verified in the hackathon-rules skill:
`min(5.0, |team miss| / max(|WS miss|, floor))`, missing = 5.0, capped at 5.0.

## Division of labour (non-negotiable)

**The LLM extracts; deterministic code calculates.**

1. LLM reads corpus documents and emits **structured JSON drivers only**:

```json
{
  "driver": "FY26 pre-exceptional operating profit guidance",
  "value": 46.0, "low": 44.0, "high": 46.0, "unit": "GBPm",
  "citation": {
    "doc_path": "challenge/offline-data/hays/filings/2026-07-10__has-ln-20260710-filing-2__1572799.md",
    "verbatim_line": "we currently expect FY26 pre -exceptional operating profit will be at the top of the £37.0 -46.0m consensus rang e",
    "published": "2026-07-10"
  }
}
```

2. Deterministic Python performs ALL arithmetic — growth application, EPS
   division, unit conversion, aggregation. The LLM never adds two numbers.
3. Every metric gets an **evidence→calculation trace** saved to disk: inputs
   (each with citation), formula applied, output, validation verdicts. The
   trace is what judges score under Model quality (12 pts): "Can the judges
   follow how evidence and assumptions become each of the 12 final numbers?"

Reject any extracted driver whose `verbatim_line` cannot be re-found in
`doc_path` by exact substring search — hallucination firewall, run in code.

## Anchoring rule

**Forecast = guidance midpoint, adjusted by the company's historical beat bias, unless cited evidence justifies deviating.**

- Anchor: the most recent company guidance for the target metric/period
  (all four target companies have current guidance in the corpus — see
  company-dossiers).
- Adjustment: historical guide-vs-actual bias measured from the corpus
  (e.g. if a company beat its revenue guidance midpoint in 7 of 8 quarters
  by ~1%, shift the anchor accordingly). Bias is computed by code from
  extracted pairs, never estimated by the LLM.
- Deviation: allowed ONLY with a cited, dated piece of evidence newer or more
  specific than the guidance itself. No vibes-based adjustments.

## Why conservative anchoring wins (scoring math, not taste)

- The hidden Wall Street benchmark is ~the analyst consensus, and consensus
  itself anchors on company guidance. Sitting at guidance-plus-bias means our
  miss ≈ WS miss → score ≈ 1.0 worst case, with upside when our adjustment is
  smarter than theirs.
- The 5.0 cap punishes blowups more than boldness rewards: a hero call that
  goes wrong can cost 5.0 on a metric; a hero call that lands saves at most
  ~1.0. Asymmetry says: be roughly right, never spectacularly wrong.
- Floors (0.5pp / 0.5% of reported) mean tiny misses are forgiven — precision
  beyond the floor buys nothing; getting the level right buys everything.
- Never a blank cell: a blank is an automatic 5.0 (worst possible). Baseline
  numbers go in FIRST, refinement replaces them.

## Pipeline shape

```
corpus docs → [LLM extractor, per company] → drivers.json (validated citations)
           → [deterministic engine] → forecast + trace per metric
           → [validator: units, range vs 8-period history, cross-foots]
           → [workbook writer: template copy, C7:C9 only]
           → submission/*.xlsx + logs/run-<timestamp>.log
```

Each stage writes its output to disk before the next reads it — restartable,
inspectable, and each intermediate is evidence for the judges.

## Where the numbers come from (per company, one line each)

- **Hays**: company-stated "top of the £37.0-46.0m consensus range" for op
  profit; net fees reconstructed from FY25 base × quarterly LFL rates; EPS
  from op profit via historical conversion. See company-dossiers.
- **HD**: FY26 guidance reaffirmed 2026-05-19 + Q2-share-of-year seasonality
  from 8 quarters of history.
- **ADI**: explicit Q3 FY26 guidance (revenue/EPS/margin midpoints ± range)
  issued 2026-05-20 + measured beat bias.
- **DE**: FY26 net income guidance + segment outlook issued 2026-05-21 +
  Q3-of-FY seasonal split from history.
