"""The final command. Runs the full pipeline and writes a timestamped log.

    npm run forecast          (= .venv/bin/python -m forecaster.run)

Stages: engine -> validator -> workbook writer -> official checker.
Workbooks are only overwritten after validation passes, so the submission
directory can never hold unvalidated numbers. --live (later) prepends the
LLM extraction stage; the default consumes the pinned, reviewed drivers.
"""
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PY = str(ROOT / ".venv" / "bin" / "python")


def main() -> int:
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    logdir = ROOT / "logs"
    logdir.mkdir(exist_ok=True)
    logfile = logdir / f"run-{stamp}.log"

    stages = [
        ("engine", [PY, "-m", "forecaster.engine"]),
        ("validate", [PY, "-m", "forecaster.validate"]),
        ("write-workbooks", [PY, "tools/write_workbooks.py", "forecasts/forecasts.json"]),
        ("check-forecasts", ["node", "scripts/check-forecasts.mjs"]),
    ]

    with logfile.open("w") as log:
        def emit(line: str) -> None:
            print(line)
            log.write(line + "\n")

        emit(f"# The Truth — forecast run {stamp}")
        for name, cmd in stages:
            emit(f"\n== stage: {name} == {datetime.now(timezone.utc).isoformat()}")
            proc = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True)
            emit(proc.stdout.rstrip())
            if proc.stderr.strip():
                emit("[stderr] " + proc.stderr.rstrip())
            if proc.returncode != 0:
                emit(f"\nRUN FAILED at stage '{name}' (exit {proc.returncode}). "
                     f"Workbooks retain their last validated state.")
                return proc.returncode
        emit(f"\nRUN CLEAR — all stages passed. Log: {logfile.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
