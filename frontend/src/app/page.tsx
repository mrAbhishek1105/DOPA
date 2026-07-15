"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { projectsApi } from "@/lib/api/projects";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import {
  Loader2,
  ArrowRight,
  Layers,
  Shield,
  Cpu,
  BarChart3,
  MessageSquare,
  Network,
  FileCode,
  Rocket,
  ChevronRight,
  Sparkles,
} from "lucide-react";

/* ─── Data ──────────────────────────────────────────── */

const PIPELINE_STEPS = [
  {
    icon: MessageSquare,
    title: "Discovery",
    desc: "Describe your project in plain English. Our AI conversation engine asks the right questions.",
    color: "from-blue-500 to-blue-600",
    glow: "shadow-blue-500/20",
  },
  {
    icon: Network,
    title: "Architecture",
    desc: "Automatically generates a cloud architecture graph with best-practice patterns.",
    color: "from-indigo-500 to-indigo-600",
    glow: "shadow-indigo-500/20",
  },
  {
    icon: FileCode,
    title: "Terraform",
    desc: "Production-ready infrastructure-as-code generated from your validated design.",
    color: "from-purple-500 to-purple-600",
    glow: "shadow-purple-500/20",
  },
  {
    icon: Rocket,
    title: "Deploy",
    desc: "Security analysis, cost estimation, and compliance checks — all before you deploy.",
    color: "from-cyan-500 to-cyan-600",
    glow: "shadow-cyan-500/20",
  },
];

const FEATURES = [
  {
    icon: Layers,
    title: "Architecture Graphs",
    desc: "Interactive, auto-generated infrastructure diagrams powered by pattern matching and recommendation engines.",
    color: "text-blue-400",
    border: "hover:border-blue-500/30",
    bg: "bg-blue-500/10",
    glow: "group-hover:shadow-blue-500/5",
  },
  {
    icon: Shield,
    title: "Security Analysis",
    desc: "Built-in compliance checks for HIPAA, SOC2, and PCI-DSS — security analysis runs against your generated Terraform.",
    color: "text-emerald-400",
    border: "hover:border-emerald-500/30",
    bg: "bg-emerald-500/10",
    glow: "group-hover:shadow-emerald-500/5",
  },
  {
    icon: BarChart3,
    title: "Cost Estimation",
    desc: "Static cost analysis of your infrastructure before you deploy. Know exactly what you'll spend.",
    color: "text-purple-400",
    border: "hover:border-purple-500/30",
    bg: "bg-purple-500/10",
    glow: "group-hover:shadow-purple-500/5",
  },
  {
    icon: Cpu,
    title: "Terraform Generation",
    desc: "Production-ready IaC from your architecture. Deterministic, reproducible, and review-ready.",
    color: "text-amber-400",
    border: "hover:border-amber-500/30",
    bg: "bg-amber-500/10",
    glow: "group-hover:shadow-amber-500/5",
  },
];

/* ─── Animation variants ────────────────────────────── */

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.1, ease: "easeOut" as const },
  }),
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.1 },
  },
};

const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

/* ─── Page ──────────────────────────────────────────── */

