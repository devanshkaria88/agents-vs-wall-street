# Historical company documents

This folder contains the frozen historical-document corpus for Home Depot, Analog Devices, Hays plc and Deere & Company. Teams can use it as research material and as a fallback if a website is blocked at the venue.

The pack contains 1,139 Markdown documents:

- 507 filings
- 538 call-transcript sections
- 94 slide documents

Start with [INDEX.md](INDEX.md), then open a company's own `INDEX.md` to browse its documents by date, type, period and title. You can also search the whole corpus locally:

```bash
rg -i "search terms" challenge/offline-data/
```

Every document begins with its company, ticker, publication date, document type, reporting period and corpus freeze date. A public source URL is included where one is available.

Some converted slide documents retain relative references to page images. The binary image files are not part of this Markdown-only pack; generated image descriptions and the rest of the extracted slide text remain in the document.

The corpus was frozen on 14 August 2026. It includes the canonical copy of every available document for these companies in the source corpus at that point. Hidden and duplicate ingestion copies are deliberately excluded.
