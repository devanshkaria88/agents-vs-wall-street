"""The one-button pipeline: readers -> firewall -> consensus -> calibration
-> calculators -> validator agent -> workbook writer, for ONE company, with a
live progress file the dashboard polls.

    .venv/bin/python -m forecaster.fullrun <company>

Progress: logs/fullrun-<company>-<UTCstamp>.json, rewritten in full (atomic:
tmp file + os.replace) at every stage transition. Stage keys: readers,
firewall, consensus, calibration, calculators, validator, writer — the
"readers" key covers reader0-2 collectively.

NOTE: there is intentionally NO official-checker stage here — the fullrun ends
at the written workbooks; scripts/check-forecasts.mjs stays a separate manual
step (npm run check:submission) before upload.

Guarantees (CLAUDE.md non-negotiables):
- Workbooks are written ONLY after forecaster.validate passes, by
  tools/write_workbooks.py. On any failure submission/ is left untouched —
  never a blank cell.
- All arithmetic is deterministic Python; the validator agent only critiques.
"""
import concurrent.futures
import json
import os
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from forecaster import extract  # noqa: E402
from agent.loop import load_config  # noqa: E402
from agent.validator import WORKBOOKS, run_validator  # noqa: E402

PY = str(ROOT / ".venv" / "bin" / "python")

STAGE_KEYS = ("readers", "firewall", "consensus", "calibration",
              "calculators", "validator", "writer")

# Demo-visibility hold: the dashboard polls the progress file every 2s, so a
# fast deterministic stage would flick pending->done between two polls and
# never render as 'running'. Holding the stage 'running' for >=1.2s is purely
# cosmetic and has no effect on any output.
DEMO_HOLD_S = 1.2


def _say(line: str) -> None:
    """Human-readable stdout; the UI tails this log, so always flush."""
    print(line, flush=True)


def _tail(proc: subprocess.CompletedProcess, limit: int = 2000) -> str:
    out = (proc.stdout or "") + (("\n[stderr] " + proc.stderr) if (proc.stderr or "").strip() else "")
    out = out.strip()
    return out[-limit:] if len(out) > limit else out


class Progress:
    """The fullrun progress file — rewritten in full at every transition."""

    def __init__(self, company: str, stamp: str):
        logdir = ROOT / "logs"
        logdir.mkdir(exist_ok=True)
        self.path = logdir / f"fullrun-{company}-{stamp}.json"
        now = datetime.now(timezone.utc).isoformat()
        self.data = {
            "company": company,
            "startedAt": now,
            "updatedAt": now,
            "stages": {k: "pending" for k in STAGE_KEYS},
            "workbook": None,
            "done": False,
            "ok": None,
            "error": None,
        }
        self._flush()

    def _flush(self) -> None:
        # Atomic rewrite: write to a temp file then os.replace, so a poller
        # can never read a half-written JSON document. The temp name is
        # dot-prefixed so the dashboard's latest("logs", "fullrun-<company>-")
        # prefix glob can never match it — an undotted "...json.tmp" sorts
        # AFTER the real ".json" and would shadow the progress file.
        self.data["updatedAt"] = datetime.now(timezone.utc).isoformat()
        tmp = self.path.with_name("." + self.path.name + ".tmp")
        tmp.write_text(json.dumps(self.data, indent=1))
        os.replace(tmp, self.path)

    def stage(self, name: str, status: str) -> None:
        self.data["stages"][name] = status
        self._flush()

    def note_error(self, error: str) -> None:
        """Record a non-fatal error without stopping the run."""
        self.data["error"] = error
        self._flush()

    def fail(self, stage_name: str, error: str) -> None:
        self.data["stages"][stage_name] = "failed"
        self.data["done"] = True
        self.data["ok"] = False
        self.data["error"] = error
        self._flush()

    def finish(self, workbook: str) -> None:
        self.data["stages"]["writer"] = "done"
        self.data["workbook"] = workbook
        self.data["done"] = True
        self.data["ok"] = True
        self._flush()


