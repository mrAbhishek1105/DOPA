"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronRight, Server, Database, Globe, Shield, Cloud } from "lucide-react";
import { useStore } from "@/store";

export function ResourcePalette() {
  const { leftSidebarOpen } = useStore();
  const [providerOpen, setProviderOpen] = useState(true);
  const [resourcesOpen, setResourcesOpen] = useState(true);

  if (!leftSidebarOpen) return null;

  return (
    <div className="w-64 h-full border-r border-slate-800/60 bg-slate-900/40 backdrop-blur-sm flex flex-col shrink-0">
      <div className="h-14 border-b border-slate-800/60 flex items-center px-4 font-bold text-sm tracking-widest text-slate-300 uppercase">
        <Cloud size={14} className="mr-2 text-blue-400" />
        Palette
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Provider Options */}
        <div>
          <button 
            onClick={() => setProviderOpen(!providerOpen)}
            className="w-full flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 hover:text-slate-200 transition-colors"
          >
            Provider options
            {providerOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
          
          <AnimatePresence>
            {providerOpen && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }} 
                animate={{ height: "auto", opacity: 1 }} 
                exit={{ height: 0, opacity: 0 }} 
                className="overflow-hidden space-y-2"
              >
                <div className="bg-slate-950/60 border border-slate-800/60 rounded-lg p-2.5 cursor-pointer hover:border-blue-500/50 hover:bg-slate-800/40 transition-all group">
                  <div className="text-xs font-semibold text-slate-200 group-hover:text-blue-400">AWS</div>
                  <div className="text-[10px] text-slate-500">ap-south-1 (Mumbai)</div>
                </div>
                <div className="bg-slate-950/60 border border-slate-800/60 rounded-lg p-2.5 cursor-pointer hover:border-slate-700 hover:bg-slate-800/40 transition-all opacity-50">
                  <div className="text-xs font-semibold text-slate-400">GCP</div>
                  <div className="text-[10px] text-slate-500">Coming soon</div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Resources */}
        <div>
          <button 
            onClick={() => setResourcesOpen(!resourcesOpen)}
            className="w-full flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 hover:text-slate-200 transition-colors"
          >
            Resources
            {resourcesOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
          
          <AnimatePresence>
            {resourcesOpen && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }} 
                animate={{ height: "auto", opacity: 1 }} 
                exit={{ height: 0, opacity: 0 }} 
                className="overflow-hidden grid grid-cols-2 gap-2"
              >
                <div className="bg-slate-950/60 border border-slate-800/60 rounded-lg p-3 flex flex-col items-center justify-center gap-2 cursor-grab hover:border-indigo-500/50 hover:bg-slate-800/40 transition-all group">
                  <Server size={18} className="text-indigo-400 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-medium text-slate-300">Compute</span>
                </div>
                <div className="bg-slate-950/60 border border-slate-800/60 rounded-lg p-3 flex flex-col items-center justify-center gap-2 cursor-grab hover:border-emerald-500/50 hover:bg-slate-800/40 transition-all group">
                  <Database size={18} className="text-emerald-400 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-medium text-slate-300">Database</span>
                </div>
                <div className="bg-slate-950/60 border border-slate-800/60 rounded-lg p-3 flex flex-col items-center justify-center gap-2 cursor-grab hover:border-purple-500/50 hover:bg-slate-800/40 transition-all group">
                  <Globe size={18} className="text-purple-400 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-medium text-slate-300">Network</span>
                </div>
                <div className="bg-slate-950/60 border border-slate-800/60 rounded-lg p-3 flex flex-col items-center justify-center gap-2 cursor-grab hover:border-amber-500/50 hover:bg-slate-800/40 transition-all group">
                  <Shield size={18} className="text-amber-400 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-medium text-slate-300">Security</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
