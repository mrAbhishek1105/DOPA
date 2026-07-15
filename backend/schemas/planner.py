"""Pydantic schemas for the Conversation Planner."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class Assumption(BaseModel):
    """An assumption made by the planner about a requirement field."""

    field: str
    value: Any
    confidence: float = Field(ge=0.0, le=1.0)
    source: str = "inferred"  # "explicit" (user said it) or "inferred" (engine guessed)


class GoalStatus(BaseModel):
    """Status of a single discovery goal."""

    goal_id: str
    priority: int
    is_satisfied: bool = False
    is_applicable: bool = True  # False if trigger conditions are not met
    satisfied_fields: list[str] = Field(default_factory=list)
    missing_fields: list[str] = Field(default_factory=list)


class PlannerState(BaseModel):
    """Full state of the Conversation Planner for a project.

    Persisted alongside requirement snapshots so that conversation
    context survives page refreshes and server restarts.
    """

    discovered_fields: dict[str, Any] = Field(default_factory=dict)
    active_goal: str | None = None
    active_question: str | None = None
    assumptions: list[Assumption] = Field(default_factory=list)
    confidence_scores: dict[str, float] = Field(default_factory=dict)
    conversation_stage: Literal[
        "initial",
        "requirements_discovery",
        "clarification",
        "complete",
    ] = "initial"
    clarification_history: list[str] = Field(default_factory=list)
    turn_count: int = 0

    model_config = {
        "str_strip_whitespace": True,
    }


class PlannerResult(BaseModel):
    """Output of the Conversation Planner after evaluating the current state."""

    next_question: str | None = None
    active_goal: str | None = None
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    is_complete: bool = False
    conversation_stage: str = "requirements_discovery"
    goals_summary: list[GoalStatus] = Field(default_factory=list)
    used_rule_id: str | None = None

    model_config = {
        "str_strip_whitespace": True,
    }
