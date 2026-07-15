from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class ScoredDimension(BaseModel):
    """A single dimension contributing to a pattern match score."""

    dimension: str = Field(..., min_length=1)
    weight: int = Field(..., ge=0, le=100)
    score: int = Field(..., ge=0)
    reason: str = Field(default="")

    model_config = {
        "str_strip_whitespace": True,
        "extra": "forbid",
    }


class PatternMatchResult(BaseModel):
    """Result of matching a structured requirement to a pattern."""

    pattern_id: str = Field(..., min_length=1)
    total_score: int = Field(..., ge=0, le=100)
    confidence: float = Field(..., ge=0.0, le=1.0)
    dimensions: list[ScoredDimension] = Field(default_factory=list)
    recommended_services: list[str] = Field(default_factory=list)

    model_config = {
        "str_strip_whitespace": True,
        "extra": "forbid",
    }


# Default scoring weights used by PatternEngine
# Sum must equal 100
DEFAULT_SCORING_WEIGHTS: dict[str, int] = {
    "application_type": 40,
    "traffic": 20,
    "availability": 20,
    "budget": 10,
    "compliance": 10,
}
