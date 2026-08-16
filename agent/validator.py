"""The adversarial validator agent — the last agent before workbooks are written.

run_validator(company) launches a tool-use agent (same structure as
agent/skillgen.py: client, JSONL trace, tool_runner, local terminal beta_tool)
whose ONLY job is to try to REFUTE the three computed metrics for a company.
It receives the metrics with their evidence->calculation traces
(forecasts/traces.json) and the merged drivers with citations
(research/drivers/live/<company>.json, falling back to the pinned file), and
re-reads the corpus to check every citation, unit convention, and
guidance/history consistency. It never computes and never proposes numbers —
it critiques with citations only (CLAUDE.md: the LLM never does arithmetic).

Artifacts:
  trace:   logs/agent-trace-validator-<company>-<stamp>.jsonl
  verdict: logs/agent-validator-<company>-<stamp>.json
           {"company", "timestamp", "verdicts": [{"metric", "verdict",
            "severity", "reason", "evidence"}]}

CLI: .venv/bin/python -m agent.validator <company>
"""
import json
import os
import sys
from datetime import datetime, timezone

import anthropic
from anthropic import beta_tool

from agent import tools
from agent.loop import (MAX_ITERATIONS, ROOT, _load_env, load_config,
                        skill_files, system_prompt)

WORKBOOKS = {
    "hays": "HAS-FY2026.xlsx",
    "home-depot": "HD-FY2026Q2.xlsx",
    "analog-devices": "ADI-FY2026Q3.xlsx",
    "deere": "DE-FY2026Q3.xlsx",
}

VERDICT_VALUES = ("confirmed", "challenged")
SEVERITY_VALUES = ("info", "warning", "blocker")

_NOTE_LIMIT = 800  # chars — free-text note fields beyond this are truncated

ADVERSARIAL_BRIEF = """\
# ADVERSARIAL VALIDATOR BRIEF (overrides the extraction task above)

You are the ADVERSARIAL VALIDATOR for {company} — the final agent gate before
workbooks are written. You are NOT extracting drivers. You receive the three
computed metrics with their evidence->calculation traces, and the merged
drivers with citations. Your job is to try to REFUTE each metric:

1. Re-find every cited verbatim_line via read_doc and check the driver value
   matches what the document actually says.
2. Check unit conventions: percentages are percentage points (4.5 means 4.5%),
   Hays EPS is in PENCE, money is in millions (USDm/GBPm).
3. Check each value is consistent with the latest guidance and the trailing
   reported history in the corpus.
4. Check the trace's stated inputs match their citations.

You MUST NOT do arithmetic and MUST NOT propose alternative numbers — you
critique with citations only.

Default to 'confirmed' unless you find concrete cited evidence of a problem.
Use severity 'blocker' ONLY for a wrong-unit / wrong-scale /
contradicted-by-document error that would materially mis-state a workbook
cell; 'warning' for plausible concerns; 'info' for notes.

When done, call submit_verdict exactly once with a JSON array holding exactly
one object per metric label ({labels}), each shaped:
{{"metric": <label>, "verdict": "confirmed"|"challenged",
  "severity": "info"|"warning"|"blocker", "reason": <str>,
  "evidence": {{"doc_path": <str>, "verbatim_line": <str>}} or null}}
"""


def _slim_drivers(drivers: dict) -> dict:
    """Deep copy with huge free-text note fields truncated.
    Citations are never touched — they must stay verbatim."""
    out = json.loads(json.dumps(drivers))

    def trim(d: dict) -> None:
        for key in ("notes", "note", "justification"):
            v = d.get(key)
            if isinstance(v, str) and len(v) > _NOTE_LIMIT:
                d[key] = v[:_NOTE_LIMIT] + " ...[truncated]"

    trim(out)
    for drv in (out.get("drivers") or {}).values():
        if isinstance(drv, dict):
            trim(drv)
    return out


