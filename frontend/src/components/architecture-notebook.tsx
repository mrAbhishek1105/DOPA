"use client";

import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { projectsApi } from "@/lib/api/projects";
import {
  CheckCircle2,
  Circle,
  HelpCircle,
  Brain,
  Sparkles,
} from "lucide-react";

export function ArchitectureNotebook({ projectId }: { projectId: string }) {
  const { data: reqData } = useQuery({
    queryKey: ["requirements", projectId],
    queryFn: () => projectsApi.getRequirements(projectId),
    refetchInterval: 3000,
  });

  const extracted = reqData?.extracted || {};
  const missingFields = reqData?.missing_fields || [];
  const isComplete = reqData?.is_complete || false;

  const capabilities: string[] = Array.isArray(extracted.capabilities) ? extracted.capabilities : [];

  const detectedCount = Object.keys(extracted).filter(
    (k) => extracted[k] !== null && extracted[k] !== "" && !k.startsWith("__") && k !== "capabilities"
  ).length;

  const totalFields = detectedCount + missingFields.length;
  const confidence = totalFields > 0 ? Math.round((detectedCount / totalFields) * 100) : 0;

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
    realtime_latency: "Real-time",
    team_size: "Team Size",
  };

  function formatValue(key: string, value: any): string {
    if (key === "users" && typeof value === "number") {
      if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
      if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
      return value.toString();
    }
    if (key === "cloud" && typeof value === "string") return value.toUpperCase();
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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain size={14} className="text-indigo-400" />
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Architecture Blueprint
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className={`text-[11px] font-bold ${
              confidence >= 80
                ? "text-emerald-400"
                : confidence >= 50
                ? "text-amber-400"
                : "text-slate-500"
            }`}
          >
            {confidence}%
          </div>
          <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${
                confidence >= 80
                  ? "bg-emerald-500"
                  : confidence >= 50
                  ? "bg-amber-500"
                  : "bg-slate-600"
              }`}
              initial={{ width: 0 }}
              animate={{ width: `${confidence}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
        </div>
      </div>

      {/* SECTION 1: Core Requirements */}
      <div className="space-y-2">
        <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
          <CheckCircle2 size={10} className="text-emerald-500" />
          Core Requirements
        </div>
        <div className="space-y-1">
          {Object.entries(extracted)
            .filter(([k, v]) => v !== null && v !== "" && v !== undefined && !k.startsWith("__") && k !== "capabilities")
            .map(([key, value]) => (
              <motion.div
                key={key}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center justify-between text-[11px]"
              >
                <span className="text-slate-500 truncate mr-2">
                  {FIELD_LABELS[key] || key.replace(/_/g, " ")}
                </span>
                <span className="text-slate-300 font-medium truncate ml-auto">
                  {formatValue(key, value)}
                </span>
              </motion.div>
            ))}
        </div>
      </div>

      {/* SECTION 2: Detected Workloads */}
      {capabilities.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-slate-800/60">
          <div className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles size={10} className="text-indigo-400" />
            Detected Workloads
          </div>
          <div className="space-y-1">
            {capabilities.map((cap) => (
              <div key={cap} className="flex items-center justify-between text-[11px]">
                <span className="text-indigo-300 font-medium truncate">{cap}</span>
                <CheckCircle2 size={10} className="text-indigo-400 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 3: Remaining / Open Questions */}
      {missingFields.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-slate-800/60">
          <div className="text-[10px] font-semibold text-amber-500/90 uppercase tracking-wider flex items-center gap-1.5">
            <HelpCircle size={10} className="text-amber-500" />
            Open Questions
          </div>
          <div className="space-y-1">
            {missingFields.map((field) => (
              <motion.div
                key={field}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-2 text-[11px]"
              >
                <Circle size={6} className="text-amber-500/60 shrink-0" />
                <span className="text-slate-400">
                  {FIELD_LABELS[field] || field.replace(/_/g, " ")}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Complete Banner */}
      {isComplete && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 mt-3"
        >
          <div className="flex items-center gap-2 text-[11px] font-medium text-emerald-400">
            <CheckCircle2 size={12} />
            All requirements gathered
          </div>
          <div className="text-[10px] text-emerald-500/60 mt-1">
            Ready to generate production architecture
          </div>
        </motion.div>
      )}
    </div>
  );
}