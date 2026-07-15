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

@router.get("/{project_id}/recommendations", response_model=dict[str, Any])
async def get_project_recommendations(project_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    repo = ProjectRepository(db)
    project = await repo.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if not project.architectures:
        return {"options": []}

    latest_arch = max(project.architectures, key=lambda a: a.created_at)
    metrics = latest_arch.metadata_info.get("metrics", {})
    
    return {
        "options": [
            {
                "id": latest_arch.metadata_info.get("recommendation_id", "A"),
                "name": latest_arch.metadata_info.get("recommendation_name", "Unknown"),
                "score": latest_arch.score,
                "score_percent": int(latest_arch.score * 100),
                "is_selected": True,
                "cost": metrics.get("cost", 50),
                "complexity": metrics.get("complexity", 50),
                "scalability": metrics.get("scalability", 50),
                "security": metrics.get("security", 50),
                "reliability": metrics.get("reliability", 50),
            }
        ]
    }
