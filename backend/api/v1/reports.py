import os
import tempfile
import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.repositories.project_repository import ProjectRepository
from backend.services.cost_engine import CostEngine
from backend.services.explanation_engine import ExplanationEngine
from backend.services.packaging_engine import PackagingEngine
from backend.services.report_engine import ReportEngine
from backend.services.security_engine import SecurityEngine
from backend.services.terraform_engine import TerraformEngine
from backend.services.validation_engine import ValidationEngine

router = APIRouter()


class GenerateReportsRequest(BaseModel):
    project_id: uuid.UUID


@router.post("/generate", response_model=dict[str, Any])
async def generate_reports(request: GenerateReportsRequest, db: AsyncSession = Depends(get_db)):
    repo = ProjectRepository(db)
    project = await repo.get_project(request.project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if not project.architectures:
        raise HTTPException(status_code=400, detail="Project has no architecture graph.")

    latest_arch = max(project.architectures, key=lambda a: a.created_at)

    extracted_reqs = {}
    if project.requirements:
        latest_req = max(project.requirements, key=lambda r: r.created_at)
        extracted_reqs = latest_req.extracted or {}

    # 1. Ensure Terraform is generated
    tf_report = await repo.get_latest_report(project.id, "terraform")
    if not tf_report:
        tf_engine = TerraformEngine()
        tf_files = tf_engine.generate(latest_arch.nodes, latest_arch.edges, project.name)
        await repo.save_report(project.id, "terraform", {"files": tf_files})
    else:
        tf_files = tf_report.payload.get("files", {})

    # 2. Ensure Security, Cost, Validation, Explanation are generated
    sec_report = await repo.get_latest_report(project.id, "security")
    if not sec_report:
        sec_engine = SecurityEngine()
        sec_payload = sec_engine.analyze(latest_arch.nodes, latest_arch.edges, tf_files)
        await repo.save_report(project.id, "security", sec_payload)
    else:
        sec_payload = sec_report.payload

    cost_report = await repo.get_latest_report(project.id, "cost")
    if not cost_report:
        cost_engine = CostEngine()
        cost_payload = cost_engine.calculate(latest_arch.nodes, latest_arch.edges)
        await repo.save_report(project.id, "cost", cost_payload)
    else:
        cost_payload = cost_report.payload

    val_report = await repo.get_latest_report(project.id, "validation")
    if not val_report:
        val_engine = ValidationEngine()
        val_payload = val_engine.validate(latest_arch.nodes, latest_arch.edges, tf_files)
        await repo.save_report(project.id, "validation", val_payload)
    else:
        val_payload = val_report.payload

    exp_report = await repo.get_latest_report(project.id, "explanation")
    if not exp_report:
        selected_option = {
            "name": latest_arch.metadata_info.get("recommendation_name", "Balanced Option"),
            "score": latest_arch.score,
        }
        exp_engine = ExplanationEngine()
        exp_payload = exp_engine.generate(extracted_reqs, selected_option, sec_payload, cost_payload)
        await repo.save_report(project.id, "explanation", exp_payload)
    else:
        exp_payload = exp_report.payload

    # 3. Generate HLD.md and LLD.md
    report_engine = ReportEngine()
    hld_md = report_engine.generate_hld(
        project_name=project.name,
        extracted_reqs=extracted_reqs,
        nodes=latest_arch.nodes,
        edges=latest_arch.edges,
        cost_report=cost_payload,
        security_report=sec_payload,
        explanation=exp_payload,
    )
    lld_md = report_engine.generate_lld(
        project_name=project.name,
        nodes=latest_arch.nodes,
        edges=latest_arch.edges,
        terraform_files=tf_files,
        validation_report=val_payload,
    )

    await repo.save_report(project.id, "hld", {"content": hld_md})
    await repo.save_report(project.id, "lld", {"content": lld_md})

    # 4. Package Artifacts into ZIP
    pkg_engine = PackagingEngine()
    package_info = pkg_engine.package(
        project_id=str(project.id),
        project_name=project.name,
        terraform_files=tf_files,
        hld_md=hld_md,
        lld_md=lld_md,
        security_report=sec_payload,
        cost_report=cost_payload,
    )

    await repo.save_report(project.id, "package", package_info)
    await repo.update_status(project.id, "completed")

    return {
        "project_id": str(project.id),
        "status": "completed",
        "hld_md": hld_md,
        "lld_md": lld_md,
        "package": package_info,
    }


@router.get("/{project_id}/download")
async def download_package(project_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    repo = ProjectRepository(db)
    report = await repo.get_latest_report(project_id, "package")
    if not report:
        raise HTTPException(status_code=404, detail="Artifact package not found. Run /reports/generate first.")

    pkg_info = report.payload
    expected_zip_path = os.path.join(
        tempfile.gettempdir(),
        "dopa_artifacts",
        str(project_id),
        f"dopa_architecture_{str(project_id)[:8]}.zip",
    )
    zip_path = expected_zip_path

    if not os.path.exists(zip_path):
        # Regenerate package if temp file expired
        project = await repo.get_project(project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")

        # Trigger re-generation
        res = await generate_reports(GenerateReportsRequest(project_id=project_id), db)
        zip_path = res["package"]["zip_path"]

    filename = pkg_info.get("zip_filename", f"dopa_architecture_{str(project_id)[:8]}.zip")
    return FileResponse(
        path=zip_path,
        filename=filename,
        media_type="application/zip",
    )


@router.get("/{project_id}", response_model=dict[str, Any])
async def get_reports(project_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    repo = ProjectRepository(db)
    hld = await repo.get_latest_report(project_id, "hld")
    lld = await repo.get_latest_report(project_id, "lld")
    package = await repo.get_latest_report(project_id, "package")

    return {
        "hld": hld.payload if hld else None,
        "lld": lld.payload if lld else None,
        "package": package.payload if package else None,
    }
