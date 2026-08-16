"""The Truth — the agent loop. A standalone tool-use agent on the Anthropic API.

One call to run_reader() = one Reader pass over one company: the model gets the
method skill + company brief as its system prompt, the corpus tools, and loops
(search -> read -> quote) until it submits drivers. Everything it does lands in
a JSONL trace under logs/.

Configuration lives in agent/config.json (model, effort, runs, tool flags,
skill files per company, optional extra system prompt). The dashboard reads
and writes that file via /api/agent-config.

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
CONFIG_PATH = ROOT / "agent" / "config.json"
MAX_ITERATIONS = 40
MAX_PAUSE_CONTINUATIONS = 3

DEFAULT_CONFIG: dict = {
    "model": "claude-opus-5",
    "effort": "medium",
    "runs": 3,
    "system_prompt_extra": "",
    "tools": {"search_corpus": True, "read_doc": True, "web_search": False},
    "web_search_max_uses": 5,
    "skills": {},
}


def load_config() -> dict:
    """agent/config.json merged over defaults; a broken file never kills a run."""
    cfg = dict(DEFAULT_CONFIG)
    try:
        on_disk = json.loads(CONFIG_PATH.read_text())
        if isinstance(on_disk, dict):
            for k, v in on_disk.items():
                if k == "tools" and isinstance(v, dict):
                    merged = dict(DEFAULT_CONFIG["tools"])
                    merged.update(v)
                    cfg["tools"] = merged
                else:
                    cfg[k] = v
    except (OSError, json.JSONDecodeError):
        pass
    return cfg


def _load_env() -> None:
    envfile = ROOT / ".env"
    if "ANTHROPIC_API_KEY" not in os.environ and envfile.exists():
        for line in envfile.read_text().splitlines():
            if line.strip() and not line.startswith("#") and "=" in line:
                k, _, v = line.partition("=")
                os.environ.setdefault(k.strip(), v.strip())


def system_prompt(company: str, config: dict | None = None) -> str:
    cfg = config or load_config()
    files = (cfg.get("skills") or {}).get(company) or ["method.md", f"{company}.md"]
    parts = []
    for f in files:
        p = SKILLS / f
        if p.is_file():
            parts.append(p.read_text())
    if not parts:  # nothing configured resolved — hard fallback
        parts = [(SKILLS / "method.md").read_text(), (SKILLS / f"{company}.md").read_text()]
    extra = (cfg.get("system_prompt_extra") or "").strip()
    if extra:
        parts.append(extra)
    return "\n\n".join(parts)


def build_tools(cfg: dict, terminal_tool) -> list:
    """Assemble the runner tool list from config flags.

    beta_tool functions and server-side tool dicts ride in the same array —
    the runner passes plain dicts through to the API untouched.
    """
    flags = cfg.get("tools") or {}
    out: list = []
    if flags.get("search_corpus", True):
        out.append(tools.search_corpus)
    if flags.get("read_doc", True):
        out.append(tools.read_doc)
    out.append(terminal_tool)  # submit tool is always available
    if flags.get("web_search", False):
        out.append({
            "type": "web_search_20260209",
            "name": "web_search",
            "max_uses": int(cfg.get("web_search_max_uses", 5)),
        })
    return out


def trace_server_tool_use(message) -> None:
    """Server-side tool calls (web_search) arrive as server_tool_use content
    blocks, not through our beta_tools — mirror them into the JSONL trace so
    the dashboard's tool feed shows them alongside corpus calls."""
    for block in getattr(message, "content", []) or []:
        if getattr(block, "type", "") == "server_tool_use":
            try:
                tool_input = dict(block.input) if isinstance(block.input, dict) else {"input": str(block.input)}
            except Exception:
                tool_input = {}
            tools.log_server_tool(getattr(block, "name", "server_tool"), tool_input)


def run_reader(company: str, run_idx: int = 0) -> dict | None:
    """One extraction pass. Returns the parsed drivers dict, or None on failure."""
    _load_env()
    cfg = load_config()
    client = anthropic.Anthropic()

    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    logdir = ROOT / "logs"
    logdir.mkdir(exist_ok=True)
    trace_path = logdir / f"agent-trace-{company}-run{run_idx}-{stamp}.jsonl"
    tools.set_trace(trace_path)

    messages: list = [{"role": "user", "content":
                       f"Extract all driver keys for {company}. Work driver by driver; "
                       f"verify hints against the corpus; then call submit_drivers once."}]
    tool_list = build_tools(cfg, tools.submit_drivers)

    submitted: dict | None = None
    last_message = None
    continuations = 0

    while True:
        runner = client.beta.messages.tool_runner(
            model=cfg["model"],
            max_tokens=16000,
            output_config={"effort": cfg["effort"]},
            system=system_prompt(company, cfg),
            tools=tool_list,
            messages=messages,
            max_iterations=MAX_ITERATIONS,
        )
        for message in runner:
            last_message = message
            trace_server_tool_use(message)
            if message.stop_reason == "refusal":
                print(f"[{company} run {run_idx}] refusal — aborting this run")
                return None
            for block in message.content:
                if block.type == "tool_use" and block.name == "submit_drivers":
                    try:
                        submitted = json.loads(block.input["drivers_json"])
                    except (json.JSONDecodeError, KeyError, TypeError):
                        pass  # agent got an error tool_result and will retry

        # The tool runner does not auto-resume pause_turn (server-side tool
        # iteration limit). Append the paused assistant turn via the runner,
        # snapshot its accumulated history, and continue in a fresh runner;
        # give up after a few continuations and just log it.
        if (last_message is not None
                and getattr(last_message, "stop_reason", None) == "pause_turn"
                and submitted is None
                and continuations < MAX_PAUSE_CONTINUATIONS):
            continuations += 1
            print(f"[{company} run {run_idx}] pause_turn — resuming (continuation {continuations})")
            runner.append_messages(last_message)
            captured: dict = {}

            def _capture(params):
                captured.update(params)
                return params

            runner.set_messages_params(_capture)
            messages = list(captured.get("messages") or messages)
            continue
        if last_message is not None and getattr(last_message, "stop_reason", None) == "pause_turn":
            print(f"[{company} run {run_idx}] ended on pause_turn after {continuations} continuations")
        break

    if submitted is None:
        print(f"[{company} run {run_idx}] finished without a valid submit_drivers call")
    else:
        submitted["_trace"] = str(trace_path.relative_to(ROOT))
    return submitted
