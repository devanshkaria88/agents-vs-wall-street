// Run-trigger API: launches pipeline stages as detached child processes from
// the dashboard. POST starts a run (extract | forecast | skillgen); GET reports
// every launched run with liveness + log tail. All state lives in files under
// logs/ so it survives dev-server restarts and stays judge-inspectable.
import { NextRequest, NextResponse } from "next/server";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { REPO } from "@/lib/state";

export const dynamic = "force-dynamic";

const COMPANIES = ["hays", "home-depot", "analog-devices", "deere"];
const RUNS_FILE = path.join(REPO, "logs", "ui-runs.json");

type Action = "extract" | "forecast" | "skillgen";

interface RunEntry {
  pid: number;
  action: Action;
  company: string | null;
  logfile: string;
  startedAt: string;
}

function readRuns(): RunEntry[] {
  try {
    const parsed = JSON.parse(fs.readFileSync(RUNS_FILE, "utf8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeRuns(runs: RunEntry[]) {
  fs.mkdirSync(path.dirname(RUNS_FILE), { recursive: true });
  fs.writeFileSync(RUNS_FILE, JSON.stringify(runs, null, 2));
}

function configuredRuns(): number {
  try {
    const cfg = JSON.parse(fs.readFileSync(path.join(REPO, "agent", "config.json"), "utf8"));
    const n = Number(cfg?.runs);
    return Number.isInteger(n) && n > 0 ? n : 3;
  } catch {
    return 3;
  }
}

function buildCommand(action: Action, company: string | null): { cmd: string; args: string[] } {
  const py = path.join(REPO, ".venv", "bin", "python");
  switch (action) {
    case "extract":
      return {
        cmd: py,
        args: [
          "-m", "forecaster.extract",
          "--companies", company ?? COMPANIES.join(","),
          "--runs", String(configuredRuns()),
        ],
      };
    case "forecast":
      return { cmd: "npm", args: ["run", "forecast"] };
    case "skillgen":
      return { cmd: py, args: ["-m", "agent.skillgen", company ?? "hays"] };
  }
}

export async function POST(req: NextRequest) {
  let body: { action?: string; company?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const action = body.action as Action | undefined;
  if (!action || !["extract", "forecast", "skillgen"].includes(action)) {
    return NextResponse.json(
      { error: "action must be one of extract | forecast | skillgen" },
      { status: 400 },
    );
  }
  const company = body.company ?? null;
  if (company !== null && !COMPANIES.includes(company)) {
    return NextResponse.json(
      { error: `company must be one of ${COMPANIES.join(", ")}` },
      { status: 400 },
    );
  }
  if (action === "skillgen" && company === null) {
    return NextResponse.json({ error: "skillgen requires a company" }, { status: 400 });
  }

  const ts = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+/, "Z");
  const logDir = path.join(REPO, "logs");
  fs.mkdirSync(logDir, { recursive: true });
  const logfile = path.join(logDir, `ui-run-${action}-${ts}.log`);
  const out = fs.openSync(logfile, "a");

  const { cmd, args } = buildCommand(action, company);
  const child = spawn(cmd, args, {
    cwd: REPO,
    detached: true,
    stdio: ["ignore", out, out],
  });
  child.unref();
  fs.closeSync(out);

  if (child.pid === undefined) {
    return NextResponse.json({ error: "failed to spawn process" }, { status: 500 });
  }

  const entry: RunEntry = {
    pid: child.pid,
    action,
    company,
    logfile: path.relative(REPO, logfile),
    startedAt: new Date().toISOString(),
  };
  writeRuns([...readRuns(), entry]);

  return NextResponse.json(entry, { status: 201, headers: { "cache-control": "no-store" } });
}

export async function GET() {
  const runs = readRuns().map((entry) => {
    let alive = false;
    try {
      process.kill(entry.pid, 0);
      alive = true;
    } catch {
      alive = false;
    }
    let tail: string[] = [];
    try {
      tail = fs
        .readFileSync(path.join(REPO, entry.logfile), "utf8")
        .trimEnd()
        .split("\n")
        .slice(-5);
    } catch {
      tail = [];
    }
    return { ...entry, alive, tail };
  });
  return NextResponse.json({ runs }, { headers: { "cache-control": "no-store" } });
}
