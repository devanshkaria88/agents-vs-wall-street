"use client";
import { useCallback, useEffect, useState } from "react";
import Pipeline, { type StageStatus } from "@/components/Pipeline";
import SidePanel, { type State } from "@/components/SidePanel";

export default function Home() {
  const [company, setCompany] = useState("hays");
  const [state, setState] = useState<State | null>(null);
  const [selected, setSelected] = useState<string | null>("reader0");
  const [live, setLive] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/state?company=${company}`, { cache: "no-store" });
      setState(await res.json());
    } catch {}
  }, [company]);

  useEffect(() => {
    refresh();
    if (!live) return;
    const t = setInterval(refresh, 2000);
    return () => clearInterval(t);
  }, [refresh, live]);

  const companies = (state as State & { companies?: { id: string; label: string }[] })?.companies ?? [
    { id: "hays", label: "Hays plc" },
    { id: "home-depot", label: "Home Depot" },
    { id: "analog-devices", label: "Analog Devices" },
    { id: "deere", label: "Deere & Co" },
  ];

  return (
    <div className="h-screen flex flex-col bg-slate-950 text-slate-100">
      <header className="flex items-center gap-4 px-5 py-3 border-b border-slate-800">
        <div>
          <span className="font-bold tracking-tight text-[17px]">The Truth</span>
          <span className="text-slate-500 text-[13px] ml-2">pipeline observability</span>
        </div>
        <nav className="flex gap-1.5 ml-4">
          {companies.map((c) => (
            <button
              key={c.id}
              onClick={() => setCompany(c.id)}
              className={`px-3 py-1 rounded-full text-[12.5px] border transition-colors ${
                company === c.id
                  ? "bg-sky-500/20 border-sky-400 text-sky-200"
                  : "border-slate-700 text-slate-400 hover:border-slate-500"
              }`}
            >
              {c.label}
            </button>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-[11px] text-slate-500">
            purple = AI · teal = deterministic code · yellow = output
          </span>
          <button
            onClick={() => setLive(!live)}
            className={`px-3 py-1 rounded-full text-[12px] border ${live ? "border-emerald-500 text-emerald-300" : "border-slate-700 text-slate-500"}`}
          >
            {live ? "● live 2s" : "○ paused"}
          </button>
        </div>
      </header>
      <div className="flex flex-1 min-h-0">
        <div className="flex-1 min-w-0">
          {state && <Pipeline statuses={state.stages as Record<string, StageStatus>} selected={selected} onSelect={setSelected} />}
        </div>
        <aside className="w-[400px] border-l border-slate-800 overflow-y-auto p-4 bg-slate-950/80">
          {state && <SidePanel stage={selected} state={state} />}
        </aside>
      </div>
    </div>
  );
}
