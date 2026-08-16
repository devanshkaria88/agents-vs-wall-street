"""Backtest harness — hide a past quarter, re-forecast it, score against truth.

A backtest hides a reported quarter (and every later document) from the corpus
via a filename-date cutoff (agent.tools.set_cutoff), asks a Reader agent to
extract management's guidance for that quarter from what remains, anchors a
deterministic forecast on the guidance midpoint, then scores it against the
ACTUAL reported number from the held-out document. ratio_vs_naive compares our
miss to the naive prior-actual-carried-forward miss — the honest stand-in for
the score formula's WS-miss denominator.

    .venv/bin/python -m forecaster.backtest <company> <quarter> [--dry-run]

Holdout specs: research/backtests/holdouts.json (per-quarter, byte-verified
here before anything runs — the spec itself gets the citation firewall).
--dry-run verifies the spec and exercises the cutoff mechanics with NO agent
call. A live run writes:
  trace:  logs/agent-trace-backtest-<company>-<quarter>-<stamp>.jsonl
  result: logs/backtest-<company>-<quarter>-<stamp>.json

INTEGRITY: the backtest reader gets ONLY search_corpus + read_doc + its
terminal submit tool — NEVER web_search; the public web knows the held-out
answer. And per CLAUDE.md the LLM never does arithmetic: it extracts guidance
low/high with a citation; Python computes midpoint, misses, and ratios.
"""
import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

import anthropic
from anthropic import beta_tool

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from agent import tools  # noqa: E402
from agent.loop import MAX_ITERATIONS, _load_env, load_config  # noqa: E402

HOLDOUTS = ROOT / "research" / "backtests" / "holdouts.json"

COMPANIES = ("hays", "home-depot", "analog-devices", "deere")

REQUIRED_KEYS = ("quarter", "label", "unit", "cutoff", "actual", "actual_doc",
                 "actual_quote", "guidance_doc", "guidance_quote",
                 "prior_actual", "prior_doc", "prior_quote")

# Self-contained brief: the FY26 skills describe the CURRENT task and would
# mislead a time-traveling reader, so the backtest never loads them.
BACKTEST_BRIEF = """\
# BACKTEST READER BRIEF — {company}, {quarter} {label}

It is effectively the day before {cutoff}. Documents on/after that date do
not exist for you — the corpus tools will refuse them, and search results
from them are suppressed. Do not speculate about what such documents contain.

Using ONLY search_corpus and read_doc on {company}'s corpus, find
management's most recent guidance for {quarter} {label} (unit: {unit}) and
extract:
  - guidance_low and guidance_high: {anchor_hint} For a point guide, use the
    same value twice. Report the numbers exactly as the document states them —
    you never do arithmetic.
  - citation: {{"doc_path": <repo-relative corpus path>, "verbatim_line":
    <the exact line copied byte-for-byte from the document>, "published":
    <the document's YYYY-MM-DD date>}}

Then call submit_backtest_drivers exactly once with that JSON object. If the
tool returns an ERROR, fix the problem and resubmit.
"""


def _say(line: str) -> None:
    print(line, flush=True)


def _doc_date(path: str) -> str:
    """The YYYY-MM-DD prefix of a corpus doc's basename ('' when undated)."""
    m = re.match(r"^\d{4}-\d{2}-\d{2}", Path(path).name)
    return m.group(0) if m else ""


def load_holdout(company: str, quarter: str) -> dict:
    """The holdout spec for one quarter, or a loud SystemExit explaining why not."""
    if not HOLDOUTS.is_file():
        raise SystemExit(f"ERROR: {HOLDOUTS.relative_to(ROOT)} not found — "
                         "create the holdout spec first (see backtest contract)")
    try:
        specs = json.loads(HOLDOUTS.read_text())
    except json.JSONDecodeError as e:
        raise SystemExit(f"ERROR: {HOLDOUTS.relative_to(ROOT)} is not valid JSON ({e})")
    entries = specs.get(company)
    if not isinstance(entries, list) or not entries:
        raise SystemExit(f"ERROR: no holdouts for '{company}' in "
                         f"{HOLDOUTS.relative_to(ROOT)} (companies present: "
                         + (", ".join(sorted(specs)) or "none") + ")")
    for entry in entries:
        if isinstance(entry, dict) and entry.get("quarter") == quarter:
            missing = [k for k in REQUIRED_KEYS if k not in entry]
            if missing:
                raise SystemExit(f"ERROR: holdout {company}/{quarter} is missing "
                                 "keys: " + ", ".join(missing))
            return entry
    have = ", ".join(str(e.get("quarter")) for e in entries if isinstance(e, dict))
    raise SystemExit(f"ERROR: no holdout quarter '{quarter}' for {company} "
                     f"(have: {have or 'none'})")


