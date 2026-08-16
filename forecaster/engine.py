"""Deterministic forecast engine. No LLM anywhere in this file.

Consumes research/drivers/<company>.json (citation-carrying drivers), fits
calibration parameters from history pairs, computes each metric via a primary
path plus cross-checks, evaluates plan variants over judgment drivers (the
low/mid/high of each drives a variant; final value = median), and emits
forecasts/forecasts.json plus a full per-metric trace.

Run: .venv/bin/python -m forecaster.engine
"""
import itertools
import json
import statistics
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DRIVERS = ROOT / "research" / "drivers"
OUT = ROOT / "forecasts"


def load(company: str) -> dict:
    """Prefer the live-merged drivers (agent-extracted, firewall-verified,
    voted, merged against the reviewed pinned set) when they exist."""
    live = DRIVERS / "live" / f"{company}.json"
    src = live if live.exists() else DRIVERS / f"{company}.json"
    d = json.loads(src.read_text())
    d["_source"] = str(src.relative_to(ROOT))
    return d


class Metric:
    def __init__(self, label: str, unit: str, ndigits: int):
        self.label, self.unit, self.ndigits = label, unit, ndigits
        self.trace: list[dict] = []
        self.variants: list[float] = []
        self.cross_checks: list[dict] = []

    def step(self, desc: str, formula: str, result):
        self.trace.append({"desc": desc, "formula": formula, "result": result})
        return result

    def cross(self, desc: str, formula: str, result, primary):
        delta = round(result - primary, 4)
        self.cross_checks.append({"desc": desc, "formula": formula,
                                  "result": result, "delta_vs_primary": delta})
        return result

    def finish(self, drivers_used: list[str], dossier: dict) -> dict:
        value = round(statistics.median(self.variants), self.ndigits)
        return {
            "label": self.label, "unit": self.unit, "value": value,
            "variants": sorted(round(v, self.ndigits) for v in self.variants),
            "spread": round(max(self.variants) - min(self.variants), self.ndigits),
            "trace": self.trace, "cross_checks": self.cross_checks,
            "citations": {k: dossier["drivers"][k].get("citation",
                          {"justification": dossier["drivers"][k].get("justification", "")})
                          for k in drivers_used if k in dossier["drivers"]},
        }


def variants_over(dossier: dict, judgment_keys: list[str]):
    """Yield one parameter set per plan variant: every low/mid/high combination
    of the judgment drivers. Non-judgment drivers stay at their point value."""
    d = dossier["drivers"]
    axes = []
    for k in judgment_keys:
        drv = d[k]
        axes.append([drv.get("low", drv["value"]), drv["value"], drv.get("high", drv["value"])])
    for combo in itertools.product(*axes):
        yield dict(zip(judgment_keys, combo))


def val(dossier: dict, key: str) -> float:
    return dossier["drivers"][key]["value"]


def calibrate_bias(pairs: list[dict]) -> dict:
    beats = [p["actual"] - p["guide_mid"] for p in pairs]
    return {"n": len(beats), "mean": round(statistics.mean(beats), 4),
            "median": round(statistics.median(beats), 4),
            "beats": [round(b, 3) for b in beats],
            "hit_rate_above_mid": sum(b > 0 for b in beats) / len(beats)}


