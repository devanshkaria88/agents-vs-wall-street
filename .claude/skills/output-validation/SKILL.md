---
name: output-validation
description: >
  Workbook output mechanics and validation for Agents vs Wall Street. Consult
  BEFORE writing, editing, checking, or generating any .xlsx workbook, filling
  forecast cells, running check:submission, or validating forecast numbers.
  Covers exact cell addresses, yellow-cell fills, units conventions, what the
  official checker enforces, and the pre-submit validation checklist.
---

# Workbook output + validation (verified 2026-08-16 with openpyxl 3.1.5 against the real templates)

## Template anatomy — verified by loading `challenge/templates/*.xlsx`

Every template has sheets `['Summary', 'Instructions']`. On **Summary**:

| Cell | Content |
|---|---|
| A6 / B6 / C6 | Header: `Metric` / `Units` / period string (e.g. `FY2026Q2`) |
| A7:A9 | The three exact metric labels |
| B7:B9 | The three exact unit strings |
| **C7:C9** | **The yellow forecast cells — the ONLY cells we write** (fill `FFFFF7D6`) |

Verified full cell dump incl. number formats: [references/template-anatomy.md](references/template-anatomy.md)

Instructions sheet (verbatim, row 6): "Enter numbers, not formulas, text, currency symbols or percent signs."

## Units conventions (SUBMISSION.md:28, template Instructions)

- Percentage rows: **percentage points** — `4.5` means 4.5%, not 0.045.
- Hays EPS: **pence** — `6.2` means 6.2 pence (HAS Summary A12 confirms).
- HD/ADI/DE EPS: dollars per share (`3.25` = $3.25).
- Money rows: millions in the stated currency (`USDm` / `GBPm`).

## What `npm run check:forecasts` actually enforces (scripts/check-forecasts.mjs, read this session)

1. File exists at `submission/<outputFile>` and opens as xlsx (lines 31-44).
2. A `Summary` sheet exists (line 46).
3. Scans rows 1-30 for header row where A=`Metric`, B=`Units`, C=`<period>` — trimmed string equality (lines 57-67).
4. For each of the 3 rows below the header: col A = exact metric label, col B = exact units, col C = a **finite JS number** (lines 74-87). Text, formula-only, or blank cells fail.

It does NOT check fills, the Instructions sheet, or value plausibility — plausibility is OUR job.

## Writing procedure (the only sanctioned path)

```python
import shutil, openpyxl                      # .venv/bin/python (openpyxl 3.1.5)
shutil.copy("challenge/templates/HAS-FY2026.xlsx", "submission/HAS-FY2026.xlsx")
wb = openpyxl.load_workbook("submission/HAS-FY2026.xlsx")
ws = wb["Summary"]
ws["C7"] = 972.4      # float, never str — checker requires typeof number
ws["C8"] = 6.2
ws["C9"] = 45.5
wb.save("submission/HAS-FY2026.xlsx")
```

Copy the template fresh each run; touch ONLY C7:C9 on Summary; never rename sheets, labels, units, or the period header ("Do not rename the Summary sheet, metric labels, units, period header or output file." — template Instructions row 9).

## Validation checklist (run before every save; log accepted AND rejected values)

1. **Numeric + finite** — each C7:C9 is a Python float, not NaN/inf/None/str.
2. **Units sanity** — % values are points (comp sales plausibly -10..10, gross margin 30..80); EPS magnitude matches currency (Hays pence likely 3-15, HD/ADI/DE dollars 1-10); money rows in millions (HD quarterly net sales ~40,000-plus USDm, not 40.0).
3. **Range vs history** — compare against the trailing 8 reported periods from the company-dossiers skill; a value outside min-max of that window needs an explicit cited justification or it is rejected back to the anchor.
4. **Cross-foot** — EPS ≈ net income / diluted shares within tolerance; Hays operating profit consistent with net fees × conversion margin; flag if internally inconsistent.
5. **Checker** — `npm run check:forecasts` must print `PASS` for all four files.
6. **Trace** — every accepted value has an evidence→calculation trace; every rejected value is logged with the reason (judges score "rejected values" under Validation & reliability, JUDGING.md:38).

## entry.json + HTML gates (from scripts/check-entry.mjs, read this session)

`npm run check:submission` = check:entry && check:forecasts. Entry gates: ≤64KB, 1-4 members w/ valid unique emails, buildStyle enum, non-empty primaryModels + languagesAndFrameworks, https://github.com ROOT repo URL, finalCommit 7-40 hex, finalCommand ≤500 chars, emailUseConfirmed===true, and `architecture/index.html` exists (1B-2MB, text, contains `<html`).