def _validate_verdicts(raw, labels: list[str]) -> tuple[list | None, str | None]:
    """Check the submitted verdict list against the contract.
    Returns (cleaned_verdicts, None) or (None, why_invalid)."""
    if isinstance(raw, dict) and isinstance(raw.get("verdicts"), list):
        raw = raw["verdicts"]  # accept the wrapped form too
    if not isinstance(raw, list):
        return None, "top level must be a JSON array of verdict objects"
    cleaned, seen = [], []
    for i, v in enumerate(raw):
        if not isinstance(v, dict):
            return None, f"entry {i} is not an object"
        metric = v.get("metric")
        if metric not in labels:
            return None, (f"entry {i} metric {metric!r} is not one of: "
                          + ", ".join(repr(l) for l in labels))
        if metric in seen:
            return None, f"duplicate verdict for metric {metric!r}"
        if v.get("verdict") not in VERDICT_VALUES:
            return None, f"entry {i} verdict must be one of {VERDICT_VALUES}"
        if v.get("severity") not in SEVERITY_VALUES:
            return None, f"entry {i} severity must be one of {SEVERITY_VALUES}"
        reason = v.get("reason")
        if not isinstance(reason, str) or not reason.strip():
            return None, f"entry {i} needs a non-empty string 'reason'"
        evidence = v.get("evidence") or None
        if evidence is not None and not (
                isinstance(evidence, dict)
                and isinstance(evidence.get("doc_path"), str)
                and isinstance(evidence.get("verbatim_line"), str)):
            return None, (f"entry {i} evidence must be null or "
                          "{doc_path: str, verbatim_line: str}")
        # A challenge without a citation is just an opinion — the traceability
        # contract (every claim carries evidence) applies to the validator too.
        if v["verdict"] == "challenged" and evidence is None:
            return None, (f"entry {i} challenges {metric!r} without evidence — "
                          "attach the doc_path + verbatim_line that grounds it")
        # Blockers halt the run before the workbooks, so they get the same
        # byte-exact firewall as extraction citations: the quote must re-find
        # in a corpus document, or the blocker is rejected back to the agent.
        if v.get("severity") == "blocker":
            path = evidence["doc_path"] if evidence else ""
            if not path.startswith("challenge/"):
                return None, (f"entry {i} blocker evidence must cite a corpus "
                              "doc (challenge/...) — blockers cannot rest on "
                              "outside sources")
            f = ROOT / path
            if not f.is_file() or evidence["verbatim_line"] not in f.read_text():
                return None, (f"entry {i} blocker quote not re-found byte-exact "
                              f"in {path} — re-read the document and resubmit")
        seen.append(metric)
        cleaned.append({"metric": metric, "verdict": v["verdict"],
                        "severity": v["severity"], "reason": reason.strip(),
                        "evidence": evidence})
    missing = [l for l in labels if l not in seen]
    if missing:
        return None, "missing verdicts for metrics: " + ", ".join(missing)
    return cleaned, None