def forecast_hays(d: dict) -> list[dict]:
    out = []

    m = Metric("Net fees", "GBPm", 1)
    h2_25 = m.step("H2 25 base = FY25 - H1 25", "972.4 - 496.0", val(d, "fy25_net_fees") - val(d, "h1_25_net_fees"))
    for p in variants_over(d, ["q3_share_of_h2"]):
        q3b, q4b = h2_25 * p["q3_share_of_h2"], h2_25 * (1 - p["q3_share_of_h2"])
        h2_26 = q3b * (1 + val(d, "q3_26_actual_growth")) + q4b * (1 + val(d, "q4_26_actual_growth"))
        m.variants.append(val(d, "h1_26_net_fees") + h2_26)
    m.step("FY26 = H1 actual + H2 reconstructed from quarterly actual growth",
           "453.3 + [476.4 split x (1-7%), (1-4%)]", round(statistics.median(m.variants), 1))
    m.cross("CFO on Q4 call describes the group as", "'close to GBP 900 million'", 900.0,
            statistics.median(m.variants))
    out.append(m.finish(["fy25_net_fees", "h1_25_net_fees", "h1_26_net_fees",
                         "q3_26_actual_growth", "q4_26_actual_growth", "q3_share_of_h2"], d))

    m = Metric("Pre-exceptional operating profit", "GBPm", 1)
    primary = m.step("Company states FY26 lands at top of GBP37.0-46.0m consensus range",
                     "range_top", val(d, "op_guide_range_top"))
    h2 = val(d, "h2_25_op") * val(d, "h2_26_op_yoy")
    m.cross("CFO path: H1 actual + H2 25 x 1.30", "20.1 + 20.1*1.30",
            round(val(d, "h1_26_op") + h2, 1), primary)
    m.variants = [primary]
    out.append(m.finish(["op_guide_range_top", "h1_26_op", "h2_25_op", "h2_26_op_yoy", "op_consensus"], d))

    m = Metric("Pre-exceptional basic EPS", "GBp", 2)
    h1_earn = m.step("H1 26 pre-x earnings implied by EPS x shares",
                     "0.46p x 1595.7m / 100", val(d, "h1_26_eps") * val(d, "h1_26_shares") / 100)
    h2_op = m.step("H2 26 op profit = FY guide top - H1 actual", "46.0 - 20.1",
                   val(d, "op_guide_range_top") - val(d, "h1_26_op"))
    for p in variants_over(d, ["half_year_finance_charge"]):
        f = p["half_year_finance_charge"]
        one_minus_t = h1_earn / (val(d, "h1_26_op") - f)  # solve H1 identity for the tax factor
        h2_earn = (h2_op - f) * one_minus_t
        m.variants.append(val(d, "h1_26_eps") + h2_earn / val(d, "h1_26_shares") * 100)
    m.step("FY26 EPS = H1 actual + H2 from op profit less finance charge, taxed, per share",
           "0.46 + (H2op - F)(1-t)/shares", round(statistics.median(m.variants), 2))
    out.append(m.finish(["h1_26_eps", "h1_26_shares", "op_guide_range_top",
                         "h1_26_op", "half_year_finance_charge"], d))
    return out


def forecast_home_depot(d: dict) -> list[dict]:
    out = []

    m = Metric("Comparable sales, total company", "%", 1)
    for p in variants_over(d, ["comp_cadence_step"]):
        m.variants.append(val(d, "q1_26_comps") + p["comp_cadence_step"])
    m.step("Q2 comp = Q1 actual + cadence step (management: improvement through year)",
           "0.6 + step", round(statistics.median(m.variants), 1))
    m.cross("FY guide midpoint", "(0.0 + 2.0)/2", val(d, "fy26_comp_guide_mid"),
            statistics.median(m.variants))
    comps_final = statistics.median(m.variants)
    out.append(m.finish(["q1_26_comps", "comp_cadence_step", "fy26_comp_guide_mid"], d))

    m = Metric("Net sales", "USDm", 0)
    for p in variants_over(d, ["gms_quarterly_sales"]):
        gms = p["gms_quarterly_sales"]
        organic_q1 = (val(d, "q1_26_net_sales") - gms) / val(d, "q1_25_net_sales") - 1
        organic_q2 = organic_q1 + (comps_final - val(d, "q1_26_comps")) / 100
        m.variants.append(val(d, "q2_25_net_sales") * (1 + organic_q2) + gms)
    m.step("Q2 organic solved from Q1 identity, stepped by comp cadence; GMS added back",
           "45277 x (1 + organic_q2) + GMS", round(statistics.median(m.variants)))
    m.cross("FY sales guide midpoint applied to year-ago quarter", "45277 x 1.035",
            round(val(d, "q2_25_net_sales") * (1 + val(d, "fy26_sales_growth_guide"))),
            statistics.median(m.variants))
    out.append(m.finish(["q2_25_net_sales", "q1_26_net_sales", "q1_25_net_sales",
                         "q1_26_comps", "gms_quarterly_sales", "fy26_sales_growth_guide"], d))

    m = Metric("Adjusted diluted EPS", "USD / share", 2)
    fy26_adj = m.step("FY26 adjusted EPS implied: GAAP guide mid + FY25 adj-GAAP gap",
                      "14.23 x 1.02 + (14.69 - 14.23)",
                      val(d, "fy26_gaap_eps_guide_base") * (1 + val(d, "fy26_eps_growth_mid"))
                      + (val(d, "fy25_adj_eps") - val(d, "fy26_gaap_eps_guide_base")))
    yoy_path = val(d, "q2_25_adj_eps") * (1 + val(d, "q1_26_adj_eps_yoy") / 2)
    m.step("Path A: year-ago x interpolated YoY (Q1 -3.7% improving toward FY ~+2%)",
           "4.68 x (1 - 0.037/2)", round(yoy_path, 2))
    share_path = fy26_adj * (val(d, "q2_25_adj_eps") / val(d, "fy25_adj_eps"))
    m.step("Path B: FY26 adj estimate x Q2's FY25 share of year",
           "FY26adj x (4.68/14.69)", round(share_path, 2))
    m.variants = [yoy_path, share_path, (yoy_path + share_path) / 2]
    out.append(m.finish(["q2_25_adj_eps", "q1_26_adj_eps_yoy", "fy25_adj_eps",
                         "fy26_gaap_eps_guide_base", "fy26_eps_growth_mid"], d))
    return out


