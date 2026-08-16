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
    <div className="h-screen flex flex-col text-slate-100 p-4 gap-4">
      <header className="glass-deep rounded-2xl flex items-center gap-4 px-5 py-3 z-20">
        <div>
          <span className="font-bold tracking-tight text-[17px]">The Truth</span>
          <span className="text-slate-500 text-[13px] ml-2">pipeline observability</span>
        </div>
        <nav className="flex gap-1.5 ml-4">
          {companies.map((c) => (
            <button
              key={c.id}
              onClick={() => setCompany(c.id)}
              className={`glass-chip cursor-pointer px-3 py-1 rounded-full text-[12.5px] transition-all duration-200 ${
                company === c.id
                  ? "!bg-sky-400/15 !border-sky-300/60 text-sky-100 shadow-[0_0_18px_rgba(56,189,248,0.25)]"
                  : "text-slate-400 hover:text-slate-200 hover:!border-white/25"
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
            className={`glass-chip cursor-pointer px-3 py-1 rounded-full text-[12px] transition-all duration-200 ${live ? "!border-emerald-400/50 text-emerald-300 shadow-[0_0_18px_rgba(52,211,153,0.2)]" : "text-slate-500"}`}
          >
            {live ? "● live 2s" : "○ paused"}
          </button>
        </div>
      </header>
      <div className="flex flex-1 min-h-0 gap-4">
        <div className="flex-1 min-w-0 glass rounded-2xl overflow-hidden">
          {state && <Pipeline statuses={state.stages as Record<string, StageStatus>} selected={selected} onSelect={setSelected} />}
        </div>
        <aside className="w-[400px] glass-deep rounded-2xl overflow-y-auto p-4">
          {state && <SidePanel stage={selected} state={state} />}
        </aside>
      </div>
    </div>
  );
}
