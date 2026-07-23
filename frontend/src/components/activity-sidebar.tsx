"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWorkspaceMode } from "@/hooks/use-workspace-mode";
import { RequirementsSummary } from "@/components/requirements-summary";
import { useStore } from "@/store";
import {
  ChevronDown,
  ChevronRight,
  Server,
  Database,
  Globe,
  Shield,
  History,
  FileText,
  Layers,
  HardDrive,
  BarChart2,
  Cpu,
  Activity,
  GitCommit,
  Undo2,
  Redo2,
  GripVertical,
  GitBranch,
  CheckCircle,
} from "lucide-react";

// ─── AWS Service Tree ──────────────────────────────────────────────────────────
const AWS_TREE = [
  {
    label: "Networking",
    icon: Globe,
    color: "text-purple-400",
    count: 5,
    services: ["CloudFront", "Route 53", "VPC", "ALB / NLB", "API Gateway"],
  },
  {
    label: "Compute",
    icon: Server,
    color: "text-indigo-400",
    count: 12,
    services: ["EC2", "ECS Fargate", "Lambda", "EKS", "Elastic Beanstalk"],
  },
  {
    label: "Storage",
    icon: HardDrive,
    color: "text-sky-400",
    count: 6,
    services: ["S3", "EFS", "Glacier", "FSx", "Storage Gateway"],
  },
  {
    label: "Database",
    icon: Database,
    color: "text-emerald-400",
    count: 8,
    services: ["RDS", "Aurora", "DynamoDB", "ElastiCache", "Redshift"],
  },
  {
    label: "Analytics",
    icon: BarChart2,
    color: "text-cyan-400",
    count: 4,
    services: ["Kinesis", "Glue", "Athena", "QuickSight"],
  },
  {
    label: "AI / ML",
    icon: Cpu,
    color: "text-pink-400",
    count: 5,
    services: ["Bedrock", "SageMaker", "Rekognition", "Comprehend", "Lex"],
  },
  {
    label: "Security",
    icon: Shield,
    color: "text-amber-400",
    count: 7,
    services: ["IAM", "WAF", "Shield", "GuardDuty", "Secrets Manager"],
  },
  {
    label: "Monitoring",
    icon: Activity,
    color: "text-rose-400",
    count: 4,
    services: ["CloudWatch", "X-Ray", "CloudTrail", "Config"],
  },
];

// ─── Draggable Service Item ────────────────────────────────────────────────────
function DraggableService({ name }: { name: string }) {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("application/dopa-service", name);
    e.dataTransfer.effectAllowed = "copy";
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className="group text-[11px] text-slate-500 hover:text-blue-400 cursor-grab active:cursor-grabbing px-2 py-1 rounded hover:bg-slate-800/40 transition-colors flex items-center gap-1.5"
      title={`Drag "${name}" onto the canvas`}
    >
      <GripVertical size={9} className="text-slate-700 group-hover:text-blue-500 shrink-0 transition-colors" />
      {name}
    </div>
  );
}

