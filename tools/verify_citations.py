#!/usr/bin/env python
"""Re-verify every shipped corpus citation byte-exact, on demand.

Walks research/dossiers/*.json, research/drivers/*.json,
research/drivers/live/*.json and research/backtests/holdouts.json, finds every
citation that points into challenge/, and re-finds its quoted line as an exact
substring of the cited file. Exits nonzero on any failure.

Run: .venv/bin/python tools/verify_citations.py
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def walk(node, hits):
    """Collect every {doc_path, verbatim_line} pair anywhere in the JSON."""
    if isinstance(node, dict):
        path, quote = node.get("doc_path"), node.get("verbatim_line")
        if isinstance(path, str) and isinstance(quote, str):
            hits.append((path, quote))
        for v in node.values():
            walk(v, hits)
        # backtest holdouts carry three quote/doc pairs with prefixed keys
        for k in ("actual", "guidance", "prior"):
            p, q = node.get(f"{k}_doc"), node.get(f"{k}_quote")
            if isinstance(p, str) and isinstance(q, str):
                hits.append((p, q))
    elif isinstance(node, list):
        for v in node:
            walk(v, hits)


def main() -> int:
    files = sorted(
        list((ROOT / "research" / "dossiers").glob("*.json"))
        + list((ROOT / "research" / "drivers").glob("*.json"))
        # report-*.json record the extraction's raw findings INCLUDING quotes
        # the firewall rejected — those are evidence of the firewall working,
        # not citations we assert, so they are excluded from this check.
        + [p for p in (ROOT / "research" / "drivers" / "live").glob("*.json")
           if not p.name.startswith("report-")]
        + [ROOT / "research" / "backtests" / "holdouts.json"]
    )
    checked = passed = 0
    failures = []
    for f in files:
        if not f.is_file():
            continue
        hits: list = []
        walk(json.loads(f.read_text()), hits)
        for path, quote in hits:
            if not path.startswith("challenge/"):
                continue  # web citations are governed by the triage policy, not this check
            checked += 1
            doc = ROOT / path
            if doc.is_file() and quote in doc.read_text():
                passed += 1
            else:
                failures.append(f"{f.relative_to(ROOT)}: quote not re-found in {path}")
    for line in failures:
        print(f"FAIL {line}")
    print(f"{passed}/{checked} corpus citations re-found byte-exact")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
