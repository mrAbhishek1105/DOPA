"use client";

import { motion } from "framer-motion";
import { ShieldCheck, Lock, CheckCircle2, Globe, AlertTriangle } from "lucide-react";

interface ComplianceGuardrailsPanelProps {
  projectId: string;
}

export function ComplianceGuardrailsPanel({ projectId }: ComplianceGuardrailsPanelProps) {
  const complianceFrameworks = [
    { name: "HIPAA Eligible", status: "PASSED", badge: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", detail: "Enforces KMS customer-managed key encryption at rest & TLS 1.3 in transit." },
    { name: "SOC 2 Type II", status: "PASSED", badge: "bg-blue-500/20 text-blue-400 border-blue-500/30", detail: "VPC private subnet isolation and CloudTrail audit log logging enabled." },
    { name: "PCI-DSS v4.0", status: "PASSED", badge: "bg-purple-500/20 text-purple-400 border-purple-500/30", detail: "No public DB endpoints allowed; restricted security group ingress." },
    { name: "GDPR Sovereignty", status: "VERIFIED", badge: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30", detail: "Regional constraint locked to AWS Mumbai (ap-south-1)." },
  ];

  const policyGuardrails = [
    { title: "CIS AWS Foundations Benchmark v1.4", result: "PASSED (14/14 checks)", status: "PASSED" },
    { title: "NIST SP 800-53 Encryption Standard", result: "PASSED (KMS Key Rotation Active)", status: "PASSED" },
    { title: "AWS Security Hub Best Practices", result: "PASSED (0 High Vulnerabilities)", status: "PASSED" },
    { title: "Data Residency & Sovereignty Policy", result: "PASSED (Region: ap-south-1)", status: "PASSED" },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {/* Framework Badges */}
      <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/60 space-y-3">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <ShieldCheck size={16} className="text-emerald-400" />
          Regulatory Compliance Frameworks
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {complianceFrameworks.map((framework, i) => (
            <div key={i} className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs text-slate-200">{framework.name}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${framework.badge}`}>
                  {framework.status}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">{framework.detail}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Policy Guardrails Checks */}
      <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/60 space-y-3">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <Lock size={14} className="text-blue-400" />
          Enterprise IT Policy Guardrails
        </h3>
        <div className="space-y-2">
          {policyGuardrails.map((g, i) => (
            <div key={i} className="p-3 rounded-lg bg-slate-900/40 border border-slate-800 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                <span className="font-medium text-slate-200">{g.title}</span>
              </div>
              <span className="text-emerald-400 font-mono text-[11px]">{g.result}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
