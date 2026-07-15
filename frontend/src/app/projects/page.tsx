"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { projectsApi } from "@/lib/api/projects";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Project, ProjectStatus } from "@/types/project";
import {
  Plus,
  Loader2,
  ArrowRight,
  FolderOpen,
  Layers,
  Clock,
  Sparkles,
} from "lucide-react";

/* ─── Status badge config ───────────────────────────── */

const STATUS_CONFIG: Record<
  ProjectStatus,
  { label: string; color: string; bg: string }
> = {
  discovery: {
    label: "Discovery",
    color: "text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/20",
  },
  requirements_gathered: {
    label: "Requirements",
    color: "text-indigo-400",
    bg: "bg-indigo-500/10 border-indigo-500/20",
  },
  options_generated: {
    label: "Options",
    color: "text-purple-400",
    bg: "bg-purple-500/10 border-purple-500/20",
  },
  graph_generated: {
    label: "Graph Ready",
    color: "text-cyan-400",
    bg: "bg-cyan-500/10 border-cyan-500/20",
  },
  analyzing: {
    label: "Analyzing",
    color: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/20",
  },
  explaining: {
    label: "Explaining",
    color: "text-orange-400",
    bg: "bg-orange-500/10 border-orange-500/20",
  },
  completed: {
    label: "Completed",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/20",
  },
  failed: {
    label: "Failed",
    color: "text-red-400",
    bg: "bg-red-500/10 border-red-500/20",
  },
};

/* ─── Animation helpers ─────────────────────────────── */

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const staggerItem = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" as const } },
};

/* ─── Skeleton Card ─────────────────────────────────── */

function SkeletonCard() {
  return (
    <div className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-6 backdrop-blur-sm animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-xl bg-slate-800/60" />
        <div className="w-20 h-5 rounded-full bg-slate-800/60" />
      </div>
      <div className="w-3/4 h-5 rounded bg-slate-800/60 mb-2" />
      <div className="w-1/2 h-4 rounded bg-slate-800/40" />
    </div>
  );
}

/* ─── Empty State ───────────────────────────────────── */

function EmptyState({ onCreateProject }: { onCreateProject: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center justify-center py-24 px-4"
    >
      <div className="w-20 h-20 rounded-3xl bg-slate-800/40 border border-slate-700/40 flex items-center justify-center mb-6">
        <FolderOpen size={36} className="text-slate-600" />
      </div>
      <h3 className="text-xl font-semibold text-slate-300 mb-2">
        No projects yet
      </h3>
      <p className="text-slate-500 text-center max-w-md mb-8">
        Create your first project to start designing cloud architecture. DOPA will
        guide you from idea to deployable infrastructure.
      </p>
      <button
        onClick={onCreateProject}
        className="flex items-center gap-2.5 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl transition-all duration-200 shadow-lg shadow-blue-600/20 hover:shadow-blue-500/30 group"
      >
        <Sparkles size={16} />
        Create Your First Project
        <ArrowRight
          size={16}
          className="group-hover:translate-x-0.5 transition-transform duration-200"
        />
      </button>
    </motion.div>
  );
}

/* ─── Project Card ──────────────────────────────────── */

function ProjectCard({ project }: { project: Project }) {
  const router = useRouter();
  const status = STATUS_CONFIG[project.status] || STATUS_CONFIG.discovery;

  const createdDate = new Date(project.created_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <motion.div
      variants={staggerItem}
      onClick={() => router.push(`/projects/${project.id}`)}
      className="group bg-slate-900/40 border border-slate-800/60 rounded-2xl p-6 backdrop-blur-sm hover:border-slate-700/50 hover:bg-slate-900/60 transition-all duration-300 cursor-pointer"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-blue-500/10 flex items-center justify-center">
          <Layers size={18} className="text-blue-400" />
        </div>
        <span
          className={`inline-flex items-center px-2.5 py-1 text-[11px] font-semibold rounded-full border ${status.bg} ${status.color}`}
        >
          {status.label}
        </span>
      </div>
      <h3 className="text-base font-semibold text-slate-200 mb-1 group-hover:text-white transition-colors duration-200">
        {project.name}
      </h3>
      <div className="flex items-center gap-1.5 text-xs text-slate-600">
        <Clock size={12} />
        {createdDate}
      </div>
      <div className="mt-4 pt-3 border-t border-slate-800/40 flex items-center justify-between">
        <span className="text-xs text-slate-600">
          Click to open workspace
        </span>
        <ArrowRight
          size={14}
          className="text-slate-700 group-hover:text-slate-400 group-hover:translate-x-0.5 transition-all duration-200"
        />
      </div>
    </motion.div>
  );
}

/* ─── Page ──────────────────────────────────────────── */

export default function ProjectsPage() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);

  const {
    data: projects,
    isLoading,
    isError,
  } = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: () => projectsApi.listProjects(),
  });

  const handleCreateProject = async () => {
    setIsCreating(true);
    try {
      const project = await projectsApi.createProject("New Architecture");
      router.push(`/projects/${project.id}`);
    } catch {
      setIsCreating(false);
    }
  };

  const hasProjects = projects && projects.length > 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
      <Navbar />

      <main className="flex-1 pt-28 pb-16 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-10"
          >
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
                <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  Your Projects
                </span>
              </h1>
              <p className="text-slate-500 mt-1">
                Manage and create architecture projects.
              </p>
            </div>
            <button
              onClick={handleCreateProject}
              disabled={isCreating}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-xl transition-all duration-200 shadow-lg shadow-blue-600/20 hover:shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              {isCreating ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus size={16} />
                  New Project
                </>
              )}
            </button>
          </motion.div>

          {/* Loading */}
          {isLoading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          )}

          {/* Error */}
          {isError && !isLoading && (
            <EmptyState onCreateProject={handleCreateProject} />
          )}

          {/* Empty */}
          {!isLoading && !isError && !hasProjects && (
            <EmptyState onCreateProject={handleCreateProject} />
          )}

          {/* Project Grid */}
          {!isLoading && hasProjects && (
            <motion.div
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
            >
              {projects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </motion.div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
