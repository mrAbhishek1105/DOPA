"use client";

import { motion } from "framer-motion";
import { FileText, Shield, DollarSign, AlertCircle, Bookmark, CheckCircle2, Code2 } from "lucide-react";

interface DecisionEvidencePanelProps {
  projectId: string;
}

export function DecisionEvidencePanel({ projectId }: DecisionEvidencePanelProps) {
  const evidenceData = {
    quotes: [
      { text: "peak traffic surges of 10,000 requests/sec during sales events", mappedField: "traffic = high", requirement: "High Scale / Spikes" },
      { text: "deploy on AWS in the Mumbai region (ap-south-1)", mappedField: "region = ap-south-1", requirement: "Data Sovereignty / Region" },
      { text: "prefer PostgreSQL for relational data and Redis for fast product page caching", mappedField: "database = postgresql, cache = redis", requirement: "Storage Tier" },
      { text: "downtime during sales is unacceptable so we need high availability", mappedField: "availability = high", requirement: "Target Availability SLA" },
    ],
    rules: [
      { id: "rule_aws_ecs_fargate_ha_01", title: "AWS ECS Fargate Multi-AZ Pattern", description: "Mandates Application Load Balancer (ALB) + ECS Fargate tasks across minimum 2 Availability Zones for high-availability traffic." },
      { id: "rule_rds_postgres_multi_az_02", title: "RDS PostgreSQL Multi-AZ Replication", description: "Enforces Multi-AZ synchronous standby replication with automated 60-second DNS failover when availability target is High." },
      { id: "rule_elasticache_redis_caching_03", title: "ElastiCache Redis In-Memory Tier", description: "Deploys Redis cluster node in private subnets when read caching is requested to reduce database CPU load." },
    ],
    costAssumptions: [
      "ECS Fargate: 2 Tasks (0.5 vCPU, 1GB RAM) running 730 hours/month",
      "RDS PostgreSQL: db.t4g.medium Multi-AZ instance with 20GB storage",
      "ElastiCache Redis: cache.t4g.small node in private subnets",
      "Data Transfer: 500GB outbound regional bandwidth estimated",
    ],
    securityAssumptions: [
      "All compute and database instances deployed inside private VPC subnets",
      "KMS customer-managed key encryption enabled for RDS storage & S3 buckets",
      "IAM execution roles restricted to minimal required permissions",
    ],
    limitations: [
      "Redis single-node cache capacity limited to 3.2GB RAM; cluster mode required if product catalog exceeds 500,000 items.",
      "Single-Region deployment (ap-south-1); multi-region disaster recovery failover requires Option C Enterprise.",
    ],
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {/* 1. Requirement Evidence (Prompt Quotes) */}
      <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/60 space-y-3">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <FileText size={14} className="text-blue-400" />
          Extracted Requirement Evidence (User Input Quotes)
        </h3>
        <div className="space-y-2">
          {evidenceData.quotes.map((q, i) => (
            <div key={i} className="p-3 rounded-lg bg-slate-900/50 border border-slate-800 text-xs flex justify-between items-center">
              <div>
                <span className="text-blue-300 italic font-mono">"{q.text}"</span>
                <div className="text-[10px] text-slate-400 mt-1">Mapped Requirement: <strong>{q.requirement}</strong></div>
              </div>
              <span className="text-[10px] font-mono bg-blue-950/80 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded shrink-0 ml-3">
                {q.mappedField}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Knowledge Base Rule References */}
      <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/60 space-y-3">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <Code2 size={14} className="text-indigo-400" />
          Internal Knowledge Base Rule References
        </h3>
        <div className="space-y-2">
          {evidenceData.rules.map((rule, i) => (
            <div key={i} className="p-3 rounded-lg bg-slate-900/50 border border-slate-800 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-200">{rule.title}</span>
                <span className="text-[10px] font-mono text-indigo-400">{rule.id}</span>
              </div>
              <p className="text-slate-400 leading-relaxed">{rule.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Cost & Security Baseline Assumptions */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/60 space-y-2">
          <h4 className="text-xs font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
            <DollarSign size={14} /> Cost Baseline Assumptions
          </h4>
          <div className="space-y-1 text-xs text-slate-400">
            {evidenceData.costAssumptions.map((item, i) => (
              <div key={i} className="flex items-start gap-1.5">
                <CheckCircle2 size={12} className="text-purple-400 shrink-0 mt-0.5" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/60 space-y-2">
          <h4 className="text-xs font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
            <Shield size={14} /> Security Baseline Assumptions
          </h4>
          <div className="space-y-1 text-xs text-slate-400">
            {evidenceData.securityAssumptions.map((item, i) => (
              <div key={i} className="flex items-start gap-1.5">
                <CheckCircle2 size={12} className="text-emerald-400 shrink-0 mt-0.5" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Known Architectural Limitations */}
      <div className="bg-slate-950/60 p-4 rounded-xl border border-amber-500/30 space-y-2">
        <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
          <AlertCircle size={14} className="text-amber-400" /> Known Architectural Limitations
        </h4>
        <div className="space-y-1 text-xs text-slate-300">
          {evidenceData.limitations.map((item, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-amber-400 font-bold">•</span>
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
