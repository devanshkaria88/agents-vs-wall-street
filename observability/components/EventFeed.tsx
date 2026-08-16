"use client";
// Floating live-event feed: every tool call and skill load across every agent
// (reader runs + skill-writer), merged chronologically by lib/state.assemble.
// Tiles are compact — tool name only — and expand on click for input/output.

export type FeedEvent = {
  ts: string;
  source: string;
  tool: string;
  input: Record<string, unknown>;
  output_head: string;
};

const TOOL_CHIP: Record<string, string> = {
  load_skill: "bg-violet-500/15 text-violet-700",
  search_corpus: "bg-sky-500/15 text-sky-700",
  read_doc: "bg-teal-500/15 text-teal-700",
  web_search: "bg-amber-500/15 text-amber-700",
  submit_drivers: "bg-emerald-500/15 text-emerald-700",
  submit_skill: "bg-emerald-500/15 text-emerald-700",
};

const SRC_CHIP: Record<string, string> = {
  SW: "bg-fuchsia-500/15 text-fuchsia-700",
};

function hint(e: FeedEvent): string {
  const i = e.input ?? {};
  if (typeof i.file === "string") return String(i.file).split("/").pop() ?? "";
  if (typeof i.query === "string") return `“${String(i.query).slice(0, 40)}”`;
  if (typeof i.path === "string") return String(i.path).split("/").pop() ?? "";
  return "";
}

export default function EventFeed({ events, asOf }: { events: FeedEvent[]; asOf?: string }) {
  const newest = events[events.length - 1];
  const active = !!newest && !!asOf && Date.parse(asOf) - Date.parse(newest.ts) < 30_000;
  return (
    <div className="glass-deep flex h-full min-h-0 flex-col rounded-xl">
      <div className="flex items-baseline justify-between border-b border-white/50 px-3 py-2">
        <span className="text-[10px] uppercase tracking-[0.14em] text-slate-500">events</span>
        <span className="flex items-center gap-1.5 font-mono text-[10px] text-slate-500">
          {active && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />}
          {events.length}
        </span>
      </div>
      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
        {!events.length && (
          <p className="p-2 text-[12px] text-slate-500">
            No events yet — launch an extraction and every tool call and skill load lands here.
          </p>
        )}
        {[...events].reverse().map((e, i) => {
          const h = hint(e);
          return (
            <details key={`${e.ts}-${i}`} className="glass-chip group rounded-md">
              <summary className="flex cursor-pointer list-none items-center gap-1.5 px-2 py-1 [&::-webkit-details-marker]:hidden">
                <span
                  className={`rounded px-1 text-[9px] font-semibold ${SRC_CHIP[e.source] ?? "bg-slate-500/15 text-slate-600"}`}
                >
                  {e.source}
                </span>
                <span className={`rounded px-1.5 font-mono text-[11px] ${TOOL_CHIP[e.tool] ?? "bg-slate-500/15 text-slate-700"}`}>
                  {e.tool}
                </span>
                {h && <span className="min-w-0 truncate text-[10px] text-slate-500">{h}</span>}
                <span className="ml-auto shrink-0 font-mono text-[9px] text-slate-400">{e.ts.slice(11, 19)}Z</span>
              </summary>
              <div className="border-t border-white/40 px-2 py-1.5">
                <div className="break-all font-mono text-[10.5px] text-slate-600">{JSON.stringify(e.input)}</div>
                {e.output_head && <div className="mt-1 text-[10.5px] text-slate-500">→ {e.output_head}</div>}
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}
