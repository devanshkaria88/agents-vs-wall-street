# Company brief: deere

Corpus directory: `challenge/offline-data/deere/` (start with its INDEX.md if you need a map).
Target workbook: DE-FY2026Q3.xlsx.

## Driver keys to extract

- **fy26_ni_guide_mid** (USDm): Verify against the corpus. Hint doc: challenge/offline-data/deere/filings/2026-05-21__de-us-20260521-q2-8k-2__1042168.md
- **h1_26_ni** (USDm): Verify against the corpus. Hint doc: research/dossiers/deere.json
- **q3_share_of_h2_ni** (fraction): Verify against the corpus. Hint doc: research/dossiers/deere.json
- **diluted_shares** (millions): Verify against the corpus. Hint doc: research/dossiers/deere.json
- **q2_26_total_rev** (USDm): Verify against the corpus. Hint doc: challenge/offline-data/deere/filings/2026-05-21__de-us-20260521-q2-8k-2__1042168.md
- **q3_q2_seasonal_ratio** (ratio): Extract Q2 FY24 and Q3 FY24 total net sales and revenues (code computes a second seasonal ratio). Put both values in additional_evidence; return null for this key.
- **q3_25_total_rev** (USDm): Verify against the corpus. Hint doc: research/dossiers/deere.json
- **q3_rev_yoy** (fraction): Return null unless a doc gives quarter-specific revenue direction for Q3 FY26.
- **q3_25_eps** (USD/share): Verify against the corpus. Hint doc: research/dossiers/deere.json
- **q3_25_ppa_op** (USDm): Verify against the corpus. Hint doc: research/dossiers/deere.json
- **q3_25_ppa_sales** (USDm): Verify against the corpus. Hint doc: research/dossiers/deere.json
- **ppa_fy_sales_guide** (fraction): Verify against the corpus. Hint doc: challenge/offline-data/deere/filings/2026-05-21__de-us-20260521-q2-8k-2__1042168.md
- **h1_26_ppa_sales_yoy** (fraction): Verify against the corpus. Hint doc: research/dossiers/deere.json
- **q3_ppa_sales_yoy** (fraction): Verify against the corpus. Hint doc: search yourself
- **q3_ppa_margin** (pp): Find how the ~$272M IEEPA tariff-refund recovery was allocated across segments in Q2 FY26, and any Q3 margin commentary from the Q2 call. Return null if only commentary found; put findings in additional_evidence.
