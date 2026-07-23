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


class GenerateGraphRequest(BaseModel):
    project_id: uuid.UUID
    selected_option_id: str


@router.post("/generate", response_model=dict[str, Any])
async def generate_graph(request: GenerateGraphRequest, db: AsyncSession = Depends(get_db)):
    repo = ProjectRepository(db)
    project = await repo.get_project(request.project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if not project.requirements:
        raise HTTPException(status_code=400, detail="Project has no requirements.")

    latest_req = max(project.requirements, key=lambda r: r.created_at)
    
    try:
        clean_extracted = {k: v for k, v in (latest_req.extracted or {}).items() if not k.startswith("__")}
        req_model = RequirementModel(**clean_extracted)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse requirements: {str(e)}")

    pattern_engine = PatternEngine()
    pattern_result = pattern_engine.match(req_model)

    rec_engine = RecommendationEngine()
    recommendations = rec_engine.generate(pattern_result)

    selected_option = next((opt for opt in recommendations.options if opt.id == request.selected_option_id), None)
    if not selected_option:
        raise HTTPException(status_code=404, detail=f"Recommendation option '{request.selected_option_id}' not found.")

    graph_engine = GraphEngine()
    graph = graph_engine.build(selected_option)

    validator = GraphValidator()
    validation_result = validator.validate(graph)

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