def run_validator(company: str) -> dict | None:
    """One adversarial validation pass. Returns the verdict-file payload dict,
    or None if the agent never submitted a valid verdict (or refused)."""
    if company not in WORKBOOKS:
        raise ValueError(f"unknown company '{company}' (expected one of {tuple(WORKBOOKS)})")

    _load_env()
    cfg = load_config()
    client = anthropic.Anthropic()

    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    logdir = ROOT / "logs"
    logdir.mkdir(exist_ok=True)
    trace_path = logdir / f"agent-trace-validator-{company}-{stamp}.jsonl"
    tools.set_trace(trace_path)

    # Skill loads are events too — same trace lines as agent/loop.py run_reader,
    # so the dashboard feed shows what the validator was briefed with.
    for p in skill_files(company, cfg):
        tools.log_event("load_skill", {"file": str(p.relative_to(ROOT))},
                        f"{len(p.read_text())} chars into system prompt")
    extra = (cfg.get("system_prompt_extra") or "").strip()
    if extra:
        tools.log_event("load_skill", {"file": "config.json: system_prompt_extra"},
                        f"{len(extra)} chars into system prompt")

    traces = json.loads((ROOT / "forecasts" / "traces.json").read_text())
    metrics = traces.get(WORKBOOKS[company])
    if not metrics:
        print(f"[validator {company}] no metrics for {WORKBOOKS[company]} "
              f"in forecasts/traces.json — nothing to validate")
        return None
    labels = [m.get("label") for m in metrics]

    live = ROOT / "research" / "drivers" / "live" / f"{company}.json"
    pinned = ROOT / "research" / "drivers" / f"{company}.json"
    drivers = _slim_drivers(json.loads((live if live.exists() else pinned).read_text()))

    verdict_path = logdir / f"agent-validator-{company}-{stamp}.json"
    result: dict = {"payload": None}

    @beta_tool
    def submit_verdict(verdicts_json: str) -> str:
        """Submit the final verdicts as a JSON array with exactly one verdict
        object per metric. Call exactly once, when every metric has been
        checked against the corpus.

        Args:
            verdicts_json: JSON array of verdict objects, each
                {"metric": str, "verdict": "confirmed"|"challenged",
                 "severity": "info"|"warning"|"blocker", "reason": str,
                 "evidence": {"doc_path": str, "verbatim_line": str} | null}.
        """
        try:
            raw = json.loads(verdicts_json)
        except json.JSONDecodeError as e:
            out = f"ERROR: invalid JSON ({e}) — fix and resubmit"
        else:
            cleaned, why = _validate_verdicts(raw, labels)
            if why:
                out = f"ERROR: {why} — fix and resubmit"
            else:
                payload = {"company": company,
                           "timestamp": datetime.now(timezone.utc).isoformat(),
                           "verdicts": cleaned}
                # Atomic: the dashboard polls this file; never let it read half
                # a document. Dot-prefixed so the latest() prefix glob skips it.
                vtmp = verdict_path.with_name("." + verdict_path.name + ".tmp")
                vtmp.write_text(json.dumps(payload, indent=1))
                os.replace(vtmp, verdict_path)
                result["payload"] = payload
                out = f"received: {len(cleaned)} verdicts"
        tools.log_event("submit_verdict", {"chars": len(verdicts_json or "")}, out)
        return out

    system = (system_prompt(company, cfg) + "\n\n"
              + ADVERSARIAL_BRIEF.format(
                  company=company,
                  labels=", ".join(repr(l) for l in labels)))

    user_payload = json.dumps({"metrics": metrics, "drivers": drivers})

    runner = client.beta.messages.tool_runner(
        model=cfg["model"],
        max_tokens=16000,
        output_config={"effort": cfg["effort"]},
        system=system,
        tools=[tools.search_corpus, tools.read_doc, submit_verdict],
        messages=[{"role": "user", "content":
                   "Adversarially validate these computed metrics against the "
                   "corpus, then call submit_verdict exactly once.\n\n"
                   + user_payload}],
        max_iterations=MAX_ITERATIONS,
    )

    last_message = None
    for message in runner:
        last_message = message
        if message.stop_reason == "refusal":
            print(f"[validator {company}] refusal — aborting")
            return None

    if last_message is not None and getattr(last_message, "stop_reason", None) == "pause_turn":
        # Kept simple: no resume for the validator — accept the end state.
        print(f"[validator {company}] ended on pause_turn — no resume attempted")

    if result["payload"] is None:
        print(f"[validator {company}] finished without a valid submit_verdict call")
        return None
    challenged = sum(1 for v in result["payload"]["verdicts"]
                     if v["verdict"] == "challenged")
    print(f"[validator {company}] {len(result['payload']['verdicts'])} verdicts "
          f"({challenged} challenged) -> {verdict_path.relative_to(ROOT)} "
          f"(trace: {trace_path.relative_to(ROOT)})")
    return result["payload"]


def main() -> int:
    if len(sys.argv) != 2 or sys.argv[1] not in WORKBOOKS:
        print(f"usage: python -m agent.validator <{'|'.join(WORKBOOKS)}>")
        return 2
    return 0 if run_validator(sys.argv[1]) is not None else 1


if __name__ == "__main__":
    raise SystemExit(main())
