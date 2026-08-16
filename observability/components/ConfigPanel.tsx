"use client";
// Reader-agent configuration editor: GET /api/agent-config on mount, edit
// skills checklist / tool toggles / system prompt extra / runs, PUT to save.
import { useEffect, useState } from "react";

type ToolInfo = { id: string; kind: string; desc: string };

type AgentConfig = {
  model: string;
  effort: string;
  runs: number;
  system_prompt_extra: string;
  tools: Record<string, boolean>;
  web_search_max_uses: number;
  skills: Record<string, string[]>;
};

export default function ConfigPanel({ company }: { company: string }) {
  const [config, setConfig] = useState<AgentConfig | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [availableSkills, setAvailableSkills] = useState<string[]>([]);
  const [toolCatalog, setToolCatalog] = useState<ToolInfo[]>([]);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/agent-config", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setConfig(d.config ?? null);
        setAvailableSkills(d.availableSkills ?? []);
        setToolCatalog(d.toolCatalog ?? []);
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!feedback?.ok) return;
    const t = setTimeout(() => setFeedback(null), 2500);
    return () => clearTimeout(t);
  }, [feedback]);

  if (!loaded) return <p className="text-sm text-slate-500">Loading config…</p>;
  if (!config) return <p className="text-sm text-rose-300">agent/config.json missing or unreadable.</p>;

  const chosen = config.skills[company] ?? [];

  const toggleSkill = (f: string) =>
    setConfig((c) => {
      if (!c) return c;
      const cur = c.skills[company] ?? [];
      const next = cur.includes(f) ? cur.filter((x) => x !== f) : [...cur, f];
      return { ...c, skills: { ...c.skills, [company]: next } };
    });

  const toggleTool = (id: string) =>
    setConfig((c) => (c ? { ...c, tools: { ...c.tools, [id]: !c.tools[id] } } : c));

  const save = async () => {
    if (!config || saving) return;
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/agent-config", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ config }),
      });
      const d = await res.json();
      if (res.ok) setFeedback({ ok: true, msg: "saved to agent/config.json" });
      else setFeedback({ ok: false, msg: d.error ?? "save failed" });
    } catch {
      setFeedback({ ok: false, msg: "network error" });
    }
    setSaving(false);
  };

  return (
    <div className="glass-chip rounded-md p-2.5">
      <div className="mb-1.5 text-[10px] uppercase tracking-[0.12em] text-slate-500">skills · {company}</div>
      <div className="mb-3 space-y-1">
        {availableSkills.map((f) => (
          <label
            key={f}
            className="flex cursor-pointer items-center gap-2 font-mono text-[11.5px] text-slate-300 transition-colors duration-150 hover:text-slate-100"
          >
            <input
              type="checkbox"
              checked={chosen.includes(f)}
              onChange={() => toggleSkill(f)}
              className="h-3.5 w-3.5 cursor-pointer accent-sky-400"
            />
            {f}
          </label>
        ))}
        {!availableSkills.length && <p className="text-[11px] text-slate-500">No skill files found.</p>}
      </div>

      <div className="mb-1.5 text-[10px] uppercase tracking-[0.12em] text-slate-500">tools</div>
      <div className="mb-3 space-y-1.5">
        {toolCatalog.map((t) => {
          const on = !!config.tools[t.id];
          return (
            <div key={t.id}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[11.5px] text-slate-300" title={t.desc}>
                  {t.id}
                  <span className="ml-1.5 text-[9.5px] uppercase text-slate-600">{t.kind}</span>
                </span>
                <button
                  onClick={() => toggleTool(t.id)}
                  aria-label={`toggle ${t.id}`}
                  className={`relative h-[18px] w-8 shrink-0 cursor-pointer rounded-full border transition-colors duration-200 ${
                    on ? "border-sky-400/50 bg-sky-400/25" : "border-white/15 bg-white/5 hover:border-white/30"
                  }`}
                >
                  <span
                    className={`absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full transition-all duration-200 ${
                      on ? "left-[15px] bg-sky-300" : "left-[2px] bg-slate-400"
                    }`}
                  />
                </button>
              </div>
              {t.id === "web_search" && (
                <p className="mt-0.5 text-[10px] text-amber-300/80">server-side; keep OFF for the offline final run</p>
              )}
            </div>
          );
        })}
      </div>

      <div className="mb-1.5 text-[10px] uppercase tracking-[0.12em] text-slate-500">system prompt extra</div>
      <textarea
        value={config.system_prompt_extra}
        onChange={(e) => setConfig((c) => (c ? { ...c, system_prompt_extra: e.target.value } : c))}
        rows={3}
        placeholder="Appended verbatim to the reader system prompt…"
        className="mb-3 w-full resize-y rounded-md border border-white/10 bg-white/[0.03] p-2 font-mono text-[11px] text-slate-200 outline-none transition-colors duration-150 placeholder:text-slate-600 focus:border-sky-400/40"
      />

      <div className="flex items-center gap-2">
        <label className="text-[11px] text-slate-400">runs</label>
        <input
          type="number"
          min={1}
          max={3}
          value={config.runs}
          onChange={(e) => {
            const v = Math.max(1, Math.min(3, Math.round(Number(e.target.value) || 1)));
            setConfig((c) => (c ? { ...c, runs: v } : c));
          }}
          className="w-14 rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-[12px] text-slate-200 outline-none transition-colors duration-150 focus:border-sky-400/40"
        />
        <button
          onClick={save}
          disabled={saving}
          className={`ml-auto rounded-md border border-sky-400/40 bg-sky-400/10 px-3 py-1 text-[12px] text-sky-200 transition-all duration-200 ${
            saving ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:border-sky-400/60 hover:bg-sky-400/20"
          }`}
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
      {feedback && (
        <p className={`mt-1.5 text-[11px] ${feedback.ok ? "text-emerald-300" : "text-rose-300"}`}>
          {feedback.ok ? "✓ " : "✗ "}
          {feedback.msg}
        </p>
      )}
    </div>
  );
}
