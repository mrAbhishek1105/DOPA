"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Shield, DollarSign, Zap, TrendingUp, Sparkles } from "lucide-react";

interface ArchitectureComparisonMatrixProps {
  onSelectOption: (optionId: string) => void;
  selectedOptionId?: string;
}

export function ArchitectureComparisonMatrix({ onSelectOption, selectedOptionId = "option-b" }: ArchitectureComparisonMatrixProps) {
  const options = [
    {
      id: "option-a",
      name: "Option A: Cost-Optimized",
      reqFit: "73%",
      modelConf: "88%",
      govConf: "80%",
      monthlyCost: "$140/mo",
      targetSla: "99.9% (Single-AZ)",
      compute: "ECS Fargate Spot",
      database: "Single-AZ RDS PostgreSQL",
      cache: "Optional Redis",
      secRisk: "MEDIUM",
      bestFor: "Staging, Development & Small Workloads",
    },
    {
      id: "option-b",
      name: "Option B: Balanced (Recommended)",
      reqFit: "87%",
      modelConf: "92%",
      govConf: "96%",
      monthlyCost: "$240/mo",
      targetSla: "99.99% (Multi-AZ)",
      compute: "ECS Fargate Multi-AZ",
      database: "Multi-AZ RDS PostgreSQL",
      cache: "ElastiCache Redis Cluster",
      secRisk: "LOW",
      bestFor: "Production E-Commerce & High Availability",
    },
    {
      id: "option-c",
      name: "Option C: Enterprise",
      reqFit: "72%",
      modelConf: "95%",
      govConf: "98%",
      monthlyCost: "$580/mo",
      targetSla: "99.999% (Multi-Region)",
      compute: "EKS Kubernetes Cluster",
      database: "Aurora PostgreSQL Serverless v2",
      cache: "ElastiCache Redis Cluster + WAF",
      secRisk: "MINIMAL",
      bestFor: "Global Enterprise & Strict Compliance",
    },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Sparkles size={16} className="text-blue-400" />
            Side-by-Side Architecture Delta Matrix
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Compare trade-offs across cost, resilience, security, and governance compliance
          </p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-800/80 bg-slate-950/60 shadow-xl">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-800/80 bg-slate-900/80">
              <th className="p-4 font-bold text-slate-400 uppercase tracking-wider w-1/4">Metric / Dimension</th>
              {options.map((opt) => (
                <th key={opt.id} className={`p-4 font-bold text-slate-200 w-1/4 ${opt.id === selectedOptionId ? "bg-blue-950/40 border-x border-blue-500/30" : ""}`}>
                  <div className="flex items-center justify-between">
                    <span>{opt.name}</span>
                    {opt.id === selectedOptionId && (
                      <span className="text-[10px] bg-blue-600 text-white font-bold px-2 py-0.5 rounded-full">ACTIVE</span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            <tr>
              <td className="p-4 font-semibold text-slate-400">Requirement Fit</td>
              {options.map((opt) => (
                <td key={opt.id} className={`p-4 font-bold text-emerald-400 ${opt.id === selectedOptionId ? "bg-blue-950/20 border-x border-blue-500/20" : ""}`}>
                  {opt.reqFit}
                </td>
              ))}
            </tr>

            <tr>
              <td className="p-4 font-semibold text-slate-400">Model Confidence</td>
              {options.map((opt) => (
                <td key={opt.id} className={`p-4 font-bold text-indigo-400 ${opt.id === selectedOptionId ? "bg-blue-950/20 border-x border-blue-500/20" : ""}`}>
                  {opt.modelConf}
                </td>
              ))}
            </tr>

            <tr>
              <td className="p-4 font-semibold text-slate-400">Governance Confidence</td>
              {options.map((opt) => (
                <td key={opt.id} className={`p-4 font-bold text-blue-400 ${opt.id === selectedOptionId ? "bg-blue-950/20 border-x border-blue-500/20" : ""}`}>
                  {opt.govConf}
                </td>
              ))}
            </tr>

            <tr>
              <td className="p-4 font-semibold text-slate-400">Estimated Monthly Spend</td>
              {options.map((opt) => (
                <td key={opt.id} className={`p-4 font-bold text-purple-300 font-mono ${opt.id === selectedOptionId ? "bg-blue-950/20 border-x border-blue-500/20" : ""}`}>
                  {opt.monthlyCost}
                </td>
              ))}
            </tr>

            <tr>
              <td className="p-4 font-semibold text-slate-400">Target Availability SLA</td>
              {options.map((opt) => (
                <td key={opt.id} className={`p-4 text-slate-300 ${opt.id === selectedOptionId ? "bg-blue-950/20 border-x border-blue-500/20" : ""}`}>
                  {opt.targetSla}
                </td>
              ))}
            </tr>

            <tr>
              <td className="p-4 font-semibold text-slate-400">Compute Layer</td>
              {options.map((opt) => (
                <td key={opt.id} className={`p-4 text-slate-300 ${opt.id === selectedOptionId ? "bg-blue-950/20 border-x border-blue-500/20" : ""}`}>
                  {opt.compute}
                </td>
              ))}
            </tr>

            <tr>
              <td className="p-4 font-semibold text-slate-400">Database Engine</td>
              {options.map((opt) => (
                <td key={opt.id} className={`p-4 text-slate-300 ${opt.id === selectedOptionId ? "bg-blue-950/20 border-x border-blue-500/20" : ""}`}>
                  {opt.database}
                </td>
              ))}
            </tr>

            <tr>
              <td className="p-4 font-semibold text-slate-400">Security Risk Profile</td>
              {options.map((opt) => (
                <td key={opt.id} className={`p-4 ${opt.id === selectedOptionId ? "bg-blue-950/20 border-x border-blue-500/20" : ""}`}>
                  <span className={`font-bold text-[10px] px-2 py-0.5 rounded ${opt.secRisk === "LOW" || opt.secRisk === "MINIMAL" ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"}`}>
                    {opt.secRisk}
                  </span>
                </td>
              ))}
            </tr>

            <tr>
              <td className="p-4 font-semibold text-slate-400">Best Suited For</td>
              {options.map((opt) => (
                <td key={opt.id} className={`p-4 text-slate-400 text-[11px] ${opt.id === selectedOptionId ? "bg-blue-950/20 border-x border-blue-500/20" : ""}`}>
                  {opt.bestFor}
                </td>
              ))}
            </tr>

            <tr>
              <td className="p-4 font-semibold text-slate-400">Governance Action</td>
              {options.map((opt) => (
                <td key={opt.id} className={`p-4 ${opt.id === selectedOptionId ? "bg-blue-950/20 border-x border-blue-500/20" : ""}`}>
                  <button
                    onClick={() => onSelectOption(opt.id)}
                    className={`w-full py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      opt.id === selectedOptionId
                        ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                        : "bg-blue-600 hover:bg-blue-500 text-white"
                    }`}
                  >
                    {opt.id === selectedOptionId ? "✓ Selected Architecture" : "Use This Architecture"}
                  </button>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