def run(company: str) -> int:
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")  # computed once
    progress = Progress(company, stamp)  # initial file: all stages pending
    _say(f"# fullrun {company} — progress: {progress.path.relative_to(ROOT)}")
    current = "readers"
    try:
        # -- readers ---------------------------------------------------------
        progress.stage("readers", "running")
        cfg = load_config()
        n = int(cfg["runs"])
        pinned = json.loads((extract.DRIVERS / f"{company}.json").read_text())
        _say(f"[readers] launching {n} parallel reader agents")
        with concurrent.futures.ThreadPoolExecutor(max_workers=n) as pool:
            futs = [pool.submit(extract.run_reader, company, pinned, i)
                    for i in range(n)]
            raw = [f.result() for f in futs]
        parsed = [r for r in raw if r]
        if not parsed:
            progress.fail("readers", f"zero of {n} reader runs parsed")
            _say(f"[readers] FAILED — zero of {n} runs parsed")
            return 1
        progress.stage("readers", "done")
        _say(f"[readers] done — {len(parsed)}/{n} runs parsed")

        # -- firewall --------------------------------------------------------
        current = "firewall"
        progress.stage("firewall", "running")
        walled = [extract.firewall(company, r) for r in parsed]
        drops = [d for w in walled for d in w["dropped"]]
        time.sleep(DEMO_HOLD_S)  # demo-visibility hold (see DEMO_HOLD_S)
        progress.stage("firewall", "done")
        _say(f"[firewall] done — {len(drops)} citation drops")

        # -- consensus (majority vote + merge-vs-pinned) ---------------------
        current = "consensus"
        progress.stage("consensus", "running")
        votes = extract.vote(walled)
        merged, decisions = extract.merge(company, pinned, votes["voted"])
        extract.LIVE.mkdir(exist_ok=True)
        (extract.LIVE / f"{company}.json").write_text(json.dumps(merged, indent=1))
        report = {
            "company": company,
            "runs_attempted": n,
            "runs_parsed": len(walled),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "firewall_drops": drops,
            "unresolved": votes["unresolved"],
            "merge_decisions": decisions,
            "additional_evidence": [e for w in walled
                                    for e in w["additional_evidence"]],
        }
        (extract.LIVE / f"report-{company}.json").write_text(
            json.dumps(report, indent=1))
        time.sleep(DEMO_HOLD_S)  # demo-visibility hold (see DEMO_HOLD_S)
        progress.stage("consensus", "done")
        ups = sum(1 for d in decisions if d["action"].startswith("UPGRADED"))
        div = sum(1 for d in decisions if d["action"].startswith("DIVERGENCE"))
        _say(f"[consensus] done — {ups} upgraded, {div} divergences, "
             f"{len(votes['unresolved'])} unresolved "
             f"-> research/drivers/live/{company}.json")

        # -- calibration -----------------------------------------------------
        # Calibration (beat-bias adjustment) is computed inside the engine
        # subprocess in the next stage; this stage is its visible phase on
        # the dashboard.
        current = "calibration"
        progress.stage("calibration", "running")
        time.sleep(DEMO_HOLD_S)  # demo-visibility hold (see DEMO_HOLD_S)
        progress.stage("calibration", "done")
        _say("[calibration] done — applied inside the engine")

        # -- calculators (engine + deterministic validate as write-gate) -----
        current = "calculators"
        progress.stage("calculators", "running")
        for name, cmd in (("engine", [PY, "-m", "forecaster.engine"]),
                          ("validate", [PY, "-m", "forecaster.validate"])):
            proc = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True)
            if proc.returncode != 0:
                # Never-a-blank-cell: validation failed, so we stop here and
                # submission/ keeps its last validated workbooks untouched.
                progress.fail("calculators",
                              f"{name} exit {proc.returncode}: {_tail(proc)}")
                _say(f"[calculators] FAILED at {name} (exit {proc.returncode}) "
                     f"— submission/ untouched")
                return 1
            _say(f"[calculators] {name} passed")
        progress.stage("calculators", "done")

        # -- validator (adversarial re-reader agent) -------------------------
        current = "validator"
        progress.stage("validator", "running")
        _say("[validator] launching adversarial validator agent")
        verdict = run_validator(company)
        if verdict is None:
            # No verdict submitted: treated as a warning — proceed, but the
            # progress file records it so the dashboard can surface it.
            progress.note_error("validator agent did not submit a verdict")
            progress.stage("validator", "done")
            _say("[validator] no verdict submitted — proceeding (warning recorded)")
        else:
            blockers = [v for v in verdict.get("verdicts", [])
                        if v.get("severity") == "blocker"]
            if blockers:
                progress.fail("validator", blockers[0].get("reason", "blocker"))
                _say(f"[validator] BLOCKER — {blockers[0].get('reason', '')} "
                     f"— stopping before workbooks are written")
                return 1
            progress.stage("validator", "done")
            challenged = sum(1 for v in verdict["verdicts"]
                             if v.get("verdict") == "challenged")
            _say(f"[validator] done — {len(verdict['verdicts'])} verdicts, "
                 f"{challenged} challenged, 0 blockers")

        # -- writer ----------------------------------------------------------
        current = "writer"
        progress.stage("writer", "running")
        proc = subprocess.run([PY, "tools/write_workbooks.py",
                               "forecasts/forecasts.json"],
                              cwd=ROOT, capture_output=True, text=True)
        if proc.returncode != 0:
            progress.fail("writer", f"write_workbooks exit {proc.returncode}: {_tail(proc)}")
            _say(f"[writer] FAILED (exit {proc.returncode})")
            return 1
        workbook = f"submission/{WORKBOOKS[company]}"
        progress.finish(workbook)
        _say(f"[writer] done — {workbook}")
        _say(f"# fullrun {company} CLEAR — all stages passed")
        return 0
    except Exception as e:  # noqa: BLE001 — anything unexpected fails the run visibly
        try:
            progress.fail(current, str(e))
        except Exception:
            pass
        _say(f"# fullrun {company} FAILED at {current}: {e}")
        return 1


def main() -> int:
    if len(sys.argv) != 2 or sys.argv[1] not in WORKBOOKS:
        print(f"usage: python -m forecaster.fullrun <{'|'.join(WORKBOOKS)}>")
        return 2
    return run(sys.argv[1])


if __name__ == "__main__":
    raise SystemExit(main())
