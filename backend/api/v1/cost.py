import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.repositories.project_repository import ProjectRepository
from backend.services.cost_engine import CostEngine

router = APIRouter()


class AnalyzeCostRequest(BaseModel):
    project_id: uuid.UUID


@router.post("/analyze", response_model=dict[str, Any])
async def analyze_cost(request: AnalyzeCostRequest, db: AsyncSession = Depends(get_db)):
    repo = ProjectRepository(db)
    project = await repo.get_project(request.project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if not project.architectures:
        raise HTTPException(status_code=400, detail="Project has no architecture graph.")

    latest_arch = max(project.architectures, key=lambda a: a.created_at)

    engine = CostEngine()
    cost_analysis = engine.calculate(
        graph_nodes=latest_arch.nodes,
        graph_edges=latest_arch.edges,
    )

    await repo.save_report(
        project_id=project.id,
        report_type="cost",
        payload=cost_analysis,
    )

    return cost_analysis


@router.get("/{project_id}", response_model=dict[str, Any])
async def get_cost(project_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    repo = ProjectRepository(db)
    report = await repo.get_latest_report(project_id, "cost")
    if not report:
        return {"estimated_monthly_cost": 0.0, "currency": "USD", "itemized_breakdown": []}
    return report.payload