def forecast_analog_devices(d: dict, calib: dict) -> list[dict]:
    out = []

    m = Metric("Revenue", "USDm", 0)
    rev_bias = calib["revenue"]["median"]
    for p in variants_over(d, ["beat_shrink"]):
        m.variants.append(val(d, "q3_guide_rev_mid") + rev_bias * p["beat_shrink"])
    m.step("Guide midpoint + shrunk historical median beat (8-of-8 beats, median +$74.5M)",
           "3900 + 74.5 x shrink", round(statistics.median(m.variants)))
    m.cross("Guide high end (3 of last 5 quarters landed above it)", "3900 + 100",
            val(d, "q3_guide_rev_mid") + 100, statistics.median(m.variants))
    out.append(m.finish(["q3_guide_rev_mid", "beat_shrink"], d))

    m = Metric("Adjusted diluted EPS", "USD / share", 2)
    eps_bias = calib["adj_eps"]["median"]
    for p in variants_over(d, ["beat_shrink"]):
        m.variants.append(val(d, "q3_guide_adj_eps_mid") + eps_bias * p["beat_shrink"])
    m.step("Guide midpoint + shrunk historical median EPS beat (median +$0.115)",
           "3.30 + 0.115 x shrink", round(statistics.median(m.variants), 2))
    out.append(m.finish(["q3_guide_adj_eps_mid", "beat_shrink"], d))

    m = Metric("Adjusted gross margin", "%", 1)
    series = d["drivers"]["adj_gm_series"]["value"]
    damped = m.step("Damped trend: last value + 0.35 x last sequential delta",
                    "73.0 + 0.35 x 1.8", series[-1] + 0.35 * (series[-1] - series[-2]))
    for p in variants_over(d, ["trailing_opex_ratio"]):
        implied = val(d, "q3_guide_adj_opm") + p["trailing_opex_ratio"]
        m.variants.append((damped + implied) / 2)
    m.step("Blend damped trend with guide-implied GM (adj op margin 49.0 + opex ratio)",
           "(73.6 + 73.3)/2", round(statistics.median(m.variants), 1))
    out.append(m.finish(["adj_gm_series", "q3_guide_adj_opm", "trailing_opex_ratio", "q2_26_adj_gm"], d))
    return out


