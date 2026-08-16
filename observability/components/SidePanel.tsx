"use client";

type ToolCall = { ts: string; tool: string; input: Record<string, unknown>; output_chars: number; output_head: string };
type Reader = { run: number; status: string; trace: string | null; calls: ToolCall[] };
type Metric = { label: string; value: number; unit: string; variants: number[]; spread: number; cross_checks: { desc: string; result: number; delta_vs_primary: number }[]; trace: { desc: string; formula: string; result: unknown }[] };
type Verdict = { metric: string; value: unknown; checks: Record<string, string> };

export type State = {
  stages: Record<string, string>;
  readers: Reader[];
  skills: { name: string; content: string }[];
  liveReport: {
    runs_parsed?: number;
    firewall_drops?: [string, string][];
    unresolved?: { key: string; candidates: unknown[] }[];
    merge_decisions?: { key: string; action: string; pinned?: unknown; live?: unknown }[];
  } | null;
  calibration: Record<string, Record<string, { n: number; mean: number; median: number; hit_rate_above_mid: number }>> | null;
  metrics: Metric[];
  verdicts: Verdict[];
  validationResult: string | null;
  runLog: string[];
};

const badge = (s: string) =>
  s.startsWith("FAIL") || s === "failed"
    ? "bg-rose-500/20 text-rose-300"
    : s === "running"
      ? "bg-amber-500/20 text-amber-300"
      : s === "done" || s === "PASS" || s.startsWith("pass")
        ? "bg-emerald-500/20 text-emerald-300"
        : "bg-slate-600/30 text-slate-300";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <h3 className="text-[11px] uppercase tracking-[0.14em] text-slate-400 mb-2">{title}</h3>
      {children}
    </div>
  );
}

