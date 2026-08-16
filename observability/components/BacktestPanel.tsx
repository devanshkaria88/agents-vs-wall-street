"use client";
// Compact backtest panel: one chip per holdout quarter. A backtest hides every
// corpus doc from the report date onward, re-forecasts from the surviving
// guidance, and scores the miss against the held-out actual — ratio_vs_naive
// is the honest stand-in for the score formula's WS-miss denominator.
// Launches via POST /api/run and polls GET /api/run for liveness, same
// pattern as RunControls.
import { useCallback, useEffect, useState } from "react";

export type Holdout = {
  quarter: string;
  label: string;
  unit: string;
  cutoff: string;
};

export type BacktestResult = {
  quarter: string;
  label: string;
  unit: string;
  cutoff: string;
  forecast: number;
  actual: number;
  abs_miss: number;
  pct_miss: number;
  ratio_vs_naive: number;
  timestamp: string | null;
};

type Run = {
  pid: number;
  action: string;
  company: string | null;
  quarter?: string | null;
  alive: boolean;
};

const ratioClass = (r: number) =>
  r < 1 ? "text-emerald-700" : r <= 2 ? "text-amber-700" : "text-rose-700";

const fmt = (n: number) =>
  Number.isFinite(n)
    ? n.toLocaleString("en-US", { maximumFractionDigits: Math.abs(n) >= 1000 ? 0 : 1 })
    : "—";

export default function BacktestPanel({
  company,
  holdouts,
  backtests,
}: {
  company: string;
  holdouts: Holdout[];
  backtests: BacktestResult[];
}) {
  const [runs, setRuns] = useState<Run[]>([]);
  const [posting, setPosting] = useState<string | null>(null);

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

  const aliveFor = (quarter: string) =>
    runs.some(
      (r) => r.alive && r.action === "backtest" && r.company === company && r.quarter === quarter,
    );

  const launch = async (quarter: string) => {
    if (posting) return;
    setPosting(quarter);
    try {
      await fetch("/api/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "backtest", company, quarter }),
      });
      await refresh();
    } catch {}
    setPosting(null);
  };

  return (
    <div className="glass-deep rounded-xl">
      <div className="flex items-baseline justify-between border-b border-white/50 px-3 py-2">
        <span className="text-[10px] uppercase tracking-[0.14em] text-slate-500">
          backtests · holdout quarters
        </span>
        <span className="font-mono text-[10px] text-slate-500">{company}</span>
      </div>
      <div className="space-y-1 p-2">
        {!holdouts.length && (
          <p className="p-2 text-[12px] text-slate-500">
            No holdout quarters defined for {company} yet.
          </p>
        )}
        {holdouts.map((h) => {
          const r = backtests.find((b) => b.quarter === h.quarter) ?? null;
          const running = aliveFor(h.quarter);
          const busy = running || posting === h.quarter;
          return (
            <div key={h.quarter} className="glass-chip flex items-center gap-2 rounded-md px-2 py-1.5">
              <button
                title={`Backtest ${h.label} for ${h.quarter}: hide docs from ${h.cutoff} onward, re-forecast, score vs the actual`}
                disabled={busy}
                onClick={() => launch(h.quarter)}
                className={`glass-chip flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md px-2 py-0.5 font-mono text-[11px] transition-all duration-150 ${
                  busy
                    ? "cursor-not-allowed !border-amber-500/40 text-slate-400"
                    : "text-slate-700 hover:!border-sky-500/50 hover:!bg-sky-500/10 hover:text-sky-800"
                }`}
              >
                {running && <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-amber-400" />}
                {h.quarter}
              </button>
              {r ? (
                <div className="flex min-w-0 flex-1 items-baseline gap-1.5 font-mono text-[10.5px]">
                  <span
                    className="truncate text-slate-700"
                    title={`${r.label}: forecast ${r.forecast} vs actual ${r.actual} ${r.unit} · miss ${fmt(r.abs_miss)} ${r.unit}`}
                  >
                    {fmt(r.forecast)} vs {fmt(r.actual)} {r.unit}
                  </span>
                  <span className="shrink-0 text-slate-500">{fmt(r.pct_miss)}%</span>
                  <span className={`ml-auto shrink-0 font-semibold ${ratioClass(r.ratio_vs_naive)}`}>
                    ×{Number.isFinite(r.ratio_vs_naive) ? r.ratio_vs_naive.toFixed(2) : "—"} vs naive
                  </span>
                </div>
              ) : (
                <span className="min-w-0 truncate text-[10.5px] text-slate-500">
                  {h.label} — not yet run
                </span>
              )}
            </div>
          );
        })}
      </div>
      <p className="border-t border-white/50 px-3 py-1.5 text-[10px] text-slate-500">
        docs from the report date onward are hidden from the reader
      </p>
    </div>
  );
}
