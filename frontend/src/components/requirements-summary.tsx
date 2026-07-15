"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { projectsApi } from "@/lib/api/projects";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, Circle, FileText } from "lucide-react";

// Fields we track for progress calculation
const ALL_FIELDS = [
  "application_type",
  "cloud",
  "region",
  "users",
  "traffic",
  "budget",
  "database",
  "availability",
  "compliance",
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
  if (typeof value === "string") {
    return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return String(value);
}

export function RequirementsSummary({ projectId }: { projectId: string }) {
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
    (k) => extracted[k] !== null && extracted[k] !== "" && extracted[k] !== undefined
  );
  const totalFields = ALL_FIELDS.length;
  const completedCount = ALL_FIELDS.filter((f) => extractedKeys.includes(f)).length;
  const progressPercent = Math.round((completedCount / totalFields) * 100);

  if (extractedKeys.length === 0) {
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
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400 font-medium">
            {completedCount}/{totalFields} fields completed
          </span>
          <span className={`font-semibold ${data?.is_complete ? "text-green-400" : "text-blue-400"}`}>
            {progressPercent}%
          </span>
        </div>
        <Progress value={progressPercent} className="h-1.5 bg-slate-800" />
      </div>

      {/* Extracted fields as badges */}
      <div className="flex flex-wrap gap-2">
        {ALL_FIELDS.map((field) => {
          const value = extracted[field];
          const isExtracted = value !== null && value !== undefined && value !== "";

          return (
            <motion.div
              key={field}
              initial={isExtracted ? { scale: 0.8, opacity: 0 } : false}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.2 }}
            >
              <Badge
                variant={isExtracted ? "default" : "outline"}
                className={`text-xs font-medium transition-all duration-200 ${
                  isExtracted
                    ? "bg-blue-600/15 text-blue-300 border-blue-500/30 hover:bg-blue-600/25"
                    : "bg-transparent text-slate-600 border-slate-700/50"
                }`}
              >
                {isExtracted ? (
                  <CheckCircle2 size={10} className="mr-1 text-blue-400" />
                ) : (
                  <Circle size={10} className="mr-1 text-slate-600" />
                )}
                {FIELD_LABELS[field] || field}
                {isExtracted && (
                  <span className="ml-1 text-blue-200">
                    : {formatValue(field, value)}
                  </span>
                )}
              </Badge>
            </motion.div>
          );
        })}
      </div>

      {/* Extra extracted fields not in ALL_FIELDS */}
      {extractedKeys.filter((k) => !ALL_FIELDS.includes(k)).length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-800/50">
          {extractedKeys
            .filter((k) => !ALL_FIELDS.includes(k))
            .map((field) => (
              <Badge
                key={field}
                className="text-xs bg-slate-800/50 text-slate-300 border-slate-700/50"
              >
                {FIELD_LABELS[field] || field.replace(/_/g, " ")}
                <span className="ml-1 text-slate-400">
                  : {formatValue(field, extracted[field])}
                </span>
              </Badge>
            ))}
        </div>
      )}
    </div>
  );
}
