# Historical-document search helper

This small Python script searches the supplied Markdown corpus and writes a cited research note. It does not calculate forecasts, select final historical values or edit the submission workbooks.

Python 3.10 or later is sufficient. There are no external dependencies.

## Run it

Search for the three challenge metrics for Home Depot:

```bash
python3 starter/search.py --company HD
```

Supply one or more narrower searches:

```bash
python3 starter/search.py \
  --company HD \
  --query "net sales" \
  --query "adjusted diluted EPS" \
  --query "comparable sales"
```

The default output is `research/HD.md`. Each result includes the source document, publication date, reporting period, excerpt and any numbers found in that excerpt.

The supported company selectors are:

- `HD` — Home Depot
- `ADI` — Analog Devices
- `HAS` — Hays plc
- `DE` — Deere & Company

The results are leads, not verified financial history. Read the cited document before using a figure and keep reported, adjusted, quarterly and annual values separate.

## Use it with Codex or Claude Code

You can ask either harness:

> Run the historical-document search helper for Home Depot, open the resulting research note and help me check the evidence for each challenge metric.

The same script works with another configured company. It identifies the document folder from the company metadata rather than hardcoding the four folder names.

## Test it

```bash
python3 -m unittest discover -s starter -p 'test_*.py'
```