def firewall_holdout(company: str, spec: dict) -> list[str]:
    """Byte-exact verification of the holdout spec against the REAL corpus
    (no cutoff active): every quote must re-find verbatim in its doc, and
    every doc date must sit on the correct side of the cutoff. Returns a list
    of failure lines (empty = clean)."""
    failures: list[str] = []
    for quote_key, doc_key in (("actual_quote", "actual_doc"),
                               ("guidance_quote", "guidance_doc"),
                               ("prior_quote", "prior_doc")):
        path = spec[doc_key]
        f = ROOT / path
        if not f.is_file():
            failures.append(f"{doc_key} '{path}' is not a file")
            continue
        if spec[quote_key] not in f.read_text():
            failures.append(f"{quote_key} not re-found byte-exact in {path}")
    cutoff = spec["cutoff"]
    if _doc_date(spec["actual_doc"]) < cutoff:
        failures.append(f"actual_doc date {_doc_date(spec['actual_doc'])!r} is "
                        f"before cutoff {cutoff} — the 'held-out' doc would be "
                        "visible to the agent")
    for doc_key in ("guidance_doc", "prior_doc"):
        if _doc_date(spec[doc_key]) >= cutoff:
            failures.append(f"{doc_key} date {_doc_date(spec[doc_key])!r} is "
                            f"on/after cutoff {cutoff} — the agent could never "
                            "cite it")
    return failures


def exercise_cutoff(company: str, spec: dict) -> list[str]:
    """Prove the cutoff mechanics hide the held-out doc from BOTH corpus tools
    (no agent, no API). Returns failure lines (empty = clean)."""
    failures: list[str] = []
    actual_doc = spec["actual_doc"]
    query = re.escape(spec["actual_quote"].splitlines()[0])
    try:
        tools.set_cutoff(None)
        open_search = tools.search_corpus(query, company, max_results=200)
        if actual_doc not in open_search:
            failures.append(f"positive control: actual_quote does not surface "
                            f"{actual_doc} in search_corpus WITHOUT a cutoff")
        tools.set_cutoff(spec["cutoff"])
        blocked_read = tools.read_doc(actual_doc)
        if "beyond the backtest cutoff" not in blocked_read:
            failures.append(f"read_doc({actual_doc}) did not return the "
                            f"beyond-cutoff ERROR (got: {blocked_read[:120]!r})")
        blocked_search = tools.search_corpus(query, company, max_results=200)
        if actual_doc in blocked_search:
            failures.append(f"search_corpus still surfaces {actual_doc} "
                            "with the cutoff armed")
    finally:
        tools.set_cutoff(None)
    return failures


