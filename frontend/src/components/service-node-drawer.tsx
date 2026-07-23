"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle2, ShieldAlert, Cpu, GitBranch, ArrowRight, Layers } from "lucide-react";

export interface NodeDrawerData {
  serviceId: string;
  name: string;
  category: string;
  purpose: string;
  requirementEvidence: string;
  chosenBecause: string[];
  alternatives: { name: string; whyNot: string }[];
  tradeoffs: string[];
}

interface ServiceNodeDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  data: NodeDrawerData | null;
}

export function ServiceNodeDrawer({ isOpen, onClose, data }: ServiceNodeDrawerProps) {
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
          initial={{ x: 400 }}
          animate={{ x: 0 }}
          exit={{ x: 400 }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          onClick={(e) => e.stopPropagation()}
          className="w-[420px] max-w-full h-full bg-slate-950 border-l border-slate-800/80 shadow-2xl p-6 flex flex-col justify-between overflow-y-auto custom-scrollbar"
        >
          {/* Header */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <Cpu size={18} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-100">{data.name}</h2>
                  <span className="text-xs text-slate-400 uppercase tracking-wider">{data.category}</span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Purpose */}
            <div className="space-y-1.5">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Purpose</div>
              <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-3 rounded-xl border border-slate-800/60">
                {data.purpose}
              </p>
            </div>

            {/* Detected Requirement */}
            <div className="space-y-1.5">
              <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Detected Requirement</div>
              <div className="text-xs text-indigo-300 bg-indigo-950/30 p-3 rounded-xl border border-indigo-500/20">
                "{data.requirementEvidence}"
              </div>
            </div>

            {/* Chosen Because */}
            <div className="space-y-2 pt-2 border-t border-slate-800/60">
              <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                <CheckCircle2 size={12} /> Chosen Because
              </div>
              <div className="space-y-1.5">
                {data.chosenBecause.map((reason, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-slate-300 bg-slate-900/40 p-2.5 rounded-lg border border-slate-800/40">
                    <ArrowRight size={12} className="text-emerald-400 shrink-0 mt-0.5" />
                    <span>{reason}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Architectural Alternatives */}
            <div className="space-y-2 pt-2 border-t border-slate-800/60">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <GitBranch size={12} /> Architectural Alternatives
              </div>
              <div className="space-y-1.5">
                {data.alternatives.map((alt, i) => (
                  <div key={i} className="p-2.5 rounded-lg bg-slate-900/40 border border-slate-800/40 text-xs">
                    <span className="font-semibold text-indigo-300">{alt.name}: </span>
                    <span className="text-slate-400">{alt.whyNot}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Trade-offs */}
            <div className="space-y-2 pt-2 border-t border-slate-800/60">
              <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                <ShieldAlert size={12} /> Architectural Trade-offs
              </div>
              <div className="space-y-1">
                {data.tradeoffs.map((tradeoff, i) => (
                  <div key={i} className="text-xs text-slate-400 flex items-start gap-2">
                    <span className="text-amber-400">•</span>
                    <span>{tradeoff}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer Action */}
          <div className="pt-4 border-t border-slate-800/80 mt-6">
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
