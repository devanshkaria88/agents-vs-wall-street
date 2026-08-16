"use client";
// Floating run-control strip: launches fullrun / extract / forecast / skillgen
// via POST /api/run and polls GET /api/run to show liveness per action. The
// primary button is the one-click Full run — readers through workbook writer —
// and the emerald chip downloads the finished workbook for MANUAL OpenStocks
// upload (never programmatic, per RULES.md:55).
import { useCallback, useEffect, useState } from "react";
import { DownloadChip, type State } from "@/components/SidePanel";

type RunAction = "fullrun" | "extract" | "forecast" | "skillgen";

type Run = {
  pid: number;
  action: RunAction;
  company: string | null;
  logfile: string;
  startedAt: string;
  alive: boolean;
  tail: string[];
};

const SECONDARY: { action: RunAction; label: string; perCompany: boolean; title: (c: string) => string }[] = [
  { action: "extract", label: "Extraction", perCompany: true, title: (c) => `Launch the 3 reader-agent runs for ${c}` },
  { action: "forecast", label: "Forecast", perCompany: false, title: () => "Run the deterministic forecast pipeline (all companies)" },
  { action: "skillgen", label: "Skills", perCompany: true, title: (c) => `Run the skill-writer agent for ${c}` },
];

const FULLRUN_STAGE_ORDER = ["readers", "firewall", "consensus", "calibration", "calculators", "validator", "writer"];

export default function RunControls({ company, state }: { company: string; state: State | null }) {
  const [runs, setRuns] = useState<Run[]>([]);
  const [posting, setPosting] = useState<RunAction | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/run", { cache: "no-store" });
      const data = await res.json();
      setRuns(Array.isArray(data.runs) ? data.runs : []);
    } catch {}
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 2000);
    return () => clearInterval(t);
  }, [refresh]);

  const aliveFor = (action: RunAction) =>
    runs.some(
      (r) =>
        r.alive &&
        r.action === action &&
        (action === "forecast" || r.company === null || r.company === company),
    );

  const launch = async (action: RunAction, perCompany: boolean) => {
    if (posting) return;
    setPosting(action);
    try {
      await fetch("/api/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(perCompany ? { action, company } : { action }),
      });
      await refresh();
    } catch {}
    setPosting(null);
  };

  const active = [...runs].reverse().find((r) => r.alive);
  const lastRun = state?.lastRun ?? null;

  const fullrun = state?.fullrun ?? null;
  const fullrunAlive = aliveFor("fullrun");
  const fullrunActive = !!fullrun?.active || fullrunAlive;
  const fullrunStage = fullrun?.active
    ? (FULLRUN_STAGE_ORDER.find((s) => fullrun.stages[s] === "running") ??
      [...FULLRUN_STAGE_ORDER].reverse().find((s) => fullrun.stages[s] === "done") ??
      "starting")
    : null;
  const fullrunBusy = fullrunActive || posting === "fullrun";

  const canDownload =
    !!state && (!!state.fullrun?.workbook || (!!state.workbook && state.validationResult === "PASS"));

  return (
    <div className="glass-deep rounded-xl px-3 py-2.5">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-[10px] uppercase tracking-[0.14em] text-slate-500">run controls</span>
        <span className="font-mono text-[10px] text-slate-600">{company}</span>
      </div>
      <button
        title={`One-click pipeline for ${company}: readers → firewall → consensus → calibration → calculators → validator agent → workbook writer`}
        disabled={fullrunBusy}
        onClick={() => launch("fullrun", true)}
        className={`mb-1.5 flex w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-2 py-2 text-[12.5px] font-semibold transition-all duration-200 ${
          fullrunBusy
            ? "glass-chip cursor-not-allowed !border-amber-500/40 text-slate-500"
            : "glass-chip cursor-pointer !border-sky-500/60 !bg-sky-500/15 text-sky-800 hover:!bg-sky-500/25"
        }`}
      >
        {fullrunActive && <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-amber-400" />}
        Full run
      </button>
      <div className="flex gap-1.5">
        {SECONDARY.map(({ action, label, perCompany, title }) => {
          const running = aliveFor(action);
          const busy = running || posting === action;
          return (
            <button
              key={action}
              title={title(company)}
              disabled={busy}
              onClick={() => launch(action, perCompany)}
              className={`glass-chip flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-2 py-1.5 text-[11.5px] transition-all duration-200 ${
                busy
                  ? "cursor-not-allowed !border-amber-500/40 text-slate-500"
                  : "cursor-pointer font-medium text-slate-700 hover:!border-sky-500/50 hover:!bg-sky-500/10 hover:text-sky-800"
              }`}
            >
              {running && <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-amber-400" />}
              {label}
            </button>
          );
        })}
      </div>
      {canDownload && (
        <div className="mt-2">
          <DownloadChip company={company} />
        </div>
      )}
      {fullrun?.active && (
        <div className="mt-2 flex items-center gap-1.5 font-mono text-[10px] text-slate-500">
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
          full run · <span className="font-semibold text-amber-700">{fullrunStage}</span>
        </div>
      )}
      {fullrun?.error && (
        <div className="mt-1.5 truncate font-mono text-[10px] text-rose-600" title={fullrun.error}>
          {fullrun.error}
        </div>
      )}
      {!active && !fullrun?.active && lastRun && (
        <div className="mt-2 flex items-center gap-1.5 font-mono text-[10px] text-slate-500">
          <span className={`inline-block h-1.5 w-1.5 rounded-full ${lastRun.clear ? "bg-emerald-500" : "bg-rose-500"}`} />
          last forecast {lastRun.at ? new Date(lastRun.at).toLocaleTimeString() : ""} ·{" "}
          <span className={lastRun.clear ? "text-emerald-700 font-semibold" : "text-rose-700 font-semibold"}>
            {lastRun.clear ? "RUN CLEAR" : "FAILED"}
          </span>
        </div>
      )}
      {active && !fullrun?.active && (
        <div className="mt-2 truncate font-mono text-[10px] text-slate-500" title={active.tail.join("\n")}>
          <span className="text-amber-300/80">
            {active.action}
            {active.company ? ` · ${active.company}` : ""}
          </span>
          {" — "}
          {active.tail.length ? active.tail[active.tail.length - 1] : "starting…"}
        </div>
      )}
    </div>
  );
}
