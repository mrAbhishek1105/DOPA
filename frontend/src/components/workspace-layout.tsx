"use client";

import { useState } from "react";
import { HealthIndicator } from "@/components/health-indicator";
import { PipelineStatus } from "@/components/pipeline-status";
import { ActivitySidebar } from "@/components/activity-sidebar";
import { ConversationPanel } from "@/components/conversation-panel";
import { useStore } from "@/store";
import { 
  ChevronLeft, 
  ChevronRight, 
  Layers, 
  FileCode2, 
  DollarSign, 
  Shield, 
  CheckSquare
} from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

interface WorkspaceLayoutProps {
  children: React.ReactNode;
  projectId?: string;
  showRightSidebar?: boolean;
  bottomPanel?: React.ReactNode;
}

export default function WorkspaceLayout({ children, projectId, showRightSidebar = true, bottomPanel }: WorkspaceLayoutProps) {
  const { rightSidebarOpen, toggleRightSidebar } = useStore();

  return (
    <div className="h-screen bg-slate-950 text-slate-50 flex flex-col overflow-hidden">
      {/* Top Header */}
      <header className="h-14 border-b border-slate-800/60 flex items-center justify-between px-6 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50 shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/" className="font-bold text-xl tracking-tight bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent hover:from-blue-300 hover:to-indigo-300 transition-all duration-300">
            DOPA
          </Link>
          <div className="h-5 w-px bg-slate-800" />
          {projectId && <PipelineStatus projectId={projectId} />}
        </div>
        <HealthIndicator />
      </header>

      {/* Main 4-Pane Workspace */}
      <div className="flex flex-1 overflow-hidden relative">
        
        {/* Pane 1: Activity Bar — Architecture, Terraform, Security, Cost, Validation */}
        <div className="w-14 flex flex-col items-center py-4 border-r border-slate-800/60 bg-slate-950 shrink-0 gap-1 z-10">
          <ActivityIcon icon={<Layers size={20} />}     label="Architecture" active />
          <ActivityIcon icon={<FileCode2 size={20} />}  label="Terraform"    />
          <ActivityIcon icon={<Shield size={20} />}     label="Security"     />
          <ActivityIcon icon={<DollarSign size={20} />} label="Cost"         />
          <ActivityIcon icon={<CheckSquare size={20} />} label="Validation"  />
        </div>

        {/* Pane 2: Activity Sidebar */}
        {projectId && <ActivitySidebar projectId={projectId} />}

        {/* Center Area + Right Sidebar + Bottom Panel wrapper */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
          
          <div className="flex flex-1 min-h-0 relative">
            {/* Pane 3: Architecture Workbench (Center) */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
              {children}
            </main>

            {/* Pane 4: Architecture Assistant (Right) */}
            {showRightSidebar && projectId && (
              <div className="relative flex flex-col h-full border-l border-slate-800/60 bg-slate-900/30 backdrop-blur-sm z-40 transition-all duration-300 shrink-0">
                <button
                  onClick={toggleRightSidebar}
                  className="absolute -left-3.5 top-6 bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-200 rounded-full p-1 z-50 shadow-md transition-colors"
                >
                  {rightSidebarOpen ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                </button>
                <motion.div
                  initial={false}
                  animate={{ width: rightSidebarOpen ? 340 : 0 }}
                  className="h-full overflow-hidden flex flex-col"
                >
                  <div className="w-[340px] h-full flex flex-col min-h-0">
                    <ConversationPanel projectId={projectId} />
                  </div>
                </motion.div>
              </div>
            )}
          </div>

          {/* Bottom Panel (Prompt Input) */}
          {bottomPanel}
        </div>
      </div>
    </div>
  );
}

function ActivityIcon({
  icon,
  label,
  active = false,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <div className="relative group w-full flex justify-center py-2">
      <button
        className={`p-2.5 rounded-xl transition-all duration-200 ${
          active
            ? "text-blue-400 bg-blue-500/10 border border-blue-500/20"
            : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/60 border border-transparent"
        }`}
        title={label}
      >
        {icon}
      </button>
      {/* Tooltip */}
      <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
        <div className="bg-slate-800 border border-slate-700 text-slate-200 text-[10px] font-semibold px-2 py-1 rounded-md whitespace-nowrap shadow-xl">
          {label}
        </div>
      </div>
    </div>
  );
}
