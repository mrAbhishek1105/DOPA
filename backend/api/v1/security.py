import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.repositories.project_repository import ProjectRepository
from backend.services.security_engine import SecurityEngine

router = APIRouter()


class AnalyzeSecurityRequest(BaseModel):
    project_id: uuid.UUID


@router.post("/analyze", response_model=dict[str, Any])
async def analyze_security(request: AnalyzeSecurityRequest, db: AsyncSession = Depends(get_db)):
    repo = ProjectRepository(db)
    project = await repo.get_project(request.project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if not project.architectures:
        raise HTTPException(status_code=400, detail="Project has no architecture graph.")

    latest_arch = max(project.architectures, key=lambda a: a.created_at)
    tf_report = await repo.get_latest_report(project.id, "terraform")
    tf_files = tf_report.payload.get("files") if tf_report else None

    engine = SecurityEngine()
    analysis = engine.analyze(
        graph_nodes=latest_arch.nodes,
        graph_edges=latest_arch.edges,
        terraform_files=tf_files,
    )

    await repo.save_report(
        project_id=project.id,
        report_type="security",
        payload=analysis,
    )

    if project.status in ("graph_generated", "terraform_generating"):
        await repo.update_status(project.id, "analyzing")

    return analysis


@router.get("/{project_id}", response_model=dict[str, Any])
async def get_security(project_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    repo = ProjectRepository(db)
    report = await repo.get_latest_report(project_id, "security")
    if not report:
        return {"findings": [], "risk_score": 100, "risk_level": "LOW"}
    return report.payload
