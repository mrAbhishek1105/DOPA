from datetime import datetime
import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.repositories.project_repository import ProjectRepository

router = APIRouter()

class CreateProjectRequest(BaseModel):
    name: str

class ProjectSummaryResponse(BaseModel):
    id: uuid.UUID
    name: str
    status: str
    created_at: datetime
    updated_at: datetime

@router.post("/", response_model=ProjectSummaryResponse)
async def create_project(request: CreateProjectRequest, db: AsyncSession = Depends(get_db)):
    repo = ProjectRepository(db)
    project = await repo.create_project(name=request.name)
    return ProjectSummaryResponse(
        id=project.id, name=project.name, status=project.status,
        created_at=project.created_at, updated_at=project.updated_at
    )

@router.get("/", response_model=list[ProjectSummaryResponse])
async def list_projects(limit: int = 50, db: AsyncSession = Depends(get_db)):
    repo = ProjectRepository(db)
    projects = await repo.list_projects(limit=limit)
    return [
        ProjectSummaryResponse(id=p.id, name=p.name, status=p.status, created_at=p.created_at, updated_at=p.updated_at)
        for p in projects
    ]

@router.get("/{project_id}", response_model=dict[str, Any])
async def get_project(project_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    repo = ProjectRepository(db)
    project = await repo.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    return {
        "id": str(project.id),
        "name": project.name,
        "status": project.status,
        "created_at": project.created_at.isoformat(),
        "updated_at": project.updated_at.isoformat(),
        "requirements": len(project.requirements),
        "architectures": len(project.architectures),
        "reports": len(project.reports)
    }

@router.delete("/{project_id}")
async def delete_project(project_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    repo = ProjectRepository(db)
    success = await repo.delete_project(project_id)
    if not success:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"status": "deleted"}

@router.get("/{project_id}/requirements", response_model=dict[str, Any])
async def get_project_requirements(project_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    repo = ProjectRepository(db)
    project = await repo.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Get the latest requirement snapshot
    if not project.requirements:
        return {"extracted": {}, "missing_fields": [], "is_complete": False}
        
    latest_req = max(project.requirements, key=lambda r: r.created_at)
    return {
        "extracted": latest_req.extracted,
        "missing_fields": latest_req.missing_fields,
        "is_complete": latest_req.is_complete
    }

@router.get("/{project_id}/status", response_model=dict[str, str])
async def get_project_status(project_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    repo = ProjectRepository(db)
    project = await repo.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    return {"status": project.status}

@router.get("/{project_id}/graph", response_model=dict[str, Any])
async def get_project_graph(project_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    repo = ProjectRepository(db)
    project = await repo.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if not project.architectures:
        return {"nodes": [], "edges": []}

    latest_arch = max(project.architectures, key=lambda a: a.created_at)
    return {
        "nodes": latest_arch.nodes,
        "edges": latest_arch.edges
    }

from backend.schemas.requirements import RequirementModel
from backend.services.pattern_engine import PatternEngine
from backend.services.recommendation_engine import RecommendationEngine

@router.get("/{project_id}/recommendations", response_model=dict[str, Any])
async def get_project_recommendations(project_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    repo = ProjectRepository(db)
    project = await repo.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if not project.requirements:
        return {"options": []}

    latest_req = max(project.requirements, key=lambda r: r.created_at)
    if not latest_req.is_complete:
        return {"options": []}

    if project.status not in ("options_generated", "graph_generated", "completed"):
        return {"options": []}

    try:
        clean_extracted = {k: v for k, v in (latest_req.extracted or {}).items() if not k.startswith("__")}
        req_model = RequirementModel(**clean_extracted)
    except Exception:
        return {"options": []}

    pattern_engine = PatternEngine()
    pattern_result = pattern_engine.match(req_model)

    rec_engine = RecommendationEngine()
    recommendations = rec_engine.generate(pattern_result)

    selected_option_id = None
    if project.architectures:
        latest_arch = max(project.architectures, key=lambda a: a.created_at)
        selected_option_id = latest_arch.metadata_info.get("recommendation_id")

    options_data = []
    for opt in recommendations.options:
        data = opt.model_dump()
        data["is_selected"] = (opt.id == selected_option_id)
        if opt.metrics:
            data["cost"] = opt.metrics.cost
            data["complexity"] = opt.metrics.complexity
            data["scalability"] = opt.metrics.scalability
            data["security"] = opt.metrics.security
            data["reliability"] = opt.metrics.reliability
        options_data.append(data)

    return {"options": options_data}
