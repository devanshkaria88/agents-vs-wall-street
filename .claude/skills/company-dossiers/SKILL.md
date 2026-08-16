---
name: company-dossiers
description: >
  Company research dossiers for the four forecast targets: Home Depot (HD),
  Analog Devices (ADI), Hays plc, Deere (DE). Consult BEFORE any work touching
  a specific company: extracting drivers, choosing anchors, computing
  baselines, validating ranges, or answering what guidance exists. Contains
  verified metric histories, guidance quotes with doc paths, beat-bias track
  records, and known traps per company.
---

# Company dossiers (corpus-verified 2026-08-16; 144/144 quotes re-found verbatim)

Full details per company in [references/](references/): hays.md, home-depot.md,
analog-devices.md, deere.md. Raw structured data: `research/dossiers/*.json`.
Corpus: 1,139 docs frozen 2026-08-14 — BEFORE all four report dates.

## Hays plc — HAS-FY2026.xlsx — FY2026 (year ended 30 Jun 2026; reports 20 Aug)

Metrics: `Net fees` (GBPm) · `Pre-exceptional basic EPS` (GBp — PENCE) · `Pre-exceptional operating profit` (GBPm)

- **Op profit anchor (the best single fact in the corpus)** — Q4 trading update
  2026-07-10 (`filings/2026-07-10__has-ln-20260710-filing-2__1572799.md`):
  "we currently expect FY26 pre -exceptional operating profit will be at the
  top of the £37.0 -46.0m consensus range". Footnote: company-compiled
  consensus £43.5m, 10 analysts, as of 9 July. Hays' "c." point guides land
  £0.1-0.6m ABOVE the stated number historically → anchor ≈ **£46.0m**.
- **Net fees**: FY25 £972.4m, H1 26 £453.3m reported. H2 26 derived: H2 25 base
  £476.4m × blend(Q3 26 actual -7%, Q4 26 actual -4%) → FY26 reported ≈ £903m;
  continuing-ops (ex six divested countries, c.£15m FY26) ≈ £888m. CFO on Q4
  call: six countries do "GBP 15 million of fees versus a business that does
  close to GBP 900 million". **RESOLVED (user, 11:35): scoring uses reported
  GROUP net fees → anchor ≈ £903m** (H1 453.3 + H2 476.4×blend(-7%,-4%) ≈ 450).
- **EPS**: FY25 1.31p, H1 26 0.46p. No FY26 EPS guidance — build from op profit
  via finance charge + ETR + shares (H1 26 weighted avg 1,595.7m; June buyback
  trimmed ~8.7m). H1-anchored: H1 26 earnings £7.3m on £20.1m op profit implies
  net finance charge ~£9m/half at ~33% ETR; H2 26 op profit ~£26m (+30% vs H2
  25, CFO stated) → H2 EPS ~0.7p → FY26 ≈ **1.1-1.3p**. (Naive flat-vs-FY25
  symmetry gives 1.3-1.5p — the H1-anchored path embeds FY26's actual higher
  finance charge and is preferred.)
- Exceptionals stay OUT of our metrics: c.£40m restructuring + c.£30m
  impairment are exceptional; metrics are pre-exceptional.

## Home Depot — HD-FY2026Q2.xlsx — FY26Q2 (13 wks ending ~2 Aug 2026; reports ~mid/late Aug)

Metrics: `Net sales` (USDm) · `Adjusted diluted EPS` (USD/share) · `Comparable sales, total company` (%)

- **Guidance** (reaffirmed 2026-05-19, `filings/2026-05-19__hd-us-20260519-q1-8k__1038584.md:30-40`):
  FY26 sales +2.5-4.5%; comps ~flat to +2.0%; adjusted operating margin
  12.8-13.0%; diluted EPS ~flat to +4.0% from $14.23 (GAAP basis; our metric is
  ADJUSTED EPS — no explicit FY26 adjusted-EPS guide. FY25 adjusted was $14.69:
  "Adjusted diluted earnings per share for fiscal 2025 were $14.69" —
  `filings/2026-02-24__hd-us-20260224-q4-8k__615609.md:39`).
- **Year-ago quarter** (Q2 FY25, `filings/2025-08-19__hd-us-20250819-q2-8k__143666.md`):
  net sales $45,277M; adj diluted EPS $4.68; comps +1.0% (US +1.4%).
- **GMS acquisition**: closed ~Sep 2025 → Q2 FY26 includes a full GMS quarter
  the year-ago lacks (~$2.0B/qtr anchor; ~$900M for ~8 wks in Q3 FY25). Q1 FY26
  sales grew +4.8% on comps of just +0.6% — GMS is the wedge. Baseline net
  sales ≈ 45,277 + ~1,950 ≈ **$47,200M** (+4.3%, inside guide).
