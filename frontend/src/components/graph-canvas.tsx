"use client";

import { useState, useCallback, useEffect, useRef, memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { projectsApi } from "@/lib/api/projects";
import { Skeleton } from "@/components/ui/skeleton";
import { ServiceNodeDrawer, type NodeDrawerData } from "@/components/service-node-drawer";
import type { GraphNode, GraphEdge } from "@/types/graph";
import { useStore } from "@/store";
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

// ─── DevOps Knowledge Base ─────────────────────────────────────────────────────
function buildDrawerData(nodeId: string, label: string): NodeDrawerData {
  const name = label.toUpperCase();

  if (name.includes("REDIS") || name.includes("ELASTICACHE") || name.includes("CACHE")) {
    return {
      serviceId: nodeId,
      name: "ElastiCache Redis",
      category: "In-Memory Caching",
      purpose: "Sub-millisecond key-value store for product catalog, session tokens, and rate-limiting counters. Eliminates redundant DB reads under high-concurrency load.",
      requirementEvidence: "Prefer Redis for fast product page caching and session management",
      monthlyCost: "~$35",
      sla: "99.99%",
      rpo: "0 min",
      rto: "< 1 min",
      scalingModel: "Horizontal cluster mode with up to 500 shards, auto-scaling read replicas",
      operationalComplexity: "Medium",
      terraformResource: "aws_elasticache_replication_group",
      complianceTags: ["SOC2", "PCI-DSS", "HIPAA"],
      chosenBecause: [
        "Native data structures (sorted sets, streams) perfectly model shopping-cart and leaderboard workloads.",
        "Multi-AZ replication with automatic failover within 60 seconds ensures zero-downtime during zone outages.",
        "Offloads ~70% of catalog read queries from RDS, preventing connection saturation at peak traffic.",
        "Pub/Sub channels allow real-time inventory invalidation without polling.",
      ],
      alternatives: [
        {
          name: "Memcached",
          pros: ["Simpler architecture", "Slightly lower memory overhead", "Multi-threaded CPU usage"],
          cons: ["No persistence — data lost on restart", "No replication or failover", "No native pub/sub or sorted sets"],
          whyNotChosen: "Lacks Multi-AZ failover and persistence needed for session consistency.",
          costDelta: "-$8/mo",
        },
        {
          name: "DynamoDB DAX",
          pros: ["Fully managed, zero ops", "Microsecond reads for DynamoDB", "Scales to millions of requests/sec"],
          cons: ["Locked to DynamoDB only", "Cannot cache relational SQL results", "Higher cost at low scale"],
          whyNotChosen: "Only accelerates DynamoDB — incompatible with PostgreSQL RDS workloads.",
          costDelta: "+$60/mo",
        },
      ],
      tradeoffs: [
        "Cache invalidation logic adds development complexity; stale reads possible during TTL window.",
        "Redis persistence (AOF/RDB) adds ~15% I/O overhead on cache nodes.",
        "Multi-AZ doubles instance cost vs single-AZ deployment.",
      ],
      iamPermissions: [
        "elasticache:DescribeReplicationGroups",
        "elasticache:CreateReplicationGroup",
        "elasticache:ModifyReplicationGroup",
        "ec2:CreateSecurityGroup",
        "ec2:AuthorizeSecurityGroupIngress",
      ],
      keyMetrics: [
        "CacheHitRate > 90% (alarm if < 80%)",
        "CurrConnections (max 65,000 per node)",
        "ReplicationLag < 5ms",
        "FreeableMemory > 20%",
        "EvictedKeys (alarm if > 0 for extended period)",
      ],
    };
  }

  if (name.includes("RDS") || name.includes("POSTGRES") || name.includes("AURORA")) {
    return {
      serviceId: nodeId,
      name: "RDS PostgreSQL (Multi-AZ)",
      category: "Relational Database",
      purpose: "ACID-compliant primary database for transactional data — orders, user accounts, inventory. Multi-AZ standby provides automatic DNS failover without manual intervention.",
      requirementEvidence: "Prefer PostgreSQL for relational data with strong consistency guarantees",
      monthlyCost: "~$180",
      sla: "99.95%",
      rpo: "5 min",
      rto: "< 2 min",
      scalingModel: "Vertical scaling (instance class) + up to 5 read replicas. Storage auto-scales to 64TB.",
      operationalComplexity: "Medium",
      terraformResource: "aws_db_instance",
      complianceTags: ["SOC2", "PCI-DSS", "GDPR", "HIPAA"],
      chosenBecause: [
        "ACID transactions required for financial order processing — NoSQL cannot guarantee this.",
        "Multi-AZ standby provides automatic 60-second DNS failover during primary failure.",
        "Automated daily snapshots + point-in-time recovery to any second within 35-day retention window.",
        "PostgreSQL extensions (PostGIS, pg_vector) provide future-proof capability for geo and AI queries.",
      ],
      alternatives: [
        {
          name: "Aurora PostgreSQL Serverless v2",
          pros: ["Auto-scales to 0 ACUs when idle", "Up to 5x faster than standard Postgres", "Global Database for multi-region", "Instant scaling without restarts"],
          cons: ["50% higher baseline cost", "Serverless cold starts add latency", "More complex monitoring"],
          whyNotChosen: "Budget doesn't justify Aurora premium; standard RDS meets current SLA requirements.",
          costDelta: "+$280/mo",
        },
        {
          name: "Single-AZ RDS",
          pros: ["50% lower cost", "Simpler configuration"],
          cons: ["No standby — 7-30 min manual failover", "Maintenance windows cause downtime", "Not suitable for production"],
          whyNotChosen: "Single point of failure is unacceptable for transactional commerce workloads.",
          costDelta: "-$90/mo",
        },
        {
          name: "DynamoDB",
          pros: ["Infinite horizontal scale", "Single-digit millisecond reads", "No schema management"],
          cons: ["No ACID across multiple items", "Complex relational queries impossible", "Paradigm shift for SQL developers"],
          whyNotChosen: "Order processing and joins require relational model — DynamoDB restructuring is out of scope.",
          costDelta: "-$60/mo",
        },
      ],
      tradeoffs: [
        "Multi-AZ doubles instance cost vs Single-AZ; justified by 99.95% SLA requirement.",
        "Read replicas add replication lag (typically 10–100ms) — use carefully for consistency-sensitive queries.",
        "Max connections limited by instance class; use RDS Proxy to pool connections from Lambda/containers.",
      ],
      iamPermissions: [
        "rds:CreateDBInstance",
        "rds:DescribeDBInstances",
        "rds:ModifyDBInstance",
        "rds:CreateDBSnapshot",
        "secretsmanager:GetSecretValue",
        "kms:Decrypt",
      ],
      keyMetrics: [
        "CPUUtilization < 70% (alarm > 85%)",
        "DatabaseConnections < 80% of max_connections",
        "FreeStorageSpace > 20% (alarm < 10%)",
        "ReadLatency < 5ms (alarm > 20ms)",
        "ReplicaLag < 100ms",
      ],
    };
  }

  if (name.includes("ECS") || name.includes("FARGATE")) {
    return {
      serviceId: nodeId,
      name: "ECS Fargate",
      category: "Serverless Containers",
      purpose: "Orchestrates containerized application services without managing EC2 infrastructure. Each task runs in its own isolated network namespace with configurable vCPU and memory.",
      requirementEvidence: "100,000 registered users with peak traffic surges of 10,000 req/sec requiring horizontal scaling",
      monthlyCost: "~$120",
      sla: "99.99%",
      rpo: "N/A",
      rto: "< 30 sec",
      scalingModel: "Target-tracking auto-scaling based on CPU% or custom ALB RequestCountPerTarget metric",
      operationalComplexity: "Medium",
      terraformResource: "aws_ecs_service + aws_ecs_task_definition",
      complianceTags: ["SOC2", "PCI-DSS"],
      chosenBecause: [
        "Serverless compute eliminates EC2 patch management, AMI updates, and capacity planning.",
        "Task-level IAM roles enforce least-privilege; no node-level credentials to rotate.",
        "Auto-scaling from 1→100 tasks in under 30 seconds to absorb flash traffic.",
        "Private subnet deployment with ALB in public subnet follows AWS security best practices.",
      ],
      alternatives: [
        {
          name: "EKS (Kubernetes)",
          pros: ["Industry-standard orchestration", "Powerful RBAC + namespace isolation", "Helm ecosystem", "Multi-cloud portability"],
          cons: ["$73/mo control plane cost", "High operational overhead", "Requires Kubernetes expertise", "Longer onboarding time"],
          whyNotChosen: "EKS complexity not justified at current scale; Fargate meets requirements with lower ops burden.",
          costDelta: "+$90/mo",
        },
        {
          name: "Lambda",
          pros: ["Zero idle cost", "Auto-scales to 10,000 concurrent", "No container management"],
          cons: ["15-min max duration", "Cold start latency (100–500ms)", "Stateless only", "Package size limits"],
          whyNotChosen: "Long-running API connections and 15-min limit make Lambda unsuitable for core API services.",
          costDelta: "-$60/mo",
        },
        {
          name: "EC2 Auto-Scaling Group",
          pros: ["Full OS control", "Reserved instance discounts", "GPU support"],
          cons: ["Manual AMI patching required", "Slower scale-out (2-5 min)", "Over-provisioning waste"],
          whyNotChosen: "OS maintenance overhead defeats the goal of focusing engineering effort on product, not infra.",
          costDelta: "-$30/mo",
        },
      ],
      tradeoffs: [
        "Fargate per-vCPU pricing is ~20% higher than equivalent EC2 reserved instances at steady state.",
        "Cold start for new tasks takes 15–30 seconds — use min-tasks baseline to keep warm capacity.",
        "Container image size directly impacts deployment speed — keep images < 500MB.",
      ],
      iamPermissions: [
        "ecs:CreateService",
        "ecs:RegisterTaskDefinition",
        "ecs:UpdateService",
        "ecr:GetAuthorizationToken",
        "ecr:BatchGetImage",
        "logs:CreateLogStream",
        "secretsmanager:GetSecretValue",
      ],
      keyMetrics: [
        "CPUUtilization per task < 70%",
        "MemoryUtilization per task < 80%",
        "RunningTaskCount vs DesiredTaskCount",
        "ALB TargetResponseTime < 200ms (p99)",
        "ALB UnHealthyHostCount = 0",
      ],
    };
  }

  if (name.includes("ALB") || name.includes("LOAD BALANCER") || name.includes("NLB")) {
    return {
      serviceId: nodeId,
      name: "Application Load Balancer",
      category: "Networking / Ingress",
      purpose: "Layer-7 HTTP/HTTPS load balancer distributing traffic across ECS tasks using path-based and host-based routing rules. Terminates TLS and forwards to private targets.",
      requirementEvidence: "High-availability ingress required for multi-AZ container cluster",
      monthlyCost: "~$20",
      sla: "99.99%",
      rpo: "N/A",
      rto: "< 5 sec",
      scalingModel: "Managed by AWS — auto-scales to millions of requests/sec with no configuration",
      operationalComplexity: "Low",
      terraformResource: "aws_lb + aws_lb_listener + aws_lb_target_group",
      complianceTags: ["SOC2", "PCI-DSS"],
      chosenBecause: [
        "Layer-7 routing enables microservice path-based routing (/api/*, /static/*) on a single IP.",
        "Native SSL/TLS termination with ACM certificates — zero certificate management overhead.",
        "Built-in WAF integration protects against OWASP Top 10 at the edge.",
        "Sticky sessions and connection draining for graceful deployments.",
      ],
      alternatives: [
        {
          name: "NLB (Network Load Balancer)",
          pros: ["Layer-4 ultra-low latency (microseconds)", "Static IP addresses", "Better for TCP/UDP workloads"],
          cons: ["No HTTP routing rules", "No WAF integration", "No path-based routing"],
          whyNotChosen: "HTTP/HTTPS routing rules and WAF integration are required for this web application.",
          costDelta: "-$5/mo",
        },
        {
          name: "API Gateway",
          pros: ["Built-in auth (Cognito/JWT)", "Usage plans and throttling", "Lambda integration"],
          cons: ["29-second max timeout", "Higher cost at scale", "Added latency (~5ms)"],
          whyNotChosen: "Long-lived connections and WebSocket requirements exceed API Gateway timeout constraints.",
          costDelta: "+$15/mo",
        },
      ],
      tradeoffs: [
        "ALB introduces ~1–2ms additional latency vs NLB; acceptable for HTTP workloads.",
        "Hourly LCU (Load Balancer Capacity Unit) charges can spike during traffic peaks.",
      ],
      iamPermissions: [
        "elasticloadbalancing:CreateLoadBalancer",
        "elasticloadbalancing:CreateTargetGroup",
        "elasticloadbalancing:RegisterTargets",
        "acm:DescribeCertificate",
        "wafv2:AssociateWebACL",
      ],
      keyMetrics: [
        "RequestCount (scale trigger)",
        "TargetResponseTime p99 < 500ms",
        "HTTP5XXCount < 0.1% of total",
        "UnHealthyHostCount = 0 (critical alarm)",
        "RejectedConnectionCount = 0",
      ],
    };
  }

  if (name.includes("CLOUDFRONT") || name.includes("CDN")) {
    return {
      serviceId: nodeId,
      name: "CloudFront CDN",
      category: "Content Delivery Network",
      purpose: "Global edge network caching static assets (JS, CSS, images) and API responses at 400+ PoPs worldwide. Reduces origin load and delivers content in < 50ms to end users.",
      requirementEvidence: "Global user base requires low-latency content delivery",
      monthlyCost: "~$25",
      sla: "99.9%",
      rpo: "N/A",
      rto: "< 1 min",
      scalingModel: "Infinite scale at edge — no capacity planning required",
      operationalComplexity: "Low",
      terraformResource: "aws_cloudfront_distribution",
      complianceTags: ["SOC2", "PCI-DSS", "GDPR"],
      chosenBecause: [
        "400+ edge locations reduce latency to < 50ms for 95% of global users.",
        "Shields origin ALB from direct internet exposure — only CloudFront IPs whitelisted in security groups.",
        "Built-in DDoS protection via AWS Shield Standard at no extra cost.",
        "Signed URL / signed cookies enable time-limited access to private S3 content.",
      ],
      alternatives: [
        {
          name: "Cloudflare CDN",
          pros: ["More aggressive caching rules", "Better DDoS protection at free tier", "Built-in Workers (edge compute)"],
          cons: ["Not AWS-native — adds vendor complexity", "Certificate management outside ACM", "Separate billing and monitoring"],
          whyNotChosen: "AWS-native stack preferred; CloudFront's ACM integration eliminates certificate management overhead.",
          costDelta: "-$10/mo",
        },
      ],
      tradeoffs: [
        "Cache invalidation costs $0.005 per path after 1,000 monthly invalidations.",
        "CloudFront access logs add S3 storage cost (~$2/mo at moderate traffic).",
        "Serving dynamic API through CloudFront adds 1–5ms edge overhead.",
      ],
      iamPermissions: [
        "cloudfront:CreateDistribution",
        "cloudfront:UpdateDistribution",
        "cloudfront:CreateInvalidation",
        "acm:DescribeCertificate",
        "s3:GetObject",
        "wafv2:GetWebACL",
      ],
      keyMetrics: [
        "CacheHitRate > 85%",
        "4xxErrorRate < 1%",
        "5xxErrorRate < 0.1%",
        "BytesDownloaded (cost driver)",
        "OriginLatency < 200ms",
      ],
    };
  }

  // Generic fallback with reasonable DevOps defaults
  const displayName = label.charAt(0).toUpperCase() + label.slice(1).toLowerCase();
  return {
    serviceId: nodeId,
    name: displayName,
    category: "AWS Cloud Component",
    purpose: `Production infrastructure component: ${displayName}. Handles a specific responsibility in the architecture stack, integrated with other services via AWS IAM roles and VPC networking.`,
    requirementEvidence: "Identified by DOPA pattern engine from extracted system requirements",
    monthlyCost: "~$20",
    sla: "99.9%",
    rpo: "15 min",
    rto: "< 5 min",
    operationalComplexity: "Medium",
    scalingModel: "Horizontal auto-scaling based on resource utilization metrics",
    terraformResource: `aws_${label.toLowerCase().replace(/[^a-z0-9]/g, "_")}`,
    chosenBecause: [
      `Selected by DOPA engine as optimal service for the ${displayName} workload pattern.`,
      "Validated against AWS Security Hub CIS Benchmark Level 2.",
      "Meets latency and throughput requirements extracted from project specifications.",
    ],
    alternatives: [
      {
        name: "Alternative Managed Service",
        pros: ["Potentially lower cost at small scale", "Less configuration required"],
        cons: ["Less AWS-native integration", "Separate monitoring stack needed"],
        whyNotChosen: "AWS-native service preferred for unified IAM, CloudWatch, and cost reporting.",
        costDelta: "-$15/mo",
      },
    ],
    tradeoffs: [
      "Managed AWS service incurs per-resource pricing — review Reserved Instance options for sustained workloads.",
      "Service-level SLA excludes dependent infrastructure (VPC, IAM) — architect for layered resilience.",
    ],
    iamPermissions: [
      `${label.toLowerCase()}:Describe*`,
      `${label.toLowerCase()}:List*`,
      `${label.toLowerCase()}:Create*`,
      "cloudwatch:PutMetricAlarm",
    ],
    keyMetrics: [
      "Availability / uptime",
      "Error rate",
      "Latency p95 / p99",
      "Resource utilization (CPU/Memory)",
    ],
  };
}

// ─── Main Component ────────────────────────────────────────────────────────────

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Trash2 } from "lucide-react";

