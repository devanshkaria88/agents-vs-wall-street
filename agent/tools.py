"""The Truth's tools. Every call is logged to a JSONL trace — the judges'
"which exact tools did it use" answer is these files, verbatim.

search_corpus and read_doc are read-only over the frozen corpus; submit_drivers
is the terminal structured hand-off to the deterministic engine. The trace
logger is process-local and set per run by loop.py.
"""
import json
import shutil
import subprocess
import threading
from datetime import datetime, timezone
from pathlib import Path

from anthropic import beta_tool

ROOT = Path(__file__).resolve().parent.parent
CORPUS = ROOT / "challenge" / "offline-data"
RG = shutil.which("rg") or "/opt/homebrew/bin/rg"

_trace_lock = threading.Lock()
_trace_file: dict[int, Path] = {}  # keyed by thread ident so parallel runs don't interleave


def set_trace(path: Path) -> None:
    _trace_file[threading.get_ident()] = path


def _log(tool: str, tool_input: dict, output: str) -> None:
    path = _trace_file.get(threading.get_ident())
    if path is None:
        return
    entry = {"ts": datetime.now(timezone.utc).isoformat(), "tool": tool,
             "input": tool_input, "output_chars": len(output),
             "output_head": output[:400]}
    with _trace_lock:
        with path.open("a") as f:
            f.write(json.dumps(entry) + "\n")


def log_server_tool(tool: str, tool_input: dict) -> None:
    """Mirror a server-side tool call (e.g. web_search) into the JSONL trace.
    Server tools execute on Anthropic's side, so there is no local output —
    we log the call itself so the dashboard's tool feed shows it."""
    _log(tool, tool_input, "(server-side tool call)")


def log_event(kind: str, event_input: dict, output: str = "") -> None:
    """Log a pipeline event that is not a client tool call (skill loads into
    the system prompt, locally-defined terminal tools) into the same JSONL
    trace, so the dashboard's event feed sees everything an agent did."""
    _log(kind, event_input, output)


@beta_tool
def search_corpus(query: str, company: str, max_results: int = 25) -> str:
    """Search the offline document corpus with ripgrep (case-insensitive regex).

    Args:
        query: Regex or keywords to search for (ripgrep syntax, case-insensitive).
        company: One of hays, home-depot, analog-devices, deere.
        max_results: Maximum matching lines to return (default 25).
    """
    target = CORPUS / company
    if not target.is_dir():
        out = f"ERROR: unknown company '{company}'"
    else:
        proc = subprocess.run(
            [RG, "-i", "-n", "--max-columns", "400", query, str(target)],
            capture_output=True, text=True, timeout=30)
        lines = proc.stdout.splitlines()
        shown = [ln.replace(str(ROOT) + "/", "") for ln in lines[:max_results]]
        out = "\n".join(shown) if shown else "NO MATCHES"
        if len(lines) > max_results:
            out += f"\n... ({len(lines) - max_results} more matches truncated — refine the query)"
    _log("search_corpus", {"query": query, "company": company}, out)
    return out


@beta_tool
def read_doc(path: str, start_line: int = 1, num_lines: int = 150) -> str:
    """Read lines from a corpus document.

    Args:
        path: Repo-relative path (must be under challenge/offline-data/).
        start_line: 1-indexed first line to read.
        num_lines: Number of lines to return (default 150, max 400).
    """
    f = (ROOT / path).resolve()
    if not str(f).startswith(str(CORPUS.resolve())) or not f.is_file():
        out = f"ERROR: '{path}' is not a readable corpus document"
    else:
        lines = f.read_text().splitlines()
        end = min(start_line - 1 + min(num_lines, 400), len(lines))
        body = "\n".join(f"{i+1}\t{lines[i]}" for i in range(max(start_line - 1, 0), end))
        out = body + (f"\n... (file has {len(lines)} lines)" if end < len(lines) else "")
    _log("read_doc", {"path": path, "start_line": start_line, "num_lines": num_lines}, out)
    return out


@beta_tool
def submit_drivers(drivers_json: str) -> str:
    """Submit the final extracted drivers as a JSON string. Call exactly once,
    when every driver key is resolved (value or justified null).

    Args:
        drivers_json: JSON object with keys 'drivers' and 'additional_evidence',
            following the schema in your instructions.
    """
    try:
        parsed = json.loads(drivers_json)
        n = len(parsed.get("drivers", {}))
        out = f"received: {n} drivers"
    except json.JSONDecodeError as e:
        out = f"ERROR: invalid JSON ({e}) — fix and resubmit"
    _log("submit_drivers", {"chars": len(drivers_json)}, out)
    return out
