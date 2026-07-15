"use client";

import { useState } from "react";
import { HealthIndicator } from "@/components/health-indicator";
import { PipelineStatus } from "@/components/pipeline-status";
import { ProjectSidebar } from "@/components/project-sidebar";
import { ConversationPanel } from "@/components/conversation-panel";
import { ArchitectureNotebook } from "@/components/architecture-notebook";
import { useStore } from "@/store";
import { ChevronLeft, ChevronRight, MessageSquare, ClipboardList } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

interface WorkspaceLayoutProps {
  children: React.ReactNode;
  projectId?: string;
  showRightSidebar?: boolean; // Controls if the right sidebar is mounted at all
}

export default function WorkspaceLayout({ children, projectId, showRightSidebar = true }: WorkspaceLayoutProps) {
  const { rightSidebarOpen, toggleRightSidebar } = useStore();
  const [rightTab, setRightTab] = useState<"conversation" | "notebook">("conversation");

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

      {/* 3-Pane Workspace */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Sidebar */}
        <ProjectSidebar currentProjectId={projectId} />

        {/* Center Area */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
          {children}
        </main>

        {/* Right Sidebar */}
        {showRightSidebar && projectId && (
          <div className="relative flex flex-col h-full border-l border-slate-800/60 bg-slate-900/30 backdrop-blur-sm z-40 transition-all duration-300">
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
                {/* Tab bar */}
                <div className="flex border-b border-slate-800/60 shrink-0">
                  <button
                    onClick={() => setRightTab("conversation")}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider transition-colors ${
                      rightTab === "conversation"
                        ? "text-blue-400 border-b-2 border-blue-500 bg-blue-500/5"
                        : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/30"
                    }`}
                  >
                    <MessageSquare size={12} />
                    Chat
                  </button>
                  <button
                    onClick={() => setRightTab("notebook")}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider transition-colors ${
                      rightTab === "notebook"
                        ? "text-indigo-400 border-b-2 border-indigo-500 bg-indigo-500/5"
                        : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/30"
                    }`}
                  >
                    <ClipboardList size={12} />
                    Overview
                  </button>
                </div>

                {/* Tab content */}
                <div className="flex-1 p-4 min-h-0 overflow-y-auto">
                  {rightTab === "conversation" ? (
                    <ConversationPanel projectId={projectId} />
                  ) : (
                    <ArchitectureNotebook projectId={projectId} />
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
