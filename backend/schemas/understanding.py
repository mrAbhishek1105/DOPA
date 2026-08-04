from typing import Any, List, Dict
from pydantic import BaseModel, Field


class Facts(BaseModel):
    application_type: str | None = None
    traffic: str | None = None
    availability: str | None = None
    database: str | None = None
    region: str | None = None
    budget: str | None = None
    realtime_latency: str | None = None
    media_storage: str | None = None
    compliance: str | None = None
    cloud: str | None = None

class ConfidenceScores(BaseModel):
    application_type: int | None = None
    traffic: int | None = None
    availability: int | None = None
    database: int | None = None
    region: int | None = None
    budget: int | None = None
    realtime_latency: int | None = None
    media_storage: int | None = None
    compliance: int | None = None
    cloud: int | None = None

class BusinessUnderstanding(BaseModel):
    """
    Structured output from the AI Business Analyst.
    This schema separates explicit user facts from AI inferred assumptions.
    """

    explicit_facts: Facts = Field(
        default_factory=Facts,
        description="Values explicitly stated by the user (e.g., 'I need PostgreSQL').",
    )
    inferred_facts: Facts = Field(
        default_factory=Facts,
        description="Assumptions derived from context (e.g., Portfolio -> Low Traffic).",
    )
    confidence: ConfidenceScores = Field(
        default_factory=ConfidenceScores,
        description="Per-field confidence scores from 0 to 100.",
    )
    uncertainties: List[str] = Field(
        default_factory=list,
        description="Fields where confidence is too low to make an assumption, or explicitly missing information.",
    )
    reasoning: str = Field(
        description="The 'why' behind the explicit facts and inferred assumptions."
    )

    @property
    def extracted(self) -> Dict[str, Any]:
        """
        Backward-compatible flattened view used by older tests and callers.

        Explicit facts win over inferred values when both exist for the same field.
        """
        extracted: Dict[str, Any] = {}
        for field, value in self.inferred_facts.model_dump(exclude_none=True).items():
            extracted[field] = value
        extracted.update(self.explicit_facts.model_dump(exclude_none=True))
        return extracted
