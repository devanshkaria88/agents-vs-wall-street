"use client";
import { ReactFlow, Background, BackgroundVariant, Handle, Position, type Node, type Edge, type NodeProps } from "@xyflow/react";
import "@xyflow/react/dist/style.css";

export type StageStatus = "idle" | "running" | "done" | "failed";

const STATUS_DOT: Record<StageStatus, string> = {
  idle: "bg-slate-500",
  running: "bg-amber-400 animate-pulse",
  done: "bg-emerald-400",
  failed: "bg-rose-400",
};

const STATUS_FX: Record<StageStatus, string> = {
  idle: "",
  running: "shadow-[0_0_22px_rgba(245,158,11,0.28)]",
  done: "",
  failed: "shadow-[0_0_22px_rgba(244,63,94,0.28)]",
};

const KIND_ACCENT: Record<string, string> = {
  ai: "bg-violet-400/80",
  code: "bg-teal-400/80",
  data: "bg-slate-500/70",
  out: "bg-yellow-300/80",
};

type StageData = { label: string; sub: string; kind: string; status: StageStatus; selected?: boolean };

function StageNode({ data }: NodeProps<Node<StageData>>) {
  return (
    <div
      className={`relative w-[210px] overflow-hidden rounded-lg border border-white/70 bg-white/60 backdrop-blur-md cursor-pointer transition-all duration-150 shadow-[0_4px_18px_rgba(51,65,85,0.12)] hover:border-slate-300 ${STATUS_FX[data.status]} ${data.selected ? "ring-2 ring-sky-400/70" : ""}`}
    >
      <span className={`absolute left-0 top-[6px] bottom-[6px] w-[2px] rounded-full ${KIND_ACCENT[data.kind] ?? KIND_ACCENT.data}`} />
      <Handle type="target" position={Position.Left} className="!opacity-0" />
      <div className="flex items-center gap-2 border-b border-slate-200/70 bg-white/45 px-3 py-1.5">
        <span className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[data.status]}`} />
        <span className="text-[12.5px] font-medium leading-tight text-slate-800">{data.label}</span>
      </div>
      <div className="px-3 py-1.5 text-[11px] leading-snug text-slate-600">{data.sub}</div>
      <Handle type="source" position={Position.Right} className="!opacity-0" />
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
    const target = statuses[b];
    const running = target === "running";
    const done = target === "done";
    return {
      id: `${a}-${b}`,
      source: a,
      target: b,
      animated: running,
      style: running
        ? { stroke: "#f59e0b", strokeWidth: 2, strokeDasharray: "5 5", filter: "drop-shadow(0 0 6px rgba(245,158,11,0.8))" }
        : done
          ? { stroke: "#34d399", strokeWidth: 1.5, opacity: 0.5 }
          : { stroke: "rgba(71,85,105,0.45)", strokeWidth: 1.3, strokeDasharray: "5 5" },
    };
  });
  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodeClick={(_, node) => onSelect(node.id)}
      fitView
      fitViewOptions={{ padding: { top: "84px", right: "440px", bottom: "32px", left: "32px" } }}
      proOptions={{ hideAttribution: true }}
      minZoom={0.4}
      colorMode="light"
      style={{ background: "transparent" }}
      nodesDraggable={false}
      nodesConnectable={false}
    >
      <Background variant={BackgroundVariant.Dots} color="rgba(100,116,139,0.35)" gap={20} size={1.1} />
    </ReactFlow>
  );
}