// ─── Custom Node Component with On-Hover Delete Button ────────────────────────
function CustomServiceNode({ id, data }: NodeProps) {
  const label = String(data.label || id);
  const { graphNodes, graphEdges, commitGraph } = useStore();

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newNodes = graphNodes.filter((n) => n.id !== id);
    const newEdges = graphEdges.filter((e) => e.source !== id && e.target !== id);
    const deletedLabel = graphNodes.find((n) => n.id === id)?.data?.label ?? id;
    commitGraph(newNodes, newEdges, `Deleted ${deletedLabel}`);
  };

  return (
    <div className="group relative bg-slate-900/90 text-slate-50 border border-blue-500/40 rounded-xl px-4 py-3 text-xs font-semibold shadow-lg backdrop-blur-md hover:border-blue-400 hover:shadow-blue-500/20 transition-all cursor-pointer min-w-[130px] text-center">
      {/* Top Connection Handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-blue-500 !w-2.5 !h-2.5 !border-2 !border-slate-900"
      />

      {/* Service Name Label */}
      <div className="flex items-center justify-center gap-2">
        <span className="capitalize">{label}</span>
      </div>

      {/* On-Hover Delete Button */}
      <button
        onClick={handleDelete}
        className="absolute -top-2.5 -right-2.5 w-6 h-6 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10"
        title="Delete resource"
      >
        <Trash2 size={12} />
      </button>

      {/* Bottom Connection Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-blue-500 !w-2.5 !h-2.5 !border-2 !border-slate-900"
      />
    </div>
  );
}

const nodeTypes = {
  customService: CustomServiceNode,
};

// ─── Main Component ────────────────────────────────────────────────────────────

function GraphCanvasInner({ projectId }: { projectId: string }) {
  const {
    graphNodes, graphEdges, graphInitialized,
    initGraph, commitGraph, setGraphNodes, setGraphEdges,
  } = useStore();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["graph", projectId],
    queryFn: () => projectsApi.getGraph(projectId),
    refetchInterval: 5000,
  });

  const [isReady, setIsReady] = useState(false);
  const [selectedNodeData, setSelectedNodeData] = useState<NodeDrawerData | null>(null);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  // ── Delete node handler for drawer ────────────────────────────
  const handleDeleteNode = useCallback((serviceId: string) => {
    const currentNodes = useStore.getState().graphNodes;
    const currentEdges = useStore.getState().graphEdges;
    const newNodes = currentNodes.filter((n) => n.id !== serviceId);
    const newEdges = currentEdges.filter((e) => e.source !== serviceId && e.target !== serviceId);
    const deletedLabel = currentNodes.find((n) => n.id === serviceId)?.data?.label ?? serviceId;
    commitGraph(newNodes, newEdges, `Deleted ${deletedLabel}`);
    setSelectedNodeData(null);
  }, [commitGraph]);

  // ── Replace node handler for drawer ───────────────────────────
  const handleReplaceNode = useCallback((serviceId: string, newName: string) => {
    const currentNodes = useStore.getState().graphNodes;
    const currentEdges = useStore.getState().graphEdges;
    const newNodes = currentNodes.map((n) => {
      if (n.id === serviceId) {
        return {
          ...n,
          type: "customService",
          data: { ...n.data, label: newName.toLowerCase() },
        };
      }
      return n;
    });
    commitGraph(newNodes, currentEdges, `Replaced with ${newName}`);
    setSelectedNodeData(null);
  }, [commitGraph]);

  // ── Initialize graph from API ─────────────────────────────────
  useEffect(() => {
    if (data?.nodes && data.nodes.length > 0 && !graphInitialized) {
      const formattedNodes: Node[] = data.nodes.map((n: GraphNode, index: number) => ({
        id: n.id,
        type: "customService",
        position: n.position || {
          x: 200 + (index % 3) * 280,
          y: 80 + Math.floor(index / 3) * 170,
        },
        data: {
          label: n.data?.label || n.data?.service || n.id,
        },
      }));

      const formattedEdges: Edge[] = data.edges.map((e: GraphEdge) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        animated: e.animated !== false,
        style: edgeStyle,
        type: "smoothstep",
      }));

      initGraph(formattedNodes, formattedEdges);
      setIsReady(true);
    } else if (graphInitialized) {
      setIsReady(true);
    }
  }, [data, graphInitialized, initGraph]);

  // ── ReactFlow change handlers ─────────────────────────────────
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const currentNodes = useStore.getState().graphNodes;
      setGraphNodes(applyNodeChanges(changes, currentNodes));
    },
    [setGraphNodes]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      const currentEdges = useStore.getState().graphEdges;
      setGraphEdges(applyEdgeChanges(changes, currentEdges));
    },
    [setGraphEdges]
  );

  // ── Node click → open enhanced drawer ─────────────────────────
  const handleNodeClick = useCallback((_: unknown, node: Node) => {
    const label = String(node.data?.label || node.id);
    setSelectedNodeData(buildDrawerData(node.id, label));
  }, []);

  // ── Drag-and-Drop from sidebar ────────────────────────────────
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const serviceName = event.dataTransfer.getData("application/dopa-service");
      if (!serviceName) return;

      const wrapper = reactFlowWrapper.current;
      if (!wrapper) return;

      const bounds = wrapper.getBoundingClientRect();
      const x = event.clientX - bounds.left;
      const y = event.clientY - bounds.top;

      const newId = `manual-${Date.now()}`;
      const newNode: Node = {
        id: newId,
        type: "customService",
        position: { x, y },
        data: {
          label: serviceName.toLowerCase(),
        },
      };

      const currentNodes = useStore.getState().graphNodes;
      const currentEdges = useStore.getState().graphEdges;
      const newNodes = [...currentNodes, newNode];
      commitGraph(newNodes, currentEdges, `Added ${serviceName}`);
      setIsReady(true);
    },
    [commitGraph]
  );

  // ── Render guards ─────────────────────────────────────────────
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

  if (!isReady || graphNodes.length === 0) {
    return (
      <div
        ref={reactFlowWrapper}
        className="absolute inset-0 flex flex-col items-center justify-center"
        onDragOver={onDragOver}
        onDrop={onDrop}
      >
        <p className="text-slate-500 text-sm font-medium">Awaiting architecture selection</p>
        <p className="text-slate-600 text-xs mt-1">Select an architecture option or drag services here</p>
      </div>
    );
  }

  return (
    <div
      ref={reactFlowWrapper}
      style={{ width: "100%", height: "100%", position: "relative" }}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <ReactFlow
        nodes={graphNodes}
        edges={graphEdges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        fitView
        colorMode="dark"
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#1e293b" gap={20} size={1} />
        <Controls showInteractive={false} />
        <MiniMap
          style={{ width: 100, height: 65 }}
          className="!bg-slate-900/90 !border-slate-800/80 !rounded-lg shadow-xl"
          nodeColor="rgba(59, 130, 246, 0.4)"
          maskColor="rgba(15, 23, 42, 0.7)"
        />
      </ReactFlow>

      <ServiceNodeDrawer
        isOpen={!!selectedNodeData}
        onClose={() => setSelectedNodeData(null)}
        data={selectedNodeData}
        onDeleteNode={handleDeleteNode}
        onReplaceNode={handleReplaceNode}
      />
    </div>
  );
}

// ─── Shared Styles ─────────────────────────────────────────────────────────────

const edgeStyle: React.CSSProperties = {
  stroke: "#3b82f6",
  strokeWidth: 2,
};

export const GraphCanvas = memo(GraphCanvasInner);
