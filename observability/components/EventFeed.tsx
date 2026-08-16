"use client";
// Floating live-event feed: every tool call and skill load across every agent
// (reader runs + skill-writer + validator), merged chronologically by
// lib/state.assemble. Tiles are compact — click one and a dialog opens with
// the FULL content re-read from the frozen corpus (/api/event-content) and
// rendered as markdown.
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export type FeedEvent = {
  ts: string;
  source: string;
  tool: string;
  input: Record<string, unknown>;
  output_head: string;
};

type EventContent =
  | { kind: "markdown"; title: string; content: string }
  | { kind: "code"; title: string; content: string }
  | { kind: "none" };

const TOOL_CHIP: Record<string, string> = {
  load_skill: "bg-violet-500/15 text-violet-700",
  search_corpus: "bg-sky-500/15 text-sky-700",
  read_doc: "bg-teal-500/15 text-teal-700",
  web_search: "bg-amber-500/15 text-amber-700",
  submit_drivers: "bg-emerald-500/15 text-emerald-700",
  submit_skill: "bg-emerald-500/15 text-emerald-700",
  submit_verdict: "bg-emerald-500/15 text-emerald-700",
};

const SRC_CHIP: Record<string, string> = {
  SW: "bg-fuchsia-500/15 text-fuchsia-700",
  VA: "bg-rose-500/15 text-rose-700",
};

function hint(e: FeedEvent): string {
  const i = e.input ?? {};
  if (typeof i.file === "string") return String(i.file).split("/").pop() ?? "";
  if (typeof i.query === "string") return `“${String(i.query).slice(0, 40)}”`;
  if (typeof i.path === "string") return String(i.path).split("/").pop() ??"";
  return "";
}

function EventDialog({ event, onClose }: { event: FeedEvent; onClose: () => void }) {
  const [content, setContent] = useState<EventContent | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/event-content", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ tool: event.tool, input: event.input }),
        });
        const data = (await res.json()) as EventContent;
        if (!cancelled) setContent(data);
      } catch {
        if (!cancelled) setContent({ kind: "none" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [event]);

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => ev.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/25 p-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="glass-deep flex max-h-[82vh] w-full max-w-3xl flex-col rounded-xl"
        onClick={(ev) => ev.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-white/50 px-4 py-2.5">
          <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${SRC_CHIP[event.source] ?? "bg-slate-500/15 text-slate-600"}`}>
            {event.source}
          </span>
          <span className={`rounded px-2 py-0.5 font-mono text-[12px] ${TOOL_CHIP[event.tool] ?? "bg-slate-500/15 text-slate-700"}`}>
            {event.tool}
          </span>
          <span className="min-w-0 truncate text-[11px] text-slate-500">
            {content && content.kind !== "none" ? content.title : hint(event)}
          </span>
          <span className="ml-auto shrink-0 font-mono text-[10px] text-slate-400">{event.ts.slice(11, 19)}Z</span>
          <button
            onClick={onClose}
            className="glass-chip ml-2 shrink-0 cursor-pointer rounded-md px-2 py-0.5 text-[11px] text-slate-600 hover:text-slate-900"
          >
            esc ✕
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          <div className="mb-2 break-all rounded bg-white/40 px-2.5 py-1.5 font-mono text-[10.5px] text-slate-600">
            {JSON.stringify(event.input)}
          </div>
          {!content && <p className="p-3 text-sm text-slate-500">Loading the full content…</p>}
          {content?.kind === "markdown" && (
            <div className="md-body rounded bg-white/40 px-3 py-2.5">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content.content}</ReactMarkdown>
            </div>
          )}
          {content?.kind === "code" && (
            <pre className="overflow-x-auto rounded bg-white/40 px-3 py-2.5 text-[11px] leading-relaxed text-slate-700">
              {content.content}
            </pre>
          )}
          {content?.kind === "none" && (
            <div className="text-[12px] leading-relaxed text-slate-600">
              {event.output_head ? (
                <>
                  <div className="mb-1 text-[10px] uppercase tracking-[0.12em] text-slate-500">stored response head</div>
                  <p className="whitespace-pre-wrap">{event.output_head}</p>
                </>
              ) : (
                <p className="text-slate-500">No reconstructable content for this event.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function EventFeed({ events, asOf }: { events: FeedEvent[]; asOf?: string }) {
  const [open, setOpen] = useState<FeedEvent | null>(null);
  const close = useCallback(() => setOpen(null), []);
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
            No events yet this run — launch a run and every tool call and skill load lands here.
          </p>
        )}
        {[...events].reverse().map((e, i) => {
          const h = hint(e);
          return (
            <button
              key={`${e.ts}-${i}`}
              onClick={() => setOpen(e)}
              className="glass-chip flex w-full cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-left hover:!border-sky-400/50"
            >
              <span className={`rounded px-1 text-[9px] font-semibold ${SRC_CHIP[e.source] ?? "bg-slate-500/15 text-slate-600"}`}>
                {e.source}
              </span>
              <span className={`rounded px-1.5 font-mono text-[11px] ${TOOL_CHIP[e.tool] ?? "bg-slate-500/15 text-slate-700"}`}>
                {e.tool}
              </span>
              {h && <span className="min-w-0 truncate text-[10px] text-slate-500">{h}</span>}
              <span className="ml-auto shrink-0 font-mono text-[9px] text-slate-400">{e.ts.slice(11, 19)}Z</span>
            </button>
          );
        })}
      </div>
      {/* Portal: .glass-deep's backdrop-filter makes this panel a containing
          block for fixed descendants — the dialog must escape to <body> to
          actually cover the viewport. */}
      {open && createPortal(<EventDialog event={open} onClose={close} />, document.body)}
    </div>
  );
}
