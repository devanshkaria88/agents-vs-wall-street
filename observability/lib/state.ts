// Server-side state assembly: reads the run artifacts the pipeline drops on
// disk and derives per-stage status. The dashboard never talks to the API
// providers — it observes the same files the judges can open by hand.
import fs from "node:fs";
import path from "node:path";

export const REPO = path.resolve(process.cwd(), "..");

export type StageStatus = "idle" | "running" | "done" | "failed";

export const COMPANIES: Record<string, { file: string; label: string }> = {
  hays: { file: "HAS-FY2026.xlsx", label: "Hays plc · FY2026" },
  "home-depot": { file: "HD-FY2026Q2.xlsx", label: "Home Depot · FY26 Q2" },
  "analog-devices": { file: "ADI-FY2026Q3.xlsx", label: "Analog Devices · FY26 Q3" },
  deere: { file: "DE-FY2026Q3.xlsx", label: "Deere & Co · FY26 Q3" },
};

function mtime(p: string): number | null {
  try {
    return fs.statSync(path.join(REPO, p)).mtimeMs;
  } catch {
    return null;
  }
}
function readJson(p: string): unknown {
  try {
    return JSON.parse(fs.readFileSync(path.join(REPO, p), "utf8"));
  } catch {
    return null;
  }
}
function latest(dir: string, prefix: string): string | null {
  try {
    const hits = fs
      .readdirSync(path.join(REPO, dir))
      .filter((f) => f.startsWith(prefix))
      .sort();
    return hits.length ? path.join(dir, hits[hits.length - 1]) : null;
  } catch {
    return null;
  }
}

function readTrace(rel: string) {
  try {
    return fs
      .readFileSync(path.join(REPO, rel), "utf8")
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((l) => JSON.parse(l));
  } catch {
    return [];
  }
}