def run_backtest(company: str, quarter: str, spec: dict) -> int:
    """Live run: time-traveled reader agent -> deterministic scoring -> result file."""
    _load_env()
    cfg = load_config()
    client = anthropic.Anthropic()
    cutoff, label, unit = spec["cutoff"], spec["label"], spec["unit"]
    # anchor_mode: how management expresses the guidance. "absolute" = the
    # metric's own units; "growth_pct" = YoY growth percentages, which code
    # applies to the year-ago base (prior_actual). HD guides growth, not sales.
    mode = spec.get("anchor_mode", "absolute")
    anchor_hint = (
        "the guided YoY GROWTH RATE range in percent (e.g. 'growth of "
        "approximately 2.5% to 4.5%' -> 2.5 and 4.5). Deterministic code "
        "applies it to the year-ago base — never convert it yourself."
        if mode == "growth_pct"
        else f"the guided range as stated by management, in {unit}."
    )

    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    logdir = ROOT / "logs"
    logdir.mkdir(exist_ok=True)
    trace_path = logdir / f"agent-trace-backtest-{company}-{quarter}-{stamp}.jsonl"
    result_path = logdir / f"backtest-{company}-{quarter}-{stamp}.json"

    submitted: dict = {"anchor": None}

    @beta_tool
    def submit_backtest_drivers(drivers_json: str) -> str:
        """Submit the extracted guidance as a JSON string. Call exactly once,
        when the guidance range and its citation are resolved.

        Args:
            drivers_json: JSON object {"guidance_low": num, "guidance_high":
                num, "citation": {"doc_path": str, "verbatim_line": str,
                "published": str}} — verbatim_line byte-exact from the doc.
        """
        try:
            parsed = json.loads(drivers_json)
        except json.JSONDecodeError as e:
            parsed = None
            out = f"ERROR: invalid JSON ({e}) — fix and resubmit"
        else:
            out = None if isinstance(parsed, dict) else "ERROR: top level must be a JSON object"
        if out is not None:
            tools.log_event("submit_backtest_drivers", {"chars": len(drivers_json)}, out)
            return out
        low, high = parsed.get("guidance_low"), parsed.get("guidance_high")
        cit = parsed.get("citation")
        if not all(isinstance(v, (int, float)) and not isinstance(v, bool)
                   for v in (low, high)):
            out = "ERROR: guidance_low and guidance_high must both be numbers"
        elif low > high:
            out = f"ERROR: guidance_low {low} > guidance_high {high}"
        elif not (isinstance(cit, dict)
                  and isinstance(cit.get("doc_path"), str)
                  and isinstance(cit.get("verbatim_line"), str)
                  and isinstance(cit.get("published"), str)):
            out = ("ERROR: citation must be {doc_path: str, verbatim_line: str, "
                   "published: str}")
        else:
            # Citation firewall, cutoff-aware: the quote must re-find
            # byte-exact in a corpus doc the time-traveled agent may see.
            f = (ROOT / cit["doc_path"]).resolve()
            in_corpus = (str(f).startswith(str(tools.CORPUS.resolve()))
                         and f.is_file())
            if not in_corpus:
                out = f"ERROR: citation doc_path '{cit['doc_path']}' is not a corpus document"
            elif tools._blocked(f):
                out = (f"ERROR: citation doc_path '{cit['doc_path']}' is beyond "
                       f"the backtest cutoff ({cutoff}) — cite a document you "
                       "can actually read")
            elif cit["verbatim_line"] not in f.read_text():
                out = (f"ERROR: verbatim_line not re-found byte-exact in "
                       f"{cit['doc_path']} — re-read the document and copy the "
                       "line exactly")
        if out is None:
            submitted["anchor"] = {"low": float(low), "high": float(high),
                                   "citation": cit}
            out = f"received: guidance [{low}, {high}] cited to {cit['doc_path']}"
        tools.log_event("submit_backtest_drivers", {"chars": len(drivers_json)}, out)
        return out

    tools.set_trace(trace_path)
    tools.set_cutoff(cutoff)
    try:
        # The time-travel is an event too — one trace line so the dashboard
        # feed shows the cutoff this agent ran under.
        tools.log_event("load_skill", {"file": f"backtest cutoff {cutoff}"},
                        f"corpus documents dated >= {cutoff} hidden from this agent")

        system = BACKTEST_BRIEF.format(company=company, quarter=quarter,
                                       label=label, unit=unit, cutoff=cutoff,
                                       anchor_hint=anchor_hint)
        _say(f"[backtest {company} {quarter}] launching time-traveled reader "
             f"(cutoff {cutoff})")
        runner = client.beta.messages.tool_runner(
            model=cfg["model"],
            max_tokens=16000,
            output_config={"effort": cfg["effort"]},
            system=system,
            tools=[tools.search_corpus, tools.read_doc, submit_backtest_drivers],
            messages=[{"role": "user", "content":
                       f"Find management's guidance for {company} {quarter} "
                       f"{label}, then call submit_backtest_drivers once."}],
            max_iterations=MAX_ITERATIONS,
        )
        last_message = None
        for message in runner:
            last_message = message
            if message.stop_reason == "refusal":
                _say(f"[backtest {company} {quarter}] refusal — aborting")
                return 1
        if last_message is not None and getattr(last_message, "stop_reason", None) == "pause_turn":
            # Kept simple like the validator: no resume — accept the end state.
            _say(f"[backtest {company} {quarter}] ended on pause_turn — no resume attempted")
    finally:
        tools.set_cutoff(None)

    anchor = submitted["anchor"]
    if anchor is None:
        _say(f"[backtest {company} {quarter}] finished without a valid "
             "submit_backtest_drivers call")
        return 1

    # -- deterministic scoring (code, never the LLM) -------------------------
    mid = (anchor["low"] + anchor["high"]) / 2
    actual = float(spec["actual"])
    naive = float(spec["prior_actual"])
    # growth_pct: guidance is a YoY rate — apply it to the year-ago base here,
    # in code, exactly where the units contract says arithmetic lives.
    forecast = round(naive * (1 + mid / 100), 2) if mode == "growth_pct" else round(mid, 2)
    abs_miss = abs(forecast - actual)
    naive_miss = abs(naive - actual)
    result = {
        "company": company,
        "quarter": quarter,
        "label": label,
        "unit": unit,
        "cutoff": cutoff,
        "forecast": forecast,
        "actual": actual,
        "abs_miss": abs_miss,
        "pct_miss": abs_miss / abs(actual),
        "naive": naive,
        "naive_miss": naive_miss,
        "ratio_vs_naive": abs_miss / max(naive_miss, 1e-9),
        "anchor_mode": mode,
        "anchor": {"low": anchor["low"], "high": anchor["high"], "mid": mid,
                   "citation": anchor["citation"]},
        "verified": True,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "trace": str(trace_path.relative_to(ROOT)),
    }
    # Atomic + dot-prefixed tmp, same reasons as the fullrun progress file.
    tmp = result_path.with_name("." + result_path.name + ".tmp")
    tmp.write_text(json.dumps(result, indent=1))
    os.replace(tmp, result_path)

    _say(f"[backtest {company} {quarter}] {label} ({unit}) — "
         f"anchor [{anchor['low']}, {anchor['high']}] -> forecast {forecast}")
    _say(f"[backtest {company} {quarter}] actual {actual} | miss {abs_miss:.2f} "
         f"({result['pct_miss']:.2%}) | naive miss {naive_miss:.2f} | "
         f"ratio_vs_naive {result['ratio_vs_naive']:.3f} "
         f"({'beat' if result['ratio_vs_naive'] < 1 else 'lost to'} the naive carry-forward)")
    _say(f"[backtest {company} {quarter}] result -> {result_path.relative_to(ROOT)}")
    return 0


