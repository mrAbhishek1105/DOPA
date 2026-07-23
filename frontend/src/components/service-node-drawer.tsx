"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, CheckCircle2, ShieldAlert, Cpu, GitBranch, ArrowRight,
  Trash2, RefreshCw, DollarSign, Clock, Activity, Lock,
  AlertTriangle, TrendingUp, ChevronDown, ChevronUp,
  Zap, Server, Database, BarChart2, Eye, Terminal
} from "lucide-react";

export interface AlternativeDetail {
  name: string;
  pros: string[];
  cons: string[];
  whyNotChosen: string;
  costDelta?: string; // e.g. "+$120/mo" or "-$40/mo"
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
  // DevOps specifics
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
}

interface ServiceNodeDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  data: NodeDrawerData | null;
  onDeleteNode?: (serviceId: string) => void;
  onReplaceNode?: (serviceId: string, newName: string) => void;
}

// ─── Sub-Components ────────────────────────────────────────────

function SectionHeader({ icon, label, color = "text-slate-400" }: { icon: React.ReactNode; label: string; color?: string }) {
  return (
    <div className={`text-[10px] font-bold ${color} uppercase tracking-wider flex items-center gap-1.5`}>
      {icon}
      {label}
    </div>
  );
}

function MetricPill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-slate-900/80 border border-slate-800/60 rounded-xl p-2 text-center">
      <div className="text-[9px] text-slate-500 uppercase tracking-widest font-semibold mb-0.5">{label}</div>
      <div className={`text-xs font-bold ${color}`}>{value}</div>
    </div>
  );
}

