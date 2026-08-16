"""Live extraction stage: LLM readers with self-consistency voting.

For each company, runs `claude -p` N times (default 3) with corpus-read tools.
Each run must return the driver JSON for a fixed key list. Then:

1. FIREWALL  — every citation quoting a corpus doc is re-verified byte-exact;
               a quote that cannot be re-found kills that run's driver.
2. VOTE      — per driver key, values from surviving runs are majority-voted
               (numeric tolerance 0.5% relative). No majority -> unresolved.
3. MERGE     — voted values upgrade pinned drivers of kind 'assumption'
               (the LLM found a real number where we had a band). For
               'base'/'anchor' drivers the pinned, human-reviewed value wins;
               any divergence is logged for review, never silently applied.

Outputs research/drivers/live/<company>.json (merged) and a full report.

Run: .venv/bin/python -m forecaster.extract [--runs 3] [--companies hays,...]
"""
import argparse
import concurrent.futures
import json
import re
import subprocess
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DRIVERS = ROOT / "research" / "drivers"
LIVE = DRIVERS / "live"

CORPUS_DIR = {
    "hays": "challenge/offline-data/hays",
    "home-depot": "challenge/offline-data/home-depot",
    "analog-devices": "challenge/offline-data/analog-devices",
    "deere": "challenge/offline-data/deere",
}

# Assumption drivers the extractor should try to REPLACE with found facts.
RESOLVE_HINTS = {
    "hays": {
        "half_year_finance_charge": "Find the H1 FY26 net finance charge (GBPm) in the 2026-02-27 half-year report income statement or finance-costs note.",
        "q3_share_of_h2": "If any doc discloses Hays quarterly absolute net fees or Q3:Q4 split, extract it; otherwise return null.",
    },
    "home-depot": {
        "gms_quarterly_sales": "Find any disclosure quantifying GMS quarterly or annual sales contribution (8-K, 10-Q, call transcripts).",
        "comp_cadence_step": "Find management commentary quantifying the expected comp cadence through FY26; otherwise return null.",
    },
    "analog-devices": {
        "trailing_opex_ratio": "Compute nothing. Instead extract Q2 FY26 ACTUAL adjusted operating margin pct from the 2026-05-20 8-K tables so code can derive opex ratio = adj GM 73.0 - adj OpM.",
        "beat_shrink": "Return null (policy parameter, not extractable).",
    },
    "deere": {
        "q3_ppa_margin": "Find any disclosure of how the ~$272M IEEPA tariff-refund recovery was allocated across segments in Q2 FY26, and any Q3 margin commentary from the Q2 call.",
        "q3_rev_yoy": "Return null unless a doc gives quarter-specific revenue direction for Q3 FY26.",
        "q3_q2_seasonal_ratio": "Extract Q2 FY24 and Q3 FY24 total net sales and revenues so code can compute a second seasonal ratio observation.",
    },
}


def prompt_for(company: str, pinned: dict) -> str:
    keys = {}
    for k, drv in pinned["drivers"].items():
        hint = RESOLVE_HINTS.get(company, {}).get(k)
        keys[k] = {
            "unit": drv["unit"],
            "task": hint or f"Verify against the corpus. Pinned hint doc: {drv.get('citation', {}).get('doc_path', 'search yourself')}",
        }
    return f"""You are the extraction stage of an earnings-forecast pipeline. Work ONLY from files under {CORPUS_DIR[company]}/ in this repository (plus that folder's INDEX.md). Do not use outside knowledge; do not compute derived values — extract what documents state.

For each driver key below, find the evidence and return its value. Citations must have doc_path (repo-relative), verbatim_line (copied BYTE-EXACT from the file, including odd OCR spacing — it will be checked by substring match and rejected if it does not appear), and published (from the doc's frontmatter published_at). If a value genuinely is not in the corpus, use null and say why in note.

Driver keys:
{json.dumps(keys, indent=1)}

Also return additional_evidence: up to 5 items with material NEW information relevant to the forecast metrics that the keys above miss (newer guidance, restatements, one-offs), same citation schema.

Output ONLY a JSON object (no markdown fences): {{"drivers": {{"<key>": {{"value": <number-or-null>, "unit": "...", "note": "...", "citation": {{"doc_path": "...", "verbatim_line": "...", "published": "YYYY-MM-DD"}}}}}}, "additional_evidence": [...]}}"""


def run_reader(company: str, pinned: dict, run_idx: int) -> dict | None:
    cmd = ["claude", "-p", prompt_for(company, pinned), "--output-format", "json",
           "--allowedTools", "Bash(rg:*),Bash(ls:*),Read,Grep,Glob", "--max-turns", "40"]
    try:
        proc = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, timeout=900)
        payload = json.loads(proc.stdout)
        text = payload.get("result", "")
        match = re.search(r"\{.*\}", text, re.DOTALL)
        return json.loads(match.group(0)) if match else None
    except Exception as e:
        print(f"[{company} run {run_idx}] reader failed: {e}")
        return None


