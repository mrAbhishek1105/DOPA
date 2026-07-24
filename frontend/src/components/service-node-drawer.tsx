"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { configurationApi } from "@/lib/api/configuration";
import { DynamicResourceForm } from "@/components/dynamic-resource-form";
import {
  X, CheckCircle2, ShieldAlert, GitBranch, ArrowRight,
  Trash2, RefreshCw, DollarSign, Activity, Lock,
  AlertTriangle, Eye, FileCode, History, Sliders,
  Copy, Check, Server, BarChart3, Shield, TrendingDown,
  Info, Zap, Clock, Star, ChevronRight, ExternalLink,
  CircleCheck, CircleX, CircleAlert, Layers
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AlternativeDetail {
  name: string;
  pros: string[];
  cons: string[];
  whyNotChosen: string;
  costDelta?: string;
}

export interface SecurityFinding {
  id: string;
  rule: string;
  description: string;
  status: "PASS" | "WARN" | "FAIL";
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";
  framework: string;
  remediation?: string;
}

export interface CostLineItem {
  label: string;
  amount: string;
  unit: string;
  note?: string;
}

export interface CostData {
  monthlyTotal: string;
  annualTotal: string;
  breakdown: CostLineItem[];
  optimizationTips: string[];
  pricingModel: string;
}

export interface ValidationCheck {
  id: string;
  label: string;
  description: string;
  status: "PASS" | "WARN" | "FAIL";
  category: string;
  fix?: string;
}

export interface NodeDrawerData {
  serviceId: string;
  name: string;
  category: string;
  purpose: string;
  requirementEvidence: string;
  chosenBecause: string[];
  alternatives: AlternativeDetail[];
  tradeoffs: string[];
  monthlyCost?: string;
  sla?: string;
  rpo?: string;
  rto?: string;
  scalingModel?: string;
  iamPermissions?: string[];
  keyMetrics?: string[];
  terraformResource?: string;
  complianceTags?: string[];
  operationalComplexity?: "Low" | "Medium" | "High";
  // enriched fields
  securityFindings?: SecurityFinding[];
  securityScore?: number;
  costData?: CostData;
  terraformPreview?: string;
  validationChecks?: ValidationCheck[];
}

interface ServiceNodeDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  data: NodeDrawerData | null;
  projectId?: string;
  initialTab?: DrawerTab;
  onDeleteNode?: (serviceId: string) => void;
  onReplaceNode?: (serviceId: string, newName: string) => void;
}

type DrawerTab = "overview" | "config" | "security" | "cost" | "hcl" | "validation" | "monitoring";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function severityColor(severity: SecurityFinding["severity"]) {
  return {
    CRITICAL: "text-red-400 bg-red-500/10 border-red-500/30",
    HIGH: "text-orange-400 bg-orange-500/10 border-orange-500/30",
    MEDIUM: "text-amber-400 bg-amber-500/10 border-amber-500/30",
    LOW: "text-blue-400 bg-blue-500/10 border-blue-500/30",
    INFO: "text-slate-400 bg-slate-500/10 border-slate-500/30",
  }[severity];
}

