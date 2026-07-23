"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWorkspaceMode } from "@/hooks/use-workspace-mode";
import { RequirementsSummary } from "@/components/requirements-summary";
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
} from "lucide-react";

// Full AWS service tree — each category with example services
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

// Git-style history entries
const HISTORY_ENTRIES = [
  { version: "v2", label: "Added Redis Cache", time: "Just now", current: true },
  { version: "v1", label: "Initial Architecture", time: "5 min ago", current: false },
];

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
            <div className="pl-4 py-0.5 space-y-0.5">
              {services.map((svc) => (
                <div
                  key={svc}
                  className="text-[11px] text-slate-500 hover:text-blue-400 cursor-pointer px-2 py-1 rounded hover:bg-slate-800/40 transition-colors"
                >
                  {svc}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function ActivitySidebar({ projectId }: { projectId: string }) {
  const { mode } = useWorkspaceMode(projectId);

  // Accordion states
  const [reqsOpen, setReqsOpen] = useState(true);
  const [explorerOpen, setExplorerOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  // Auto-expand based on mode
  useEffect(() => {
    if (mode === "DISCOVERY" || mode === "ARCHITECTURE_SELECTION") {
      setReqsOpen(true);
      setExplorerOpen(false);
    } else {
      setReqsOpen(false);
      setExplorerOpen(true);
    }
  }, [mode]);

  return (
    <div className="w-64 h-full border-r border-slate-800/60 bg-slate-900/40 backdrop-blur-sm flex flex-col shrink-0">
      {/* Header */}
      <div className="h-14 border-b border-slate-800/60 flex items-center px-4 shrink-0">
        <span className="text-sm font-semibold text-slate-300">Project Overview</span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar">

        {/* Requirements Section */}
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

        {/* Architecture Explorer Section */}
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
                  <div className="text-[10px] font-bold text-slate-500 uppercase px-1 mb-2">
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

        {/* History Section — Git style */}
        <div>
          <button
            onClick={() => setHistoryOpen(!historyOpen)}
            className="w-full flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 hover:text-slate-200 transition-colors"
          >
            <div className="flex items-center gap-2">
              <History size={14} />
              History
            </div>
            {historyOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>

          <AnimatePresence>
            {historyOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden space-y-1"
              >
                {HISTORY_ENTRIES.map((entry) => (
                  <button
                    key={entry.version}
                    className={`w-full text-left p-2.5 rounded-lg flex items-start gap-2.5 transition-colors ${
                      entry.current
                        ? "bg-slate-800/60 border border-blue-500/30"
                        : "hover:bg-slate-800/40 border border-transparent"
                    }`}
                  >
                    <GitCommit
                      size={14}
                      className={entry.current ? "text-blue-400 shrink-0 mt-0.5" : "text-slate-600 shrink-0 mt-0.5"}
                    />
                    <div>
                      <div
                        className={`text-xs font-semibold ${
                          entry.current ? "text-blue-300" : "text-slate-400"
                        }`}
                      >
                        {entry.label}
                      </div>
                      <div className="text-[10px] text-slate-600">
                        {entry.version} · {entry.time}
                      </div>
                    </div>
                    {entry.current && (
                      <span className="ml-auto text-[9px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded font-bold">
                        HEAD
                      </span>
                    )}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </div>
  );
}
