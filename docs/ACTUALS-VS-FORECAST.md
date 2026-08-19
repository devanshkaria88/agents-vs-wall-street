# Actuals vs our submitted forecasts

Post-event scoreboard, one section per company as each reports. Deltas and
implied scores computed by `python3` (see commit message for the session), not
by hand. The official Wall Street benchmark was frozen internally at the 18:00
submission deadline and is never published (JUDGING.md:83) — "WS" rows below
use public vendor consensus snapshots as a proxy and are labelled as such.

Scoring reminder (JUDGING.md:66-79): `metric score = min(5.0, our absolute
miss / max(WS absolute miss, floor))`; floor = 0.5pp for percentage metrics,
0.5% of the reported result for money/EPS. Lower is better; <1.0 beats the
Street.

---

## ADI — FY2026Q3 (13 wks ended 1 Aug 2026, reported Wed 2026-08-19 pre-market)

Sources: [8-K exhibit 99.1 (SEC)](https://www.sec.gov/Archives/edgar/data/0000006281/000000628126000072/adi3q26exhibit991earnings.htm),
[press release (PR Newswire)](https://www.prnewswire.com/news-releases/analog-devices-reports-record-fiscal-third-quarter-2026-financial-results-302854642.html),
consensus figures per [Investing.com](https://www.investing.com/news/earnings/analog-devices-climbs-as-fiscal-q3-results-q4-outlook-beat-forecasts-4867067)
(revenue est. $3.91B, adj EPS est. $3.34). Income statement shows revenue
"$4,021,899" (thousands) = $4,021.9M — units reconciled per the dossier trap
note.

| Metric | Ours (submitted) | Actual | Our miss | Consensus (proxy) | WS miss | Implied score |
|---|---|---|---|---|---|---|
| Revenue (USDm) | 3,960 | 4,021.9 | −61.9 (−1.54%) | 3,910 | −111.9 | **0.55 — beat WS** |
| Adjusted diluted EPS (USD) | 3.39 | 3.45 | −0.06 (−1.74%) | 3.34 | −0.11 | **0.55 — beat WS** |
| Adjusted gross margin (%) | 73.3 | 72.5 | +0.8pp | not published | unknown | 0.8–1.6 (scenarios below) |

Context from the release: GAAP diluted EPS $2.74 (guide was $2.60 ±0.15);
adjusted operating margin 50.0% (guided ~49.0% ±100bps); revenue +40% YoY off
the $2,880.3M year-ago quarter. End markets: Industrial $1,971.9M (+53% YoY),
Automotive $998.2M (+16%), Communications $654.5M (+84%, data-center led),
Consumer $397.2M (+6%). Q4 FY26 guide: revenue $4.3B ±$100M, adjusted EPS
$3.86 ±$0.15, adjusted op margin ~52.0% ±100bps.

### How each pipeline decision aged

**Revenue — right method, too much shrink.** We anchored at guide midpoint
$3,900M + median historical beat $74.5M, then *shrank* the beat because the
2026-06-02 call flagged Q3 auto demand pulled into late Q2 → submitted 3,960.
The actual beat was +$121.9M — above even the unshrunk median, and $21.9M above
the guide's high end (the "3 of last 5 above the high end" cross-check in
`forecasts/traces.json`, which computed 4,000 and was set aside). The pull-in
tempering cost us ~$40M of accuracy but still left us well inside the Street's
miss, because consensus sat at $3,910M — barely above midpoint. The 9th
consecutive revenue beat; the anchor+beat-bias architecture was the right
call.

**Adjusted EPS — same story.** Guide midpoint $3.30 + shrunk median beat
(+$0.09) → 3.39 vs actual 3.45 (a full +$0.15 beat, top of the historical
+0.04…+0.17 range). Miss of $0.06 vs the consensus proxy's $0.11.

**Adjusted gross margin — the trend broke on us.** The series 69.2 → 69.8 →
71.2 → 73.0 had risen four straight quarters; our damped-trend-blended-with-
guide-implied calculation gave 73.3. Actual: 72.5, the first sequential
*decline* (−0.5pp), plausibly mix — the +84% YoY Communications/data-center
ramp — though the release doesn't say. With no published GM consensus, the
implied score depends on the frozen benchmark: WS flat at 73.0 → 0.8/0.5 =
1.60 against us; WS extrapolating like us (73.3–73.5) → 0.8–1.0. Note the
op-margin guide (49.0%, which ADI *did* publish) beat by 100bps while GM fell
— the miss was opex leverage read as gross margin. Lesson: a 4-quarter
monotone trend is not a driver; where the company guides an adjacent margin,
weight the guided line harder than the unguided one.

### Net read

Two of three metrics beat the Street proxy at ~0.55 each — the conservative
anchor-on-guidance-plus-beat-bias method did exactly what it was designed to
do (both misses were in the *conservative* direction, no blowup risk). GM is
between a narrow win and a 1.6 loss depending on the hidden benchmark.
ADI-average across the three: ~0.57–0.90 (scenario-dependent), comfortably
under the 5.0-per-blank disaster case and likely under 1.0 overall.

---

*Pending: HD FY26Q2 (~mid/late Aug), Hays FY2026 (20 Aug), DE FY26Q3
(reported mid-Aug — to be pulled). Append sections here as they land.*
