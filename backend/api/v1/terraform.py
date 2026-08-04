import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.repositories.project_repository import ProjectRepository
from backend.services.terraform_engine import TerraformEngine

router = APIRouter()


class GenerateTerraformRequest(BaseModel):
    project_id: uuid.UUID


@router.post("/generate", response_model=dict[str, Any])
async def generate_terraform(request: GenerateTerraformRequest, db: AsyncSession = Depends(get_db)):
    repo = ProjectRepository(db)
    project = await repo.get_project(request.project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if not project.architectures:
        raise HTTPException(status_code=400, detail="Project has no architecture graph. Generate graph first.")

    latest_arch = max(project.architectures, key=lambda a: a.created_at)

    # Extract region, app type, and environment from project requirements
    region = "us-east-1"
    app_type = "ecommerce-platform"
    if project.requirements:
        latest_req = max(project.requirements, key=lambda r: r.created_at)
        if latest_req.extracted:
            region = latest_req.extracted.get("region") or "us-east-1"
            app_type = latest_req.extracted.get("application_type") or "ecommerce-platform"

    project_name = project.name
    if not project_name or project_name == "New Architecture":
        project_name = app_type.replace("_", "-")

    engine = TerraformEngine()
    files = engine.generate(
        graph_nodes=latest_arch.nodes,
        graph_edges=latest_arch.edges,
        project_name=project_name,
        region=region,
        environment="prod",
    )

    await repo.update_status(project.id, "terraform_generating")

    await repo.save_report(
        project_id=project.id,
        report_type="terraform",
        payload={"files": files},
    )

    await repo.update_status(project.id, "analyzing")

    return {
        "project_id": str(project.id),
        "files": files,
    }


@router.get("/{project_id}", response_model=dict[str, Any])
async def get_terraform(project_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    repo = ProjectRepository(db)
    report = await repo.get_latest_report(project_id, "terraform")
    if not report:
        return {"files": {}}
    return report.payload
