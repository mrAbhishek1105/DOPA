from __future__ import annotations

from pydantic import BaseModel, Field


class MetricEvaluation(BaseModel):
    """Multi-metric evaluation for a single architecture option."""

    cost: float = Field(..., ge=0.0, le=100.0)
    complexity: float = Field(..., ge=0.0, le=100.0)
    scalability: float = Field(..., ge=0.0, le=100.0)
    reliability: float = Field(..., ge=0.0, le=100.0)
    security: float = Field(..., ge=0.0, le=100.0)
    total: float = Field(..., ge=0.0, le=100.0)

    model_config = {
        "str_strip_whitespace": True,
        "extra": "forbid",
    }


class ArchitectureOption(BaseModel):
    """Single architecture option shown to the user."""

    id: str = Field(..., min_length=1)
    name: str = Field(..., min_length=1)
    score: float = Field(..., ge=0.0, le=1.0)
    metrics: MetricEvaluation | None = None
    services: list[str] = Field(default_factory=list)
    tradeoffs: list[str] = Field(default_factory=list)

    model_config = {
        "str_strip_whitespace": True,
        "extra": "forbid",
    }


class RecommendationResult(BaseModel):
    """Recommendation output for the UI and graph selection flow."""

    pattern_id: str = Field(..., min_length=1)
    options: list[ArchitectureOption] = Field(default_factory=list)

    model_config = {
        "str_strip_whitespace": True,
        "extra": "forbid",
    }


# Default ranking weights used by RecommendationEngine
# These can be made user-configurable later
DEFAULT_RANKING_WEIGHTS: dict[str, float] = {
    "cost": 0.20,
    "complexity": 0.15,
    "scalability": 0.25,
    "reliability": 0.25,
    "security": 0.15,
}
