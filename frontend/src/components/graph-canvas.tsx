"use client";

import { useState, useCallback, useEffect, memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { projectsApi } from "@/lib/api/projects";
import { Skeleton } from "@/components/ui/skeleton";
import dynamic from "next/dynamic";
import {
  applyNodeChanges,
  applyEdgeChanges,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

// Lazy-load ReactFlow for performance (it's ~200KB)
const ReactFlow = dynamic(
  () => import("@xyflow/react").then((mod) => mod.ReactFlow),
  { ssr: false }
);
const Background = dynamic(
  () => import("@xyflow/react").then((mod) => mod.Background),
  { ssr: false }
);
const Controls = dynamic(
  () => import("@xyflow/react").then((mod) => mod.Controls),
  { ssr: false }
);
const MiniMap = dynamic(
  () => import("@xyflow/react").then((mod) => mod.MiniMap),
  { ssr: false }
);

function GraphCanvasInner({ projectId }: { projectId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["graph", projectId],
    queryFn: () => projectsApi.getGraph(projectId),
    refetchInterval: 5000,
  });

  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (data && data.nodes && data.nodes.length > 0) {
      const formattedNodes: Node[] = data.nodes.map((n: any, index: number) => ({
        id: n.id,
        position: n.position || {
          x: 200 + (index % 3) * 250,
          y: 80 + Math.floor(index / 3) * 160,
        },
        data: { label: n.data?.label || n.data?.service || n.id },
        style: {
          background: "rgba(15, 23, 42, 0.9)",
          color: "#f8fafc",
          border: "1px solid rgba(51, 65, 85, 0.6)",
          borderRadius: "10px",
          padding: "10px 16px",
          fontSize: "13px",
          fontWeight: 500,
          boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          backdropFilter: "blur(8px)",
        },
      }));

      const formattedEdges: Edge[] = data.edges.map((e: any) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        animated: e.animated !== false,
        style: {
          stroke: "rgba(148, 163, 184, 0.5)",
          strokeWidth: 1.5,
        },
        type: "smoothstep",
      }));

      setNodes(formattedNodes);
      setEdges(formattedEdges);
      setIsReady(true);
    }
  }, [data]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) =>
      setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) =>
      setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  // Loading state
  if (isLoading && !isReady) {
    return (
      <div className="absolute inset-0 p-6">
        <div className="flex flex-col gap-4 items-center justify-center h-full">
          <Skeleton className="w-48 h-10 rounded-lg bg-slate-800/60" />
          <div className="flex gap-8">
            <Skeleton className="w-36 h-10 rounded-lg bg-slate-800/60" />
            <Skeleton className="w-36 h-10 rounded-lg bg-slate-800/60" />
          </div>
          <Skeleton className="w-40 h-10 rounded-lg bg-slate-800/60" />
          {/* Fake connector lines */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <svg className="w-full h-full opacity-10" viewBox="0 0 400 300">
              <line x1="200" y1="40" x2="120" y2="140" stroke="#475569" strokeWidth="1" strokeDasharray="6 4" />
              <line x1="200" y1="40" x2="280" y2="140" stroke="#475569" strokeWidth="1" strokeDasharray="6 4" />
              <line x1="200" y1="140" x2="200" y2="240" stroke="#475569" strokeWidth="1" strokeDasharray="6 4" />
            </svg>
          </div>
        </div>
      </div>
    );
  }

  // Empty state — waiting for architecture generation
  if (!isReady || nodes.length === 0) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="relative">
          {/* Decorative pulsing rings */}
          <div className="absolute inset-0 w-16 h-16 rounded-full bg-blue-500/5 animate-ping" />
          <div className="relative w-16 h-16 rounded-full bg-slate-800/80 border border-slate-700/50 flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-slate-500">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
              <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
              <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
        <p className="text-slate-500 text-sm font-medium mt-4">Awaiting architecture generation</p>
        <p className="text-slate-600 text-xs mt-1">Complete the conversation to generate your graph</p>
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        colorMode="dark"
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#1e293b" gap={20} size={1} />
        <Controls
          showInteractive={false}
          className="!bg-slate-900/80 !border-slate-700/50 !rounded-lg !shadow-lg [&>button]:!bg-slate-800 [&>button]:!border-slate-700/50 [&>button]:!text-slate-300 [&>button:hover]:!bg-slate-700"
        />
        <MiniMap
          className="!bg-slate-900/80 !border-slate-700/50 !rounded-lg"
          nodeColor="rgba(59, 130, 246, 0.3)"
          maskColor="rgba(0, 0, 0, 0.6)"
        />
      </ReactFlow>
    </div>
  );
}

export const GraphCanvas = memo(GraphCanvasInner);
