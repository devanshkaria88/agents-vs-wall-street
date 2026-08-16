# Company brief: hays

Corpus directory: `challenge/offline-data/hays/` (start with its INDEX.md if you need a map).
Target workbook: HAS-FY2026.xlsx.

## Driver keys to extract

- **fy25_net_fees** (GBPm): Verify against the corpus. Hint doc: challenge/offline-data/hays/filings/2025-08-21__has-ln-20250821-h2-8k__143890.md
- **h1_26_net_fees** (GBPm): Verify against the corpus. Hint doc: challenge/offline-data/hays/filings/2026-02-27__has-ln-20260227-h1-8k__642921.md
- **h1_25_net_fees** (GBPm): Verify against the corpus. Hint doc: challenge/offline-data/hays/filings/2026-02-27__has-ln-20260227-h1-8k__642921.md
- **q3_26_actual_growth** (fraction): Verify against the corpus. Hint doc: challenge/offline-data/hays/filings/2026-04-16__has-ln-20260416-filing-2__955810.md
- **q4_26_actual_growth** (fraction): Verify against the corpus. Hint doc: challenge/offline-data/hays/filings/2026-07-10__has-ln-20260710-filing-2__1572799.md
- **q3_share_of_h2** (fraction): If any doc discloses Hays quarterly absolute net fees or a Q3:Q4 split, extract it; otherwise null.
- **op_guide_range_top** (GBPm): Verify against the corpus. Hint doc: challenge/offline-data/hays/filings/2026-07-10__has-ln-20260710-filing-2__1572799.md
- **op_consensus** (GBPm): Verify against the corpus. Hint doc: challenge/offline-data/hays/filings/2026-07-10__has-ln-20260710-filing-2__1572799.md
- **h1_26_op** (GBPm): Verify against the corpus. Hint doc: challenge/offline-data/hays/filings/2026-02-27__has-ln-20260227-h1-8k__642921.md
- **h2_25_op** (GBPm): Verify against the corpus. Hint doc: challenge/offline-data/hays/filings/2025-08-21__has-ln-20250821-h2-8k__143890.md
- **h2_26_op_yoy** (ratio): Verify against the corpus. Hint doc: challenge/offline-data/hays/call-transcripts/2026-07-10__has-ln-20260710-call-qna__1573114.md
- **h1_26_eps** (GBp): Verify against the corpus. Hint doc: research/dossiers/hays.json
- **h1_26_shares** (millions): Verify against the corpus. Hint doc: research/dossiers/hays.json
- **half_year_finance_charge** (GBPm): Find the H1 FY26 net finance charge (GBPm) in the 2026-02-27 half-year report income statement or finance-costs note.

Ruling: Scored on reported GROUP net fees (user/organiser resolution at gate, 11:35).