export function assemble(company: string) {
  const meta = COMPANIES[company] ?? COMPANIES.hays;
  const now = Date.now();
  const RUNNING_WINDOW_MS = 20_000;

  // Reader runs: newest trace file per run index
  const readers = [0, 1, 2].map((i) => {
    const rel = latest("logs", `agent-trace-${company}-run${i}-`);
    const m = rel ? mtime(rel) : null;
    const calls = rel ? readTrace(rel) : [];
    const submitted = calls.some((c) => c.tool === "submit_drivers" && String(c.output_head).startsWith("received"));
    const status: StageStatus = !rel
      ? "idle"
      : submitted
        ? "done"
        : m && now - m < RUNNING_WINDOW_MS
          ? "running"
          : calls.length
            ? "done"
            : "idle";
    return { run: i, status, trace: rel, calls: calls.slice(-80) };
  });

  // Skill-writer agent: newest skillgen trace for this company
  const skillgenRel = latest("logs", `agent-trace-skillgen-${company}-`);
  const skillgenM = skillgenRel ? mtime(skillgenRel) : null;
  const skillgenCalls = skillgenRel ? readTrace(skillgenRel) : [];
  const skillgenSubmitted = skillgenCalls.some(
    (c) => c.tool === "submit_skill" && String(c.output_head).startsWith("written"),
  );
  const skillgenStatus: StageStatus = !skillgenRel
    ? "idle"
    : skillgenSubmitted
      ? "done"
      : skillgenM && now - skillgenM < RUNNING_WINDOW_MS
        ? "running"
        : skillgenCalls.length
          ? "done"
          : "idle";
  const skillgen = { status: skillgenStatus, trace: skillgenRel, calls: skillgenCalls.slice(-80) };

  const liveReport = readJson(`research/drivers/live/report-${company}.json`) as {
    firewall_drops?: unknown[];
    unresolved?: unknown[];
    merge_decisions?: { action: string }[];
    additional_evidence?: unknown[];
    runs_parsed?: number;
    timestamp?: string;
  } | null;

  const anyReaderActive = readers.some((r) => r.status === "running");
  const readersStarted = readers.some((r) => r.status !== "idle");
  const extractStatus: StageStatus = liveReport
    ? "done"
    : anyReaderActive
      ? "running"
      : readersStarted
        ? "running"
        : "idle";

  const calibration = readJson("forecasts/calibration.json");
  const traces = readJson("forecasts/traces.json") as Record<string, unknown[]> | null;
  const metrics = (traces?.[meta.file] ?? []) as {
    label: string;
    value: number;
    unit: string;
    variants: number[];
    spread: number;
    cross_checks: unknown[];
    trace: unknown[];
  }[];

  const validationRel = latest("logs", "validation-");
  const validation = validationRel
    ? (readJson(validationRel) as { result?: string; timestamp?: string; verdicts?: { workbook: string }[] })
    : null;
  const verdicts = (validation?.verdicts ?? []).filter((v) => v.workbook === meta.file);

  // Adversarial validator AGENT: newest trace + newest verdict file for this
  // company. A verdict only counts as belonging to the newest run when its
  // filename stamp is >= the trace's stamp (both share the UTC-stamp suffix),
  // so a re-run shows "running" instead of a stale done/failed.
  const stampOf = (p: string | null) => p?.match(/(\d{8}T\d{6}Z)\.[a-z]+$/)?.[1] ?? null;
  const vTraceRel = latest("logs", `agent-trace-validator-${company}-`);
  const vTraceM = vTraceRel ? mtime(vTraceRel) : null;
  const vCalls = vTraceRel ? readTrace(vTraceRel) : [];
  const vVerdictRel = latest("logs", `agent-validator-${company}-`);
  const validatorVerdict = vVerdictRel
    ? (readJson(vVerdictRel) as {
        company?: string;
        timestamp?: string;
        verdicts?: { metric: string; verdict: string; severity: string; reason: string; evidence: { doc_path: string; verbatim_line: string } | null }[];
      } | null)
    : null;
  const vTraceStamp = stampOf(vTraceRel);
  const vVerdictStamp = stampOf(vVerdictRel);
  const verdictCurrent = !!validatorVerdict && (!vTraceStamp || !vVerdictStamp || vVerdictStamp >= vTraceStamp);
  // The validator's window is much wider than the readers': a high-effort
  // adversarial turn routinely thinks >20s between tool calls, and 20s of
  // silence must not flick the node back to idle mid-run.
  const VALIDATOR_WINDOW_MS = 150_000;
  const validatorStatus: StageStatus = verdictCurrent
    ? (validatorVerdict?.verdicts ?? []).some((v) => v.severity === "blocker")
      ? "failed"
      : "done"
    : vTraceRel && vTraceM && now - vTraceM < VALIDATOR_WINDOW_MS
      ? "running"
      : "idle";

  const runLogRel = latest("logs", "run-");
  const runLogM = runLogRel ? mtime(runLogRel) : null;
  let runLog: string[] = [];
  try {
    runLog = fs
      .readFileSync(path.join(REPO, runLogRel ?? ""), "utf8")
      .split("\n")
      .slice(-40);
  } catch {}
  const runClear = runLog.some((l) => l.includes("RUN CLEAR"));

  const agentCfg = readJson("agent/config.json") as { skills?: Record<string, string[]> } | null;
  const skills = (agentCfg?.skills?.[company] ?? ["method.md", `${company}.md`]).map((f) => ({
    name: `agent/skills/${f}`,
    content: (() => {
      try {
        return fs.readFileSync(path.join(REPO, "agent", "skills", f), "utf8");
      } catch {
        return "";
      }
    })(),
  }));

  // Unified event feed: every tool call and skill load, across every agent
  // (reader runs R0-R2 + skill-writer SW + validator agent VA), merged
  // chronologically.
  type RawCall = { ts?: string; tool?: string; input?: Record<string, unknown>; output_head?: unknown };
  const events = [
    ...readers.flatMap((r) => (r.calls as RawCall[]).map((c) => ({ src: `R${r.run}`, c }))),
    ...(skillgenCalls.slice(-80) as RawCall[]).map((c) => ({ src: "SW", c })),
    ...(vCalls.slice(-80) as RawCall[]).map((c) => ({ src: "VA", c })),
  ]
    .filter(({ c }) => typeof c?.ts === "string" && typeof c?.tool === "string")
    .map(({ src, c }) => ({
      ts: String(c.ts),
      source: src,
      tool: String(c.tool),
      input: (c.input ?? {}) as Record<string, unknown>,
      output_head: String(c.output_head ?? "").slice(0, 200),
    }))
    .sort((a, b) => (a.ts < b.ts ? -1 : a.ts > b.ts ? 1 : 0))
    .slice(-150);

  const engineM = mtime("forecasts/traces.json");
  const wbM = mtime(`submission/${meta.file}`);

  // Freshness: an artifact touched moments ago flips its stage to "running"
  // so fast deterministic reruns (~3s, faster than the poll) still visibly
  // sweep through the graph instead of completing invisibly.
  const FRESH_MS = 7_000;
  const isFresh = (m: number | null) => !!m && now - m < FRESH_MS;

  const stages: Record<string, StageStatus> = {
    corpus: "done",
    reader0: readers[0].status,
    reader1: readers[1].status,
    reader2: readers[2].status,
    firewall: extractStatus,
    consensus: liveReport ? "done" : extractStatus === "running" && !anyReaderActive ? "running" : "idle",
    calibration: isFresh(mtime("forecasts/calibration.json")) ? "running" : calibration ? "done" : "idle",
    calculators: isFresh(engineM) ? "running" : metrics.length ? "done" : engineM ? "running" : "idle",
    validator: validatorStatus,
    writer: isFresh(wbM) ? "running" : wbM ? "done" : "idle",
  };

  // Full-run orchestrator progress file: while a run is live its coarse
  // progress OVERRIDES the artifact-derived stage statuses (upward only for
  // the readers); once done, the artifacts speak for themselves again.
  const fullrunRel = latest("logs", `fullrun-${company}-`);
  const fullrunRaw = fullrunRel
    ? (readJson(fullrunRel) as {
        company?: string;
        startedAt?: string;
        updatedAt?: string;
        stages?: Record<string, string>;
        workbook?: string | null;
        done?: boolean;
        ok?: boolean | null;
        error?: string | null;
        warning?: string | null;
      } | null)
    : null;
  let fullrun: {
    active: boolean;
    stages: Record<string, string>;
    workbook: string | null;
    ok: boolean | null;
    error: string | null;
    warning: string | null;
    startedAt: string | null;
  } | null = null;
  if (fullrunRaw) {
    const updatedMs = Date.parse(fullrunRaw.updatedAt ?? "");
    const active = !fullrunRaw.done && Number.isFinite(updatedMs) && now - updatedMs < 180_000;
    const prog = fullrunRaw.stages ?? {};
    fullrun = {
      active,
      stages: prog,
      workbook: fullrunRaw.workbook ?? null,
      ok: fullrunRaw.ok ?? null,
      error: fullrunRaw.error ?? null,
      warning: fullrunRaw.warning ?? null,
      startedAt: fullrunRaw.startedAt ?? null,
    };
    if (active) {
      // "readers" (plural) covers reader0-2 collectively — upward only:
      // running/done/failed lift an idle reader, never downgrade one whose
      // own trace says it is running or done.
      const rProg = prog.readers;
      if (rProg === "running" || rProg === "done" || rProg === "failed") {
        for (const id of ["reader0", "reader1", "reader2"]) {
          if (stages[id] === "idle") stages[id] = rProg as StageStatus;
        }
      }
      // Every other progress key maps 1:1 onto the same-named stage id.
      for (const id of ["firewall", "consensus", "calibration", "calculators", "validator", "writer"]) {
        const p = prog[id];
        if (p === "running" || p === "failed") stages[id] = p;
        else if (p === "done" && stages[id] !== "running") stages[id] = "done";
        // "pending" → leave the artifact-derived status alone.
      }
    } else if (fullrunRaw.done && fullrunRaw.ok === false && Number.isFinite(updatedMs) && now - updatedMs < 600_000) {
      // A failed run must stay visible: fail() sets done=true in the same
      // flush, so the 'active' override above can never observe it. Keep the
      // failed stages red for 10 minutes (unless a newer manual run has that
      // stage running again) instead of snapping back to last run's green.
      for (const [id, p] of Object.entries(prog)) {
        if (p !== "failed") continue;
        if (id === "readers") {
          for (const r of ["reader0", "reader1", "reader2"]) {
            if (stages[r] !== "running") stages[r] = "failed";
          }
        } else if (id in stages && stages[id] !== "running") {
          stages[id] = "failed";
        }
      }
    }
  }

  return {
    company,
    companies: Object.entries(COMPANIES).map(([id, c]) => ({ id, label: c.label })),
    workbook: meta.file,
    workbookExists: wbM !== null,
    generatedAt: new Date().toISOString(),
    stages,
    events,
    readers: readers.map((r) => ({ ...r, calls: r.calls })),
    skillgen,
    liveReport,
    calibration,
    metrics,
    verdicts,
    validationResult: validation?.result ?? null,
    validatorVerdict,
    validatorTrace: vTraceRel,
    fullrun,
    runLog,
    lastRun: runLogRel
      ? { log: runLogRel, at: runLogM ? new Date(runLogM).toISOString() : null, clear: runClear }
      : null,
    skills: skills.map((s) => ({ name: s.name, content: s.content.slice(0, 24000) })),
    pinnedDrivers: readJson(`research/drivers/${company}.json`),
  };
}