export default function LandingPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleCreateProject = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const project = await projectsApi.createProject("New Architecture");
      router.push(`/projects/${project.id}`);
    } catch (err: any) {
      if (err?.code === "ERR_NETWORK" || err?.message?.includes("Network")) {
        setError("Cannot reach backend. Make sure the API server is running on port 8000.");
      } else {
        setError("Failed to create project. Please try again.");
      }
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
      <Navbar />

      {/* ── Hero ────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
        {/* Animated background blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            animate={{
              x: [0, 40, -20, 0],
              y: [0, -30, 20, 0],
              scale: [1, 1.1, 0.95, 1],
            }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute top-[-15%] left-[-10%] w-[50%] h-[50%] bg-blue-600/[0.08] rounded-full blur-[140px]"
          />
          <motion.div
            animate={{
              x: [0, -30, 30, 0],
              y: [0, 40, -20, 0],
              scale: [1, 0.95, 1.1, 1],
            }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
            className="absolute bottom-[-15%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/[0.08] rounded-full blur-[140px]"
          />
          <motion.div
            animate={{
              x: [0, 20, -10, 0],
              y: [0, -15, 25, 0],
            }}
            transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
            className="absolute top-[30%] right-[15%] w-[30%] h-[30%] bg-purple-600/[0.05] rounded-full blur-[120px]"
          />
          {/* Grid pattern overlay */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
              backgroundSize: "64px 64px",
            }}
          />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-slate-800/60 bg-slate-900/40 backdrop-blur-sm mb-8"
          >
            <Sparkles size={14} className="text-blue-400" />
            <span className="text-xs font-medium text-slate-400">
              AI-Powered DevOps Architecture
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: "easeOut" }}
            className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.1] mb-6"
          >
            <span className="text-slate-100">From Idea to</span>
            <br />
            <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-cyan-400 bg-clip-text text-transparent">
              Infrastructure
            </span>
            <br />
            <span className="text-slate-100">in Minutes</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed mb-10"
          >
            DOPA converts your business requirements into validated cloud architectures,
            production-ready Terraform, security analysis, and cost estimates — all
            through a simple conversation.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.45 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <button
              onClick={handleCreateProject}
              disabled={isLoading}
              className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-2xl transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed shadow-xl shadow-blue-600/20 hover:shadow-blue-500/30 text-lg group"
            >
              {isLoading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Initializing...
                </>
              ) : (
                <>
                  Start Building
                  <ArrowRight
                    size={20}
                    className="group-hover:translate-x-1 transition-transform duration-200"
                  />
                </>
              )}
            </button>
            <a
              href="/about"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 border border-slate-700/60 text-slate-300 hover:text-white hover:border-slate-600 font-medium rounded-2xl transition-all duration-200 backdrop-blur-sm text-lg"
            >
              Learn More
              <ChevronRight size={18} className="text-slate-500" />
            </a>
          </motion.div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2 inline-block"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* ── How It Works ────────────────────────────── */}
      <section className="relative py-32 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={fadeUp}
            custom={0}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
              <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                How It Works
              </span>
            </h2>
            <p className="text-slate-400 text-lg max-w-xl mx-auto">
              Four steps from concept to deployable cloud infrastructure.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={staggerContainer}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {PIPELINE_STEPS.map((step, i) => (
              <motion.div key={step.title} variants={staggerItem} className="relative">
                {/* Connector line (hidden on mobile & last item) */}
                {i < PIPELINE_STEPS.length - 1 && (
                  <div className="hidden lg:block absolute top-12 left-[calc(100%+0.25rem)] w-[calc(100%-3.5rem)] h-px">
                    <div className="w-full h-full bg-gradient-to-r from-slate-700/60 to-slate-800/30" />
                  </div>
                )}
                <div className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-6 backdrop-blur-sm hover:border-slate-700/60 transition-all duration-300 h-full">
                  {/* Step number */}
                  <div className="text-[11px] font-semibold text-slate-600 uppercase tracking-widest mb-4">
                    Step {i + 1}
                  </div>
                  {/* Icon */}
                  <div
                    className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center mb-4 shadow-lg ${step.glow}`}
                  >
                    <step.icon size={22} className="text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-200 mb-2">
                    {step.title}
                  </h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Features ────────────────────────────────── */}
      <section className="relative py-32 px-4 sm:px-6">
        {/* Subtle gradient background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] bg-blue-600/[0.03] rounded-full blur-[160px]" />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={fadeUp}
            custom={0}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
              <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                Built for Production
              </span>
            </h2>
            <p className="text-slate-400 text-lg max-w-xl mx-auto">
              Every feature designed to make your infrastructure deterministic,
              secure, and cost-effective.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={staggerContainer}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            {FEATURES.map((feat) => (
              <motion.div
                key={feat.title}
                variants={staggerItem}
                className={`group bg-slate-900/40 border border-slate-800/60 rounded-2xl p-8 backdrop-blur-sm ${feat.border} transition-all duration-300 shadow-xl shadow-transparent ${feat.glow}`}
              >
                <div
                  className={`w-14 h-14 rounded-2xl ${feat.bg} flex items-center justify-center mb-5`}
                >
                  <feat.icon size={26} className={feat.color} />
                </div>
                <h3 className="text-xl font-semibold text-slate-200 mb-2">
                  {feat.title}
                </h3>
                <p className="text-sm text-slate-500 leading-relaxed">{feat.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Bottom CTA ──────────────────────────────── */}
      <section className="relative py-32 px-4 sm:px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={fadeUp}
          custom={0}
          className="max-w-3xl mx-auto text-center"
        >
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
              Ready to build?
            </span>
          </h2>
          <p className="text-slate-400 text-lg mb-8">
            Start with a conversation. End with production infrastructure.
          </p>
          <button
            onClick={handleCreateProject}
            disabled={isLoading}
            className="inline-flex items-center gap-2.5 px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-2xl transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed shadow-xl shadow-blue-600/20 hover:shadow-blue-500/30 text-lg group"
          >
            {isLoading ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Creating Project...
              </>
            ) : (
              <>
                Start Building
                <ArrowRight
                  size={20}
                  className="group-hover:translate-x-1 transition-transform duration-200"
                />
              </>
            )}
          </button>
        </motion.div>
      </section>

      <Footer />
    </div>
  );
}
