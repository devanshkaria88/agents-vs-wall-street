"use client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import ConfigPanel from "@/components/ConfigPanel";

type ToolCall = { ts: string; tool: string; input: Record<string, unknown>; output_chars: number; output_head: string };
type Reader = { run: number; status: string; trace: string | null; calls: ToolCall[] };
type Metric = { label: string; value: number; unit: string; variants: number[]; spread: number; cross_checks: { desc: string; result: number; delta_vs_primary: number }[]; trace: { desc: string; formula: string; result: unknown }[] };
type Verdict = { metric: string; value: unknown; checks: Record<string, string> };

export type ValidatorVerdict = {
  company?: string;
  timestamp?: string;
  verdicts?: {
    metric: string;
    verdict: "confirmed" | "challenged" | string;
    severity: "info" | "warning" | "blocker" | string;
    reason: string;
    evidence: { doc_path: string; verbatim_line: string } | null;
  }[];
};

export type Fullrun = {
  active: boolean;
  stages: Record<string, string>;
  workbook: string | null;
  ok: boolean | null;
  error: string | null;
  warning: string | null;
  startedAt: string | null;
};

export type State = {
  workbook: string;
  workbookExists: boolean;
  stages: Record<string, string>;
  readers: Reader[];
  skillgen?: { status: string; trace: string | null; calls: ToolCall[] } | null;
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
  validatorVerdict: ValidatorVerdict | null;
  validatorTrace: string | null;
  fullrun: Fullrun | null;
  runLog: string[];
  lastRun?: { log: string; at: string | null; clear: boolean } | null;
};

// Shared with RunControls: the emerald download chip for the finished
// workbook. The link only downloads — uploads to OpenStocks stay MANUAL.
export function DownloadChip({ company }: { company: string }) {
  return (
    <a
      href={`/api/download?company=${company}`}
      download
      title="Download the workbook — for manual OpenStocks upload"
      className="glass-chip inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11.5px] font-medium text-emerald-800 !border-emerald-500/50 hover:!bg-emerald-500/15"
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
      Download workbook
    </a>
  );
}

const badge = (s: string) =>
  s.startsWith("FAIL") || s === "failed"
    ? "bg-rose-500/15 text-rose-700"
    : s === "running"
      ? "bg-amber-500/15 text-amber-700"
      : s === "done" || s === "PASS" || s.startsWith("pass")
        ? "bg-emerald-500/15 text-emerald-700"
        : "bg-slate-500/15 text-slate-700";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <h3 className="text-[11px] uppercase tracking-[0.14em] text-slate-600 mb-2">{title}</h3>
      {children}
    </div>
  );
}

// Compact tool feed: one line per call (tool + time); click a tile to expand
// the full input and the head of the output.
function ToolFeed({ calls }: { calls: ToolCall[] }) {
  if (!calls.length) return <p className="text-slate-500 text-sm">No tool calls yet.</p>;
  return (
    <div className="space-y-1">
      {[...calls].reverse().map((c, i) => (
        <details key={i} className="rounded-md glass-chip">
          <summary className="flex cursor-pointer list-none items-center justify-between px-2.5 py-1.5 [&::-webkit-details-marker]:hidden">
            <span className="font-mono text-[12px] text-sky-700">{c.tool}</span>
            <span className="text-[10px] text-slate-500">{c.ts?.slice(11, 19)}Z</span>
          </summary>
          <div className="border-t border-white/40 px-2.5 py-2">
            <div className="font-mono text-[11px] text-slate-700 break-all">{JSON.stringify(c.input)}</div>
            <div className="text-[11px] text-slate-500 mt-1">→ {c.output_head?.slice(0, 300)}</div>
          </div>
        </details>
      ))}
    </div>
  );
}

