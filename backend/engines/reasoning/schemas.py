from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class CapabilitySchema(BaseModel):
    id: str = Field(..., min_length=1)
    name: str = Field(..., min_length=1)
    reason: str = Field(..., min_length=1)
    importance: str = Field(default="required")
    priority: int = Field(default=0)
    source_rule: str | None = None
    dependencies: list[str] = Field(default_factory=list)


class DecisionSchema(BaseModel):
    title: str = Field(..., min_length=1)
    reason: str = Field(..., min_length=1)
    confidence: float = Field(..., ge=0.0, le=1.0)
    rule_id: str | None = None
    timestamp: str | None = None


class ConflictSchema(BaseModel):
    id: str = Field(..., min_length=1)
    severity: str = Field(..., min_length=1)
    reason: str = Field(..., min_length=1)
    recommendation: str = Field(..., min_length=1)
    blocking: bool = False


class AssumptionSchema(BaseModel):
    field: str = Field(..., min_length=1)
    value: str = Field(..., min_length=1)
    reason: str = Field(..., min_length=1)
    confidence: float = Field(default=0.8, ge=0.0, le=1.0)


class ReasoningResult(BaseModel):
    requirements: dict[str, Any] = Field(default_factory=dict)
    architecture_intent: dict[str, Any] = Field(default_factory=dict)
    architectural_characteristics: dict[str, Any] = Field(default_factory=dict)
    capabilities: list[str] = Field(default_factory=list)
    decisions: list[DecisionSchema] = Field(default_factory=list)
    assumptions: list[AssumptionSchema] = Field(default_factory=list)
    conflicts: list[ConflictSchema] = Field(default_factory=list)
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)

    model_config = {
        "str_strip_whitespace": True,
        "extra": "forbid",
    }
