import json
import logging
import os
import shutil
import subprocess
import tempfile
from typing import Any

from backend.services.knowledge_loader import KnowledgeLoader

logger = logging.getLogger(__name__)


class SecurityEngine:
    """Evaluates security rules and Checkov audit findings against ArchitectureGraph & generated HCL."""

    def __init__(self) -> None:
        loader = KnowledgeLoader()
        self.rules = loader.get("security-rules.json") or []

    def analyze(self, graph_nodes: list[dict[str, Any]], graph_edges: list[dict[str, Any]], terraform_files: dict[str, str] | None = None) -> dict[str, Any]:
        findings = []

        # 1. Native rule-based evaluation against graph topology
        native_findings = self._evaluate_native_rules(graph_nodes, graph_edges)
        findings.extend(native_findings)

        # 2. Checkov CLI execution (if installed and terraform_files provided)
        checkov_available = shutil.which("checkov") is not None
        checkov_findings = []
        if checkov_available and terraform_files:
            try:
                checkov_findings = self._run_checkov(terraform_files)
                findings.extend(checkov_findings)
            except Exception as e:
                logger.warning(f"Checkov scan failed: {e}", exc_info=True)

        # Calculate Risk Score (0-100)
        critical_count = sum(1 for f in findings if f.get("severity") == "critical")
        high_count = sum(1 for f in findings if f.get("severity") == "high")
        medium_count = sum(1 for f in findings if f.get("severity") == "medium")
        low_count = sum(1 for f in findings if f.get("severity") == "low")

        raw_score = 100 - (critical_count * 25 + high_count * 15 + medium_count * 5 + low_count * 2)
        risk_score = max(0, min(100, raw_score))

        risk_level = "LOW"
        if critical_count > 0:
            risk_level = "CRITICAL"
        elif high_count > 0:
            risk_level = "HIGH"
        elif medium_count > 0:
            risk_level = "MEDIUM"

        return {
            "risk_score": risk_score,
            "risk_level": risk_level,
            "checkov_executed": checkov_available and bool(terraform_files),
            "summary": {
                "critical": critical_count,
                "high": high_count,
                "medium": medium_count,
                "low": low_count,
                "total_findings": len(findings),
            },
            "compliance": {
                "hipaa_eligible": critical_count == 0 and high_count == 0,
                "soc2_eligible": critical_count == 0,
                "pci_dss_eligible": critical_count == 0 and high_count == 0,
            },
            "findings": findings,
        }

    def _evaluate_native_rules(self, nodes: list[dict[str, Any]], edges: list[dict[str, Any]]) -> list[dict[str, Any]]:
        findings = []
        services = { (n.get("data", {}).get("service") or n.get("type") or n.get("id")).lower() for n in nodes }

        # Rule: Database without encryption or public database check
        if "rds" in services:
            # Check if KMS key node exists in graph
            if "kms" not in services:
                findings.append({
                    "rule_id": "unencrypted_at_rest",
                    "category": "data_protection",
                    "severity": "high",
                    "message": "RDS database instance is missing dedicated KMS key encryption.",
                    "recommendation": "Enable storage encryption with a KMS customer managed key (CMK).",
                    "target_service": "rds",
                })

        # Rule: ALB without SSL / HTTP only ingress
        if "alb" in services:
            findings.append({
                "rule_id": "alb_http_only",
                "category": "network_exposure",
                "severity": "medium",
                "message": "ALB is accepting HTTP traffic on port 80.",
                "recommendation": "Redirect HTTP port 80 traffic to HTTPS port 443 with ACM SSL certificate.",
                "target_service": "alb",
            })

        # Rule: S3 public read check
        if "s3" in services:
            findings.append({
                "rule_id": "s3_public_read",
                "category": "data_exposure",
                "severity": "low",
                "message": "S3 bucket configuration should block all public ACLs explicitly.",
                "recommendation": "Set block_public_acls = true and enable server-side encryption.",
                "target_service": "s3",
            })

        return findings

    def _run_checkov(self, files: dict[str, str]) -> list[dict[str, Any]]:
        findings = []
        with tempfile.TemporaryDirectory() as tmpdir:
            for fname, content in files.items():
                fpath = os.path.join(tmpdir, fname)
                with open(fpath, "w", encoding="utf-8") as f:
                    f.write(content)

            cmd = ["checkov", "-d", tmpdir, "--output", "json", "--compact"]
            res = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
            if res.stdout:
                try:
                    data = json.loads(res.stdout)
                    failed_checks = data.get("results", {}).get("failed_checks", [])
                    for fc in failed_checks:
                        findings.append({
                            "rule_id": fc.get("check_id"),
                            "category": "checkov_audit",
                            "severity": "high" if "CRITICAL" in fc.get("check_name", "").upper() else "medium",
                            "message": fc.get("check_name"),
                            "recommendation": f"Review line {fc.get('file_line_range', [0])[0]} in {fc.get('file_path')}",
                            "target_service": fc.get("resource"),
                        })
                except Exception:
                    logger.warning("Failed to parse Checkov output, scan results may be incomplete", exc_info=True)

        return findings
