"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { projectsApi } from "@/lib/api/projects";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, Circle, FileText, Sparkles, HelpCircle, Layers, ShieldCheck, Check, ChevronDown, ChevronRight, Package, Search, Zap, TrendingUp } from "lucide-react";

// Fields we track for core progress calculation
const ALL_FIELDS = [
  "application_type",
  "cloud",
  "region",
  "users",
  "traffic",
  "budget",
  "database",
  "availability",
];

const FIELD_LABELS: Record<string, string> = {
  application_type: "App Type",
  cloud: "Cloud",
  region: "Region",
  users: "Users",
  traffic: "Traffic",
  budget: "Budget",
  database: "Database",
  availability: "Availability",
  compliance: "Compliance",
  storage: "Storage",
  realtime: "Real-time",
  team_size: "Team Size",
};

function formatValue(key: string, value: any): string {
  if (key === "users" && typeof value === "number") {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
    return value.toString();
  }
  if (key === "database" && typeof value === "string") {
    const dbMap: Record<string, string> = {
      postgresql: "PostgreSQL",
      mysql: "MySQL",
      dynamodb: "DynamoDB",
      mongodb: "MongoDB",
      sql: "SQL",
    };
    return dbMap[value.toLowerCase()] || value;
  }
  if (typeof value === "string") {
    return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return String(value);
}

export function RequirementsSummary({ projectId }: { projectId: string }) {
  const [isCoreOpen, setIsCoreOpen] = useState(true);
  const [isCharOpen, setIsCharOpen] = useState(false);
  const [isOpenQOpen, setIsOpenQOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["requirements", projectId],
    queryFn: () => projectsApi.getRequirements(projectId),
    refetchInterval: 3000,
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-4 w-32 bg-slate-800" />
        <Skeleton className="h-3 w-full bg-slate-800" />
        <div className="flex flex-wrap gap-2 mt-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-6 w-20 rounded-full bg-slate-800" />
          ))}
        </div>
      </div>
    );
  }

  const extracted = data?.extracted || {};
  const extractedKeys = Object.keys(extracted).filter(
    (k) => extracted[k] !== null && extracted[k] !== "" && extracted[k] !== undefined && !k.startsWith("__") && k !== "capabilities"
  );

  const capabilities: string[] = Array.isArray(extracted.capabilities) ? extracted.capabilities : [];

  const totalFields = ALL_FIELDS.length;
  const completedCount = ALL_FIELDS.filter((f) => extractedKeys.includes(f)).length;
  const progressPercent = Math.round((completedCount / totalFields) * 100);

  // Derive vendor-neutral architectural characteristics
  const characteristics = [
    { label: "Object Storage", icon: <Package size={10} className="mr-1 text-slate-400 shrink-0" /> },
    { label: "Search", icon: <Search size={10} className="mr-1 text-slate-400 shrink-0" /> },
    { label: "Caching", icon: <Zap size={10} className="mr-1 text-amber-400 shrink-0" /> },
    { label: "High Availability (Multi-AZ)", icon: <CheckCircle2 size={10} className="mr-1 text-indigo-400 shrink-0" /> },
  ];

  // Baseline assumptions
  const assumptions = [
    "Internet-facing public application",
    "AWS managed VPC private subnets",
  ];

  if (extractedKeys.length === 0 && capabilities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center py-6">
        <div className="w-10 h-10 rounded-full bg-slate-800/80 flex items-center justify-center mb-3">
          <FileText size={18} className="text-slate-500" />
        </div>
        <p className="text-sm text-slate-500">No requirements gathered yet.</p>
        <p className="text-xs text-slate-600 mt-1">Start a conversation to define your architecture.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400 font-medium">
            {completedCount}/{totalFields} core fields
          </span>
          <span className={`font-semibold ${data?.is_complete ? "text-emerald-400" : "text-blue-400"}`}>
            {progressPercent}%
          </span>
        </div>
        <Progress value={progressPercent} className="h-1.5 bg-slate-800" />
      </div>

      {/* SECTION 1: Core Requirements */}
      <div className="space-y-2">
        <button 
          onClick={() => setIsCoreOpen(!isCoreOpen)}
          className="w-full flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider"
        >
          <div className="flex items-center gap-1.5">
            <Layers size={10} className="text-slate-500" />
            Core Requirements
          </div>
          {isCoreOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </button>
        <AnimatePresence>
          {isCoreOpen && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="flex flex-wrap gap-1.5 overflow-hidden">
              {ALL_FIELDS.map((field) => {
                const value = extracted[field];
                const isExtracted = value !== null && value !== undefined && value !== "";

                return (
                  <Badge
                    key={field}
                    variant={isExtracted ? "default" : "outline"}
                    className={`text-[11px] font-medium transition-all duration-200 ${
                      isExtracted
                        ? "bg-slate-800/60 text-slate-300 border-slate-700 hover:bg-slate-700/60"
                        : "bg-transparent text-slate-600 border-slate-800/60"
                    }`}
                  >
                    {isExtracted ? (
                      <CheckCircle2 size={10} className="mr-1 text-blue-400 shrink-0" />
                    ) : (
                      <Circle size={10} className="mr-1 text-slate-600 shrink-0" />
                    )}
                    {FIELD_LABELS[field] || field}
                    {isExtracted && (
                      <span className="ml-1 text-slate-400 font-semibold">
                        : {formatValue(field, value)}
                      </span>
                    )}
                  </Badge>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* SECTION 2: Architectural Characteristics */}
      <div className="space-y-2 pt-2 border-t border-slate-800/60">
        <button 
          onClick={() => setIsCharOpen(!isCharOpen)}
          className="w-full flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider"
        >
          <div className="flex items-center gap-1.5">
            <Sparkles size={10} className="text-slate-500" />
            Architecture Characteristics
          </div>
          {isCharOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </button>
        <AnimatePresence>
          {isCharOpen && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="flex flex-wrap gap-1.5 overflow-hidden">
              {characteristics.map((char) => (
                <Badge
                  key={char.label}
                  className="text-[11px] bg-slate-800/40 text-slate-300 border-slate-700/50 font-medium"
                >
                  {char.icon}
                  {char.label}
                </Badge>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* SECTION 3: Open Questions */}
      <div className="space-y-2 pt-2 border-t border-slate-800/60">
        <button 
          onClick={() => setIsOpenQOpen(!isOpenQOpen)}
          className="w-full flex items-center justify-between text-[10px] font-bold text-amber-400/90 uppercase tracking-wider"
        >
          <div className="flex items-center gap-1.5">
            <HelpCircle size={10} className="text-amber-400" />
            Open Questions
          </div>
          {isOpenQOpen ? <ChevronDown size={12} className="text-amber-400/90" /> : <ChevronRight size={12} className="text-amber-400/90" />}
        </button>
        <AnimatePresence>
          {isOpenQOpen && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="space-y-1.5 overflow-hidden">
              <div className="flex items-center justify-between text-[11px] bg-slate-900/60 p-2 rounded-lg border border-amber-500/20">
                <span className="text-slate-300">Compliance Framework</span>
                <span className="text-[9px] font-bold bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded uppercase">HIGH</span>
              </div>
              <div className="flex items-center justify-between text-[11px] bg-slate-900/60 p-2 rounded-lg border border-amber-500/20">
                <span className="text-slate-300">Disaster Recovery RPO/RTO</span>
                <span className="text-[9px] font-bold bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded uppercase">MED</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
