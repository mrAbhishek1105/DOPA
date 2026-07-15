"""Pydantic schemas for the Sprint 6A Architecture Intelligence Pipeline."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class ArchitectureIntent(BaseModel):
    """The architecture intent determined from requirements."""

    intent_id: str
    name: str
    description: str = ""
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)
    trigger_fields: dict[str, Any] = Field(default_factory=dict)


class ArchitectureStyle(BaseModel):
    """An architecture style with its logical components (cloud-agnostic)."""

    style_id: str
    name: str
    description: str = ""
    logical_components: list[str] = Field(default_factory=list)
    characteristics: dict[str, Any] = Field(default_factory=dict)
    tags: list[str] = Field(default_factory=list)


class ServiceCandidate(BaseModel):
    """A candidate service for a logical component."""

    service: str
    score: float = Field(ge=0.0, le=100.0)
    best_for: list[str] = Field(default_factory=list)
    avoid_when: list[str] = Field(default_factory=list)
    selection_reason: str = ""


class ComponentServiceMap(BaseModel):
    """Mapping from a logical component to selected services."""

    component_id: str
    component_label: str = ""
    candidates: list[ServiceCandidate] = Field(default_factory=list)
    selected: ServiceCandidate | None = None
    selection_policy: str = ""


class ArchitecturePlan(BaseModel):
    """Complete architecture plan from the Sprint 6A pipeline."""

    requirements: dict[str, Any] = Field(default_factory=dict)
    intents: list[ArchitectureIntent] = Field(default_factory=list)
    style: ArchitectureStyle | None = None
    components: list[ComponentServiceMap] = Field(default_factory=list)
    constraints: dict[str, Any] = Field(default_factory=dict)
    provider: str = "aws"
    reasoning_trace: list[dict[str, Any]] = Field(default_factory=list)

    model_config = {
        "str_strip_whitespace": True,
        "extra": "forbid",
    }


class Constraint(BaseModel):
    """A constraint that affects service selection."""

    name: str
    value: Any
    source: str = "requirement"  # "requirement" | "inferred" | "user_override"
    severity: Literal["must", "prefer", "avoid"] = "must"