def firewall(company: str, extraction: dict) -> dict:
    """Drop any driver whose corpus citation cannot be re-found byte-exact."""
    kept, dropped = {}, []
    for k, drv in (extraction or {}).get("drivers", {}).items():
        cit = drv.get("citation") or {}
        path, quote = cit.get("doc_path", ""), cit.get("verbatim_line", "")
        if drv.get("value") is None:
            dropped.append((k, "null value"))
            continue
        if path.startswith("challenge/"):
            f = ROOT / path
            if not f.exists() or quote not in f.read_text():
                dropped.append((k, f"quote not re-found in {path}"))
                continue
        kept[k] = drv
    return {"kept": kept, "dropped": dropped,
            "additional_evidence": (extraction or {}).get("additional_evidence", [])}


def close(a: float, b: float) -> bool:
    return abs(a - b) <= max(0.005 * max(abs(a), abs(b)), 1e-9)


def vote(runs: list[dict]) -> dict:
    voted, unresolved = {}, []
    all_keys = {k for r in runs for k in r["kept"]}
    for k in all_keys:
        candidates = [r["kept"][k] for r in runs if k in r["kept"]]
        best, support = None, 0
        for c in candidates:
            n = sum(1 for o in candidates if close(float(o["value"]), float(c["value"])))
            if n > support:
                best, support = c, n
        if best is not None and support >= 2:
            voted[k] = {**best, "vote_support": f"{support}/{len(runs)}"}
        else:
            unresolved.append({"key": k, "candidates": [c.get("value") for c in candidates]})
    return {"voted": voted, "unresolved": unresolved}


def merge(company: str, pinned: dict, voted: dict) -> tuple[dict, list]:
    merged = json.loads(json.dumps(pinned))
    decisions = []
    for k, live in voted.items():
        if k not in merged["drivers"]:
            decisions.append({"key": k, "action": "ignored", "why": "not a known driver key"})
            continue
        p = merged["drivers"][k]
        lv, pv = float(live["value"]), float(p["value"]) if not isinstance(p["value"], list) else None
        if p.get("kind") == "assumption":
            merged["drivers"][k] = {**p, "value": lv, "kind": "extracted-live",
                                    "citation": live.get("citation"), "vote_support": live["vote_support"]}
            decisions.append({"key": k, "action": "UPGRADED assumption -> extracted",
                              "pinned": p["value"], "live": lv})
        elif pv is not None and not close(lv, pv):
            decisions.append({"key": k, "action": "DIVERGENCE — pinned wins, review needed",
                              "pinned": pv, "live": lv, "live_citation": live.get("citation")})
        else:
            decisions.append({"key": k, "action": "confirmed", "value": pv})
    return merged, decisions


def extract_company(company: str, n_runs: int) -> dict:
    pinned = json.loads((DRIVERS / f"{company}.json").read_text())
    with concurrent.futures.ThreadPoolExecutor(max_workers=n_runs) as pool:
        futs = [pool.submit(run_reader, company, pinned, i) for i in range(n_runs)]
        raw = [f.result() for f in futs]
    walled = [firewall(company, r) for r in raw if r]
    votes = vote(walled)
    merged, decisions = merge(company, pinned, votes["voted"])

    LIVE.mkdir(exist_ok=True)
    (LIVE / f"{company}.json").write_text(json.dumps(merged, indent=1))
    report = {
        "company": company, "runs_attempted": n_runs, "runs_parsed": len(walled),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "firewall_drops": [d for w in walled for d in w["dropped"]],
        "unresolved": votes["unresolved"], "merge_decisions": decisions,
        "additional_evidence": [e for w in walled for e in w["additional_evidence"]],
    }
    (LIVE / f"report-{company}.json").write_text(json.dumps(report, indent=1))
    return report


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--runs", type=int, default=3)
    ap.add_argument("--companies", default="hays,home-depot,analog-devices,deere")
    args = ap.parse_args()
    for company in args.companies.split(","):
        rep = extract_company(company.strip(), args.runs)
        ups = sum(1 for d in rep["merge_decisions"] if d["action"].startswith("UPGRADED"))
        div = sum(1 for d in rep["merge_decisions"] if d["action"].startswith("DIVERGENCE"))
        print(f"{company}: {rep['runs_parsed']}/{rep['runs_attempted']} runs parsed, "
              f"{ups} upgraded, {div} divergences, {len(rep['unresolved'])} unresolved "
              f"-> research/drivers/live/report-{company}.json")


if __name__ == "__main__":
    main()
