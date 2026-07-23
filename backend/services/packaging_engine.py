import json
import logging
import os
import tempfile
import zipfile
from typing import Any

logger = logging.getLogger(__name__)


class PackagingEngine:
    """Assembles Terraform files, Markdown reports, and JSON analysis outputs into a downloadable ZIP archive."""

    def package(
        self,
        project_id: str,
        project_name: str,
        terraform_files: dict[str, str],
        hld_md: str,
        lld_md: str,
        security_report: dict[str, Any] | None = None,
        cost_report: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        output_dir = os.path.join(tempfile.gettempdir(), "dopa_artifacts", str(project_id))
        os.makedirs(output_dir, exist_ok=True)

        zip_filename = f"dopa_architecture_{project_id[:8]}.zip"
        zip_filepath = os.path.join(output_dir, zip_filename)

        with zipfile.ZipFile(zip_filepath, "w", zipfile.ZIP_DEFLATED) as zipf:
            # 1. Terraform HCL files
            for fname, content in terraform_files.items():
                zipf.writestr(f"terraform/{fname}", content)

            # 2. Markdown Reports
            zipf.writestr("reports/HLD.md", hld_md)
            zipf.writestr("reports/LLD.md", lld_md)

            # 3. JSON Reports
            if security_report:
                zipf.writestr("reports/security_findings.json", json.dumps(security_report, indent=2))
            if cost_report:
                zipf.writestr("reports/cost_breakdown.json", json.dumps(cost_report, indent=2))

            # 4. README in zip root
            readme_content = f'''# DOPA Generated Infrastructure Architecture: {project_name}

Project ID: {project_id}

## Directory Contents:
- `/terraform/`: Production-ready Terraform HCL code (`main.tf`, `provider.tf`, etc.)
- `/reports/HLD.md`: High-Level Design document
- `/reports/LLD.md`: Low-Level Design document
- `/reports/security_findings.json`: Checkov / native security analysis
- `/reports/cost_breakdown.json`: Itemized monthly cost estimate

## Quick Start:
1. Navigate to `/terraform/` directory.
2. Run `terraform init`
3. Run `terraform plan`
4. Run `terraform apply`
'''
            zipf.writestr("README.md", readme_content)

        file_size = os.path.getsize(zip_filepath)

        return {
            "zip_path": zip_filepath,
            "zip_filename": zip_filename,
            "size_bytes": file_size,
            "file_count": len(terraform_files) + 4,
        }
