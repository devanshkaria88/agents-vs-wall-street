# Historical company-document index

This frozen corpus contains 1,139 canonical historical documents available before the hackathon. Hidden and duplicate ingestion copies are excluded.

| Company | Ticker | Documents | Filings | Call transcripts | Slides | Coverage |
|---|---:|---:|---:|---:|---:|---|
| [Home Depot](home-depot/INDEX.md) | HD | 319 | 127 | 176 | 16 | 2012-05-15–2026-05-21 |
| [Analog Devices](analog-devices/INDEX.md) | ADI | 271 | 129 | 131 | 11 | 2015-01-29–2026-06-02 |
| [Hays plc](hays/INDEX.md) | LSE:HAS | 239 | 123 | 100 | 16 | 2015-09-18–2026-08-03 |
| [Deere & Company](deere/INDEX.md) | DE | 310 | 128 | 131 | 51 | 2012-05-16–2026-05-28 |

## Retrieval tips

- Start with a company `INDEX.md` to browse by date, document type, period and title.
- Use `rg -i "search terms" challenge/offline-data/<company>/` to search one company.
- Use `rg -l -i "search terms" challenge/offline-data/` when you only need matching filenames.
- Each document starts with company, ticker, publication date, document type, reporting period and corpus freeze date.

Corpus frozen on 2026-08-14.
