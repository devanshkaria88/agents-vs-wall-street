# Strategy — Agents vs Wall Street (written 11:30, 2026-08-16)

Status at time of writing: knowledge layer done (4 skills, all corpus-verified),
`npm run check:submission` **green** with cited baselines in all 12 cells
(committed cc893e0, 11:24 — safety valve cleared 96 min early).

## 1. Per-company plan, ranked by expected points

Scoring: `min(5.0, our_miss / max(WS_miss, floor))` per metric, lower = better.
Floors matter: %-metrics get a generous 0.5pp floor; EPS floors are tiny
(0.5% of EPS ≈ $0.02), so EPS metrics carry the most blowup risk per unit of
error. Each metric is 1/12 of the score.

| Rank | Metric | Anchor quality | Plan |
|---|---|---|---|
| 1 | Hays op profit | Company told us the answer: "top of the £37.0-46.0m consensus range" (10 Jul) | Forecast ~46.0. WS consensus was £43.5m on 9 Jul, pre-update; even post-revision WS sits ≤ us or equal. Floor is tiny (£0.23m) but our miss should be ≤£1m |
| 2 | ADI revenue | Explicit guide $3.9B±100M + 8-of-8 midpoint beats (mean +$86M) | Anchor 3,975-3,990 (bias-adjusted, tempered for the disclosed Q2 auto pull-in) |
| 3 | ADI adj gross margin | Not guided, but smooth rising series 69.2→69.8→71.2→73.0; 0.5pp floor | Trend-extrapolate ~73.3; hard to miss by >0.5pp |
| 4 | HD comps (total co.) | 0.5pp floor; Q1 +0.6, guidance implies improvement through year | ~+1.0; even ±0.5pp miss scores ~1.0 worst case |
| 5 | ADI adj EPS | Guide $3.30±0.15 + consistent +$0.04-0.17 beats | ~3.38; small floor, but guidance discipline is machine-like |
| 6 | HD net sales | Year-ago $45,277M + measurable GMS wedge (~$2.0B/qtr) + FY guide | ~47,200; main risk is GMS quarter-run-rate estimate |
| 7 | HD adj EPS | No quarterly guide; cadence commentary ("improving through year" from Q1's -3.7%) | ~4.64 (flat-to--1% YoY vs $4.68); floor $0.023 — tight |
| 8 | Hays net fees | H1 actual + Q3/Q4 growth rates pin FY26 ≈ £903m reported | Basis RESOLVED (user, 11:35): reported group net fees → anchor 903. Now a solid metric; residual risk is only the Q3/Q4 blend weighting |
| 9 | DE revenue | No quarterly guide; Q3/Q2 seasonal ratio ~0.94 + year-ago $12,018M | ~12,500; seasonality stable across FY24/FY25 |
| 10 | DE PPA op profit | Segment guide "down 5-10%" FY26 + volatile margins + tariff-recovery noise | ~600; widest genuine uncertainty of the money metrics |
| 11 | Hays EPS | Derived: op profit 46 → finance charge → ETR → shares; H1-anchored ≈1.1-1.3p | ~1.2p; floor is microscopic (0.006p) but WS has the same derivation problem |
| 12 | DE diluted EPS | FY NI guide $4.5-5.0B → H2 split → Q3 ~55-58% of H2 → ~$4.80 | Most model-dependent number; validate against year-ago $4.75 |

## 2. Estimating the hidden Wall Street benchmark

The benchmark freezes at 18:00 today; it is not given to us. Three sources, in order:

1. **Company-compiled consensus in the corpus** — exists ONLY for Hays op profit
   (£43.5m, 10 analysts, 9 Jul). Directly usable.
2. **Public web this afternoon** (explicitly allowed, RULES.md:22): a focused
   sweep for current sell-side consensus on HD Q2, ADI Q3, DE Q3 (Visible
   Alpha/Zacks/press summaries). Logged with URLs + retrieval times in
   `research/`; used only to position relative to WS, never to replace our
   corpus-derived number.
3. **Structural inference**: consensus anchors on guidance. Where we find no
   number, assume WS ≈ guidance midpoint + typical beat premium — meaning our
   bias-adjusted anchor should sit close to WS. That is fine: score ≈ 1.0 is
   the par outcome; we win where our adjustment is better-informed (Hays
   top-of-range, ADI quantified bias, HD GMS wedge).

Implication: we never take a position far from both guidance and consensus.
The cap punishes blowups (max loss 5.0) more than boldness pays (max gain ~1.0
per metric vs par).

## 3. Build order (clock times from 11:30)

| Time | Milestone | Notes |
|---|---|---|
| ~~11:24~~ | ~~Baselines green~~ | DONE (cc893e0) |
| 11:30-11:45 | **GATE: user sign-off on this strategy** | Also: user creates GitHub repo + pushes (entry.json needs the URL; repo push is on the critical path) |
| 11:45-12:45 | Extractor: per-company LLM driver extraction → `research/drivers/*.json`, citation firewall in code | Reuses dossier anchors; every driver = value+range+doc_path+verbatim_line |
| 12:45-13:45 | Engine: deterministic per-metric calculators + evidence→calculation traces → `forecasts/forecasts.json` | Pure Python, no LLM; unit tests on the arithmetic |
| 13:45-14:15 | Validator: units/range/cross-foot checks, accept-reject log; wire `npm run forecast` (extract→calc→validate→write→check) | Full pipeline = the final command |
| 14:15-15:00 | WS consensus sweep (public web) + Hays basis resolution; re-anchor where evidence justifies; rerun pipeline | Every change cited |
| 15:00-16:15 | Architecture HTML: plain-English flow, honest diagram, tried/abandoned section, <2MB self-contained | Craft matters: 30 write-up points |
| 16:00-17:15 | Judge conversation (5 min, some slot in window) | Demo the trace for one metric live |
| 16:30 | **Dress rehearsal**: clean checkout of final commit → `npm run forecast` → green check | Log kept in `logs/` |
| 17:00 | HTML frozen (self-imposed, 15 min early); final commit; entry.json completed | |
| 17:15-17:45 | Final run in window, from declared commit, timestamped log | Baselines guarantee a submittable state even on crash |
| 17:30-17:55 | Manual uploads ×4 + private form (user does this; agent forbidden) | Last valid upload counts; buffer before 18:00 |

## 4. What we will NOT build

- No agent framework / multi-agent orchestration in the final system — one
  pipeline, one command (the workflow fan-out was bootstrap research only).
- No vector DB / RAG index — `rg` over 1,139 markdown files is sufficient and
  transparent.
- No Monte Carlo, DCF, or regression models — anchor + bias + seasonality
  ratios only; every step explainable in one sentence to a judge.
- No general web scraper — one focused, logged consensus lookup.
- No UI, no dashboard, no hosting; the HTML is a static page.
- No programmatic OpenStocks interaction of any kind (RULES.md:55).

## 5. Top-5 risks and mitigations

1. ~~**Hays net-fees basis.**~~ **RESOLVED at the gate (user, 11:35): scoring
   uses reported GROUP net fees.** Baseline moved 895 → 903. Residual risk is
   the Q3/Q4 blend weighting inside H2 (±£3-4m), well inside the WS-miss
   denominator.
2. **A malformed/blank cell at 18:00** (worst case: automatic 5.0s).
   Mitigation: already impossible to be blank — green baselines committed; the
   pipeline only overwrites green output after its own validation passes;
   `check:submission` runs inside the final command.
3. **Engine/time overrun squeezing the HTML** (30 judged points). Mitigation:
   timeboxes above with a drop-order — if 15:00 arrives without a finished
   validator, we ship extractor+engine and hand-audit the traces; the HTML
   slot is protected; baseline numbers are already submittable.
4. **DE quarterly derivation error** (tariff-refund noise, FS drift, no
   quarterly guidance). Mitigation: blend two independent paths (FY-guide NI
   split vs year-ago +growth), cap the result within ±10% of the year-ago
   quarter, cross-foot EPS×shares≈NI, and accept par (~1.0) rather than
   chase a hero call on the noisiest company.
5. **Consensus moved after our corpus froze** (e.g. analysts revised Hays to
   ~£45.5m post-update, eroding our edge). Mitigation: the 14:15 public-web
   sweep positions us against CURRENT consensus; where consensus has converged
   to our number, we stay at our best estimate of the actual — par is
   acceptable; edge comes from the metrics where the corpus gives us private
   structure (GMS wedge, ADI bias table, Hays top-of-range).

## Open questions — ALL RESOLVED at the gate (user, 11:35)

- Hays "Net fees" → scored on total reported GROUP net fees. (Baseline 903.)
- HD/ADI "Adjusted diluted EPS" → confirmed, scored against the company's own
  non-GAAP reconciliation figure.
- DE Q3 FY26 report date → moot; scoring is checked on 20 Aug regardless.