function ToolFeed({ calls }: { calls: ToolCall[] }) {
  if (!calls.length) return <p className="text-slate-500 text-sm">No tool calls yet.</p>;
  return (
    <div className="space-y-2">
      {[...calls].reverse().map((c, i) => (
        <div key={i} className="rounded-lg glass-chip p-2.5">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[12px] text-sky-300">{c.tool}</span>
            <span className="text-[10px] text-slate-500">{c.ts?.slice(11, 19)}Z</span>
          </div>
          <div className="font-mono text-[11px] text-slate-300 mt-1 break-all">
            {JSON.stringify(c.input).slice(0, 180)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 line-clamp-2">→ {c.output_head?.slice(0, 160)}</div>
        </div>
      ))}
    </div>
  );
}

export default function SidePanel({ stage, state }: { stage: string | null; state: State }) {
  if (!stage)
    return (
      <div className="text-slate-400 text-sm p-2">
        Click a stage to inspect what it did — the exact skills it loaded, the tools it invoked, and the artifacts it produced.
      </div>
    );

  if (stage.startsWith("reader")) {
    const idx = Number(stage.slice(-1));
    const r = state.readers[idx];
    return (
      <div>
        <Section title={`Reader run ${idx} · ${r?.status ?? "idle"}`}>
          <span className={`text-[11px] px-2 py-0.5 rounded-full ${badge(r?.status ?? "idle")}`}>{r?.status}</span>
          {r?.trace && <div className="font-mono text-[11px] text-slate-500 mt-2">{r.trace}</div>}
        </Section>
        <Section title="Skills loaded (system prompt)">
          {state.skills.map((s) => (
            <details key={s.name} className="mb-1.5 rounded-lg glass-chip p-2">
              <summary className="font-mono text-[12px] text-violet-300 cursor-pointer">{s.name}</summary>
              <pre className="text-[10.5px] text-slate-400 whitespace-pre-wrap mt-1 max-h-56 overflow-auto">{s.content}</pre>
            </details>
          ))}
        </Section>
        <Section title={`Tool invocations (${r?.calls.length ?? 0})`}>
          <ToolFeed calls={r?.calls ?? []} />
        </Section>
      </div>
    );
  }

  if (stage === "firewall" || stage === "vote" || stage === "merge") {
    const rep = state.liveReport;
    return (
      <div>
        <Section title="Extraction consensus">
          {!rep ? (
            <p className="text-slate-500 text-sm">Waiting for all reader runs to finish…</p>
          ) : (
            <>
              <p className="text-sm text-slate-300 mb-2">{rep.runs_parsed} runs parsed</p>
              <Section title={`Firewall drops (${rep.firewall_drops?.length ?? 0})`}>
                {(rep.firewall_drops ?? []).map(([k, why], i) => (
                  <div key={i} className="text-[12px] text-rose-300 font-mono">{k}: <span className="text-slate-400">{why}</span></div>
                ))}
                {!rep.firewall_drops?.length && <p className="text-slate-500 text-sm">Nothing dropped — all quotes re-found byte-exact.</p>}
              </Section>
              <Section title={`Unresolved after vote (${rep.unresolved?.length ?? 0})`}>
                {(rep.unresolved ?? []).map((u, i) => (
                  <div key={i} className="text-[12px] font-mono text-amber-300">{u.key} <span className="text-slate-500">{JSON.stringify(u.candidates)}</span></div>
                ))}
                {!rep.unresolved?.length && <p className="text-slate-500 text-sm">Every driver reached 2-of-3 agreement.</p>}
              </Section>
              <Section title="Merge decisions">
                {(rep.merge_decisions ?? []).map((d, i) => (
                  <div key={i} className="rounded-lg glass-chip p-2 mb-1.5">
                    <div className="font-mono text-[12px] text-sky-300">{d.key}</div>
                    <div className={`text-[11px] ${d.action.startsWith("DIVERGENCE") ? "text-rose-300" : d.action.startsWith("UPGRADED") ? "text-emerald-300" : "text-slate-400"}`}>
                      {d.action}
                      {d.pinned !== undefined && <span className="text-slate-500"> pinned={String(d.pinned)} live={String(d.live ?? "—")}</span>}
                    </div>
                  </div>
                ))}
              </Section>
            </>
          )}
        </Section>
      </div>
    );
  }

  if (stage === "calibration") {
    const cal = state.calibration?.["analog-devices"];
    return (
      <Section title="Calibration — fitted from guide-vs-actual history">
        {!cal ? (
          <p className="text-slate-500 text-sm">Not yet computed.</p>
        ) : (
          Object.entries(cal).map(([metric, b]) => (
            <div key={metric} className="rounded-lg glass-chip p-2.5 mb-2">
              <div className="font-mono text-[12px] text-sky-300">{metric}</div>
              <div className="text-[12px] text-slate-300 mt-1">
                median beat <b className="text-emerald-300">+{b.median}</b> · mean +{b.mean} · n={b.n} · beat rate {Math.round(b.hit_rate_above_mid * 100)}%
              </div>
            </div>
          ))
        )}
      </Section>
    );
  }

  if (stage === "calculators") {
    return (
      <Section title={`Metric calculators (${state.metrics.length})`}>
        {state.metrics.map((m) => (
          <div key={m.label} className="rounded-lg glass-chip p-2.5 mb-2">
            <div className="flex justify-between items-baseline">
              <span className="text-[13px] text-slate-200">{m.label}</span>
              <span className="font-mono text-[15px] text-yellow-200">{m.value}<span className="text-[10px] text-slate-500 ml-1">{m.unit}</span></span>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">{m.variants.length} plan variants · spread {m.spread}</div>
            {m.trace.map((t, i) => (
              <div key={i} className="text-[11px] text-slate-400 mt-1"><span className="text-slate-500 font-mono">{t.formula}</span> — {t.desc}</div>
            ))}
            {m.cross_checks.map((c, i) => (
              <div key={i} className="text-[11px] text-teal-300 mt-0.5">✓ cross-check: {c.desc} → {c.result} (Δ {c.delta_vs_primary})</div>
            ))}
          </div>
        ))}
      </Section>
    );
  }

  if (stage === "validator") {
    return (
      <div>
        <Section title={`Validation · ${state.validationResult ?? "not run"}`}>
          {state.verdicts.map((v, i) => (
            <div key={i} className="rounded-lg glass-chip p-2.5 mb-1.5">
              <div className="flex justify-between">
                <span className="text-[12.5px] text-slate-200">{v.metric}</span>
                <span className="font-mono text-[12px] text-slate-400">{String(v.value)}</span>
              </div>
              {Object.entries(v.checks).map(([name, res]) => (
                <div key={name} className="flex justify-between mt-1">
                  <span className="text-[11px] text-slate-500 font-mono">{name}</span>
                  <span className={`text-[10.5px] px-1.5 rounded ${badge(res)}`}>{res.length > 46 ? res.slice(0, 46) + "…" : res}</span>
                </div>
              ))}
            </div>
          ))}
        </Section>
      </div>
    );
  }

  if (stage === "writer" || stage === "checker" || stage === "corpus") {
    return (
      <Section title={stage === "corpus" ? "Corpus" : "Run log (latest)"}>
        {stage === "corpus" ? (
          <p className="text-sm text-slate-300">
            1,139 markdown documents (507 filings, 538 transcript sections, 94 slide docs) frozen 2026-08-14, plus the logged
            public-web consensus sweep in <span className="font-mono text-[12px]">research/web/</span>.
          </p>
        ) : (
          <pre className="text-[11px] text-slate-400 whitespace-pre-wrap max-h-[60vh] overflow-auto">{state.runLog.join("\n")}</pre>
        )}
      </Section>
    );
  }
  return null;
}
