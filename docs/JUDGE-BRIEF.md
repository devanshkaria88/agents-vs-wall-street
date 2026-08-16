# Judge conversation crib sheet (5 minutes, some slot 16:00–17:15)

## The 20-second pitch

"The Truth reads the 1,139-document corpus with an agent we built on the
Anthropic API, quotes its evidence byte-exact, and hands it to deterministic
Python that does every calculation. The AI never does arithmetic; the code
never guesses; every one of the twelve numbers walks back to a quoted sentence
in a named file. The companies already told us most of the answers — Hays
literally pre-announced 'top of the £37–46m range' — so the system's job is
applying their own arithmetic to their own words, and proving it did."

## The one demo to do (pick Hays op profit)

1. Open `forecasts/traces.json` → HAS → Pre-exceptional operating profit:
   show the citation (doc path + the verbatim "top of the £37.0-46.0m" line),
   the CFO cross-check path (20.1 + 20.1×1.30 = 46.2), and the value.
2. Open one `logs/agent-trace-hays-*.jsonl`: "every ripgrep query and file
   read the agent made, timestamped."
3. If time: `forecasts/calibration.json` — "ADI beat its guide 8 of 8; we
   computed the median from cited pairs at runtime, we didn't assert it."

## Scored-category answers (their rubric, our sentence)

- **Forecasting approach (16):** anchor to guidance, adjust by bias measured
  from 8 quarters of guide-vs-actual, deviate only with cited evidence, take
  par where we have no edge (Deere). Cap math punishes blowups 5:1 — so no
  hero calls, ever.
- **Model quality (12):** traces.json — inputs with citations → formula →
  variants → median. Nothing is asserted.
- **Data approach (12):** frozen corpus + one logged public-web consensus
  sweep (sources + retrieval times in research/web/). Freshness = newest doc
  wins; trust = byte-exact re-verification.
- **Validation (12):** citation firewall (144/144 in bootstrap, caught 2
  drifts + my own $14.94-vs-$14.69 HD error), unit sanity, trailing-history
  position with justifications, cross-foots, accepted AND rejected logged.
- **Agent harness (9):** the bootstrap story — the agent verified the rules,
  wrote its own skills, planned, got sign-off at a gate, THEN built. Git
  history is the diary. Runtime harness is ours: tool loop + trace on the API.
- **Tooling (9):** search_corpus/read_doc/submit_drivers (all self-logging),
  the firewall, the voting extractor, the workbook writer + validator, and
  npm run forecast tying it together.

## Likely questions

- "What if the model hallucinates?" → It can't put uncited numbers in: the
  firewall re-finds every quote as an exact substring or the driver dies.
- "Same number every run?" → Downstream of drivers, bit-for-bit. Extraction
  votes 2-of-3; judgment bands sweep deterministically; median aggregates.
- "Why not average multiple runs?" (Primer's advice) → That's variance
  reduction for end-to-end stochastic agents; we removed the variance
  structurally and ensemble at the two stages where it actually lives.
- "Why no fine-tuning/LoRA?" → 12 targets, ~30 historical quarters: instant
  overfit, and it would downgrade the reader model. Documented in the HTML.
- "Did the live agents change anything?" → Two upgrades (Hays £6.7m finance
  charge; ADI actual opex ratio) and one correction OF US: all three HD
  readers cited the 10-Q's "$1.3 billion" GMS figure against our $1,975M
  inference. Reviewed, re-verified, adopted: +$255M on net sales.
- "Weakest number?" → Hays EPS (derived, tiny floor, band 1.1–1.3p) and DE
  PPA (tariff-refund opacity — we deliberately hug year-ago).
- "Human input during final run?" → Start the command, review the validation
  report, do the four manual uploads. The rules require manual upload.

## Numbers to have in your head

HD 47,613 / 4.68 / +1.0 · ADI 3,960 / 3.39 / 73.3 · HAS 903.5 / 1.12 / 46.0 ·
DE 12,543 / 4.84 / 556. Street: HD ~47.3-47.5B & 4.71 · ADI 3.93B & 3.33 ·
DE EPS 4.85 · Hays op consensus was 43.5 pre-update. Report dates: HD Tue,
ADI Wed, DE+Hays Thu.
