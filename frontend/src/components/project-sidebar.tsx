"use client";

import { useStore } from "@/store";
import { ChevronLeft, ChevronRight, Plus, MessageSquare, History, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { projectsApi } from "@/lib/api/projects";
import { useState } from "react";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Project } from "@/types/project";
import { RequirementsSummary } from "@/components/requirements-summary";
import { FileText } from "lucide-react";

export function ProjectSidebar({ currentProjectId }: { currentProjectId?: string }) {
  const { leftSidebarOpen, toggleLeftSidebar } = useStore();
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const queryClient = useQueryClient();

  const { data: projects, isLoading } = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: () => projectsApi.listProjects(),
  });

  const handleNewProject = async () => {
    setIsCreating(true);
    try {
      const project = await projectsApi.createProject("New Architecture");
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      router.push(`/projects/${project.id}`);
    } catch (err) {
      console.error("Failed to create project", err);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="relative flex flex-col h-full bg-slate-950/50 border-r border-slate-800/60 backdrop-blur-sm z-40 transition-all duration-300">
      <motion.div
        initial={false}
        animate={{ width: leftSidebarOpen ? 260 : 0 }}
        className="h-full overflow-hidden flex flex-col"
      >
        <div className="p-4 w-[260px] flex-shrink-0">
          <button
            onClick={handleNewProject}
            disabled={isCreating}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 px-4 rounded-lg transition-all duration-200 flex items-center gap-2 text-sm shadow-lg shadow-blue-500/20 disabled:opacity-50"
          >
            {isCreating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            New Architecture
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-4 w-[260px]">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-2 flex items-center gap-2">
            <History size={14} />
            Recent Projects
          </div>
          <div className="space-y-1">
            {isLoading ? (
              <div className="px-4 py-2 text-xs text-slate-500">Loading projects...</div>
            ) : projects && projects.length > 0 ? (
              projects.map((proj) => {
                const date = new Date(proj.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                });
                return (
                  <Link
                    key={proj.id}
                    href={`/projects/${proj.id}`}
                    className={`flex flex-col gap-1 px-3 py-2.5 rounded-lg transition-colors ${
                      proj.id === currentProjectId
                        ? "bg-slate-800/80 text-blue-400"
                        : "hover:bg-slate-900/50 text-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-2 text-sm font-medium truncate">
                      <MessageSquare size={14} className="shrink-0 opacity-70" />
                      <span className="truncate">{proj.name}</span>
                    </div>
                    <span className="text-[10px] text-slate-500 pl-6">{date}</span>
                  </Link>
                );
              })
            ) : (
              <div className="px-4 py-2 text-xs text-slate-500">No projects yet.</div>
            )}
          </div>
        </div>

        {currentProjectId && (
          <div className="flex-shrink-0 p-4 border-t border-slate-800/60 bg-slate-900/20 w-[260px]">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-2 flex items-center gap-2">
              <FileText size={14} />
              Requirements
            </div>
            <div className="px-2">
              <RequirementsSummary projectId={currentProjectId} />
            </div>
          </div>
        )}
      </motion.div>

      {/* Toggle button */}
      <button
        onClick={toggleLeftSidebar}
        className="absolute -right-3.5 top-6 bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-200 rounded-full p-1 z-50 shadow-md transition-colors"
      >
        {leftSidebarOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
      </button>
    </div>
  );
}