// ─── Explorer Category ─────────────────────────────────────────────────────────
function ExplorerCategory({
  label,
  icon: Icon,
  color,
  count,
  services,
}: (typeof AWS_TREE)[0]) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 text-xs text-slate-300 hover:text-blue-400 p-1.5 rounded hover:bg-slate-800/50 transition-colors"
      >
        <Icon size={12} className={color} />
        <span className="flex-1 text-left">{label}</span>
        <span className="text-[10px] text-slate-600 font-mono">{count}</span>
        {open ? (
          <ChevronDown size={10} className="text-slate-500" />
        ) : (
          <ChevronRight size={10} className="text-slate-500" />
        )}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="pl-3 py-0.5 space-y-0.5">
              {services.map((svc) => (
                <DraggableService key={svc} name={svc} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Timestamp helper ──────────────────────────────────────────────────────────
function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 5) return "Just now";
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

// ─── Main Sidebar ──────────────────────────────────────────────────────────────
export function ActivitySidebar({ projectId }: { projectId: string }) {
  const { mode } = useWorkspaceMode(projectId);
  const { graphHistory, historyHead, undo, redo, canUndo, canRedo } = useStore();

  // Accordion states
  const [reqsOpen, setReqsOpen] = useState(true);
  const [explorerOpen, setExplorerOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  // Auto-expand based on mode
  useEffect(() => {
    if (mode === "DISCOVERY" || mode === "ARCHITECTURE_SELECTION") {
      setReqsOpen(true);
      setExplorerOpen(false);
      setHistoryOpen(false);
    } else {
      setReqsOpen(false);
      setExplorerOpen(true);
      setHistoryOpen(true);
    }
  }, [mode]);

  // Keyboard shortcuts: Ctrl+Z / Ctrl+Y
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        if (canUndo()) undo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        if (canRedo()) redo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [canUndo, canRedo, undo, redo]);

  return (
    <div className="w-64 h-full border-r border-slate-800/60 bg-slate-900/40 backdrop-blur-sm flex flex-col shrink-0">
      {/* Header */}
      <div className="h-14 border-b border-slate-800/60 flex items-center px-4 shrink-0">
        <span className="text-sm font-semibold text-slate-300">Project Overview</span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar">

        {/* ── Requirements ── */}
        <div>
          <button
            onClick={() => setReqsOpen(!reqsOpen)}
            className="w-full flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 hover:text-slate-200 transition-colors"
          >
            <div className="flex items-center gap-2">
              <FileText size={14} />
              Requirements
            </div>
            {reqsOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>

          <AnimatePresence>
            {reqsOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-slate-950/40 border border-slate-800/40 rounded-lg overflow-hidden">
                  <RequirementsSummary projectId={projectId} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Architecture Explorer (drag-to-canvas) ── */}
        <div>
          <button
            onClick={() => setExplorerOpen(!explorerOpen)}
            className="w-full flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 hover:text-slate-200 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Layers size={14} />
              Architecture Explorer
            </div>
            {explorerOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>

          <AnimatePresence>
            {explorerOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-slate-950/60 border border-slate-800/60 rounded-lg p-2">
                  {/* Drag hint */}
                  <div className="flex items-center gap-1 text-[9px] text-slate-600 px-1 mb-2">
                    <GripVertical size={9} />
                    Drag services onto the canvas
                  </div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase px-1 mb-1.5">
                    AWS Services
                  </div>
                  <div className="space-y-0.5">
                    {AWS_TREE.map((cat) => (
                      <ExplorerCategory key={cat.label} {...cat} />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── History (Undo / Redo + Git log) ── */}
        <div>
          <button
            onClick={() => setHistoryOpen(!historyOpen)}
            className="w-full flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 hover:text-slate-200 transition-colors"
          >
            <div className="flex items-center gap-2">
              <History size={14} />
              History
              {graphHistory.length > 0 && (
                <span className="text-[9px] font-mono text-slate-600">
                  ({historyHead + 1}/{graphHistory.length})
                </span>
              )}
            </div>
            {historyOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>

          <AnimatePresence>
            {historyOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden space-y-2"
              >
                {/* Undo / Redo toolbar */}
                <div className="flex items-center gap-1 bg-slate-950/60 border border-slate-800/60 rounded-lg p-1.5">
                  <button
                    onClick={undo}
                    disabled={!canUndo()}
                    title="Undo (Ctrl+Z)"
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                      canUndo()
                        ? "text-blue-400 hover:bg-slate-800/60 hover:text-blue-300"
                        : "text-slate-700 cursor-not-allowed"
                    }`}
                  >
                    <Undo2 size={13} />
                    Undo
                  </button>
                  <div className="w-px h-5 bg-slate-800" />
                  <button
                    onClick={redo}
                    disabled={!canRedo()}
                    title="Redo (Ctrl+Y)"
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                      canRedo()
                        ? "text-blue-400 hover:bg-slate-800/60 hover:text-blue-300"
                        : "text-slate-700 cursor-not-allowed"
                    }`}
                  >
                    Redo
                    <Redo2 size={13} />
                  </button>
                </div>

                {/* Git-style commit log */}
                {graphHistory.length === 0 ? (
                  <div className="text-[11px] text-slate-600 text-center py-2">
                    No history yet
                  </div>
                ) : (
                  <div className="relative pl-3 space-y-0 border-l border-slate-800/60 ml-2">
                    {/* Render in reverse so newest is on top */}
                    {[...graphHistory].reverse().map((entry, revIdx) => {
                      const idx = graphHistory.length - 1 - revIdx;
                      const isCurrent = idx === historyHead;
                      const isFuture = idx > historyHead;
                      return (
                        <div
                          key={entry.id}
                          className={`relative flex items-start gap-2 py-2 pl-1 rounded-r-lg transition-colors ${
                            isCurrent
                              ? "bg-blue-500/5"
                              : isFuture
                              ? "opacity-40"
                              : "hover:bg-slate-800/20"
                          }`}
                        >
                          {/* Branch line connector */}
                          <div className={`absolute -left-3 top-3 w-2.5 border-t ${
                            isCurrent ? "border-blue-500/60" : "border-slate-800"
                          }`} />

                          {isCurrent ? (
                            <CheckCircle size={12} className="text-blue-400 shrink-0 mt-0.5" />
                          ) : (
                            <GitCommit size={12} className="text-slate-600 shrink-0 mt-0.5" />
                          )}

                          <div className="min-w-0 flex-1">
                            <div className={`text-[11px] font-semibold truncate ${
                              isCurrent ? "text-blue-300" : isFuture ? "text-slate-600" : "text-slate-400"
                            }`}>
                              {entry.label}
                            </div>
                            <div className="text-[9px] text-slate-600 font-mono">
                              {entry.nodes.length} nodes · {timeAgo(entry.timestamp)}
                            </div>
                          </div>

                          {isCurrent && (
                            <span className="text-[8px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded font-bold shrink-0">
                              HEAD
                            </span>
                          )}
                          {isFuture && (
                            <span className="text-[8px] bg-slate-800 text-slate-600 px-1.5 py-0.5 rounded font-bold shrink-0">
                              REDO
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Keyboard shortcut hint */}
                <div className="text-[9px] text-slate-700 text-center pb-1">
                  ⌘/Ctrl+Z to undo · ⌘/Ctrl+Y to redo
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </div>
  );
}
