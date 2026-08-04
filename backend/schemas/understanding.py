from typing import Any, Dict, List
from pydantic import BaseModel, Field

class InferredFact(BaseModel):
    value: Any = Field(description="The inferred value for the field.")
    confidence: int = Field(ge=0, le=100, description="Confidence score from 0 to 100.")

class BusinessUnderstanding(BaseModel):
    """
    Structured output from the AI Business Analyst.
    This schema separates explicit user facts from AI inferred assumptions.
    """
    explicit_facts: Dict[str, Any] = Field(
        default_factory=dict,
        description="Values explicitly stated by the user (e.g., 'I need PostgreSQL')."
    )
    inferred_facts: Dict[str, InferredFact] = Field(
        default_factory=dict,
        description="Assumptions derived from context (e.g., Portfolio -> Low Traffic)."
    )
    uncertainties: List[str] = Field(
        default_factory=list,
        description="Fields where confidence is too low to make an assumption, or explicitly missing information."
    )
    reasoning: str = Field(
        description="The 'why' behind the explicit facts and inferred assumptions."
    )
