from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


# ──────────────────────────────────────────────
# Graph Validation Schemas
# ──────────────────────────────────────────────

class ValidationIssue(BaseModel):
    """Single validation issue found during graph validation."""

    severity: Literal["error", "warning", "info"]
    category: str = Field(..., min_length=1)
    rule_id: str = Field(..., min_length=1)
    message: str = Field(..., min_length=1)
    node_id: str | None = None
    edge_id: str | None = None

    model_config = {
        "str_strip_whitespace": True,
        "extra": "forbid",
    }


class ValidationResult(BaseModel):
    """Result of validating an ArchitectureGraph."""

    graph_id: str = Field(..., min_length=1)
    validation_score: int = Field(..., ge=0, le=100)
    passed: bool
    issues: list[ValidationIssue] = Field(default_factory=list)

    model_config = {
        "str_strip_whitespace": True,
        "extra": "forbid",
    }


PASS_THRESHOLD: int = 70


# ──────────────────────────────────────────────
# Knowledge Validation Schemas
# ──────────────────────────────────────────────

class KnowledgeIssue(BaseModel):
    """Single issue found during knowledge validation."""

    file: str = Field(..., min_length=1)
    severity: Literal["error", "warning", "info"]
    category: str = Field(..., min_length=1)
    message: str = Field(..., min_length=1)

    model_config = {
        "str_strip_whitespace": True,
        "extra": "forbid",
    }


class KnowledgeValidationResult(BaseModel):
    """Result of validating the knowledge directory at startup."""

    passed: bool
    issues: list[KnowledgeIssue] = Field(default_factory=list)
    loaded_files: int = 0
    valid_files: int = 0

    model_config = {
        "str_strip_whitespace": True,
        "extra": "forbid",
    }