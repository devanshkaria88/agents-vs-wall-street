"use client";
import { ReactFlow, Background, Handle, Position, type Node, type Edge, type NodeProps } from "@xyflow/react";
import "@xyflow/react/dist/style.css";

export type StageStatus = "idle" | "running" | "done" | "failed";

const STATUS_STYLE: Record<StageStatus, { border: string; dot: string; glow: string }> = {
  idle: { border: "border-slate-700", dot: "bg-slate-600", glow: "" },
  running: { border: "border-amber-400", dot: "bg-amber-400 animate-pulse", glow: "shadow-[0_0_24px_rgba(251,191,36,0.35)]" },
  done: { border: "border-emerald-500", dot: "bg-emerald-400", glow: "" },
  failed: { border: "border-rose-500", dot: "bg-rose-400", glow: "shadow-[0_0_24px_rgba(244,63,94,0.35)]" },
};

const KIND_TINT: Record<string, string> = {
  ai: "bg-violet-950/80 text-violet-100",
  code: "bg-teal-950/80 text-teal-100",
  data: "bg-slate-900/80 text-slate-200",
  out: "bg-yellow-950/70 text-yellow-100",
};

type StageData = { label: string; sub: string; kind: string; status: StageStatus; selected?: boolean };

function StageNode({ data }: NodeProps<Node<StageData>>) {
  const s = STATUS_STYLE[data.status];
  return (
    <div
      className={`rounded-xl border-2 ${s.border} ${KIND_TINT[data.kind]} ${s.glow} px-4 py-2.5 w-[210px] cursor-pointer transition-all ${data.selected ? "ring-2 ring-sky-400" : ""}`}
    >
      <Handle type="target" position={Position.Left} className="!bg-slate-500" />
      <div className="flex items-center gap-2">
        <span className={`inline-block h-2.5 w-2.5 rounded-full ${s.dot}`} />
        <span className="font-semibold text-[13px] leading-tight">{data.label}</span>
      </div>
      <div className="text-[11px] opacity-70 mt-0.5 leading-snug">{data.sub}</div>
      <Handle type="source" position={Position.Right} className="!bg-slate-500" />
    </div>
  );
}

const nodeTypes = { stage: StageNode };

const LAYOUT: { id: string; label: string; sub: string; kind: string; x: number; y: number }[] = [
  { id: "corpus", label: "Corpus", sub: "1,139 frozen documents", kind: "data", x: 0, y: 170 },
  { id: "reader0", label: "Reader agent · run 0", sub: "claude-opus-5 + tools", kind: "ai", x: 260, y: 40 },
  { id: "reader1", label: "Reader agent · run 1", sub: "claude-opus-5 + tools", kind: "ai", x: 260, y: 170 },
  { id: "reader2", label: "Reader agent · run 2", sub: "claude-opus-5 + tools", kind: "ai", x: 260, y: 300 },
  { id: "firewall", label: "Citation firewall", sub: "quotes re-found byte-exact", kind: "code", x: 520, y: 105 },
  { id: "vote", label: "Majority vote", sub: "2-of-3 per driver", kind: "code", x: 520, y: 235 },
  { id: "merge", label: "Merge vs pinned", sub: "live upgrades assumptions", kind: "code", x: 780, y: 170 },
  { id: "calibration", label: "Calibration", sub: "bias fitted from history", kind: "code", x: 1040, y: 40 },
  { id: "calculators", label: "Calculators ×12", sub: "primary + cross-check", kind: "code", x: 1040, y: 170 },
  { id: "validator", label: "Validator", sub: "units · ranges · cross-foots", kind: "code", x: 1040, y: 300 },
  { id: "writer", label: "Workbook writer", sub: "fills the 12 yellow cells", kind: "out", x: 1300, y: 170 },
  { id: "checker", label: "Official checker", sub: "npm run check:submission", kind: "data", x: 1300, y: 300 },
];

const FLOWS: [string, string][] = [
  ["corpus", "reader0"], ["corpus", "reader1"], ["corpus", "reader2"],
  ["reader0", "firewall"], ["reader1", "firewall"], ["reader2", "firewall"],
  ["firewall", "vote"], ["vote", "merge"], ["merge", "calibration"],
  ["calibration", "calculators"], ["merge", "calculators"],
  ["calculators", "validator"], ["validator", "writer"], ["writer", "checker"],
];

export default function Pipeline({
  statuses,
  selected,
  onSelect,
}: {
  statuses: Record<string, StageStatus>;
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  const nodes: Node<StageData>[] = LAYOUT.map((n) => ({
    id: n.id,
    type: "stage",
    position: { x: n.x, y: n.y },
    data: { label: n.label, sub: n.sub, kind: n.kind, status: statuses[n.id] ?? "idle", selected: selected === n.id },
  }));
  const edges: Edge[] = FLOWS.map(([a, b]) => {
    const active = statuses[b] === "running";
    return {
      id: `${a}-${b}`,
      source: a,
      target: b,
      animated: active,
      style: { stroke: active ? "#fbbf24" : statuses[b] === "done" ? "#34d399" : "#475569", strokeWidth: active ? 2.2 : 1.4 },
    };
  });
  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodeClick={(_, node) => onSelect(node.id)}
      fitView
      fitViewOptions={{ padding: 0.12 }}
      proOptions={{ hideAttribution: true }}
      minZoom={0.4}
      colorMode="dark"
      nodesDraggable={false}
      nodesConnectable={false}
    >
      <Background color="#1e293b" gap={22} />
    </ReactFlow>
  );
}
