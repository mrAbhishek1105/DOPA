import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.engines.reasoning.engine import ReasoningEngine
from backend.repositories.project_repository import ProjectRepository
from backend.schemas.requirements import RequirementModel

router = APIRouter()


class GenerateReasoningRequest(BaseModel):
    project_id: uuid.UUID | None = None
    requirements: dict[str, Any] = Field(default_factory=dict)


@router.post("/generate", response_model=dict[str, Any])
async def generate_reasoning(request: GenerateReasoningRequest, db: AsyncSession = Depends(get_db)):
    req_payload: dict[str, Any] = dict(request.requirements)
    repo = None

    if request.project_id:
        repo = ProjectRepository(db)
        project = await repo.get_project(request.project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")

        if project.requirements:
            latest_req = max(project.requirements, key=lambda item: item.created_at)
            req_payload = dict(latest_req.extracted or {})

    if "application_type" not in req_payload and "application" in req_payload:
        req_payload["application_type"] = req_payload["application"]

    try:
        req_model = RequirementModel(**req_payload)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid input requirements: {exc}") from exc

    normalized = req_model.model_dump(exclude_none=True)
    normalized = {k: v for k, v in normalized.items() if not k.startswith("__")}

    engine = ReasoningEngine()
    result = engine.generate(normalized)
    payload = result.model_dump()

    if repo and request.project_id:
        await repo.save_report(
            project_id=request.project_id,
            report_type="reasoning",
            payload=payload,
        )

    return payload


@router.get("/{project_id}", response_model=dict[str, Any])
async def get_reasoning(project_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    repo = ProjectRepository(db)
    report = await repo.get_latest_report(project_id, "reasoning")
    if not report:
        return {"capabilities": [], "decisions": [], "assumptions": [], "conflicts": [], "confidence": 0.0}
    return report.payload
