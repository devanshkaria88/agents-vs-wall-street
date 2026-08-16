"use client";
// Floating run-control strip: launches extract / forecast / skillgen via
// POST /api/run and polls GET /api/run to show liveness per action.
import { useCallback, useEffect, useState } from "react";

type RunAction = "extract" | "forecast" | "skillgen";

type Run = {
  pid: number;
  action: RunAction;
  company: string | null;
  logfile: string;
  startedAt: string;
  alive: boolean;
  tail: string[];
};

const ACTIONS: { action: RunAction; label: string; perCompany: boolean; title: (c: string) => string }[] = [
  { action: "extract", label: "Run extraction", perCompany: true, title: (c) => `Launch the 3 reader-agent runs for ${c}` },
  { action: "forecast", label: "Run full forecast", perCompany: false, title: () => "Run the deterministic forecast pipeline (all companies)" },
  { action: "skillgen", label: "Regenerate skills", perCompany: true, title: (c) => `Run the skill-writer agent for ${c}` },
];

export default function RunControls({ company }: { company: string }) {
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

  return (
    <div className="glass-deep rounded-xl px-3 py-2.5">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-[10px] uppercase tracking-[0.14em] text-slate-500">run controls</span>
        <span className="font-mono text-[10px] text-slate-600">{company}</span>
      </div>
      <div className="flex gap-1.5">
        {ACTIONS.map(({ action, label, perCompany, title }) => {
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
      {active && (
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
