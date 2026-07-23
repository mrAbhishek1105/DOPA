import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.repositories.project_repository import ProjectRepository
from backend.services.validation_engine import ValidationEngine

router = APIRouter()


class CheckValidationRequest(BaseModel):
    project_id: uuid.UUID


@router.post("/check", response_model=dict[str, Any])
async def check_validation(request: CheckValidationRequest, db: AsyncSession = Depends(get_db)):
    repo = ProjectRepository(db)
    project = await repo.get_project(request.project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if not project.architectures:
        raise HTTPException(status_code=400, detail="Project has no architecture graph.")

    latest_arch = max(project.architectures, key=lambda a: a.created_at)
    tf_report = await repo.get_latest_report(project.id, "terraform")
    tf_files = tf_report.payload.get("files") if tf_report else None

    engine = ValidationEngine()
    validation_res = engine.validate(
        graph_nodes=latest_arch.nodes,
        graph_edges=latest_arch.edges,
        terraform_files=tf_files,
    )

    await repo.save_report(
        project_id=project.id,
        report_type="validation",
        payload=validation_res,
    )

    return validation_res


@router.get("/{project_id}", response_model=dict[str, Any])
async def get_validation(project_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    repo = ProjectRepository(db)
    report = await repo.get_latest_report(project_id, "validation")
    if not report:
        return {"status": "PASSED", "passed": True, "issues": []}
    return report.payload