export default function SidePanel({ stage, state, company }: { stage: string | null; state: State; company: string }) {
  if (!stage)
    return (
      <div className="text-slate-600 text-sm p-2">
        Click a stage to inspect what it did — the exact skills it loaded, the tools it invoked, and the artifacts it produced.
      </div>
    );

  if (stage.startsWith("reader")) {
    const idx = Number(stage.slice(-1));
    const r = state.readers[idx];
    const sg = state.skillgen;
    return (
      <div>
        <Section title="Configure · reader agent">
          <ConfigPanel company={company} />
        </Section>
        <Section title={`Reader run ${idx} · ${r?.status ?? "idle"}`}>
          <span className={`text-[11px] px-2 py-0.5 rounded-full ${badge(r?.status ?? "idle")}`}>{r?.status}</span>
          {r?.trace && <div className="font-mono text-[11px] text-slate-500 mt-2">{r.trace}</div>}
        </Section>
        {sg && (sg.status !== "idle" || sg.calls.length > 0) && (
          <Section title={`Skill writer · ${sg.status}`}>
            <span className={`text-[11px] px-2 py-0.5 rounded-full ${badge(sg.status)}`}>{sg.status}</span>
            {sg.trace && <div className="font-mono text-[11px] text-slate-500 mt-2">{sg.trace}</div>}
            {sg.calls.length > 0 && (
              <div className="mt-2">
                <ToolFeed calls={sg.calls} />
              </div>
            )}
          </Section>
        )}
        <Section title="Skills loaded (system prompt)">
          {state.skills.map((s) => (
            <details key={s.name} className="mb-1.5 rounded-md glass-chip p-2">
              <summary className="font-mono text-[12px] text-violet-700 cursor-pointer">{s.name}</summary>
              <div className="md-body mt-1.5 max-h-80 overflow-auto rounded bg-white/40 px-2.5 py-2">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{s.content}</ReactMarkdown>
              </div>
            </details>
          ))}
        </Section>
        <Section title={`Tool invocations (${r?.calls.length ?? 0})`}>
          <ToolFeed calls={r?.calls ?? []} />
        </Section>
      </div>
    );
  }

  if (stage === "firewall" || stage === "consensus") {
    const rep = state.liveReport;
    return (
      <div>
        <Section title="Extraction consensus">
          {!rep ? (
            <p className="text-slate-500 text-sm">Waiting for all reader runs to finish…</p>
          ) : (
            <>
              <p className="text-sm text-slate-700 mb-2">{rep.runs_parsed} runs parsed</p>
              <Section title={`Firewall drops (${rep.firewall_drops?.length ?? 0})`}>
                {(rep.firewall_drops ?? []).map(([k, why], i) => (
                  <div key={i} className="text-[12px] text-rose-700 font-mono">{k}: <span className="text-slate-600">{why}</span></div>
                ))}
                {!rep.firewall_drops?.length && <p className="text-slate-500 text-sm">Nothing dropped — all quotes re-found byte-exact.</p>}
              </Section>
              <Section title={`Unresolved after vote (${rep.unresolved?.length ?? 0})`}>
                {(rep.unresolved ?? []).map((u, i) => (
                  <div key={i} className="text-[12px] font-mono text-amber-700">{u.key} <span className="text-slate-500">{JSON.stringify(u.candidates)}</span></div>
                ))}
                {!rep.unresolved?.length && <p className="text-slate-500 text-sm">Every driver reached 2-of-3 agreement.</p>}
              </Section>
              <Section title="Merge decisions">
                {(rep.merge_decisions ?? []).map((d, i) => (
                  <div key={i} className="rounded-md glass-chip p-2 mb-1.5">
                    <div className="font-mono text-[12px] text-sky-700">{d.key}</div>
                    <div className={`text-[11px] ${d.action.startsWith("DIVERGENCE") ? "text-rose-700" : d.action.startsWith("UPGRADED") ? "text-emerald-700" : "text-slate-600"}`}>
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
            <div key={metric} className="rounded-md glass-chip p-2.5 mb-2">
              <div className="font-mono text-[12px] text-sky-700">{metric}</div>
              <div className="text-[12px] text-slate-700 mt-1">
                median beat <b className="text-emerald-700">+{b.median}</b> · mean +{b.mean} · n={b.n} · beat rate {Math.round(b.hit_rate_above_mid * 100)}%
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
          <div key={m.label} className="rounded-md glass-chip p-2.5 mb-2">
            <div className="flex justify-between items-baseline">
              <span className="text-[13px] text-slate-800">{m.label}</span>
              <span className="font-mono text-[15px] text-amber-700">{m.value}<span className="text-[10px] text-slate-500 ml-1">{m.unit}</span></span>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">{m.variants.length} plan variants · spread {m.spread}</div>
            {m.trace.map((t, i) => (
              <div key={i} className="text-[11px] text-slate-600 mt-1"><span className="text-slate-500 font-mono">{t.formula}</span> — {t.desc}</div>
            ))}
            {m.cross_checks.map((c, i) => (
              <div key={i} className="text-[11px] text-teal-700 mt-0.5">✓ cross-check: {c.desc} → {c.result} (Δ {c.delta_vs_primary})</div>
            ))}
          </div>
        ))}
      </Section>
    );
  }

  if (stage === "validator") {
    const vv = state.validatorVerdict;
    const sevChip = (s: string) =>
      s === "blocker"
        ? "bg-rose-500/15 text-rose-700"
        : s === "warning"
          ? "bg-amber-500/15 text-amber-700"
          : "bg-sky-500/15 text-sky-700";
    return (
      <div>
        <Section title="Adversarial validator (agent)">
          {!vv?.verdicts?.length ? (
            <p className="text-slate-500 text-sm">Not run yet — the adversarial re-reader challenges every number against the corpus.</p>
          ) : (
            vv.verdicts.map((v, i) => (
              <div key={i} className="rounded-md glass-chip p-2.5 mb-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12.5px] text-slate-800">{v.metric}</span>
                  <span className="flex shrink-0 items-center gap-1">
                    <span className={`text-[10.5px] px-1.5 py-0.5 rounded-full ${v.verdict === "confirmed" ? "bg-emerald-500/15 text-emerald-700" : "bg-rose-500/15 text-rose-700"}`}>
                      {v.verdict}
                    </span>
                    <span className={`text-[10.5px] px-1.5 py-0.5 rounded-full ${sevChip(v.severity)}`}>{v.severity}</span>
                  </span>
                </div>
                <div className="text-[11.5px] text-slate-600 mt-1">{v.reason}</div>
                {v.evidence && (
                  <div className="mt-1.5 rounded bg-white/40 px-2 py-1.5">
                    <div className="font-mono text-[10.5px] text-slate-700 break-words">“{v.evidence.verbatim_line}”</div>
                    <div className="font-mono text-[10px] text-slate-500 mt-0.5">{v.evidence.doc_path}</div>
                  </div>
                )}
              </div>
            ))
          )}
          {state.validatorTrace && <div className="font-mono text-[11px] text-slate-500 mt-2">{state.validatorTrace}</div>}
        </Section>
        <Section title={`Deterministic checks · ${state.validationResult ?? "not run"}`}>
          {state.verdicts.map((v, i) => (
            <div key={i} className="rounded-md glass-chip p-2.5 mb-1.5">
              <div className="flex justify-between">
                <span className="text-[12.5px] text-slate-800">{v.metric}</span>
                <span className="font-mono text-[12px] text-slate-600">{String(v.value)}</span>
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

  if (stage === "corpus") {
    return (
      <Section title="Corpus">
        <p className="text-sm text-slate-700">
          1,139 markdown documents (507 filings, 538 transcript sections, 94 slide docs) frozen 2026-08-14, plus the logged
          public-web consensus sweep in <span className="font-mono text-[12px]">research/web/</span>.
        </p>
      </Section>
    );
  }

  if (stage === "writer") {
    return (
      <div>
        <Section title="Workbook">
          {state.workbookExists ? (
            <DownloadChip company={company} />
          ) : (
            <p className="text-sm text-slate-500">Not written yet — run the pipeline first.</p>
          )}
        </Section>
        <Section title="Run log (latest)">
          <pre className="text-[11px] text-slate-600 whitespace-pre-wrap max-h-[60vh] overflow-auto">{state.runLog.join("\n")}</pre>
        </Section>
      </div>
    );
  }
  return null;
}
