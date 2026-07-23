import uuid
import json
import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.repositories.project_repository import ProjectRepository
from backend.services.discovery_engine import DiscoveryEngine
from backend.services.conversation_planner import ConversationPlanner
from backend.services.response_builder import ResponseBuilder
from backend.schemas.conversation import DiscoveryResponse
from backend.schemas.planner import PlannerState

router = APIRouter()
logger = logging.getLogger(__name__)

class ConversationMessageRequest(BaseModel):
    project_id: uuid.UUID
    message: str

@router.post("/message", response_model=dict[str, Any])
async def process_message(request: ConversationMessageRequest, db: AsyncSession = Depends(get_db)):
    repo = ProjectRepository(db)
    project = await repo.get_project(request.project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Get extracted_so_far and planner_state from the latest requirement snapshot
    extracted_so_far: dict[str, Any] = {}
    planner_state: PlannerState | None = None

    if project.requirements:
        latest_req = max(project.requirements, key=lambda r: r.created_at)
        extracted_so_far = latest_req.extracted or {}

        # Restore planner state if persisted
        raw_planner = (latest_req.extracted or {}).get("__planner_state__")
        if raw_planner and isinstance(raw_planner, dict):
            try:
                planner_state = PlannerState(**raw_planner)
            except Exception:
                logger.warning("Failed to restore planner state, starting fresh", exc_info=True)
                planner_state = None

    # Strip internal planner key from extracted fields before passing to engine
    clean_extracted = {k: v for k, v in extracted_so_far.items() if not k.startswith("__")}

    # 1. Run Discovery Engine (deterministic extraction)
    engine = DiscoveryEngine()
    discovery_response: DiscoveryResponse = engine.process_message(request.message, clean_extracted)

    # 2. Run Conversation Planner (intelligent question selection)
    planner = ConversationPlanner()
    planner_result, updated_state = planner.plan(discovery_response, planner_state)

    # Override the discovery engine's raw question with the planner's contextual question
    final_question = planner_result.next_question or discovery_response.next_question
    final_is_complete = planner_result.is_complete or discovery_response.is_complete

    # 3. Run Response Builder (persona / natural language layer)
    builder = ResponseBuilder()
    # Create a new DiscoveryResponse with the final question overridden
    enhanced_discovery = DiscoveryResponse(
        extracted=discovery_response.extracted,
        missing_fields=discovery_response.missing_fields,
        completed_fields=discovery_response.completed_fields,
        next_question=final_question,
        is_complete=final_is_complete,
    )
    built = builder.build(enhanced_discovery, planner_result)

    # 4. Persist the requirement snapshot with planner state embedded
    persisted_extracted = dict(discovery_response.extracted)
    persisted_extracted["__planner_state__"] = updated_state.model_dump()

    await repo.save_requirement(
        project_id=project.id,
        extracted=persisted_extracted,
        missing=discovery_response.missing_fields,
        is_complete=final_is_complete,
    )

    if final_is_complete and project.status == "discovery":
        await repo.update_status(project.id, "requirements_gathered")

    logger.info(
        "Conversation turn %d for project %s — goal: %s, confidence: %.2f",
        updated_state.turn_count,
        request.project_id,
        planner_result.active_goal,
        planner_result.confidence,
    )

    return {
        "extracted": discovery_response.extracted,
        "missing_fields": discovery_response.missing_fields,
        "completed_fields": discovery_response.completed_fields,
        "next_question": final_question,
        "is_complete": final_is_complete,
        "planner_goal": planner_result.active_goal,
        "confidence": planner_result.confidence,
        "builder_message": built["message"],
        "notebook": built["notebook"],
        "response_type": built["response_type"],
    }
