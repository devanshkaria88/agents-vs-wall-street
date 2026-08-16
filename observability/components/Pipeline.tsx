"use client";
import { useEffect, useRef } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  Background,
  BackgroundVariant,
  Handle,
  Position,
  type Node,
  type BuiltInEdge,
  type NodeProps,
} from "@xyflow/react";
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
      className={`glass-node relative w-[210px] cursor-pointer overflow-hidden rounded-lg transition-all duration-150 ${STATUS_FX[data.status]} ${data.selected ? "ring-2 ring-sky-400/70" : ""}`}
    >
      <span className={`absolute left-0 top-[6px] bottom-[6px] w-[2px] rounded-full ${KIND_ACCENT[data.kind] ?? KIND_ACCENT.data}`} />
      <Handle type="target" position={Position.Left} className="!opacity-0" />
      <div className="flex items-center gap-2 border-b border-slate-200/50 bg-white/20 px-3 py-1.5">
        <span className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[data.status]}`} />
        <span className="text-[12.5px] font-medium leading-tight text-slate-800">{data.label}</span>
      </div>
      <div className="px-3 py-1.5 text-[11px] leading-snug text-slate-600">{data.sub}</div>
      <Handle type="source" position={Position.Right} className="!opacity-0" />
    </div>
  );
}

const nodeTypes = { stage: StageNode };

const NODE_W = 210;
const NODE_H = 64;

// Calm left-to-right spine (midline y=190). calibration rides above the spine
// between consensus and calculators, so no edge ever crosses another.
const LAYOUT: { id: string; label: string; sub: string; kind: string; x: number; y: number }[] = [
  { id: "corpus", label: "Corpus", sub: "1,139 frozen documents", kind: "data", x: 0, y: 190 },
  { id: "reader0", label: "Reader agent · run 0", sub: "claude-opus-5 + tools", kind: "ai", x: 250, y: 40 },
  { id: "reader1", label: "Reader agent · run 1", sub: "claude-opus-5 + tools", kind: "ai", x: 250, y: 190 },
  { id: "reader2", label: "Reader agent · run 2", sub: "claude-opus-5 + tools", kind: "ai", x: 250, y: 340 },
  { id: "firewall", label: "Citation firewall", sub: "quotes re-found byte-exact", kind: "code", x: 500, y: 190 },
  { id: "consensus", label: "Vote & merge", sub: "2-of-3 consensus · live upgrades pinned", kind: "code", x: 750, y: 190 },
  { id: "calibration", label: "Calibration", sub: "bias fitted from history", kind: "code", x: 1000, y: 40 },
  { id: "calculators", label: "Calculators ×12", sub: "primary + cross-check", kind: "code", x: 1250, y: 190 },
  { id: "validator", label: "Validator agent", sub: "adversarial re-read of the calcs", kind: "ai", x: 1500, y: 190 },
  { id: "writer", label: "Workbook writer", sub: "fills the yellow cells · download", kind: "out", x: 1750, y: 190 },
];

const FLOWS: [string, string][] = [
  ["corpus", "reader0"], ["corpus", "reader1"], ["corpus", "reader2"],
  ["reader0", "firewall"], ["reader1", "firewall"], ["reader2", "firewall"],
  ["firewall", "consensus"],
  ["consensus", "calibration"], ["consensus", "calculators"],
  ["calibration", "calculators"],
  ["calculators", "validator"], ["validator", "writer"],
];

// The floating panels are translucent glass, so the graph may breathe UNDER
// their edges at overview zoom — modest padding keeps the middle legible
// instead of squeezing 1960px of spine into the gap between the panels.
const FIT_PADDING = { top: "84px", right: "200px", bottom: "40px", left: "150px" } as const;

// Follow-cam: while a run is live, glide the viewport to the bounding box of
// every running stage, and glide back to the full graph when the run ends.
function FollowCam({ statuses, follow }: { statuses: Record<string, StageStatus>; follow: boolean }) {
  const { fitBounds, fitView } = useReactFlow();
  const lastSig = useRef("init");
  useEffect(() => {
    const running = LAYOUT.filter((n) => statuses[n.id] === "running");
    const sig = follow ? running.map((n) => n.id).join(",") : "off";
    if (sig === lastSig.current) return;
    const wasOff = lastSig.current === "off" || lastSig.current === "init";
    lastSig.current = sig;
    if (!follow) return;
    // Animated viewport transitions ride on requestAnimationFrame, which is
    // frozen while the tab is hidden — the glide would silently never run.
    // Hidden tab (screenshots, background polling): jump instantly instead.
    const duration = document.visibilityState === "visible" ? 900 : 0;
    if (!running.length) {
      if (!wasOff) fitView({ padding: FIT_PADDING, duration });
      return;
    }
    const minX = Math.min(...running.map((n) => n.x));
    const maxX = Math.max(...running.map((n) => n.x)) + NODE_W;
    const minY = Math.min(...running.map((n) => n.y));
    const maxY = Math.max(...running.map((n) => n.y)) + NODE_H;
    // Enforce a minimum window so a single running stage doesn't zoom in absurdly.
    const w = Math.max(maxX - minX + 200, 860);
    const h = Math.max(maxY - minY + 160, 520);
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    fitBounds({ x: cx - w / 2 + 48, y: cy - h / 2, width: w, height: h }, { duration });
  }, [statuses, follow, fitBounds, fitView]);
  return null;
}

function Flow({
  statuses,
  selected,
  follow,
  onSelect,
}: {
  statuses: Record<string, StageStatus>;
  selected: string | null;
  follow: boolean;
  onSelect: (id: string) => void;
}) {
  const nodes: Node<StageData>[] = LAYOUT.map((n) => ({
    id: n.id,
    type: "stage",
    position: { x: n.x, y: n.y },
    data: { label: n.label, sub: n.sub, kind: n.kind, status: statuses[n.id] ?? "idle", selected: selected === n.id },
  }));
  const edges: BuiltInEdge[] = FLOWS.map(([a, b]) => {
    const target = statuses[b];
    const running = target === "running";
    const done = target === "done";
    return {
      id: `${a}-${b}`,
      source: a,
      target: b,
      type: "smoothstep" as const,
      pathOptions: { borderRadius: 18 },
      animated: running,
      style: running
        ? { stroke: "#f59e0b", strokeWidth: 2, strokeDasharray: "5 5", filter: "drop-shadow(0 0 6px rgba(245,158,11,0.8))" }
        : done
          ? { stroke: "#34d399", strokeWidth: 1.5, opacity: 0.5 }
          : { stroke: "rgba(71,85,105,0.45)", strokeWidth: 1.1, strokeDasharray: "5 5", opacity: 0.5 },
    };
  });
  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodeClick={(_, node) => onSelect(node.id)}
      fitView
      fitViewOptions={{ padding: FIT_PADDING }}
      proOptions={{ hideAttribution: true }}
      // 0.22: the widened layout (~2240px of nodes) + 804px of floating-panel
      // fit padding must still fit a ~1500px laptop window at min zoom.
      minZoom={0.22}
      colorMode="light"
      style={{ background: "transparent" }}
      nodesDraggable={false}
      nodesConnectable={false}
    >
      <FollowCam statuses={statuses} follow={follow} />
      <Background variant={BackgroundVariant.Dots} color="rgba(100,116,139,0.22)" gap={24} size={1.1} />
    </ReactFlow>
  );
}

export default function Pipeline(props: {
  statuses: Record<string, StageStatus>;
  selected: string | null;
  follow: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <ReactFlowProvider>
      <Flow {...props} />
    </ReactFlowProvider>
  );
}