def main() -> int:
    argv = sys.argv[1:]
    dry = "--dry-run" in argv
    args = [a for a in argv if a != "--dry-run"]
    if len(args) != 2 or args[0] not in COMPANIES:
        print(f"usage: python -m forecaster.backtest <{'|'.join(COMPANIES)}> "
              "<quarter> [--dry-run]")
        return 2
    company, quarter = args
    spec = load_holdout(company, quarter)

    # 1. Firewall the spec itself before anything runs.
    failures = firewall_holdout(company, spec)
    for f in failures:
        _say(f"FAIL [holdout firewall] {f}")
    if failures:
        _say(f"# backtest {company} {quarter} ABORTED — holdout spec failed its firewall")
        return 1
    _say(f"PASS [holdout firewall] all 3 quotes byte-exact; doc dates on the "
         f"correct sides of cutoff {spec['cutoff']}")

    # 2. Prove the cutoff mechanics (no agent, no API).
    failures = exercise_cutoff(company, spec)
    for f in failures:
        _say(f"FAIL [cutoff mechanics] {f}")
    if failures:
        _say(f"# backtest {company} {quarter} ABORTED — cutoff mechanics failed")
        return 1
    _say(f"PASS [cutoff mechanics] {spec['actual_doc']} is invisible to "
         "read_doc and search_corpus under the cutoff")

    if dry:
        _say(f"# backtest {company} {quarter} dry-run CLEAR — no agent called")
        return 0

    # 3. Live run.
    return run_backtest(company, quarter, spec)


if __name__ == "__main__":
    raise SystemExit(main())
