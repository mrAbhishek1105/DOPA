"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { projectsApi } from "@/lib/api/projects";
import { Check, Loader2 } from "lucide-react";

const PIPELINE_STEPS = [
  { key: "discover", label: "Discover" },
  { key: "design", label: "Design" },
  { key: "analyze", label: "Analyze" },
  { key: "generate", label: "Generate" },
  { key: "complete", label: "Complete" },
] as const;

function getStepIndex(status: string): number {
  if (["discovery", "requirements_gathered"].includes(status)) return 0;
  if (["options_generated", "graph_generated"].includes(status)) return 1;
  if (["analyzing"].includes(status)) return 2;
  if (["terraform_generating"].includes(status)) return 3;
  if (["completed"].includes(status)) return 4;
  return 0;
}

export function PipelineStatus({ projectId }: { projectId: string }) {
  const { data } = useQuery({
    queryKey: ["status", projectId],
    queryFn: () => projectsApi.getStatus(projectId),
    refetchInterval: 3000,
  });

  const currentStatus = data?.status || "discovery";
  const currentIndex = getStepIndex(currentStatus);

  return (
    <div className="flex items-center gap-1">
      {PIPELINE_STEPS.map((step, i) => {
        const isCompleted = i < currentIndex;
        const isCurrent = i === currentIndex;
        const isFuture = i > currentIndex;

        return (
          <div key={step.key} className="flex items-center">
            {/* Step indicator */}
            <motion.div
              className="flex items-center gap-1.5"
              initial={false}
              animate={{ opacity: 1 }}
            >
              {/* Dot / Check */}
              <div
                className={`flex items-center justify-center transition-all duration-300 ${
                  isCompleted
                    ? "w-4 h-4"
                    : isCurrent
                    ? "w-5 h-5"
                    : "w-3.5 h-3.5"
                }`}
              >
                {isCompleted ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-4 h-4 rounded-full bg-green-500/20 flex items-center justify-center"
                  >
                    <Check size={10} className="text-green-400" />
                  </motion.div>
                ) : isCurrent ? (
                  <motion.div
                    initial={{ scale: 0.5 }}
                    animate={{ scale: 1 }}
                    className="w-5 h-5 rounded-full bg-blue-500/20 border border-blue-500/50 flex items-center justify-center"
                  >
                    {currentStatus === "analyzing" ? (
                      <Loader2 size={10} className="text-blue-400 animate-spin" />
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                    )}
                  </motion.div>
                ) : (
                  <div className="w-3.5 h-3.5 rounded-full bg-slate-800 border border-slate-700" />
                )}
              </div>

              {/* Label */}
              <span
                className={`text-[11px] font-medium transition-colors duration-200 hidden md:inline ${
                  isCompleted
                    ? "text-green-400/70"
                    : isCurrent
                    ? "text-blue-300"
                    : "text-slate-600"
                }`}
              >
                {step.label}
              </span>
            </motion.div>

            {/* Connector line */}
            {i < PIPELINE_STEPS.length - 1 && (
              <div className="mx-1.5 hidden md:block">
                <div
                  className={`w-4 h-px transition-colors duration-300 ${
                    isCompleted ? "bg-green-500/40" : "bg-slate-700/50"
                  }`}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
