"""Validator: the last gate before a number reaches a yellow cell.

Checks each forecast for unit sanity, position vs the trailing reported
history, and internal cross-foots. Verdicts (accepted AND rejected, with
reasons) are written to logs/ — rejected metrics keep their previous
workbook value rather than shipping something suspicious.

Run: .venv/bin/python -m forecaster.validate
"""
import json
import math
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# Trailing reported history per metric (from research/dossiers/*.json, all
# firewall-verified). hist = [min, max] of the last 8 reported periods.
# sane = absolute never-plausible bounds for the unit — a hard failure.
CHECKS = {
    ("HD-FY2026Q2.xlsx", "Net sales"): {"hist": [38198, 45277], "sane": [30000, 60000],
        "growth_ok": "GMS acquisition adds a full quarter absent from history ($1.3B in Q1 per the 10-Q, seasonally scaled)"},
    ("HD-FY2026Q2.xlsx", "Adjusted diluted EPS"): {"hist": [2.72, 4.68], "sane": [1.0, 8.0]},
    ("HD-FY2026Q2.xlsx", "Comparable sales, total company"): {"hist": [-3.3, 1.0], "sane": [-10.0, 10.0],
        "growth_ok": "management guided comps improving through the year from Q1's +0.6"},
    ("ADI-FY2026Q3.xlsx", "Revenue"): {"hist": [2312, 3623], "sane": [1500, 6000],
        "growth_ok": "company guided $3.9B +/- $100M, above every historical quarter"},
    ("ADI-FY2026Q3.xlsx", "Adjusted diluted EPS"): {"hist": [1.58, 3.09], "sane": [0.5, 6.0],
        "growth_ok": "company guided $3.30 +/- $0.15"},
    ("ADI-FY2026Q3.xlsx", "Adjusted gross margin"): {"hist": [67.9, 73.0], "sane": [50.0, 85.0],
        "growth_ok": "margin series rising four consecutive quarters"},
    ("HAS-FY2026.xlsx", "Net fees"): {"hist": [972.4, 1294.6], "sane": [300.0, 2000.0],
        "growth_ok": "fees declined all year (H1 actual 453.3 annualises below the historical min)"},
    ("HAS-FY2026.xlsx", "Pre-exceptional basic EPS"): {"hist": [1.31, 9.22], "sane": [0.2, 15.0],
        "growth_ok": "H1 actual was 0.46p; full year mechanically lands below FY25's 1.31p"},
    ("HAS-FY2026.xlsx", "Pre-exceptional operating profit"): {"hist": [45.6, 210.1], "sane": [10.0, 300.0]},
    ("DE-FY2026Q3.xlsx", "Worldwide net sales and revenues"): {"hist": [8508, 13369], "sane": [6000, 20000]},
    ("DE-FY2026Q3.xlsx", "Diluted EPS (GAAP)"): {"hist": [2.42, 6.64], "sane": [1.0, 10.0]},
    ("DE-FY2026Q3.xlsx", "Production & Precision Ag operating profit"): {"hist": [139, 1162], "sane": [50, 2000]},
}


def main() -> int:
    forecasts = json.loads((ROOT / "forecasts" / "forecasts.json").read_text())
    traces = json.loads((ROOT / "forecasts" / "traces.json").read_text())
    verdicts, failed = [], False

    # Completeness gate: all 12 (workbook, metric) cells must be present BEFORE
    # the writer runs — this is the write-gate's guarantee that a partial
    # forecasts.json can never reach write_workbooks (a blank cell scores 5.0).
    for wb, label in CHECKS:
        if not isinstance(forecasts.get(wb), dict) or label not in forecasts[wb]:
            verdicts.append({"workbook": wb, "metric": label, "value": None,
                             "checks": {"present": "FAIL: missing from forecasts.json"}})
            failed = True

    for wb, metrics in forecasts.items():
        for label, value in metrics.items():
            spec = CHECKS.get((wb, label))
            if spec is None:
                verdicts.append({"workbook": wb, "metric": label, "value": value,
                                 "checks": {"known_metric": "FAIL: not a known (workbook, metric) pair"}})
                failed = True
                continue
            v = {"workbook": wb, "metric": label, "value": value, "checks": {}}

            ok = isinstance(value, (int, float)) and math.isfinite(value)
            v["checks"]["finite_number"] = "pass" if ok else "FAIL"
            failed |= not ok

            lo, hi = spec["sane"]
            ok = lo <= value <= hi
            v["checks"]["unit_sanity"] = "pass" if ok else f"FAIL: {value} outside sane [{lo}, {hi}]"
            failed |= not ok

            hlo, hhi = spec["hist"]
            if hlo <= value <= hhi:
                v["checks"]["vs_trailing_history"] = "pass (inside 8-period range)"
            elif hlo * 0.8 <= value <= hhi * 1.15:
                reason = spec.get("growth_ok")
                if reason:
                    v["checks"]["vs_trailing_history"] = f"outside history, justified: {reason}"
                else:
                    v["checks"]["vs_trailing_history"] = "FAIL: outside history with no justification"
                    failed = True
            else:
                v["checks"]["vs_trailing_history"] = f"FAIL: {value} far outside history [{hlo}, {hhi}]"
                failed = True

            verdicts.append(v)

    # Cross-foots across metrics
    de_eps = forecasts["DE-FY2026Q3.xlsx"]["Diluted EPS (GAAP)"]
    de_ni_implied = de_eps * 270.7
    xf1 = abs(de_ni_implied - 1311) < 120
    verdicts.append({"workbook": "DE-FY2026Q3.xlsx", "metric": "cross-foot EPS x shares vs Q3 NI",
                     "value": round(de_ni_implied, 1),
                     "checks": {"eps_x_shares_vs_ni": "pass" if xf1 else "FAIL"}})
    failed |= not xf1

    hays_op = forecasts["HAS-FY2026.xlsx"]["Pre-exceptional operating profit"]
    xf2 = 37.0 <= hays_op <= 46.5
    verdicts.append({"workbook": "HAS-FY2026.xlsx", "metric": "cross-foot op profit vs stated consensus range",
                     "value": hays_op,
                     "checks": {"inside_37_to_46_range": "pass" if xf2 else "FAIL"}})
    failed |= not xf2

    hd = traces["HD-FY2026Q2.xlsx"]
    eps_metric = next(m for m in hd if m["label"] == "Adjusted diluted EPS")
    xf3 = eps_metric["spread"] < 0.35
    verdicts.append({"workbook": "HD-FY2026Q2.xlsx", "metric": "cross-foot EPS path disagreement",
                     "value": eps_metric["spread"],
                     "checks": {"paths_within_tolerance": "pass" if xf3 else "FAIL"}})
    failed |= not xf3

    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    logdir = ROOT / "logs"
    logdir.mkdir(exist_ok=True)
    report = {"timestamp": stamp, "result": "FAIL" if failed else "PASS", "verdicts": verdicts}
    (logdir / f"validation-{stamp}.json").write_text(json.dumps(report, indent=1))

    for v in verdicts:
        for name, res in v["checks"].items():
            flag = "REJECT" if res.startswith("FAIL") else "accept"
            print(f"{flag:7s} {v['workbook']:20s} {v['metric']:45s} {name}: {res}")
    print(f"\nvalidation: {report['result']} ({len(verdicts)} verdicts) -> logs/validation-{stamp}.json")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
