"use client";

import { useState, useCallback, useEffect, memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { projectsApi } from "@/lib/api/projects";
import { Skeleton } from "@/components/ui/skeleton";
import { ServiceNodeDrawer, NodeDrawerData } from "@/components/service-node-drawer";
import type { GraphNode, GraphEdge } from "@/types/graph";
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

// Lazy-load ReactFlow for performance
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
  const { data, isLoading, isError } = useQuery({
    queryKey: ["graph", projectId],
    queryFn: () => projectsApi.getGraph(projectId),
    refetchInterval: 5000,
  });

  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [selectedNodeData, setSelectedNodeData] = useState<NodeDrawerData | null>(null);

  useEffect(() => {
    if (data && data.nodes && data.nodes.length > 0) {
      const formattedNodes: Node[] = data.nodes.map((n: GraphNode, index: number) => ({
        id: n.id,
        position: n.position || {
          x: 200 + (index % 3) * 250,
          y: 80 + Math.floor(index / 3) * 160,
        },
        data: { label: n.data?.label || n.data?.service || n.id },
        style: {
          background: "rgba(15, 23, 42, 0.9)",
          color: "#f8fafc",
          border: "1px solid rgba(59, 130, 246, 0.4)",
          borderRadius: "12px",
          padding: "12px 18px",
          fontSize: "13px",
          fontWeight: 600,
          boxShadow: "0 6px 16px rgba(0,0,0,0.4)",
          backdropFilter: "blur(8px)",
          cursor: "pointer",
        },
      }));

      const formattedEdges: Edge[] = data.edges.map((e: GraphEdge) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        animated: e.animated !== false,
        style: {
          stroke: "#3b82f6",
          strokeWidth: 2,
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

  const handleNodeClick = (_: any, node: Node) => {
    const name = String(node.data?.label || node.id).toUpperCase();

    let drawerData: NodeDrawerData;
    if (name.includes("REDIS") || name.includes("CACHE")) {
      drawerData = {
        serviceId: node.id,
        name: "ElastiCache Redis",
        category: "In-Memory Caching",
        purpose: "High-speed key-value memory cache for product page catalog & user sessions.",
        requirementEvidence: "prefer PostgreSQL for relational data and Redis for fast product page caching",
        chosenBecause: [
          "Peak traffic surge of 10,000 req/sec requires sub-millisecond page load times.",
          "Offloads high-frequency catalog read queries from PostgreSQL RDS database.",
          "Provides native data structure caching for shopping cart sessions.",
        ],
        alternatives: [
          { name: "Memcached", whyNot: "Lacks native cluster replication and multi-AZ failover persistence." },
          { name: "DynamoDB DAX", whyNot: "Designed for DynamoDB NoSQL model, not relational SQL workloads." },
        ],
        tradeoffs: [
          "Adds ~$35/month operational infrastructure spend.",
          "Requires cache invalidation logic upon inventory updates.",
        ],
      };
    } else if (name.includes("RDS") || name.includes("POSTGRES")) {
      drawerData = {
        serviceId: node.id,
        name: "RDS PostgreSQL (Multi-AZ)",
        category: "Relational Database Tier",
        purpose: "ACID-compliant relational database for orders, transactions, and user accounts.",
        requirementEvidence: "We prefer PostgreSQL for relational data",
        chosenBecause: [
          "PostgreSQL engine requested for relational SQL transactional data.",
          "Multi-AZ deployment provides automatic 60-second DNS failover during zone outages.",
          "Automated daily snapshot backups and point-in-time recovery.",
        ],
        alternatives: [
          { name: "Aurora PostgreSQL Serverless v2", whyNot: "Higher baseline cost ($580/mo) suitable for Enterprise Option C." },
          { name: "Single-AZ RDS", whyNot: "Lacks redundant standby instance, risking downtime during maintenance." },
        ],
        tradeoffs: [
          "Multi-AZ doubles instance cost compared to Single-AZ deployment.",
        ],
      };
    } else if (name.includes("ECS") || name.includes("FARGATE")) {
      drawerData = {
        serviceId: node.id,
        name: "ECS Fargate (Serverless Containers)",
        category: "Stateless Compute Tier",
        purpose: "Containerized microservice execution platform running stateless application tasks.",
        requirementEvidence: "100,000 registered users with peak traffic surges of 10,000 requests/sec",
        chosenBecause: [
          "Serverless container engine scales horizontally without EC2 server patching.",
          "Spans across 2 private subnets for zero-downtime availability.",
          "Integrated with Application Load Balancer for health check routing.",
        ],
        alternatives: [
          { name: "EKS Kubernetes", whyNot: "Introduces heavy Kubernetes control plane overhead and complex operations." },
          { name: "EC2 Auto-Scaling Group", whyNot: "Requires OS maintenance, AMI patching, and manual instance tuning." },
        ],
        tradeoffs: [
          "Slightly higher per-vCPU cost than reserved EC2 instances.",
        ],
      };
    } else {
      drawerData = {
        serviceId: node.id,
        name: name,
        category: "AWS Cloud Component",
        purpose: `Production infrastructure component supporting the ${name} tier.`,
        requirementEvidence: "Extracted from system requirement specifications",
        chosenBecause: [
          `Selected by DOPA pattern engine for ${name} workload performance.`,
          "Validated against AWS Security Hub & CIS Benchmarks.",
        ],
        alternatives: [
          { name: "Legacy Server Setup", whyNot: "Lacks automated scaling and cloud resilience." },
        ],
        tradeoffs: ["Standard AWS cloud resource billing."],
      };
    }

    setSelectedNodeData(drawerData);
  };

  if (isError) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-red-400 text-sm font-medium">Failed to load architecture graph</p>
      </div>
    );
  }

  if (isLoading && !isReady) {
    return (
      <div className="absolute inset-0 p-6 flex flex-col items-center justify-center">
        <Skeleton className="w-48 h-10 rounded-lg bg-slate-800/60" />
      </div>
    );
  }

  if (!isReady || nodes.length === 0) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-slate-500 text-sm font-medium">Awaiting architecture selection</p>
        <p className="text-slate-600 text-xs mt-1">Select an architecture option card to explore graph topology</p>
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        fitView
        colorMode="dark"
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#1e293b" gap={20} size={1} />
        <Controls showInteractive={false} />
        <MiniMap className="!bg-slate-900/80 !border-slate-700/50 !rounded-lg" nodeColor="rgba(59, 130, 246, 0.3)" />
      </ReactFlow>

      {/* Educational Service Node Drawer */}
      <ServiceNodeDrawer
        isOpen={!!selectedNodeData}
        onClose={() => setSelectedNodeData(null)}
        data={selectedNodeData}
      />
    </div>
  );
}

export const GraphCanvas = memo(GraphCanvasInner);
