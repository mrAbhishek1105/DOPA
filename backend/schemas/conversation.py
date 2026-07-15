from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


class ConversationMessage(BaseModel):
    """A single message in a conversation."""

    role: Literal["user", "assistant"]
    content: str = Field(..., min_length=1)
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    model_config = {
        "str_strip_whitespace": True,
        "extra": "forbid",
    }


class CompletenessResult(BaseModel):
    """Result of checking requirement completeness for an application type."""

    application_type: str = Field(..., min_length=1)
    completed_fields: list[str] = Field(default_factory=list)
    missing_fields: list[str] = Field(default_factory=list)
    is_complete: bool = False

    model_config = {
        "str_strip_whitespace": True,
        "extra": "forbid",
    }


class ConversationState(BaseModel):
    """Current state of a conversation with the discovery engine."""

    project_id: str = Field(..., min_length=1)
    messages: list[ConversationMessage] = Field(default_factory=list)
    extracted_requirements: dict[str, Any] = Field(default_factory=dict)
    current_question: str | None = None
    missing_fields: list[str] = Field(default_factory=list)
    completed_fields: list[str] = Field(default_factory=list)
    is_complete: bool = False

    model_config = {
        "str_strip_whitespace": True,
        "extra": "forbid",
    }


class DiscoveryResponse(BaseModel):
    """Response from the discovery engine after processing a message."""

    extracted: dict[str, Any] = Field(default_factory=dict)
    missing_fields: list[str] = Field(default_factory=list)
    completed_fields: list[str] = Field(default_factory=list)
    next_question: str | None = None
    is_complete: bool = False
    planner_goal: str | None = None
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)

    model_config = {
        "str_strip_whitespace": True,
    }