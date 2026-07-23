import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.repositories.project_repository import ProjectRepository
from backend.services.explanation_engine import ExplanationEngine

router = APIRouter()


class GenerateExplanationRequest(BaseModel):
    project_id: uuid.UUID


@router.post("/generate", response_model=dict[str, Any])
async def generate_explanation(request: GenerateExplanationRequest, db: AsyncSession = Depends(get_db)):
    repo = ProjectRepository(db)
    project = await repo.get_project(request.project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    extracted_reqs = {}
    if project.requirements:
        latest_req = max(project.requirements, key=lambda r: r.created_at)
        extracted_reqs = latest_req.extracted or {}

    selected_option = None
    if project.architectures:
        latest_arch = max(project.architectures, key=lambda a: a.created_at)
        selected_option = {
            "name": latest_arch.metadata_info.get("recommendation_name", "Balanced Option"),
            "score": latest_arch.score,
        }

    sec_report = await repo.get_latest_report(project.id, "security")
    sec_payload = sec_report.payload if sec_report else None

    cost_report = await repo.get_latest_report(project.id, "cost")
    cost_payload = cost_report.payload if cost_report else None

    engine = ExplanationEngine()
    explanation = engine.generate(
        extracted_reqs=extracted_reqs,
        selected_option=selected_option,
        security_report=sec_payload,
        cost_report=cost_payload,
    )

    await repo.save_report(
        project_id=project.id,
        report_type="explanation",
        payload=explanation,
    )

    if project.status == "analyzing":
        await repo.update_status(project.id, "explaining")

    return explanation


@router.get("/{project_id}", response_model=dict[str, Any])
async def get_explanation(project_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    repo = ProjectRepository(db)
    report = await repo.get_latest_report(project_id, "explanation")
    if not report:
        return {"chosen_because": [], "tradeoff_narrative": ""}
    return report.payload
