from __future__ import annotations

from typing import Any, Literal, Dict, List

from pydantic import BaseModel, Field

class ProjectGraphNode(BaseModel):
    """A node in the Project Knowledge Graph."""
    value: Any
    confidence: int = Field(ge=0, le=100)
    source: Literal["explicit", "inferred"]
    verified: bool = False

class PlannerState(BaseModel):
    """
    State of the conversation and the Project Knowledge Graph.
    """
    # The central source of truth for the project requirements
    graph: Dict[str, ProjectGraphNode] = Field(default_factory=dict)
    
    # State tracking
    turn_count: int = 0
    asked_fields: List[str] = Field(default_factory=list)
    last_asked_field: str | None = None
    field_attempt_counts: Dict[str, int] = Field(default_factory=dict)
    
    is_complete: bool = False

    model_config = {
        "str_strip_whitespace": True,
    }

class PlannerResult(BaseModel):
    """Output of the Conversation Planner."""
    next_question: str | None = None
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    is_complete: bool = False
    
    # For UI
    field_being_asked: str | None = None
    suggested_replies: List[str] = Field(default_factory=list)

    model_config = {
        "str_strip_whitespace": True,
    }
