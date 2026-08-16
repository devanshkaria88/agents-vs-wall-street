# Company brief: home-depot

Corpus directory: `challenge/offline-data/home-depot/` (start with its INDEX.md if you need a map).
Target workbook: HD-FY2026Q2.xlsx.

## Driver keys to extract

- **q2_25_net_sales** (USDm): Verify against the corpus. Hint doc: challenge/offline-data/home-depot/filings/2025-08-19__hd-us-20250819-q2-8k__143666.md
- **q2_25_adj_eps** (USD/share): Verify against the corpus. Hint doc: challenge/offline-data/home-depot/filings/2025-08-19__hd-us-20250819-q2-8k__143666.md
- **q2_25_comps** (pp): Verify against the corpus. Hint doc: challenge/offline-data/home-depot/filings/2025-08-19__hd-us-20250819-q2-8k__143666.md
- **q1_26_net_sales** (USDm): Verify against the corpus. Hint doc: challenge/offline-data/home-depot/filings/2026-05-19__hd-us-20260519-q1-8k__1038584.md
- **q1_25_net_sales** (USDm): Verify against the corpus. Hint doc: research/dossiers/home-depot.json
- **q1_26_comps** (pp): Verify against the corpus. Hint doc: challenge/offline-data/home-depot/filings/2026-05-19__hd-us-20260519-q1-8k__1038584.md
- **q1_26_adj_eps_yoy** (fraction): Verify against the corpus. Hint doc: research/dossiers/home-depot.json
- **fy25_adj_eps** (USD/share): Verify against the corpus. Hint doc: challenge/offline-data/home-depot/filings/2026-02-24__hd-us-20260224-q4-8k__615609.md
- **fy26_gaap_eps_guide_base** (USD/share): Verify against the corpus. Hint doc: challenge/offline-data/home-depot/filings/2026-05-19__hd-us-20260519-q1-8k__1038584.md
- **fy26_eps_growth_mid** (fraction): Verify against the corpus. Hint doc: challenge/offline-data/home-depot/filings/2026-05-19__hd-us-20260519-q1-8k__1038584.md
- **fy26_comp_guide_mid** (pp): Verify against the corpus. Hint doc: challenge/offline-data/home-depot/filings/2026-05-19__hd-us-20260519-q1-8k__1038584.md
- **fy26_sales_growth_guide** (fraction): Verify against the corpus. Hint doc: challenge/offline-data/home-depot/filings/2026-05-19__hd-us-20260519-q1-8k__1038584.md
- **gms_quarterly_sales** (USDm): Find any disclosure quantifying GMS quarterly or annual sales contribution (8-K, 10-Q, transcripts).
- **comp_cadence_step** (pp): Find management commentary quantifying expected comp cadence through FY26; otherwise null.
