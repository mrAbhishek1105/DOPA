"use client";

import { motion } from "framer-motion";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import Link from "next/link";
import {
  ArrowRight,
  MessageSquare,
  ClipboardList,
  Puzzle,
  Lightbulb,
  Network,
  FileCode,
  Shield,
  BarChart3,
  CheckCircle,
  FileText,
  Layers,
  Cpu,
  Database,
  Cloud,
} from "lucide-react";

/* ─── Data ──────────────────────────────────────────── */

const PIPELINE = [
  {
    icon: MessageSquare,
    title: "Discovery",
    desc: "AI-driven conversation understands your business requirements, constraints, and goals.",
    color: "from-blue-500 to-blue-600",
  },
  {
    icon: ClipboardList,
    title: "Requirements",
    desc: "Structured extraction of technical and non-functional requirements from your conversation.",
    color: "from-blue-600 to-indigo-500",
  },
  {
    icon: Puzzle,
    title: "Pattern Matching",
    desc: "Maps requirements to proven cloud architecture patterns from a versioned knowledge base.",
    color: "from-indigo-500 to-indigo-600",
  },
  {
    icon: Lightbulb,
    title: "Recommendations",
    desc: "Generates ranked service recommendations with tradeoff analysis for your review.",
    color: "from-indigo-600 to-purple-500",
  },
  {
    icon: Network,
    title: "Graph Generation",
    desc: "Builds a validated architecture graph — the source of truth for your entire infrastructure.",
    color: "from-purple-500 to-purple-600",
  },
  {
    icon: FileCode,
    title: "Terraform",
    desc: "Deterministic IaC generation from the architecture graph. Review-ready, production-grade.",
    color: "from-purple-600 to-fuchsia-500",
  },
  {
    icon: Shield,
    title: "Security",
    desc: "Compliance checks (HIPAA, SOC2, PCI-DSS) run against the generated Terraform.",
    color: "from-fuchsia-500 to-pink-500",
  },
  {
    icon: BarChart3,
    title: "Cost Analysis",
    desc: "Static cost estimation so you know exactly what you'll spend before you deploy.",
    color: "from-pink-500 to-rose-500",
  },
  {
    icon: CheckCircle,
    title: "Validation",
    desc: "Ensures your architecture meets all requirements and passes structural checks.",
    color: "from-rose-500 to-orange-500",
  },
  {
    icon: FileText,
    title: "Report",
    desc: "Human-readable report with architecture decisions, security findings, and cost breakdown.",
    color: "from-orange-500 to-amber-500",
  },
];

const TECH_STACK = [
  {
    icon: Layers,
    name: "Next.js",
    desc: "React 19 frontend with App Router",
    color: "text-slate-300",
    bg: "bg-slate-500/10",
  },
  {
    icon: Cpu,
    name: "FastAPI",
    desc: "High-performance Python backend",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
  },
  {
    icon: Database,
    name: "PostgreSQL",
    desc: "Reliable data with JSONB for graphs",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
  },
  {
    icon: FileCode,
    name: "Terraform",
    desc: "Deterministic IaC generation",
    color: "text-purple-400",
    bg: "bg-purple-500/10",
  },
  {
    icon: Cloud,
    name: "AWS",
    desc: "Cloud-native architecture patterns",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
  },
];

/* ─── Animation helpers ─────────────────────────────── */

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
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
};

const staggerItem = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" as const } },
};

/* ─── Page ──────────────────────────────────────────── */

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
      <Navbar />

      {/* ── Hero ──────────────────────────────────── */}
      <section className="relative pt-36 pb-24 px-4 sm:px-6 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-10%] left-[20%] w-[40%] h-[40%] bg-indigo-600/[0.06] rounded-full blur-[140px]" />
          <div className="absolute bottom-[-10%] right-[10%] w-[35%] h-[35%] bg-purple-600/[0.05] rounded-full blur-[120px]" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1] mb-6"
          >
            <span className="text-slate-100">Built for</span>{" "}
            <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
              DevOps Engineers
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed"
          >
            DOPA is an AI-assisted infrastructure architecture platform. It converts
            business requirements into validated cloud architectures, cost estimates,
            security findings, Terraform artifacts, and human-readable reports —
            through a deterministic, graph-centric pipeline.
          </motion.p>
        </div>
      </section>

      {/* ── The Pipeline ──────────────────────────── */}
      <section className="relative py-28 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
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
                The DOPA Pipeline
              </span>
            </h2>
            <p className="text-slate-400 text-lg max-w-xl mx-auto">
              A strict, deterministic flow from conversation to deployable infrastructure.
            </p>
          </motion.div>

          {/* Pipeline steps — vertical timeline */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
            variants={staggerContainer}
            className="relative"
          >
            {/* Vertical line */}
            <div className="absolute left-6 sm:left-8 top-0 bottom-0 w-px bg-gradient-to-b from-blue-500/40 via-purple-500/40 to-amber-500/40" />

            <div className="space-y-6">
              {PIPELINE.map((step, i) => (
                <motion.div
                  key={step.title}
                  variants={staggerItem}
                  className="relative flex items-start gap-6 sm:gap-8 pl-2"
                >
                  {/* Timeline dot */}
                  <div
                    className={`relative z-10 w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center shadow-lg shrink-0`}
                  >
                    <step.icon size={20} className="text-white" />
                  </div>

                  {/* Content card */}
                  <div className="flex-1 bg-slate-900/40 border border-slate-800/60 rounded-2xl p-5 sm:p-6 backdrop-blur-sm hover:border-slate-700/60 transition-colors duration-300">
                    <div className="flex items-center gap-3 mb-1.5">
                      <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-widest">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <h3 className="text-lg font-semibold text-slate-200">
                        {step.title}
                      </h3>
                    </div>
                    <p className="text-sm text-slate-500 leading-relaxed">{step.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Tech Stack ────────────────────────────── */}
      <section className="relative py-28 px-4 sm:px-6">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[50%] h-[50%] bg-indigo-600/[0.03] rounded-full blur-[140px]" />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto">
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
                Technology Stack
              </span>
            </h2>
            <p className="text-slate-400 text-lg max-w-xl mx-auto">
              Built with modern, production-grade tools for reliability and performance.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={staggerContainer}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4"
          >
            {TECH_STACK.map((tech) => (
              <motion.div
                key={tech.name}
                variants={staggerItem}
                className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-6 backdrop-blur-sm hover:border-slate-700/60 transition-colors duration-300 text-center"
              >
                <div
                  className={`w-12 h-12 rounded-2xl ${tech.bg} flex items-center justify-center mx-auto mb-3`}
                >
                  <tech.icon size={22} className={tech.color} />
                </div>
                <h3 className="text-base font-semibold text-slate-200 mb-1">
                  {tech.name}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">{tech.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Bottom CTA ────────────────────────────── */}
      <section className="relative py-28 px-4 sm:px-6">
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
              Ready to start?
            </span>
          </h2>
          <p className="text-slate-400 text-lg mb-8">
            Jump in and create your first project. DOPA handles the complexity.
          </p>
          <Link
            href="/projects"
            className="inline-flex items-center gap-2.5 px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-2xl transition-all duration-200 shadow-xl shadow-blue-600/20 hover:shadow-blue-500/30 text-lg group"
          >
            Go to Projects
            <ArrowRight
              size={20}
              className="group-hover:translate-x-1 transition-transform duration-200"
            />
          </Link>
        </motion.div>
      </section>

      <Footer />
    </div>
  );
}
