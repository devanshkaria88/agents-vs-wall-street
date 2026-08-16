# Company brief: analog-devices

Corpus directory: `challenge/offline-data/analog-devices/` (start with its INDEX.md if you need a map).
Target workbook: ADI-FY2026Q3.xlsx.

## Driver keys to extract

- **q3_guide_rev_mid** (USDm): Verify against the corpus. Hint doc: challenge/offline-data/analog-devices/filings/2026-05-20__adi-us-20260520-q2-8k__1040581.md
- **q3_guide_adj_eps_mid** (USD/share): Verify against the corpus. Hint doc: challenge/offline-data/analog-devices/filings/2026-05-20__adi-us-20260520-q2-8k__1040581.md
- **q3_guide_adj_opm** (pp): Verify against the corpus. Hint doc: challenge/offline-data/analog-devices/filings/2026-05-20__adi-us-20260520-q2-8k__1040581.md
- **q2_26_adj_gm** (pp): Verify against the corpus. Hint doc: challenge/offline-data/analog-devices/filings/2026-05-20__adi-us-20260520-q2-8k__1040581.md
- **adj_gm_series** (pp): Verify against the corpus. Hint doc: research/dossiers/analog-devices.json
- **trailing_opex_ratio** (pp): Extract Q2 FY26 ACTUAL adjusted operating margin pct from the 2026-05-20 8-K tables (code derives opex ratio = adj GM 73.0 - adj OpM). Return that op margin value for this key and explain in note.
- **beat_shrink** (ratio): Policy parameter — return null.
