import uuid
import logging
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.repositories.project_repository import ProjectRepository
from backend.services.discovery_engine import DiscoveryEngine
from backend.services.conversation_planner import ConversationPlanner
from backend.services.response_builder import ResponseBuilder
from backend.schemas.planner import PlannerState

router = APIRouter()
logger = logging.getLogger(__name__)

class ConversationMessageRequest(BaseModel):
    project_id: uuid.UUID
    message: str = Field(..., min_length=1, max_length=8000)

@router.post("/message", response_model=dict[str, Any])
async def process_message(request: ConversationMessageRequest, db: AsyncSession = Depends(get_db)):
    repo = ProjectRepository(db)
    project = await repo.get_project(request.project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    planner_state: PlannerState | None = None

    # Retrieve existing state
    if project.requirements:
        latest_req = max(project.requirements, key=lambda r: r.created_at)
        raw_planner = (latest_req.extracted or {}).get("__planner_state__")
        if raw_planner and isinstance(raw_planner, dict):
            try:
                planner_state = PlannerState.model_validate(raw_planner)
            except Exception:
                logger.warning("Failed to restore planner state", exc_info=True)
                planner_state = None

    # Convert state graph to simple dict for the AI context
    current_state_snapshot = {}
    if planner_state:
        for k, v in planner_state.graph.items():
            current_state_snapshot[k] = v.value

    # 1. Run AI Discovery Engine (extracts BusinessUnderstanding)
    engine = DiscoveryEngine()
    understanding = await engine.process_message(
        request.message,
        current_state_snapshot
    )

    # 2. Run Deterministic Planner
    planner = ConversationPlanner()
    planner_result, updated_state = planner.plan(understanding, planner_state)

    # 3. Prepare response
    final_question = planner_result.next_question
    final_is_complete = planner_result.is_complete

    # 4. Run Response Builder (Format nice markdown output)
    builder = ResponseBuilder()
    
    # We pass a simple dict to the ResponseBuilder for backwards compatibility
    extracted = {k: v.value for k, v in updated_state.graph.items()}
    built = builder.build_simple(
        extracted=extracted,
        next_question=final_question,
        is_complete=final_is_complete
    )

    # 5. Persist to DB
    persisted_extracted = dict(extracted)
    persisted_extracted["__planner_state__"] = updated_state.model_dump()

    await repo.save_requirement(
        project_id=project.id,
        extracted=persisted_extracted,
        missing=[], # Obsolete in v2
        is_complete=final_is_complete,
    )

    if final_is_complete and project.status == "discovery":
        await repo.update_status(project.id, "requirements_gathered")

    logger.info(
        "Turn %d for project %s — field: %s, confidence: %.2f",
        updated_state.turn_count,
        request.project_id,
        planner_result.field_being_asked,
        planner_result.confidence,
    )

    return {
        "extracted": extracted,
        "next_question": final_question,
        "is_complete": final_is_complete,
        "confidence": planner_result.confidence,
        "builder_message": built["message"],
        "notebook": built["notebook"],
        "response_type": built["response_type"],
        "suggested_replies": planner_result.suggested_replies,
        "field_being_asked": planner_result.field_being_asked,
    }