def forecast_deere(d: dict) -> list[dict]:
    out = []

    m = Metric("Worldwide net sales and revenues", "USDm", 0)
    for p in variants_over(d, ["q3_q2_seasonal_ratio", "q3_rev_yoy"]):
        seasonal = val(d, "q2_26_total_rev") * p["q3_q2_seasonal_ratio"]
        yoy = val(d, "q3_25_total_rev") * (1 + p["q3_rev_yoy"])
        m.variants.append((seasonal + yoy) / 2)
    m.step("Blend of seasonal path (Q2 x Q3/Q2 ratio) and YoY path (year-ago x growth)",
           "(13369 x 0.942 + 12018 x 1.04)/2", round(statistics.median(m.variants)))
    out.append(m.finish(["q2_26_total_rev", "q3_q2_seasonal_ratio", "q3_25_total_rev", "q3_rev_yoy"], d))

    m = Metric("Diluted EPS (GAAP)", "USD / share", 2)
    h2_ni = m.step("H2 26 NI implied by FY guide mid - H1 actual", "4750 - 2429",
                   val(d, "fy26_ni_guide_mid") - val(d, "h1_26_ni"))
    for p in variants_over(d, ["q3_share_of_h2_ni"]):
        m.variants.append(h2_ni * p["q3_share_of_h2_ni"] / val(d, "diluted_shares"))
    m.step("Q3 EPS = H2 NI x Q3 share / diluted shares", "2321 x 0.565 / 270.7",
           round(statistics.median(m.variants), 2))
    m.cross("Year-ago quarter EPS", "Q3 FY25 actual", val(d, "q3_25_eps"),
            statistics.median(m.variants))
    out.append(m.finish(["fy26_ni_guide_mid", "h1_26_ni", "q3_share_of_h2_ni",
                         "diluted_shares", "q3_25_eps"], d))

    m = Metric("Production & Precision Ag operating profit", "USDm", 0)
    for p in variants_over(d, ["q3_ppa_sales_yoy", "q3_ppa_margin"]):
        sales = val(d, "q3_25_ppa_sales") * (1 + p["q3_ppa_sales_yoy"])
        m.variants.append(sales * p["q3_ppa_margin"] / 100)
    m.step("PPA sales (year-ago x guided decline) x margin", "4273 x 0.93 x 14.0%",
           round(statistics.median(m.variants)))
    m.cross("Year-ago quarter PPA op profit", "Q3 FY25 actual", val(d, "q3_25_ppa_op"),
            statistics.median(m.variants))
    out.append(m.finish(["q3_25_ppa_sales", "q3_ppa_sales_yoy", "q3_ppa_margin",
                         "q3_25_ppa_op", "ppa_fy_sales_guide", "h1_26_ppa_sales_yoy"], d))
    return out


def main() -> None:
    OUT.mkdir(exist_ok=True)
    adi = load("analog-devices")
    calib = {"revenue": calibrate_bias(adi["history_pairs"]["revenue"]),
             "adj_eps": calibrate_bias(adi["history_pairs"]["adj_eps"])}
    (OUT / "calibration.json").write_text(json.dumps(
        {"analog-devices": calib,
         "note": "beat = actual - guide midpoint; engine uses the median, "
                 "shrunk by the beat_shrink judgment driver"}, indent=1))

    results = {
        "HAS-FY2026.xlsx": forecast_hays(load("hays")),
        "HD-FY2026Q2.xlsx": forecast_home_depot(load("home-depot")),
        "ADI-FY2026Q3.xlsx": forecast_analog_devices(adi, calib),
        "DE-FY2026Q3.xlsx": forecast_deere(load("deere")),
    }

    forecasts = {f: {m["label"]: m["value"] for m in metrics} for f, metrics in results.items()}
    (OUT / "forecasts.json").write_text(json.dumps(forecasts, indent=1))
    (OUT / "traces.json").write_text(json.dumps(results, indent=1))

    for f, metrics in results.items():
        for m in metrics:
            print(f"{f:20s} {m['label']:42s} {m['value']:>10} {m['unit']:12s} "
                  f"variants={len(m['variants'])} spread={m['spread']}")


if __name__ == "__main__":
    main()
