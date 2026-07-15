"use client";

import { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { projectsApi } from "@/lib/api/projects";
import { useStore } from "@/store";
import { RecommendationOption } from "@/types/recommendation";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Shield, Zap, DollarSign, Layers, TrendingUp } from "lucide-react";

function RecommendationCardsInner({ projectId }: { projectId: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["recommendations", projectId],
    queryFn: () => projectsApi.getRecommendations(projectId),
    refetchInterval: 5000,
  });
  const setSelectedRecommendation = useStore((s) => s.setSelectedRecommendation);
  const selectedRecommendation = useStore((s) => s.selectedRecommendation);

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="flex gap-4 h-full">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex-1 rounded-xl p-4 border border-slate-800/50 bg-slate-900/30">
            <div className="flex justify-between mb-3">
              <Skeleton className="h-4 w-24 bg-slate-800" />
              <Skeleton className="h-5 w-14 rounded-full bg-slate-800" />
            </div>
            <div className="space-y-2.5 mt-4">
              <Skeleton className="h-2 w-full bg-slate-800" />
              <Skeleton className="h-2 w-3/4 bg-slate-800" />
              <Skeleton className="h-2 w-5/6 bg-slate-800" />
            </div>
            <Skeleton className="h-7 w-full mt-4 rounded-md bg-slate-800" />
          </div>
        ))}
      </div>
    );
  }

  // Empty state
  if (error || !data || data.options.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-8 h-8 rounded-full bg-slate-800/60 flex items-center justify-center mx-auto mb-2">
            <Layers size={14} className="text-slate-500" />
          </div>
          <p className="text-slate-500 text-sm">No recommendations yet</p>
          <p className="text-slate-600 text-xs mt-0.5">Complete requirements to generate options</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 h-full">
      <AnimatePresence>
        {data.options.map((rec, index) => {
          const isActive =
            rec.is_selected ||
            selectedRecommendation?.id === rec.id;

          return (
            <motion.div
              key={rec.id}
              initial={{ opacity: 0, y: 16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.3, delay: index * 0.08, ease: "easeOut" }}
              whileHover={{ scale: 1.015, y: -2 }}
              onClick={() => setSelectedRecommendation(rec)}
              className={`flex-1 rounded-xl p-3.5 border cursor-pointer flex flex-col justify-between transition-all duration-200 ${
                isActive
                  ? "bg-blue-950/30 border-blue-500/40 shadow-[0_0_20px_rgba(59,130,246,0.1)]"
                  : "bg-slate-900/30 border-slate-800/50 hover:border-slate-700/60 hover:bg-slate-900/50"
              }`}
            >
              <div>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-[13px] text-slate-200 leading-snug pr-2">
                    {rec.name}
                  </h3>
                  <span
                    className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isActive
                        ? "bg-blue-500/20 text-blue-300"
                        : "bg-slate-800/80 text-slate-400"
                    }`}
                  >
                    {rec.score_percent ?? (rec.score * 100).toFixed(0)}%
                  </span>
                </div>

                <div className="space-y-1.5 mt-3">
                  <MetricBar icon={DollarSign} label="Cost" value={rec.cost ?? 75} />
                  <MetricBar icon={Zap} label="Complexity" value={rec.complexity ?? 50} reverse />
                  <MetricBar icon={TrendingUp} label="Scale" value={rec.scalability ?? 80} />
                  {rec.security != null && (
                    <MetricBar icon={Shield} label="Security" value={rec.security} />
                  )}
                </div>
              </div>

              <button
                className={`mt-3 w-full py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-slate-800/60 text-slate-400 hover:bg-slate-700/60 hover:text-slate-300"
                }`}
              >
                {isActive ? "✓ Active" : "Select"}
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

export const RecommendationCards = memo(RecommendationCardsInner);

// ── Metric Bar ─────────────────────────────────────────────

interface MetricBarProps {
  icon: React.ElementType;
  label: string;
  value: number;
  reverse?: boolean;
}

function MetricBar({ icon: Icon, label, value, reverse = false }: MetricBarProps) {
  const isGood = reverse ? value < 50 : value > 70;
  const isWarning = reverse ? value >= 50 && value < 80 : value >= 40 && value <= 70;

  let barColor = "bg-red-500/80";
  if (isGood) barColor = "bg-emerald-500/80";
  else if (isWarning) barColor = "bg-amber-500/80";

  return (
    <Tooltip>
      <TooltipTrigger>
        <div className="flex items-center gap-2 text-[11px] group cursor-default w-full">
          <Icon size={10} className="text-slate-500 shrink-0" />
          <span className="text-slate-500 w-14 truncate text-left">{label}</span>
          <div className="flex-1 h-1 bg-slate-800/80 rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${barColor}`}
              initial={{ width: 0 }}
              animate={{ width: `${value}%` }}
              transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
            />
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        {label}: {value}%
      </TooltipContent>
    </Tooltip>
  );
}
