"""The Truth — the agent loop. A standalone tool-use agent on the Anthropic API.

One call to run_reader() = one Reader pass over one company: the model gets the
method skill + company brief as its system prompt, the corpus tools, and loops
(search -> read -> quote) until it submits drivers. Everything it does lands in
a JSONL trace under logs/.

Auth: ANTHROPIC_API_KEY from the environment or repo-root .env (never committed).
"""
import json
import os
from datetime import datetime, timezone
from pathlib import Path

import anthropic

from agent import tools

ROOT = Path(__file__).resolve().parent.parent
SKILLS = ROOT / "agent" / "skills"
MODEL = "claude-opus-5"
MAX_ITERATIONS = 40


def _load_env() -> None:
    envfile = ROOT / ".env"
    if "ANTHROPIC_API_KEY" not in os.environ and envfile.exists():
        for line in envfile.read_text().splitlines():
            if line.strip() and not line.startswith("#") and "=" in line:
                k, _, v = line.partition("=")
                os.environ.setdefault(k.strip(), v.strip())


def system_prompt(company: str) -> str:
    return (SKILLS / "method.md").read_text() + "\n\n" + (SKILLS / f"{company}.md").read_text()


def run_reader(company: str, run_idx: int = 0) -> dict | None:
    """One extraction pass. Returns the parsed drivers dict, or None on failure."""
    _load_env()
    client = anthropic.Anthropic()

    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    logdir = ROOT / "logs"
    logdir.mkdir(exist_ok=True)
    trace_path = logdir / f"agent-trace-{company}-run{run_idx}-{stamp}.jsonl"
    tools.set_trace(trace_path)

    runner = client.beta.messages.tool_runner(
        model=MODEL,
        max_tokens=16000,
        output_config={"effort": "medium"},
        system=system_prompt(company),
        tools=[tools.search_corpus, tools.read_doc, tools.submit_drivers],
        messages=[{"role": "user", "content":
                   f"Extract all driver keys for {company}. Work driver by driver; "
                   f"verify hints against the corpus; then call submit_drivers once."}],
        max_iterations=MAX_ITERATIONS,
    )

    submitted: dict | None = None
    for message in runner:
        if message.stop_reason == "refusal":
            print(f"[{company} run {run_idx}] refusal — aborting this run")
            return None
        for block in message.content:
            if block.type == "tool_use" and block.name == "submit_drivers":
                try:
                    submitted = json.loads(block.input["drivers_json"])
                except (json.JSONDecodeError, KeyError, TypeError):
                    pass  # agent got an error tool_result and will retry

    if submitted is None:
        print(f"[{company} run {run_idx}] finished without a valid submit_drivers call")
    else:
        submitted["_trace"] = str(trace_path.relative_to(ROOT))
    return submitted