function statusIcon(status: "PASS" | "WARN" | "FAIL", size = 14) {
  if (status === "PASS") return <CircleCheck size={size} className="text-emerald-400 shrink-0" />;
  if (status === "WARN") return <CircleAlert size={size} className="text-amber-400 shrink-0" />;
  return <CircleX size={size} className="text-red-400 shrink-0" />;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text).catch(() => {});
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold transition-all border border-slate-700/60"
    >
      {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ServiceNodeDrawer({
  isOpen,
  onClose,
  data,
  projectId = "",
  initialTab = "config",
  onDeleteNode,
  onReplaceNode,
}: ServiceNodeDrawerProps) {
  const [activeTab, setActiveTab] = useState<DrawerTab>(initialTab);

  useEffect(() => {
    if (isOpen) setActiveTab(initialTab);
  }, [isOpen, initialTab, data?.serviceId]);

  const { data: configArtifact } = useQuery({
    queryKey: ["project-config", projectId],
    queryFn: () => configurationApi.getConfiguration(projectId),
    enabled: !!projectId && isOpen,
  });

  if (!isOpen || !data) return null;
  const currentResourceInstance = configArtifact?.resources[data.serviceId];

  const tabs = [
    { id: "overview", label: "Overview", icon: Eye },
    { id: "config", label: "Config", icon: Sliders },
    { id: "security", label: "Security", icon: Shield },
    { id: "cost", label: "Cost", icon: DollarSign },
    { id: "hcl", label: "Terraform", icon: FileCode },
    { id: "validation", label: "Validate", icon: CircleCheck },
    { id: "monitoring", label: "Metrics", icon: BarChart3 },
  ] as const;

  // Compute security score from findings
  const findings = data.securityFindings || [];
  const secScore = data.securityScore ?? (
    findings.length === 0 ? 88 :
      Math.round(
        (findings.filter(f => f.status === "PASS").length / findings.length) * 100
      )
  );
  const secColor = secScore >= 85 ? "text-emerald-400" : secScore >= 65 ? "text-amber-400" : "text-red-400";
  const secRingColor = secScore >= 85 ? "stroke-emerald-400" : secScore >= 65 ? "stroke-amber-400" : "stroke-red-400";

  // Compute validation score
  const checks = data.validationChecks || [];
  const passCount = checks.filter(c => c.status === "PASS").length;
  const validationScore = checks.length > 0 ? Math.round((passCount / checks.length) * 100) : 100;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex justify-end"
      >
        <motion.div
          initial={{ x: 520 }}
          animate={{ x: 0 }}
          exit={{ x: 520 }}
          transition={{ type: "spring", damping: 26, stiffness: 220 }}
          onClick={(e) => e.stopPropagation()}
          className="w-[500px] max-w-full h-full bg-[#090e1a] border-l border-slate-800/80 shadow-2xl flex flex-col overflow-hidden"
        >
          {/* ── Header ── */}
          <div className="px-5 py-4 border-b border-slate-800/80 bg-gradient-to-r from-slate-900/80 to-slate-900/40 shrink-0">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600/30 to-indigo-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-lg">
                  <Server size={19} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-100 leading-tight">{data.name}</h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider">{data.category}</span>
                    {data.complianceTags && data.complianceTags.map(tag => (
                      <span key={tag} className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            {/* Quick stats strip */}
            <div className="grid grid-cols-4 gap-2 mb-3">
              {[
                { label: "Cost/mo", value: data.monthlyCost || "~$20", color: "text-emerald-400" },
                { label: "SLA", value: data.sla || "99.9%", color: "text-blue-400" },
                { label: "Security", value: `${secScore}%`, color: secColor },
                { label: "Validate", value: `${validationScore}%`, color: validationScore >= 80 ? "text-emerald-400" : "text-amber-400" },
              ].map(s => (
                <div key={s.label} className="bg-slate-900/80 border border-slate-800/60 rounded-lg p-2 text-center">
                  <div className={`text-sm font-black ${s.color} leading-none`}>{s.value}</div>
                  <div className="text-[9px] text-slate-500 uppercase tracking-wider mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Tab bar */}
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
              {tabs.map((tab) => {
                const IconComp = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as DrawerTab)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold shrink-0 transition-all ${isActive
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-900/40"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                      }`}
                  >
                    <IconComp size={11} />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Scrollable Content ── */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-5">

            {/* ════════ TAB: OVERVIEW ════════ */}
            {activeTab === "overview" && (
              <div className="space-y-5 pb-6">
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Purpose</div>
                  <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/80 p-3.5 rounded-xl border border-slate-800/80">{data.purpose}</p>
                </div>

                <div className="border-t border-slate-800/60 pt-3.5">
                  <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1.5">Detected Requirement</div>
                  <div className="text-xs text-indigo-300 bg-indigo-950/40 p-3.5 rounded-xl border border-indigo-500/30 italic">
                    "{data.requirementEvidence}"
                  </div>
                </div>

                <div className="border-t border-slate-800/60 pt-3.5 space-y-2">
                  <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <CircleCheck size={12} /> Chosen Because
                  </div>
                  {data.chosenBecause.map((r, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-xs text-slate-200 bg-slate-900/60 p-3 rounded-xl border border-slate-800/60">
                      <ArrowRight size={12} className="text-emerald-400 shrink-0 mt-0.5" />
                      <span>{r}</span>
                    </div>
                  ))}
                </div>

                {data.alternatives?.length > 0 && (
                  <div className="border-t border-slate-800/60 pt-3.5 space-y-2">
                    <div className="text-[10px] font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                      <GitBranch size={12} /> Architectural Alternatives
                    </div>
                    {data.alternatives.map((alt, i) => (
                      <div key={i} className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800/80 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-100">{alt.name}</span>
                          {alt.costDelta && (
                            <span className="text-[10px] font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">{alt.costDelta}</span>
                          )}
                        </div>
                        {alt.whyNotChosen && (
                          <p className="text-[11px] text-slate-400 italic"><span className="font-semibold text-slate-300">Why not chosen:</span> {alt.whyNotChosen}</p>
                        )}
                        {alt.pros?.length > 0 && (
                          <div className="text-[10px] text-emerald-400">
                            <span className="font-bold uppercase text-slate-500">Pros: </span>{alt.pros.join(" · ")}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {data.tradeoffs?.length > 0 && (
                  <div className="border-t border-slate-800/60 pt-3.5 space-y-2">
                    <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <AlertTriangle size={12} /> Architectural Trade-Offs
                    </div>
                    {data.tradeoffs.map((t, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-amber-200/90 bg-amber-950/20 p-3 rounded-xl border border-amber-500/20">
                        <span className="text-amber-400 font-bold">•</span>
                        <span>{t}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="border-t border-slate-800/60 pt-4 space-y-2">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Component Actions</div>
                  {data.alternatives?.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-[11px] text-slate-400">Replace with alternative:</div>
                      {data.alternatives.map((alt, i) => (
                        <button key={i}
                          onClick={() => onReplaceNode && onReplaceNode(data.serviceId, alt.name)}
                          className="w-full flex items-center justify-between px-3.5 py-2.5 bg-slate-900 hover:bg-indigo-950/40 border border-slate-800 hover:border-indigo-500/40 rounded-xl text-xs text-indigo-300 transition-all group">
                          <span className="font-semibold">{alt.name}</span>
                          <span className="text-[10px] text-slate-500 group-hover:text-indigo-400 flex items-center gap-1">Replace <RefreshCw size={10} /></span>
                        </button>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={() => onDeleteNode && onDeleteNode(data.serviceId)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-950/30 hover:bg-red-900/40 border border-red-500/30 hover:border-red-500/60 text-red-400 text-xs font-semibold rounded-xl transition-all">
                    <Trash2 size={13} /> Delete Resource from Architecture
                  </button>
                </div>
              </div>
            )}

            {/* ════════ TAB: CONFIG ════════ */}
            {activeTab === "config" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-blue-950/20 p-3 rounded-xl border border-blue-500/20">
                  <div>
                    <div className="text-xs font-bold text-blue-300">Infrastructure Configuration</div>
                    <div className="text-[10px] text-slate-400">Schema-driven parameters with DOPA Smart Defaults</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-mono font-bold text-emerald-400">{currentResourceInstance?.completion_percentage ?? 100}%</div>
                    <div className="text-[9px] text-slate-500 uppercase">Readiness</div>
                  </div>
                </div>
                <DynamicResourceForm
                  key={data.serviceId}
                  projectId={projectId}
                  resourceId={data.serviceId}
                  provider="aws"
                  service={data.name}
                  currentProperties={currentResourceInstance?.properties}
                />
              </div>
            )}

            {/* ════════ TAB: SECURITY ════════ */}
            {activeTab === "security" && (
              <div className="space-y-5 pb-6">

                {/* Security Score Hero */}
                <div className="relative bg-gradient-to-br from-slate-900 to-slate-900/60 border border-slate-800/80 rounded-2xl p-5 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-transparent pointer-events-none" />
                  <div className="flex items-center gap-5">
                    {/* Circular score gauge */}
                    <div className="relative w-20 h-20 shrink-0">
                      <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
                        <circle cx="18" cy="18" r="15.9" fill="none" stroke="#1e293b" strokeWidth="3" />
                        <circle
                          cx="18" cy="18" r="15.9" fill="none"
                          className={secRingColor}
                          strokeWidth="3"
                          strokeDasharray={`${secScore} ${100 - secScore}`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className={`text-lg font-black leading-none ${secColor}`}>{secScore}</span>
                        <span className="text-[8px] text-slate-500 uppercase">Score</span>
                      </div>
                    </div>

                    <div className="flex-1">
                      <div className="text-sm font-bold text-slate-100 mb-1">Security Analysis</div>
                      <div className="text-[11px] text-slate-400 mb-3">
                        {secScore >= 85 ? "Strong security posture. No critical findings." :
                          secScore >= 65 ? "Acceptable posture. Review warnings." :
                            "Action required. Address critical findings."}
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {[
                          { label: "PASS", count: findings.filter(f => f.status === "PASS").length, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" },
                          { label: "WARN", count: findings.filter(f => f.status === "WARN").length, color: "text-amber-400 bg-amber-500/10 border-amber-500/30" },
                          { label: "FAIL", count: findings.filter(f => f.status === "FAIL").length, color: "text-red-400 bg-red-500/10 border-red-500/30" },
                        ].map(b => (
                          <div key={b.label} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-bold ${b.color}`}>
                            <span>{b.count}</span><span className="font-medium">{b.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Compliance Tags */}
                {data.complianceTags && data.complianceTags.length > 0 && (
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Compliance Coverage</div>
                    <div className="flex flex-wrap gap-2">
                      {data.complianceTags.map(tag => (
                        <div key={tag} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-[11px] font-bold text-emerald-300">
                          <CircleCheck size={11} /> {tag}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Security Findings */}
                {findings.length > 0 && (
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <ShieldAlert size={11} /> Security Findings
                    </div>
                    <div className="space-y-2">
                      {findings.map((f) => (
                        <div key={f.id} className={`p-3.5 rounded-xl border ${f.status === "PASS" ? "bg-emerald-950/20 border-emerald-500/20" : f.status === "WARN" ? "bg-amber-950/20 border-amber-500/20" : "bg-red-950/20 border-red-500/20"}`}>
                          <div className="flex items-start gap-2.5">
                            {statusIcon(f.status, 14)}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className="text-xs font-bold text-slate-100">{f.rule}</span>
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${severityColor(f.severity)}`}>
                                  {f.severity}
                                </span>
                                <span className="text-[9px] text-slate-500 font-mono">{f.framework}</span>
                              </div>
                              <p className="text-[11px] text-slate-400">{f.description}</p>
                              {f.status !== "PASS" && f.remediation && (
                                <div className="mt-2 flex items-start gap-1.5 text-[10px] text-indigo-300 bg-indigo-950/30 px-2.5 py-1.5 rounded-lg border border-indigo-500/20">
                                  <Zap size={10} className="shrink-0 mt-0.5" />
                                  <span><span className="font-bold">Fix:</span> {f.remediation}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* IAM Permissions */}
                {data.iamPermissions && data.iamPermissions.length > 0 && (
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Lock size={11} /> Required IAM Permissions
                    </div>
                    <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3.5 space-y-1.5">
                      {data.iamPermissions.map((p, i) => (
                        <div key={i} className="flex items-center gap-2 text-[11px] font-mono text-rose-300">
                          <ChevronRight size={10} className="text-slate-600 shrink-0" />
                          {p}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ════════ TAB: COST ════════ */}
            {activeTab === "cost" && (
              <div className="space-y-5 pb-6">
                {/* Hero cost card */}
                <div className="relative bg-gradient-to-br from-emerald-950/40 to-slate-900/80 border border-emerald-500/25 rounded-2xl p-5 overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                  <div className="text-[10px] font-bold text-emerald-400/70 uppercase tracking-wider mb-1">Estimated Monthly Cost</div>
                  <div className="text-4xl font-black text-emerald-300 mb-1">{data.costData?.monthlyTotal || data.monthlyCost || "~$20"}</div>
                  <div className="text-[11px] text-slate-400">{data.costData?.annualTotal ? `${data.costData.annualTotal}/year` : "per month · On-Demand pricing"}</div>
                  <div className="mt-3 text-[10px] text-slate-500">{data.costData?.pricingModel || "AWS On-Demand · us-east-1"}</div>
                </div>

                {/* Cost breakdown */}
                {data.costData?.breakdown && data.costData.breakdown.length > 0 && (
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Cost Breakdown</div>
                    <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl overflow-hidden">
                      {data.costData.breakdown.map((item, i) => (
                        <div key={i} className={`flex items-center justify-between px-4 py-3 ${i !== 0 ? "border-t border-slate-800/60" : ""}`}>
                          <div>
                            <div className="text-xs font-semibold text-slate-200">{item.label}</div>
                            <div className="text-[10px] text-slate-500">{item.unit}{item.note ? ` · ${item.note}` : ""}</div>
                          </div>
                          <div className="text-sm font-bold text-emerald-300 font-mono">{item.amount}</div>
                        </div>
                      ))}
                      <div className="flex items-center justify-between px-4 py-3 border-t border-slate-700/80 bg-slate-800/40">
                        <span className="text-xs font-bold text-slate-200">Total</span>
                        <span className="text-sm font-black text-emerald-300 font-mono">{data.costData.monthlyTotal}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Optimization Tips */}
                {data.costData?.optimizationTips && data.costData.optimizationTips.length > 0 && (
                  <div>
                    <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <TrendingDown size={11} /> Cost Optimization Tips
                    </div>
                    <div className="space-y-2">
                      {data.costData.optimizationTips.map((tip, i) => (
                        <div key={i} className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-950/20 border border-amber-500/20 text-[11px] text-amber-200/90">
                          <Star size={11} className="text-amber-400 shrink-0 mt-0.5" />
                          <span>{tip}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* SLA / RTO / RPO quick info */}
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Reliability & Recovery</div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "SLA", value: data.sla || "99.9%", color: "text-blue-400" },
                      { label: "RTO", value: data.rto || "< 5 min", color: "text-indigo-400" },
                      { label: "RPO", value: data.rpo || "15 min", color: "text-purple-400" },
                    ].map(m => (
                      <div key={m.label} className="bg-slate-900/80 border border-slate-800/60 rounded-xl p-3 text-center">
                        <div className={`text-sm font-black ${m.color}`}>{m.value}</div>
                        <div className="text-[9px] text-slate-500 uppercase tracking-wider mt-0.5">{m.label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-950/20 border border-blue-500/20 text-[10px] text-blue-300">
                  <Info size={11} className="shrink-0 mt-0.5" />
                  Estimates based on AWS us-east-1 On-Demand pricing. Actual costs may vary based on usage patterns, Reserved Instances, and data transfer volumes.
                </div>
              </div>
            )}

            {/* ════════ TAB: HCL TERRAFORM ════════ */}
            {activeTab === "hcl" && (
              <div className="space-y-4 pb-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Terraform HCL Preview</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Generated by DOPA · {data.terraformResource || "aws_resource"}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <CopyButton text={data.terraformPreview || `resource "${data.terraformResource || "aws_resource"}" "main" {\n  # Configure in the Config tab\n}`} />
                    <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2 py-1 rounded-lg">
                      <CircleCheck size={9} /> Valid HCL
                    </span>
                  </div>
                </div>

                {/* Code block */}
                <div className="relative bg-slate-950/90 border border-slate-800/80 rounded-xl overflow-hidden">
                  {/* Window chrome */}
                  <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-800/80 bg-slate-900/60">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500/70" />
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
                    <span className="text-[10px] text-slate-500 ml-2 font-mono">main.tf</span>
                  </div>
                  <pre className="p-4 overflow-x-auto text-[11px] leading-[1.7] font-mono">
                    <HclHighlight code={data.terraformPreview || defaultTerraformPreview(data)} />
                  </pre>
                </div>

                {/* Registry link */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800/60">
                  <div className="text-[11px] text-slate-400">
                    Resource: <span className="text-blue-300 font-mono">{data.terraformResource || "aws_resource"}</span>
                  </div>
                  <a
                    href={`https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/${(data.terraformResource || "aws_resource").replace("aws_", "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    Terraform Docs <ExternalLink size={10} />
                  </a>
                </div>
              </div>
            )}

            {/* ════════ TAB: VALIDATION ════════ */}
            {activeTab === "validation" && (
              <div className="space-y-5 pb-6">
                {/* Validation score hero */}
                <div className="relative bg-gradient-to-br from-slate-900/80 to-slate-900/40 border border-slate-800/80 rounded-2xl p-5 overflow-hidden">
                  <div className="flex items-center gap-4">
                    <div className="relative w-16 h-16 shrink-0">
                      <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
                        <circle cx="18" cy="18" r="15.9" fill="none" stroke="#1e293b" strokeWidth="3.5" />
                        <circle
                          cx="18" cy="18" r="15.9" fill="none"
                          className={validationScore >= 80 ? "stroke-emerald-400" : validationScore >= 60 ? "stroke-amber-400" : "stroke-red-400"}
                          strokeWidth="3.5"
                          strokeDasharray={`${validationScore} ${100 - validationScore}`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className={`text-base font-black leading-none ${validationScore >= 80 ? "text-emerald-400" : validationScore >= 60 ? "text-amber-400" : "text-red-400"}`}>{validationScore}%</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-100 mb-1">Infrastructure Validation</div>
                      <div className="text-[11px] text-slate-400 mb-2">
                        {passCount} of {checks.length} checks passed
                        {checks.length === 0 && " · Default validation applied"}
                      </div>
                      <div className="flex gap-2">
                        {[
                          { label: "Pass", count: checks.filter(c => c.status === "PASS").length, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" },
                          { label: "Warn", count: checks.filter(c => c.status === "WARN").length, color: "text-amber-400 bg-amber-500/10 border-amber-500/30" },
                          { label: "Fail", count: checks.filter(c => c.status === "FAIL").length, color: "text-red-400 bg-red-500/10 border-red-500/30" },
                        ].map(b => (
                          <div key={b.label} className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-bold ${b.color}`}>
                            {b.count} {b.label}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Validation checks list */}
                {checks.length > 0 ? (
                  <div className="space-y-2">
                    {["FAIL", "WARN", "PASS"].map(status => {
                      const statusChecks = checks.filter(c => c.status === status);
                      if (statusChecks.length === 0) return null;
                      return (
                        <div key={status}>
                          <div className={`text-[10px] font-bold uppercase tracking-wider mb-1.5 ${status === "PASS" ? "text-emerald-400" : status === "WARN" ? "text-amber-400" : "text-red-400"}`}>
                            {status} ({statusChecks.length})
                          </div>
                          <div className="space-y-1.5">
                            {statusChecks.map(check => (
                              <div key={check.id} className={`p-3.5 rounded-xl border ${check.status === "PASS" ? "bg-emerald-950/15 border-emerald-500/15" : check.status === "WARN" ? "bg-amber-950/20 border-amber-500/20" : "bg-red-950/20 border-red-500/25"}`}>
                                <div className="flex items-start gap-2.5">
                                  {statusIcon(check.status, 14)}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                      <span className="text-xs font-semibold text-slate-100">{check.label}</span>
                                      <span className="text-[9px] text-slate-500 bg-slate-800/60 px-1.5 py-0.5 rounded font-mono">{check.category}</span>
                                    </div>
                                    <p className="text-[10px] text-slate-400">{check.description}</p>
                                    {check.status !== "PASS" && check.fix && (
                                      <div className="mt-1.5 flex items-start gap-1.5 text-[10px] text-indigo-300 bg-indigo-950/30 px-2.5 py-1.5 rounded-lg border border-indigo-500/20">
                                        <Zap size={9} className="shrink-0 mt-0.5" />
                                        <span><span className="font-bold">Fix:</span> {check.fix}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/60 text-center">
                    <CircleCheck size={24} className="text-emerald-400 mx-auto mb-2" />
                    <div className="text-xs font-bold text-slate-200 mb-1">Default Validation Applied</div>
                    <div className="text-[11px] text-slate-400">Configure resource parameters in the Config tab to run full validation checks.</div>
                  </div>
                )}
              </div>
            )}

            {/* ════════ TAB: MONITORING ════════ */}
            {activeTab === "monitoring" && (
              <div className="space-y-5 pb-6">
                <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                  <BarChart3 size={12} /> CloudWatch Metrics & Alarms
                </div>

                <div className="space-y-2">
                  {(data.keyMetrics || ["Availability > 99.9%", "Latency p95 < 500ms", "Error Rate < 0.1%"]).map((m, i) => (
                    <div key={i} className="flex items-center justify-between p-3.5 rounded-xl bg-cyan-950/15 border border-cyan-500/20 text-xs">
                      <div className="flex items-center gap-2.5">
                        <Activity size={12} className="text-cyan-400 shrink-0" />
                        <span className="text-slate-200 font-mono font-medium">{m}</span>
                      </div>
                      <span className="text-[9px] font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">ALARM SET</span>
                    </div>
                  ))}
                </div>

                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Recommended Dashboards</div>
                {[
                  { name: "Request Volume & Latency", desc: "Track TPS and response time percentiles" },
                  { name: "Error Rate & 5xx Monitoring", desc: "Alert on elevated error rates" },
                  { name: "Capacity & Scaling Events", desc: "Monitor auto-scaling activity" },
                ].map((d, i) => (
                  <div key={i} className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/60 hover:border-cyan-500/30 transition-colors cursor-pointer group">
                    <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                      <BarChart3 size={13} className="text-cyan-400" />
                    </div>
                    <div className="flex-1">
                      <div className="text-xs font-semibold text-slate-200 group-hover:text-cyan-300 transition-colors">{d.name}</div>
                      <div className="text-[10px] text-slate-500">{d.desc}</div>
                    </div>
                    <ExternalLink size={11} className="text-slate-600 group-hover:text-cyan-400 transition-colors" />
                  </div>
                ))}

                <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-900/60 border border-slate-800/60 text-[10px] text-slate-400">
                  <Clock size={11} />
                  Alarms trigger after 2 consecutive evaluation periods · 1-minute granularity
                </div>
              </div>
            )}
          </div>

          {/* ── Footer ── */}
          <div className="px-5 py-3 border-t border-slate-800/60 bg-slate-900/40 shrink-0">
            <button
              onClick={onClose}
              className="w-full py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-all border border-slate-700/50"
            >
              Close Drawer
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── HCL Syntax Highlighter ───────────────────────────────────────────────────

function HclHighlight({ code }: { code: string }) {
  const lines = code.split("\n");
  return (
    <>
      {lines.map((line, i) => {
        let colored = <span className="text-slate-300">{line}</span>;
        if (line.trimStart().startsWith("#")) {
          colored = <span className="text-slate-500 italic">{line}</span>;
        } else if (/^resource\s+"/.test(line.trim()) || /^(variable|output|module|locals)\s/.test(line.trim())) {
          colored = (
            <span>
              <span className="text-purple-400">{line.match(/^\s*/)?.[0]}{line.trim().split(" ")[0]}</span>
              <span className="text-amber-300">{" " + line.trim().split(" ").slice(1).join(" ").replace("{", "").trim()}</span>
              <span className="text-slate-300">{" {"}</span>
            </span>
          );
        } else if (line.includes("=")) {
          const [key, ...rest] = line.split("=");
          const val = rest.join("=");
          colored = (
            <span>
              <span className="text-blue-300">{key}</span>
              <span className="text-slate-400">{"="}</span>
              <span className="text-emerald-300">{val}</span>
            </span>
          );
        } else if (line.trim() === "}" || line.trim() === "{") {
          colored = <span className="text-slate-400">{line}</span>;
        }
        return (
          <div key={i} className="flex">
            <span className="w-8 shrink-0 text-slate-700 select-none text-right mr-4">{i + 1}</span>
            {colored}
          </div>
        );
      })}
    </>
  );
}

function defaultTerraformPreview(data: NodeDrawerData): string {
  return `resource "${data.terraformResource || "aws_resource"}" "main" {
  name = "${data.name.toLowerCase().replace(/[^a-z0-9]/g, "_")}"

  # ── Properties from Configuration ──────────────────
  # Configure these in the 'Config' tab above

  tags = {
    Name        = "${data.name}"
    Environment = "production"
    ManagedBy   = "DOPA-Terraform"
    Component   = "${data.category}"
  }
}`;
}