- **Comps cadence**: Q1 FY26 +0.6%; management: guidance "does imply a slight
  improvement in comps as we move through the year" → Q2 baseline ≈ **+1.0%**.
- **Adj EPS cadence**: Q1 FY26 $3.43 (-3.7% YoY); Feb call: EPS "mid-single
  digit % negative in Q1, improving through year" → Q2 ≈ flat-to--2% YoY →
  baseline ≈ **$4.60-4.68**. HD gives NO quarterly guidance.
- Trap: comp base timing for GMS (SRS precedent: entered comp base ~13 months
  post-close) — GMS likely NOT in Q2 comp base; tariff costs flagged live.

## Analog Devices — ADI-FY2026Q3.xlsx — FY26Q3 (13 wks ended 1 Aug 2026; reports ~late Aug)

Metrics: `Revenue` (USDm) · `Adjusted diluted EPS` (USD/share) · `Adjusted gross margin` (%)

- **Explicit Q3 guidance** (`filings/2026-05-20__adi-us-20260520-q2-8k__1040581.md:71`):
  "revenue of $3.9 billion, +/- $100 million ... adjusted EPS to be $3.30,
  +/-$0.15" (also adj op margin ~49.0% ±100bps — NOT gross margin).
- **Beat bias, 8 of 8 quarters** (Q3 FY24→Q2 FY26): revenue beat midpoint every
  time: +42, +43, +73, +140, +130, +76, +60, +123 ($M; mean ~+86M, ~+2.8%);
  adj EPS beat +0.04 to +0.17 (mean ~+0.08). Three of last five ABOVE the high
  end. Baseline revenue ≈ **$3,970-3,990M**, EPS ≈ **$3.38**.
- **Adjusted gross margin is NOT guided** — series: 69.2 → 69.8 → 71.2 → 73.0
  (last four quarters, rising with utilization/mix). Baseline ≈ **73.2-73.5%**.
- Tempering fact: 2026-06-02 conf call — some Q3 auto demand accelerated into
  late Q2 (pull-in risk to the beat size).
- Trap: Q1 FY26 income statement OCR shows "$ 3,160,263" (thousands) — always
  reconcile units to USDm.

## Deere — DE-FY2026Q3.xlsx — FY26Q3 (qtr ending ~2 Aug 2026; reports ~mid-Aug — possibly BEFORE our scoring)

Metrics: `Worldwide net sales and revenues` (USDm) · `Diluted EPS (GAAP)` (USD/share) · `Production & Precision Ag operating profit` (USDm)

- **No quarterly guidance exists.** FY26 guide (raised at Q1, reaffirmed Q2,
  `filings/2026-05-21__de-us-20260521-q2-8k-2__1042168.md:74`): "Net income
  attributable to Deere & Company for fiscal 2026 is forecasted to be in a
  range of $4.5 billion to $5.0 billion." Segment outlook: PPA net sales
  "Down 5 to 10%" FY26; Financial Services NI ~$860M.
- **Trap (verbatim-verified)**: `Worldwide net sales and revenues` = TOTAL
  incl. Financial Services ($13,369M Q2 FY26); "net sales" alone = equipment
  ops only ($11,981M Q2 FY26). Use the TOTAL row.
- **History**: Q3 FY25 total revenue $12,018M, diluted EPS $4.75, PPA op profit
  $580M (margin 13.6% on $4,273M PPA sales). Q2 FY26: revenue $13,369M (+5%),
  EPS $6.55 (incl. ~$272M pretax IEEPA tariff-refund recovery), PPA $706M.
- **Derivation path**: H1 FY26 NI $2.429B → guide mid $4.75B implies H2
  ~$2.32B; historical Q3 share of H2 NI ~55-58% → Q3 NI ~$1.30B / 270.7M shares
  → EPS ≈ **$4.80**; revenue via Q3/Q2 seasonal ratio (~0.94) ≈ **$12,500M**;
  PPA op profit ≈ **$580-620M** (H1 PPA sales -8% within "down 5-10%" guide).
- Beat history: FY24 net income beat final guide; FY25 landed just above the
  $4.75-5.25B→$5.0B-ish final range (actual $5.027B); FY26 guide RAISED at Q1.

## Cross-company facts

- Every target reports AFTER the corpus freeze (2026-08-14) and after today —
  no actuals leak anywhere; verified by all four researchers.
- No sell-side consensus numbers for any target period exist in the corpus
  EXCEPT Hays op profit (£43.5m company-compiled). WS benchmark must be
  inferred: guidance midpoint + public web during event.
- All four have guidance current as of May-July 2026 — extraction starts from
  the anchor docs named above.
