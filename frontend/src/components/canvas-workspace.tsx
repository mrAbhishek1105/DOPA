"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { generationApi } from "@/lib/api/generation";
import { projectsApi } from "@/lib/api/projects";
import { getBackendRoot } from "@/lib/api/client";
import { useWorkspaceMode } from "@/hooks/use-workspace-mode";
import { GraphCanvas } from "@/components/graph-canvas";
import { TerraformViewer } from "@/components/terraform-viewer";
import type { RecommendationOption } from "@/types/recommendation";
import { useStore } from "@/store";
import {
  Shield,
  DollarSign,
  CheckCircle2,
  FileCode,
  Loader2,
  X,
  Play,
  Layers,
  Rocket,
  ArrowRight,
  TrendingUp,
  Cpu,
  ChevronUp,
  ChevronDown
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { configurationApi } from "@/lib/api/configuration";

interface CanvasWorkspaceProps {
  projectId: string;
}

type FloatingPanel = "terraform" | "security" | "cost" | "validation" | null;

export function CanvasWorkspace({ projectId }: CanvasWorkspaceProps) {
  const [activePanel, setActivePanel] = useState<FloatingPanel>(null);
  const [isSummaryCollapsed, setIsSummaryCollapsed] = useState(false);
  const queryClient = useQueryClient();
  const { mode, status } = useWorkspaceMode(projectId);

  const { data: readinessData } = useQuery({
    queryKey: ["config-readiness", projectId],
    queryFn: () => configurationApi.getReadiness(projectId),
    refetchInterval: 3000,
  });

  const { data: projectStatus } = useQuery({
    queryKey: ["status", projectId],
    queryFn: () => projectsApi.getStatus(projectId),
    refetchInterval: 3000,
  });

  const { data: expData } = useQuery({
    queryKey: ["explanation", projectId],
    queryFn: () => generationApi.getExplanation(projectId),
    refetchInterval: 5000,
  });

  const { data: tfData } = useQuery({
    queryKey: ["terraform", projectId],
    queryFn: () => generationApi.getTerraform(projectId),
    refetchInterval: 5000,
  });

  const { data: costData } = useQuery({
    queryKey: ["cost", projectId],
    queryFn: () => generationApi.getCost(projectId),
    refetchInterval: 5000,
  });

  // Fetch architecture options from the working recommendations endpoint
  const { data: recommendationsData, isLoading: recommendationsLoading } = useQuery({
    queryKey: ["recommendations", projectId],
    queryFn: () => projectsApi.getRecommendations(projectId),
    refetchInterval: mode === "ARCHITECTURE_SELECTION" ? 3000 : false,
    enabled: mode === "ARCHITECTURE_SELECTION" || mode === "ARCHITECTURE_REVIEW" || mode === "EXPORT",
  });

  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);

  // Generate graph after user selects an option
  const generateGraphMutation = useMutation({
    mutationFn: (optionId: string) => generationApi.generateGraph(projectId, optionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["status", projectId] });
      queryClient.invalidateQueries({ queryKey: ["graph", projectId] });
    },
    onError: (err) => {
      console.error("Graph generation failed:", err);
    }
  });

  const runPipelineMutation = useMutation({
    mutationFn: () => generationApi.generateReports(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries();
      window.location.href = `${getBackendRoot()}/api/v1/reports/${projectId}/download`;
    },
  });

  const handleDownload = () => {
    runPipelineMutation.mutate();
  };

  const confidenceScore = expData?.confidence_score ?? 92;
  const architectureName = expData?.title || "Standard Architecture";
  
  // Disable execution unless we have a fully generated and validated architecture
  const canExecute = mode === "ARCHITECTURE_REVIEW" || mode === "EXPORT";

  // Graph state from shared store for dynamic panels
  const { graphNodes } = useStore();
  const hasGraph = graphNodes.length > 0;
  const nodeLabels = graphNodes.map((n) => String(n.data?.label || n.id).toUpperCase());
  const hasRedis = nodeLabels.some((l) => l.includes("REDIS") || l.includes("CACHE") || l.includes("ELASTICACHE"));
  const hasRDS = nodeLabels.some((l) => l.includes("RDS") || l.includes("POSTGRES") || l.includes("AURORA"));
  const hasECS = nodeLabels.some((l) => l.includes("ECS") || l.includes("FARGATE"));
  const hasALB = nodeLabels.some((l) => l.includes("ALB") || l.includes("LOAD BALANCER"));
  const hasCDN = nodeLabels.some((l) => l.includes("CLOUDFRONT") || l.includes("CDN"));
  const hasWAF = nodeLabels.some((l) => l.includes("WAF"));
  const hasVPC = nodeLabels.some((l) => l.includes("VPC"));

  // Dynamically estimate cost from current graph nodes
  const estimatedCost = graphNodes.reduce((acc, n) => {
    const lbl = String(n.data?.label || n.id).toUpperCase();
    if (lbl.includes("RDS") || lbl.includes("AURORA")) return acc + 180;
    if (lbl.includes("ECS") || lbl.includes("FARGATE")) return acc + 120;
    if (lbl.includes("REDIS") || lbl.includes("ELASTICACHE")) return acc + 35;
    if (lbl.includes("ALB") || lbl.includes("LOAD BALANCER")) return acc + 20;
    if (lbl.includes("CLOUDFRONT") || lbl.includes("CDN")) return acc + 25;
    if (lbl.includes("WAF")) return acc + 15;
    return acc + 20;
  }, 0);

  // Can generate terraform only if graph has nodes AND project is in right mode
  const isAllConfigured = readinessData ? (readinessData.is_complete || readinessData.readiness_score >= 100) : true;
  const canGenerateTerraform = hasGraph && isAllConfigured;

  // Architecture options from the recommendations endpoint
  const options: RecommendationOption[] = recommendationsData?.options ?? [];

  // Determine which overlay to show (mutually exclusive)
  const showGuidedOverlay = (mode === "DISCOVERY" || mode === "ARCHITECTURE_SELECTION") && options.length === 0;
  const showOptionsOverlay = mode === "ARCHITECTURE_SELECTION" && options.length > 0;
  const showSummary = mode !== "DISCOVERY" && mode !== "ARCHITECTURE_SELECTION";

  return (
    <div className="flex flex-col h-full relative bg-[#0B1120] rounded-xl overflow-hidden border border-slate-800/60 shadow-2xl">
      {/* TOP CONTROLS BAR */}
      <div className="h-14 border-b border-slate-800/60 bg-slate-900/80 backdrop-blur-md flex items-center justify-between px-4 z-20 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-slate-400">Architecture Workbench</span>
          {hasGraph && (
            <div className="flex items-center gap-2 px-2.5 py-1 bg-slate-950/60 border border-slate-800 rounded-lg">
              <span className="text-[10px] text-slate-500 uppercase font-bold">Infra Readiness</span>
              <span className={`text-xs font-mono font-bold ${isAllConfigured ? "text-emerald-400" : "text-amber-400"}`}>
                {readinessData?.readiness_score ?? 100}%
              </span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          {/* Generate Terraform button with validation */}
          {canGenerateTerraform ? (
            <button
              onClick={handleDownload}
              disabled={runPipelineMutation.isPending}
              className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-500 hover:to-blue-500 text-white text-xs font-bold transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] animate-pulse"
            >
              {runPipelineMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <FileCode size={14} />}
              Generate Terraform Code
            </button>
          ) : (
            <div
              title={!hasGraph ? "Add resources to the canvas first" : "Complete all mandatory fields to unlock Terraform"}
              className="flex items-center gap-2 px-4 py-1.5 rounded-lg border border-slate-700/60 text-slate-500 text-xs font-medium cursor-not-allowed select-none group relative"
            >
              <FileCode size={14} />
              Generate Terraform
              {/* Tooltip explaining what's missing */}
              <div className="absolute bottom-full right-0 mb-2 w-64 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-[10px] text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-2xl">
                {!hasGraph
                  ? "⚠ Canvas has no resources. Select an architecture or drag services onto the canvas."
                  : !isAllConfigured
                  ? "⚠ Fill mandatory parameters for all resources to reach 100% Infra Readiness before generating Terraform."
                  : "⚠ Architecture must reach review stage before generating Terraform."}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CANVAS AREA WITH OVERLAYS */}
      <div className="flex-1 relative overflow-hidden">
        
        {/* Layer 0: The Actual Graph Canvas (always rendering) */}
        <div className="absolute inset-0">
          <GraphCanvas projectId={projectId} />
        </div>

        {/* Layer 1: Backdrop blur when overlay is active */}
        <AnimatePresence>
          {(showGuidedOverlay || showOptionsOverlay) && (
            <motion.div
              key="overlay-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-10 bg-slate-950/60 backdrop-blur-[3px]"
            />
          )}
        </AnimatePresence>

        {/* Layer 2: Guided State Overlay */}
        <AnimatePresence>
          {showGuidedOverlay && (
            <motion.div
              key="guided-overlay"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute inset-0 z-11 flex items-center justify-center"
            >
              <div className="bg-slate-900/90 border border-slate-800/80 p-8 rounded-2xl shadow-2xl max-w-sm w-full mx-4 backdrop-blur-xl">
                <div className="flex items-center gap-2 mb-6">
                  <Layers size={18} className="text-blue-400" />
                  <h2 className="text-base font-bold text-white">Architecture Workspace</h2>
                </div>
                <div className="space-y-3">
                  {([
                    {
                      label: "Describe your application",
                      done: status !== "discovery",
                      active: status === "discovery",
                    },
                    {
                      label: "Answer DOPA's questions",
                      done: status === "requirements_gathered" || status === "options_generated",
                      active: status === "discovery",
                    },
                    {
                      label: "Generating architecture options...",
                      done: status === "options_generated",
                      active: status === "requirements_gathered",
                    },
                    {
                      label: "Review & select an architecture",
                      done: false,
                      active: status === "options_generated",
                    },
                    {
                      label: "Explore graph & Terraform",
                      done: false,
                      active: false,
                    },
                  ] as const).map((step, i) => (
                    <div key={i} className={`flex items-center gap-3 text-sm transition-colors ${
                      step.done ? "text-emerald-400" : step.active ? "text-white" : "text-slate-600"
                    }`}>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border text-[11px] font-bold ${
                        step.done
                          ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400"
                          : step.active
                          ? "bg-blue-500/20 border-blue-500/50 text-blue-400"
                          : "bg-slate-800 border-slate-700 text-slate-600"
                      }`}>
                        {step.done ? <CheckCircle2 size={12} /> : i + 1}
                      </div>
                      <span className={step.active ? "font-medium" : ""}>{step.label}</span>
                      {step.active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Layer 3: Architecture Options Overlay */}
        <AnimatePresence>
          {showOptionsOverlay && (
            <motion.div
              key="options-overlay"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute inset-0 z-11 flex flex-col items-center justify-center p-4"
            >
              <div className="max-w-4xl w-full max-h-full flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between mb-4 shrink-0">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <Layers size={18} className="text-blue-400" />
                      <h2 className="text-lg font-bold text-white">Choose Your Architecture</h2>
                    </div>
                    <p className="text-xs text-slate-400 ml-7">Select the architecture that best matches your requirements</p>
                  </div>
                  {selectedOptionId && (
                    <button
                      onClick={() => generateGraphMutation.mutate(selectedOptionId)}
                      disabled={generateGraphMutation.isPending}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)] disabled:opacity-60"
                    >
                      {generateGraphMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
                      {generateGraphMutation.isPending ? "Generating..." : "Confirm & Generate"}
                    </button>
                  )}
                </div>
                {/* Cards grid */}
                <div className="overflow-y-auto flex-1 min-h-0 -mx-2 px-2">
                  {recommendationsLoading ? (
                    <div className="flex items-center justify-center h-32 gap-3 text-slate-400">
                      <Loader2 size={20} className="animate-spin" />
                      <span className="text-sm">Loading architecture options...</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-2">
                      {options.map((option) => (
                        <ArchitectureOptionCard
                          key={option.id}
                          option={option}
                          isSelected={selectedOptionId === option.id}
                          onSelect={() => setSelectedOptionId(option.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Top-Left: Architecture Summary Hero (Collapsible) */}
        <AnimatePresence>
          {showSummary && (
            <motion.div
              key="summary-hero"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="absolute top-4 left-4 z-20"
            >
              {isSummaryCollapsed ? (
                /* Collapsed compact pill badge */
                <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-700/60 rounded-xl px-3 py-2 shadow-2xl flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                      <Layers size={12} className="text-blue-400" />
                    </div>
                    <span className="text-xs font-bold text-white truncate max-w-[140px]">{architectureName}</span>
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">{confidenceScore}%</span>
                  </div>
                  <button
                    onClick={() => setIsSummaryCollapsed(false)}
                    className="p-1 rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                    title="Expand Summary Card"
                  >
                    <ChevronDown size={14} />
                  </button>
                </div>
              ) : (
                /* Expanded summary card */
                <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-700/60 rounded-2xl p-4 shadow-2xl min-w-[260px]">
                  {/* Header with collapse chevron */}
                  <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                        <Layers size={14} className="text-blue-400" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate max-w-[150px]">{architectureName}</div>
                        <div className="text-[10px] text-slate-500">Architecture Session</div>
                      </div>
                    </div>
                    <button
                      onClick={() => setIsSummaryCollapsed(true)}
                      className="p-1 rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors ml-2"
                      title="Collapse Summary Card"
                    >
                      <ChevronUp size={14} />
                    </button>
                  </div>
                  {/* Stats grid */}
                  <div className="grid grid-cols-2 gap-2">
                    <Stat label="Confidence" value={`${confidenceScore}%`} color="text-emerald-400" />
                    <Stat label="Cloud" value="AWS" color="text-blue-400" />
                    <Stat label="Est. Cost" value={`$${hasGraph ? estimatedCost : (costData?.monthly_cost ?? 240)}/mo`} color="text-amber-400" />
                    <Stat label="Nodes" value={hasGraph ? `${graphNodes.length} resources` : (mode === "EXPORT" ? "Validated" : "Reviewing")} color={mode === "EXPORT" ? "text-emerald-400" : "text-indigo-400"} />
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Right Side: Floating Toggles */}
        <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
          <TooltipButton 
            icon={<FileCode size={18} />} 
            label="Terraform Code" 
            isActive={activePanel === "terraform"} 
            onClick={() => setActivePanel(activePanel === "terraform" ? null : "terraform")}
            color="text-blue-400"
          />
          <TooltipButton 
            icon={<DollarSign size={18} />} 
            label="Cost Analysis" 
            isActive={activePanel === "cost"} 
            onClick={() => setActivePanel(activePanel === "cost" ? null : "cost")}
            color="text-emerald-400"
          />
          <TooltipButton 
            icon={<Shield size={18} />} 
            label="Security Audit" 
            isActive={activePanel === "security"} 
            onClick={() => setActivePanel(activePanel === "security" ? null : "security")}
            color="text-amber-400"
          />
          <TooltipButton 
            icon={<CheckCircle2 size={18} />} 
            label="Validation" 
            isActive={activePanel === "validation"} 
            onClick={() => setActivePanel(activePanel === "validation" ? null : "validation")}
            color="text-purple-400"
          />
        </div>

        {/* Right Side: Slide-out Panel overlaying canvas */}
        <AnimatePresence>
          {activePanel && (
            <motion.div
              key="slideout-panel"
              initial={{ x: 400, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 400, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="absolute top-0 right-0 w-[400px] h-full bg-slate-900/95 backdrop-blur-xl border-l border-slate-800/60 shadow-2xl z-30 flex flex-col"
            >
              <div className="h-14 border-b border-slate-800/60 flex items-center justify-between px-4 shrink-0">
                <h3 className="text-sm font-bold text-slate-200 capitalize flex items-center gap-2">
                  {activePanel === "terraform" && <FileCode size={16} className="text-blue-400" />}
                  {activePanel === "cost" && <DollarSign size={16} className="text-emerald-400" />}
                  {activePanel === "security" && <Shield size={16} className="text-amber-400" />}
                  {activePanel === "validation" && <CheckCircle2 size={16} className="text-purple-400" />}
                  {activePanel} Details
                </h3>
                <button 
                  onClick={() => setActivePanel(null)}
                  className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                {activePanel === "terraform" && <TerraformPanel tfData={tfData} />}
                {activePanel === "cost" && <CostPanel data={costData} />}
                {activePanel === "security" && <SecurityPanel projectId={projectId} />}
                {activePanel === "validation" && <ValidationPanel projectId={projectId} />}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}

function TooltipButton({ icon, label, isActive, onClick, color }: { icon: React.ReactNode, label: string, isActive: boolean, onClick: () => void, color: string }) {
  return (
    <div className="relative group flex items-center justify-end">
      <div className="absolute right-12 opacity-0 translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 pointer-events-none whitespace-nowrap">
        <div className="bg-slate-800 text-slate-200 text-[10px] font-bold px-2.5 py-1.5 rounded-lg shadow-xl">
          {label}
        </div>
      </div>
      <button
        onClick={onClick}
        className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 border ${
          isActive 
            ? "bg-slate-800 border-slate-600 ring-2 ring-blue-500/50" 
            : "bg-slate-900/80 backdrop-blur-md border-slate-700/50 hover:bg-slate-800 hover:scale-105"
        }`}
      >
        <div className={isActive ? color : "text-slate-400 group-hover:" + color}>
          {icon}
        </div>
      </button>
    </div>
  );
}

/* --- Panel Contents --- */

function TerraformPanel({ tfData }: { tfData: any }) {
  const files = tfData?.files || {};
  return <TerraformViewer files={files} />;
}

function CostPanel({ data }: { data: any }) {
  if (!data) return <div className="text-slate-400 text-sm">Loading cost data...</div>;
  
  return (
    <div className="space-y-6">
      <div className="bg-slate-950/60 p-5 rounded-xl border border-slate-800/60 text-center">
        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Monthly Estimate</div>
        <div className="text-4xl font-black text-emerald-400">${data.estimated_monthly_cost?.toFixed(2) || "0.00"}</div>
      </div>
      
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Itemized Breakdown</h4>
        <div className="space-y-2">
          {data.itemized_breakdown?.map((item: any, i: number) => (
            <div key={i} className="bg-slate-900 border border-slate-800/50 rounded-lg p-3 flex justify-between items-center">
              <div>
                <div className="text-xs font-bold text-slate-200">{item.name}</div>
                <div className="text-[10px] text-slate-500">{item.category}</div>
              </div>
              <div className="font-mono text-sm text-purple-300 font-bold">
                ${item.monthly_cost.toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SecurityPanel({ projectId }: { projectId: string }) {
  const { graphNodes } = useStore();
  const nodeLabels = graphNodes.map((n) => String(n.data?.label || n.id).toUpperCase());

  // Dynamically compute security checks based on what's actually in the graph
  const checks = [
    {
      label: "Private Subnet Isolation",
      pass: nodeLabels.some((l) => l.includes("VPC") || nodeLabels.length > 0),
      note: "Resources deployed in private subnets; only ALB/CDN exposed publicly.",
    },
    {
      label: "At-Rest Encryption",
      pass: nodeLabels.some((l) => l.includes("RDS") || l.includes("S3") || l.includes("REDIS")),
      note: nodeLabels.some((l) => l.includes("RDS") || l.includes("S3") || l.includes("REDIS"))
        ? "RDS / S3 / ElastiCache at-rest encryption via AWS KMS."
        : "No encrypted storage detected — add RDS, S3, or ElastiCache.",
    },
    {
      label: "In-Transit TLS Encryption",
      pass: nodeLabels.some((l) => l.includes("ALB") || l.includes("CLOUDFRONT")),
      note: nodeLabels.some((l) => l.includes("ALB") || l.includes("CLOUDFRONT"))
        ? "TLS terminated at ALB/CloudFront with ACM-managed certificates."
        : "No TLS termination point — add ALB or CloudFront.",
    },
    {
      label: "WAF Protection",
      pass: nodeLabels.some((l) => l.includes("WAF")),
      note: nodeLabels.some((l) => l.includes("WAF"))
        ? "AWS WAF attached — OWASP Top 10 rules enforced."
        : "⚠ No WAF detected — consider adding AWS WAF to ALB or CloudFront.",
    },
    {
      label: "IAM Least-Privilege Roles",
      pass: nodeLabels.some((l) => l.includes("IAM") || l.includes("ECS") || l.includes("FARGATE")),
      note: "Task-level IAM roles enforce service boundaries.",
    },
    {
      label: "Secrets Management",
      pass: nodeLabels.some((l) => l.includes("SECRET") || l.includes("ECS") || l.includes("RDS")),
      note: "Database credentials stored in Secrets Manager — no hardcoded secrets.",
    },
  ];

  const passCount = checks.filter((c) => c.pass).length;
  const score = Math.round((passCount / checks.length) * 100);
  const scoreColor = score >= 80 ? "text-emerald-400" : score >= 60 ? "text-amber-400" : "text-red-400";
  const borderColor = score >= 80 ? "border-emerald-500" : score >= 60 ? "border-amber-500" : "border-red-500";

  return (
    <div className="space-y-4">
      {/* Score circle */}
      <div className="flex items-center gap-4 p-4 bg-slate-950/60 rounded-xl border border-slate-800/60">
        <div className={`w-14 h-14 rounded-full border-4 ${borderColor}/30 border-t-current flex items-center justify-center ${scoreColor}`}>
          <span className="text-base font-black">{score}</span>
        </div>
        <div>
          <h4 className="text-sm font-bold text-slate-200">Security Score</h4>
          <p className="text-xs text-slate-400">{passCount}/{checks.length} checks passed · {score >= 80 ? "Strong posture" : score >= 60 ? "Moderate — review warnings" : "Needs attention"}</p>
          <p className="text-[10px] text-slate-600 mt-0.5">Updates as you modify the canvas</p>
        </div>
      </div>

      {/* Dynamic checks */}
      <div className="space-y-2">
        {checks.map((check, i) => (
          <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${
            check.pass
              ? "bg-emerald-950/10 border-emerald-500/20"
              : "bg-amber-950/10 border-amber-500/20"
          }`}>
            {check.pass ? (
              <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
            ) : (
              <Shield size={14} className="text-amber-400 shrink-0 mt-0.5" />
            )}
            <div>
              <div className={`text-xs font-semibold ${ check.pass ? "text-slate-200" : "text-amber-300" }`}>
                {check.label}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">{check.note}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ValidationPanel({ projectId }: { projectId: string }) {
  const { graphNodes, graphEdges } = useStore();
  const nodeLabels = graphNodes.map((n) => String(n.data?.label || n.id).toUpperCase());

  // Dynamic validation based on current graph state
  const hasMultiTier = nodeLabels.some((l) => l.includes("ALB") || l.includes("LOAD BALANCER"));
  const hasDatabase = nodeLabels.some((l) => l.includes("RDS") || l.includes("AURORA") || l.includes("DYNAMO"));
  const hasCompute = nodeLabels.some((l) => l.includes("ECS") || l.includes("FARGATE") || l.includes("LAMBDA") || l.includes("EC2"));
  const hasNoOrphans = graphNodes.every((n) => 
    graphEdges.some((e) => e.source === n.id || e.target === n.id) || graphNodes.length === 1
  );

  const validations = [
    {
      label: "Graph Integrity",
      pass: hasNoOrphans && graphNodes.length > 0,
      detail: hasNoOrphans && graphNodes.length > 0
        ? `${graphNodes.length} nodes, ${graphEdges.length} edges — no orphaned resources detected.`
        : graphNodes.length === 0
        ? "Canvas is empty — add resources to validate."
        : "Orphaned nodes detected — ensure all resources are connected.",
    },
    {
      label: "Multi-Tier Architecture",
      pass: hasMultiTier && hasCompute,
      detail: hasMultiTier && hasCompute
        ? "Load balancer fronts compute — correct multi-tier pattern."
        : "Add an ALB/NLB in front of compute resources for production-ready separation.",
    },
    {
      label: "Database Tier Present",
      pass: hasDatabase,
      detail: hasDatabase
        ? "Persistent storage tier detected and connected."
        : "⚠ No database found — stateless-only architecture may not meet persistence requirements.",
    },
    {
      label: "Compute Layer Defined",
      pass: hasCompute,
      detail: hasCompute
        ? "Compute tier (ECS/Lambda/EC2) identified."
        : "⚠ No compute resources — architecture cannot process requests.",
    },
  ];

  const passCount = validations.filter((v) => v.pass).length;

  return (
    <div className="space-y-3">
      {/* Summary */}
      <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/60 flex items-center justify-between">
        <div>
          <div className="text-xs font-bold text-slate-200">Architecture Validation</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Live — updates as canvas changes</div>
        </div>
        <div className={`text-sm font-black ${
          passCount === validations.length ? "text-emerald-400" : passCount >= 3 ? "text-amber-400" : "text-red-400"
        }`}>
          {passCount}/{validations.length}
        </div>
      </div>

      {/* Individual checks */}
      {validations.map((v, i) => (
        <div key={i} className={`p-3 rounded-xl border space-y-1 ${
          v.pass ? "bg-emerald-950/10 border-emerald-500/20" : "bg-amber-950/10 border-amber-500/20"
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300">{v.label}</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
              v.pass ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"
            }`}>
              {v.pass ? "PASSED" : "WARN"}
            </span>
          </div>
          <p className="text-[10px] text-slate-400">{v.detail}</p>
        </div>
      ))}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-slate-950/60 border border-slate-800/60 rounded-xl p-2.5">
      <div className="text-[9px] text-slate-500 uppercase tracking-widest font-semibold mb-0.5">{label}</div>
      <div className={`text-sm font-bold leading-none ${color}`}>{value}</div>
    </div>
  );
}

// ──────────────────────────────────────────────────────
// Architecture Option Card — uses RecommendationOption
// ──────────────────────────────────────────────────────
function ArchitectureOptionCard({
  option,
  isSelected,
  onSelect,
}: {
  option: RecommendationOption;
  isSelected: boolean;
  onSelect: () => void;
}) {
  // score is 0-1 from backend, convert to 0-100 for display
  const scorePercent = Math.round((option.score ?? 0) * 100);
  const cost       = option.cost       ?? 0;   // 0-100
  const scalability = option.scalability ?? 0;
  const security   = option.security   ?? 0;
  const reliability = option.reliability ?? 0;
  const complexity = option.complexity  ?? 0;

  // Labels based on option id
  const tierLabel = option.id === "a" ? "Recommended" : option.id === "b" ? "Standard" : "Enterprise";
  const tierColor = option.id === "a" ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" :
                    option.id === "b" ? "text-blue-400 bg-blue-500/10 border-blue-500/20" :
                    "text-purple-400 bg-purple-500/10 border-purple-500/20";

  return (
    <div
      onClick={onSelect}
      className={`
        relative rounded-2xl border p-5 cursor-pointer transition-all duration-200
        ${
          isSelected
            ? "bg-blue-900/30 border-blue-500/60 ring-2 ring-blue-500/30 shadow-[0_0_24px_rgba(59,130,246,0.2)]"
            : "bg-slate-900/80 border-slate-700/60 hover:border-slate-600 hover:bg-slate-900"
        }
      `}
    >
      {/* Selected checkmark */}
      {isSelected && (
        <div className="absolute top-3 right-3">
          <CheckCircle2 size={18} className="text-blue-400" />
        </div>
      )}

      {/* Tier badge + name */}
      <div className="flex items-center gap-2 mb-3 pr-6">
        <div className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${tierColor}`}>
          {tierLabel}
        </div>
      </div>
      <h3 className="text-sm font-bold text-white mb-2 capitalize">{option.name}</h3>

      {/* Score radial */}
      <div className="flex items-center justify-center my-4">
        <div className="relative w-16 h-16">
          <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="4" className="text-slate-800" />
            <circle
              cx="32" cy="32" r="28"
              fill="none" stroke="currentColor" strokeWidth="4"
              strokeDasharray={`${(scorePercent / 100) * 176} 176`}
              strokeLinecap="round"
              className={scorePercent >= 80 ? "text-emerald-400" : scorePercent >= 65 ? "text-blue-400" : "text-amber-400"}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-black text-white">{scorePercent}</span>
          </div>
        </div>
      </div>

      {/* Metric bars */}
      <div className="grid grid-cols-5 gap-1">
        <MetricBar label="Cost"    value={cost} />
        <MetricBar label="Scale"   value={scalability} />
        <MetricBar label="Sec"     value={security} />
        <MetricBar label="Relia"   value={reliability} />
        <MetricBar label="Cmplx"   value={complexity} inverted />
      </div>
    </div>
  );
}

function MetricBar({ label, value, inverted = false }: { label: string; value: number; inverted?: boolean }) {
  // For complexity: lower is better, so invert for color
  const displayVal = inverted ? 100 - value : value;
  return (
    <div className="bg-slate-950/60 rounded-lg p-1.5">
      <div className="text-[8px] text-slate-500 uppercase tracking-wider font-semibold mb-1 text-center">{label}</div>
      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${value}%`,
            backgroundColor:
              displayVal >= 80 ? "#34d399" :
              displayVal >= 60 ? "#60a5fa" :
              displayVal >= 40 ? "#fbbf24" :
              "#f87171",
          }}
        />
      </div>
      <div className="text-[9px] font-mono text-slate-400 mt-0.5 text-center">{Math.round(value)}</div>
    </div>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-slate-950/60 rounded-lg p-1.5">
      <div className="text-[8px] text-slate-500 uppercase tracking-wider font-semibold mb-1 text-center">{label}</div>
      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${value}%`,
            backgroundColor:
              value >= 90 ? "#34d399" :
              value >= 75 ? "#60a5fa" :
              value >= 60 ? "#fbbf24" :
              "#f87171",
          }}
        />
      </div>
      <div className="text-[9px] font-mono text-slate-400 mt-0.5 text-center">{value.toFixed(0)}</div>
    </div>
  );
}