"use client";
import { useCallback, useEffect, useState } from "react";
import Pipeline, { type StageStatus } from "@/components/Pipeline";
import RunControls from "@/components/RunControls";
import SidePanel, { type State } from "@/components/SidePanel";
import EventFeed, { type FeedEvent } from "@/components/EventFeed";

export default function Home() {
  const [company, setCompany] = useState("hays");
  const [state, setState] = useState<State | null>(null);
  const [selected, setSelected] = useState<string | null>("reader0");
  const [live, setLive] = useState(true);
  const [follow, setFollow] = useState(true);

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
    <div className="relative h-screen w-screen overflow-hidden text-slate-900">
      {/* Drifting color field — gives the frosted tiles something to blur */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
        <div className="bg-blob bg-blob-a" />
        <div className="bg-blob bg-blob-b" />
      </div>

      {/* Full-bleed graph canvas */}
      <div className="absolute inset-0 z-0">
        {state && (
          <Pipeline
            statuses={state.stages as Record<string, StageStatus>}
            selected={selected}
            follow={follow}
            onSelect={setSelected}
          />
        )}
      </div>

      {/* Floating header */}
      <header className="glass-deep absolute left-4 right-4 top-4 z-10 flex items-center gap-4 rounded-xl px-4 py-2.5">
        <div>
          <span className="text-[15px] font-bold tracking-tight">The Truth</span>
          <span className="ml-2 text-[12px] text-slate-500">pipeline observability</span>
        </div>
        <nav className="ml-4 flex gap-1.5">
          {companies.map((c) => (
            <button
              key={c.id}
              onClick={() => setCompany(c.id)}
              className={`glass-chip cursor-pointer rounded-full px-3 py-1 text-[12px] transition-all duration-150 ${
                company === c.id
                  ? "!border-sky-400/50 !bg-sky-400/10 text-sky-800"
                  : "text-slate-600 hover:text-slate-800 hover:!border-slate-400/60"
              }`}
            >
              {c.label}
            </button>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-[11px] text-slate-500">
            violet = AI · teal = deterministic code · yellow = output
          </span>
          <button
            onClick={() => setFollow(!follow)}
            title="Glide the viewport to whichever stage is running"
            className={`glass-chip cursor-pointer rounded-full px-3 py-1 text-[12px] transition-all duration-150 ${
              follow ? "!border-sky-400/40 text-sky-700" : "text-slate-500"
            }`}
          >
            {follow ? "◉ follow cam" : "○ follow cam"}
          </button>
          <button
            onClick={() => setLive(!live)}
            className={`glass-chip cursor-pointer rounded-full px-3 py-1 text-[12px] transition-all duration-150 ${
              live ? "!border-emerald-400/40 text-emerald-700" : "text-slate-500"
            }`}
          >
            {live ? "● live 2s" : "○ paused"}
          </button>
        </div>
      </header>

      {/* Floating left column: live event feed */}
      <div className="absolute bottom-4 left-4 top-24 z-10 w-[330px]">
        <EventFeed
          events={(state as State & { events?: FeedEvent[] })?.events ?? []}
          asOf={(state as State & { generatedAt?: string })?.generatedAt}
        />
      </div>

      {/* Floating right column: run controls + inspector */}
      <div className="absolute bottom-4 right-4 top-24 z-10 flex w-[400px] flex-col gap-3">
        <RunControls company={company} lastRun={(state as unknown as { lastRun?: { log: string; at: string | null; clear: boolean } | null })?.lastRun} />
        <aside className="glass-deep min-h-0 flex-1 overflow-y-auto rounded-xl p-4">
          {state && <SidePanel stage={selected} state={state} company={company} />}
        </aside>
      </div>
    </div>
  );
}
