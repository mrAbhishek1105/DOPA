import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.repositories.project_repository import ProjectRepository
from backend.schemas.requirements import RequirementModel
from backend.services.pattern_engine import PatternEngine
from backend.services.recommendation_engine import RecommendationEngine

router = APIRouter()


class GenerateRecommendationsRequest(BaseModel):
    project_id: uuid.UUID


@router.post("/generate", response_model=dict[str, Any])
async def generate_recommendations(request: GenerateRecommendationsRequest, db: AsyncSession = Depends(get_db)):
    repo = ProjectRepository(db)
    project = await repo.get_project(request.project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if not project.requirements:
        raise HTTPException(status_code=400, detail="Project has no requirements. Please run discovery first.")

    latest_req = max(project.requirements, key=lambda r: r.created_at)
    if not latest_req.is_complete:
        raise HTTPException(status_code=400, detail="Requirements are not complete yet.")

    try:
        clean_extracted = {k: v for k, v in (latest_req.extracted or {}).items() if not k.startswith("__")}
        req_model = RequirementModel(**clean_extracted)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse requirements: {str(e)}")

    pattern_engine = PatternEngine()
    pattern_result = pattern_engine.match(req_model)

    rec_engine = RecommendationEngine()
    recommendations = rec_engine.generate(pattern_result)

    if not recommendations.options:
        raise HTTPException(status_code=404, detail="No valid architecture recommendations found for these requirements.")

    # Update project status
    if project.status in ("discovery", "requirements_gathered"):
        await repo.update_status(project.id, "options_generated")

    return {
        "pattern": pattern_result.model_dump(),
        "options": [opt.model_dump() for opt in recommendations.options]
    }
