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
from backend.services.graph_engine import GraphEngine
from backend.services.graph_validator import GraphValidator

router = APIRouter()

class GenerateArchitectureRequest(BaseModel):
    project_id: uuid.UUID

@router.post("/", response_model=dict[str, Any])
async def generate_architecture(request: GenerateArchitectureRequest, db: AsyncSession = Depends(get_db)):
    repo = ProjectRepository(db)
    project = await repo.get_project(request.project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if not project.requirements:
        raise HTTPException(status_code=400, detail="Project has no requirements. Please run discovery first.")

    latest_req = max(project.requirements, key=lambda r: r.created_at)
    if not latest_req.is_complete:
        raise HTTPException(status_code=400, detail="Requirements are not complete yet.")

    # 1. Transform dict into Pydantic model
    # Wait, RequirementModel takes kwargs.
    try:
        req_model = RequirementModel(**latest_req.extracted)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse requirements: {str(e)}")

    # 2. Pattern Engine
    pattern_engine = PatternEngine()
    pattern_result = pattern_engine.match(req_model)

    # 3. Recommendation Engine
    rec_engine = RecommendationEngine()
    recommendations = rec_engine.generate(pattern_result)

    if not recommendations.options:
        raise HTTPException(status_code=404, detail="No valid architecture recommendations found for these requirements.")

    # Select the top recommendation (option 0)
    selected_option = recommendations.options[0]

    # 4. Graph Engine
    graph_engine = GraphEngine()
    graph = graph_engine.build(selected_option)

    # 5. Validation
    validator = GraphValidator()
    validation_result = validator.validate(graph)

    # Persist the architecture
    arch = await repo.save_architecture(
        project_id=project.id,
        pattern_id=pattern_result.pattern_id,
        score=selected_option.score,
        nodes=[node.model_dump() for node in graph.nodes],
        edges=[edge.model_dump() for edge in graph.edges],
        metadata={
            "recommendation_id": selected_option.id,
            "recommendation_name": selected_option.name,
            "validation_passed": validation_result.passed,
            "validation_issues": [i.model_dump() for i in validation_result.issues],
            "metrics": {
                "cost": selected_option.metrics.cost,
                "complexity": selected_option.metrics.complexity,
                "scalability": selected_option.metrics.scalability,
                "security": selected_option.metrics.security,
                "reliability": selected_option.metrics.reliability,
            } if selected_option.metrics else {}
        }
    )

    # Update project status
    await repo.update_status(project.id, "graph_generated")

    return {
        "architecture_id": str(arch.id),
        "pattern": pattern_result.model_dump(),
        "selected_option": selected_option.model_dump(),
        "graph": {
            "nodes": [n.model_dump() for n in graph.nodes],
            "edges": [e.model_dump() for e in graph.edges]
        },
        "validation": validation_result.model_dump()
    }