function ComplexityBadge({ level }: { level?: "Low" | "Medium" | "High" }) {
  if (!level) return null;
  const styles = {
    Low: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    Medium: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    High: "bg-red-500/15 text-red-400 border-red-500/30",
  }[level];
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${styles}`}>
      {level} Complexity
    </span>
  );
}

function CollapsibleSection({ title, icon, color = "text-slate-400", children, defaultOpen = false }: {
  title: string; icon: React.ReactNode; color?: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-t border-slate-800/60 pt-3">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between mb-2 group"
      >
        <SectionHeader icon={icon} label={title} color={color} />
        {open ? (
          <ChevronUp size={10} className="text-slate-600 group-hover:text-slate-400 transition-colors" />
        ) : (
          <ChevronDown size={10} className="text-slate-600 group-hover:text-slate-400 transition-colors" />
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
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Drawer ────────────────────────────────────────────────

export function ServiceNodeDrawer({ isOpen, onClose, data, onDeleteNode, onReplaceNode }: ServiceNodeDrawerProps) {
  if (!isOpen || !data) return null;

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
          initial={{ x: 480 }}
          animate={{ x: 0 }}
          exit={{ x: 480 }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          onClick={(e) => e.stopPropagation()}
          className="w-[480px] max-w-full h-full bg-[#0b1120] border-l border-slate-800/80 shadow-2xl flex flex-col overflow-hidden"
        >
          {/* ── Header ── */}
          <div className="px-5 py-4 border-b border-slate-800/80 bg-slate-900/60 shrink-0">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <Server size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-100">{data.name}</h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider">{data.category}</span>
                    <ComplexityBadge level={data.operationalComplexity} />
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Quick metrics bar */}
            {(data.monthlyCost || data.sla || data.rpo || data.rto) && (
              <div className="grid grid-cols-4 gap-1.5 mt-3">
                {data.monthlyCost && <MetricPill label="Cost/mo" value={data.monthlyCost} color="text-amber-400" />}
                {data.sla && <MetricPill label="SLA" value={data.sla} color="text-emerald-400" />}
                {data.rpo && <MetricPill label="RPO" value={data.rpo} color="text-blue-400" />}
                {data.rto && <MetricPill label="RTO" value={data.rto} color="text-purple-400" />}
              </div>
            )}
          </div>

          {/* ── Scrollable Body ── */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-0">

            {/* Purpose */}
            <div className="pb-3">
              <SectionHeader icon={<Eye size={11} />} label="Purpose" />
              <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-3 rounded-xl border border-slate-800/60 mt-2">
                {data.purpose}
              </p>
            </div>

            {/* Requirement Evidence */}
            <div className="border-t border-slate-800/60 pt-3 pb-3">
              <SectionHeader icon={<Terminal size={11} />} label="Detected Requirement" color="text-indigo-400" />
              <div className="mt-2 text-xs text-indigo-300 bg-indigo-950/30 p-3 rounded-xl border border-indigo-500/20 italic">
                "{data.requirementEvidence}"
              </div>
            </div>

            {/* Why This Service (Chosen Because) */}
            <CollapsibleSection
              title="Why This Service"
              icon={<CheckCircle2 size={11} />}
              color="text-emerald-400"
              defaultOpen={true}
            >
              <div className="space-y-1.5 mb-3">
                {data.chosenBecause.map((reason, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-slate-300 bg-slate-900/40 p-2.5 rounded-lg border border-slate-800/40">
                    <ArrowRight size={11} className="text-emerald-400 shrink-0 mt-0.5" />
                    <span>{reason}</span>
                  </div>
                ))}
              </div>
            </CollapsibleSection>

            {/* Alternative Comparison Table */}
            <CollapsibleSection
              title="Alternatives Compared"
              icon={<GitBranch size={11} />}
              color="text-indigo-400"
              defaultOpen={true}
            >
              <div className="space-y-3 mb-3">
                {data.alternatives.map((alt, i) => (
                  <div key={i} className="rounded-xl border border-slate-800/60 bg-slate-900/40 overflow-hidden">
                    {/* Alt header */}
                    <div className="flex items-center justify-between px-3 py-2 bg-slate-800/40 border-b border-slate-800/60">
                      <span className="text-xs font-bold text-indigo-300">{alt.name}</span>
                      {alt.costDelta && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          alt.costDelta.startsWith("+") ? "text-red-400 bg-red-500/10" : "text-emerald-400 bg-emerald-500/10"
                        }`}>
                          {alt.costDelta}
                        </span>
                      )}
                    </div>
                    <div className="p-2.5 grid grid-cols-2 gap-2">
                      {/* Pros */}
                      <div>
                        <div className="text-[9px] font-bold text-emerald-500 uppercase mb-1 flex items-center gap-0.5">
                          <TrendingUp size={8} /> Pros
                        </div>
                        <div className="space-y-0.5">
                          {alt.pros.map((p, j) => (
                            <div key={j} className="text-[10px] text-slate-400 flex items-start gap-1">
                              <span className="text-emerald-500 mt-0.5">+</span>
                              <span>{p}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      {/* Cons */}
                      <div>
                        <div className="text-[9px] font-bold text-red-500 uppercase mb-1 flex items-center gap-0.5">
                          <AlertTriangle size={8} /> Cons
                        </div>
                        <div className="space-y-0.5">
                          {alt.cons.map((c, j) => (
                            <div key={j} className="text-[10px] text-slate-400 flex items-start gap-1">
                              <span className="text-red-500 mt-0.5">−</span>
                              <span>{c}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    {/* Why not chosen */}
                    <div className="px-2.5 pb-2 text-[10px] text-amber-400/80 bg-amber-950/10 border-t border-slate-800/40 pt-1.5">
                      ⚠ Not selected: {alt.whyNotChosen}
                    </div>
                  </div>
                ))}
              </div>
            </CollapsibleSection>

            {/* Trade-offs */}
            <CollapsibleSection
              title="Architectural Trade-offs"
              icon={<ShieldAlert size={11} />}
              color="text-amber-400"
              defaultOpen={false}
            >
              <div className="space-y-1.5 mb-3">
                {data.tradeoffs.map((t, i) => (
                  <div key={i} className="text-xs text-slate-400 flex items-start gap-2 bg-amber-950/10 border border-amber-500/15 p-2.5 rounded-lg">
                    <span className="text-amber-400 mt-0.5">•</span>
                    <span>{t}</span>
                  </div>
                ))}
              </div>
            </CollapsibleSection>

            {/* IAM Permissions */}
            {data.iamPermissions && data.iamPermissions.length > 0 && (
              <CollapsibleSection
                title="Required IAM Permissions"
                icon={<Lock size={11} />}
                color="text-rose-400"
                defaultOpen={false}
              >
                <div className="font-mono bg-slate-950/60 border border-slate-800/60 rounded-xl p-3 space-y-0.5 mb-3">
                  {data.iamPermissions.map((perm, i) => (
                    <div key={i} className="text-[10px] text-rose-300">{perm}</div>
                  ))}
                </div>
              </CollapsibleSection>
            )}

            {/* CloudWatch Metrics */}
            {data.keyMetrics && data.keyMetrics.length > 0 && (
              <CollapsibleSection
                title="Key CloudWatch Metrics"
                icon={<Activity size={11} />}
                color="text-cyan-400"
                defaultOpen={false}
              >
                <div className="space-y-1 mb-3">
                  {data.keyMetrics.map((m, i) => (
                    <div key={i} className="flex items-center gap-2 text-[11px] text-slate-300 bg-cyan-950/15 border border-cyan-500/15 px-2.5 py-1.5 rounded-lg">
                      <BarChart2 size={10} className="text-cyan-400 shrink-0" />
                      {m}
                    </div>
                  ))}
                </div>
              </CollapsibleSection>
            )}

            {/* Scaling & Terraform */}
            {(data.scalingModel || data.terraformResource) && (
              <CollapsibleSection
                title="DevOps Reference"
                icon={<Zap size={11} />}
                color="text-purple-400"
                defaultOpen={false}
              >
                <div className="space-y-2 mb-3">
                  {data.scalingModel && (
                    <div className="bg-slate-900/60 border border-slate-800/60 p-2.5 rounded-xl">
                      <div className="text-[9px] text-slate-500 uppercase mb-0.5">Scaling Model</div>
                      <div className="text-xs text-purple-300">{data.scalingModel}</div>
                    </div>
                  )}
                  {data.terraformResource && (
                    <div className="bg-slate-950/60 border border-slate-800/60 p-2.5 rounded-xl font-mono">
                      <div className="text-[9px] text-slate-500 uppercase mb-0.5">Terraform Resource</div>
                      <div className="text-xs text-blue-400">{data.terraformResource}</div>
                    </div>
                  )}
                  {data.complianceTags && data.complianceTags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {data.complianceTags.map((tag, i) => (
                        <span key={i} className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </CollapsibleSection>
            )}

            {/* Component Actions */}
            <div className="border-t border-slate-800/60 pt-4 space-y-3">
              <SectionHeader icon={<RefreshCw size={11} />} label="Component Actions" />

              {data.alternatives.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[11px] text-slate-400 font-medium">Replace with alternative:</div>
                  <div className="grid grid-cols-1 gap-1.5">
                    {data.alternatives.map((alt, i) => (
                      <button
                        key={i}
                        onClick={() => onReplaceNode && onReplaceNode(data.serviceId, alt.name)}
                        className="flex items-center justify-between px-3 py-2 bg-slate-900 hover:bg-indigo-950/40 border border-slate-800 hover:border-indigo-500/40 rounded-xl text-xs text-indigo-300 transition-all group"
                      >
                        <span className="font-semibold">{alt.name}</span>
                        <span className="text-[10px] text-slate-500 group-hover:text-indigo-400 font-bold flex items-center gap-1">
                          Replace <RefreshCw size={10} />
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => onDeleteNode && onDeleteNode(data.serviceId)}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-red-950/30 hover:bg-red-900/40 border border-red-500/30 hover:border-red-500/60 text-red-400 text-xs font-semibold rounded-xl transition-all"
              >
                <Trash2 size={13} />
                Delete Resource from Architecture
              </button>
            </div>
          </div>

          {/* ── Footer ── */}
          <div className="px-5 py-3 border-t border-slate-800/60 bg-slate-900/40 shrink-0">
            <button
              onClick={onClose}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-all"
            >
              Close Analysis Drawer
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
