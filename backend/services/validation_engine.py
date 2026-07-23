import logging
import os
import shutil
import subprocess
import tempfile
from typing import Any

from backend.services.knowledge_loader import KnowledgeLoader

logger = logging.getLogger(__name__)


class ValidationEngine:
    """Validates architecture topology and checks generated HCL Terraform code syntax."""

    def __init__(self) -> None:
        loader = KnowledgeLoader()
        self.rules = loader.get("validation-rules.json") or []

    def validate(self, graph_nodes: list[dict[str, Any]], graph_edges: list[dict[str, Any]], terraform_files: dict[str, str] | None = None) -> dict[str, Any]:
        issues = []

        # 1. Evaluate architectural rules
        arch_issues = self._evaluate_architecture_rules(graph_nodes, graph_edges)
        issues.extend(arch_issues)

        # 2. Execute `terraform validate` if Terraform CLI is installed & HCL files provided
        tf_cli_available = shutil.which("terraform") is not None
        tf_validation_result = None

        if tf_cli_available and terraform_files:
            try:
                tf_validation_result = self._run_terraform_validate(terraform_files)
                if not tf_validation_result.get("valid"):
                    issues.append({
                        "rule_id": "terraform_syntax_error",
                        "category": "syntax",
                        "severity": "critical",
                        "message": "Terraform syntax validation failed.",
                        "details": tf_validation_result.get("error_output"),
                    })
            except Exception as e:
                logger.warning(f"Terraform validation subprocess failed: {e}", exc_info=True)

        critical_count = sum(1 for i in issues if i.get("severity") == "critical")
        high_count = sum(1 for i in issues if i.get("severity") == "high")

        status = "PASSED"
        if critical_count > 0:
            status = "FAILED"
        elif high_count > 0 or len(issues) > 0:
            status = "WARNINGS"

        return {
            "status": status,
            "passed": status != "FAILED",
            "terraform_cli_executed": tf_cli_available and bool(terraform_files),
            "cli_result": tf_validation_result,
            "issues": issues,
        }

    def _evaluate_architecture_rules(self, nodes: list[dict[str, Any]], edges: list[dict[str, Any]]) -> list[dict[str, Any]]:
        issues = []
        services = { (n.get("data", {}).get("service") or n.get("type") or n.get("id")).lower() for n in nodes }

        # Check: Single Point of Failure (SPOF) if DB is not multi-az
        if "rds" in services and "multi_az" not in services:
            issues.append({
                "rule_id": "single_point_of_failure",
                "category": "resilience",
                "severity": "high",
                "message": "Critical database component is deployed without multi-AZ failover resilience.",
                "recommendation": "Enable multi_az = true for production workloads to prevent SPOF.",
            })

        # Check: Missing VPC / Private subnet layer
        if "vpc" not in services and len(nodes) > 1:
            issues.append({
                "rule_id": "missing_private_network",
                "category": "network_design",
                "severity": "high",
                "message": "No private subnet isolation layer is present for backend components.",
                "recommendation": "Introduce a dedicated VPC with private subnets for application and database tiers.",
            })

        return issues

    def _run_terraform_validate(self, files: dict[str, str]) -> dict[str, Any]:
        with tempfile.TemporaryDirectory() as tmpdir:
            for fname, content in files.items():
                fpath = os.path.join(tmpdir, fname)
                with open(fpath, "w", encoding="utf-8") as f:
                    f.write(content)

            # Init terraform backend-less
            init_res = subprocess.run(
                ["terraform", "init", "-backend=false"],
                cwd=tmpdir,
                capture_output=True,
                text=True,
                timeout=30,
            )

            # Validate HCL
            val_res = subprocess.run(
                ["terraform", "validate", "-json"],
                cwd=tmpdir,
                capture_output=True,
                text=True,
                timeout=30,
            )

            return {
                "valid": val_res.returncode == 0,
                "stdout": val_res.stdout,
                "error_output": val_res.stderr if val_res.returncode != 0 else None,
            }
