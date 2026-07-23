from __future__ import annotations

import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.engines.reasoning.schemas import ReasoningResult
from backend.engines.synthesis.engine import SynthesisEngine
from backend.engines.synthesis.schemas import ArchitectureOptionSchema, ArchitectureOptionsSchema, ComponentSchema, ScoreSchema, ServiceMappingSchema
from backend.repositories.project_repository import ProjectRepository

router = APIRouter()


class GenerateSynthesisRequest(BaseModel):
    project_id: uuid.UUID | None = None
    reasoning: dict[str, Any] | None = None
    cloud_provider: str = "aws"


@router.post("/generate", response_model=ArchitectureOptionsSchema)
async def generate_synthesis(request: GenerateSynthesisRequest, db: AsyncSession = Depends(get_db)):
    """Generate architecture options from reasoning results."""
    reasoning_payload: dict[str, Any] = {}

    if request.reasoning is not None:
        reasoning_payload = request.reasoning
    elif request.project_id:
        repo = ProjectRepository(db)
        report = await repo.get_latest_report(request.project_id, "reasoning")
        if not report:
            raise HTTPException(status_code=404, detail="No reasoning result found for this project")
        reasoning_payload = dict(report.payload)
    else:
        raise HTTPException(status_code=400, detail="Either reasoning or project_id is required")

    # Validate reasoning payload
    try:
        result = ReasoningResult(**reasoning_payload)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid reasoning data: {exc}") from exc

    # Run synthesis engine
    engine = SynthesisEngine()
    options = engine.generate(
        requirements=dict(result.requirements),
        capabilities=list(result.capabilities),
        cloud_provider=request.cloud_provider,
    )

    # Convert to response schema
    option_schemas = []
    for opt in options:
        components = [
            ComponentSchema(
                id=c.id,
                name=c.name,
                layer=c.layer,
                required=c.required,
                reason=c.reason,
                dependencies=list(c.dependencies),
            )
            for c in opt.components
        ]
        services = [
            ServiceMappingSchema(
                logical_component_id=s.logical_component_id,
                cloud_service_id=s.cloud_service_id,
                cloud_service_name=s.cloud_service_name,
                cloud_provider=s.cloud_provider,
                properties=dict(s.properties),
            )
            for s in opt.services
        ]
        score = None
        if opt.score:
            score = ScoreSchema(
                availability=opt.score.availability,
                cost=opt.score.cost,
                security=opt.score.security,
                operations=opt.score.operations,
                performance=opt.score.performance,
                overall=opt.score.overall,
            )
        option_schemas.append(
            ArchitectureOptionSchema(
                id=opt.id,
                name=opt.name,
                pattern=opt.pattern,
                components=components,
                services=services,
                score=score,
                reason=opt.reason,
            )
        )

    return ArchitectureOptionsSchema(architecture_options=option_schemas)


@router.get("/{project_id}", response_model=ArchitectureOptionsSchema)
async def get_synthesis(project_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Get previously generated architecture options for a project."""
    repo = ProjectRepository(db)
    report = await repo.get_latest_report(project_id, "synthesis")
    if not report:
        return ArchitectureOptionsSchema(architecture_options=[])
    return ArchitectureOptionsSchema(**report.payload)