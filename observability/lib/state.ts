// Server-side state assembly: reads the run artifacts the pipeline drops on
// disk and derives per-stage status. The dashboard never talks to the API
// providers — it observes the same files the judges can open by hand.
import fs from "node:fs";
import path from "node:path";

export const REPO = path.resolve(process.cwd(), "..");

export type StageStatus = "idle" | "running" | "done" | "failed";

const COMPANIES: Record<string, { file: string; label: string }> = {
  hays: { file: "HAS-FY2026.xlsx", label: "Hays plc · FY2026" },
  "home-depot": { file: "HD-FY2026Q2.xlsx", label: "Home Depot · FY26 Q2" },
  "analog-devices": { file: "ADI-FY2026Q3.xlsx", label: "Analog Devices · FY26 Q3" },
  deere: { file: "DE-FY2026Q3.xlsx", label: "Deere & Co · FY26 Q3" },
};

function exists(p: string) {
  return fs.existsSync(path.join(REPO, p));
}
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

  const runLogRel = latest("logs", "run-");
  let runLog: string[] = [];
  try {
    runLog = fs
      .readFileSync(path.join(REPO, runLogRel ?? ""), "utf8")
      .split("\n")
      .slice(-40);
  } catch {}
  const runClear = runLog.some((l) => l.includes("RUN CLEAR"));

  const skills = ["method.md", `${company}.md`].map((f) => ({
    name: `agent/skills/${f}`,
    content: (() => {
      try {
        return fs.readFileSync(path.join(REPO, "agent", "skills", f), "utf8");
      } catch {
        return "";
      }
    })(),
  }));

  const engineM = mtime("forecasts/traces.json");
  const validM = validation?.timestamp ?? null;
  const wbM = mtime(`submission/${meta.file}`);

  const stages: Record<string, StageStatus> = {
    corpus: "done",
    reader0: readers[0].status,
    reader1: readers[1].status,
    reader2: readers[2].status,
    firewall: extractStatus,
    vote: liveReport ? "done" : extractStatus === "running" && !anyReaderActive ? "running" : "idle",
    merge: liveReport ? "done" : "idle",
    calibration: calibration ? "done" : "idle",
    calculators: metrics.length ? "done" : engineM ? "running" : "idle",
    validator: validation ? (validation.result === "PASS" ? "done" : "failed") : "idle",
    writer: wbM ? "done" : "idle",
    checker: runClear ? "done" : runLogRel ? "done" : "idle",
  };

  return {
    company,
    companies: Object.entries(COMPANIES).map(([id, c]) => ({ id, label: c.label })),
    workbook: meta.file,
    generatedAt: new Date().toISOString(),
    stages,
    readers: readers.map((r) => ({ ...r, calls: r.calls })),
    skillgen,
    liveReport,
    calibration,
    metrics,
    verdicts,
    validationResult: validation?.result ?? null,
    runLog,
    skills: skills.map((s) => ({ name: s.name, content: s.content.slice(0, 4000) })),
    pinnedDrivers: readJson(`research/drivers/${company}.json`),
  };
}
