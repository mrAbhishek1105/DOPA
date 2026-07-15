from __future__ import annotations

from pydantic import BaseModel, Field


class Node(BaseModel):
    """Business-level graph node used by the deterministic graph engine."""

    id: str = Field(..., min_length=1)
    type: str = Field(..., min_length=1)
    provider: str = "aws"
    service: str = Field(..., min_length=1)
    metadata: dict[str, object] = Field(default_factory=dict)

    model_config = {
        "str_strip_whitespace": True,
        "extra": "forbid",
    }


class Edge(BaseModel):
    """Directed relationship between two graph nodes."""

    id: str = Field(..., min_length=1)
    source: str = Field(..., min_length=1)
    target: str = Field(..., min_length=1)
    relationship: str = Field(..., min_length=1)
    properties: dict[str, object] = Field(default_factory=dict)

    model_config = {
        "str_strip_whitespace": True,
        "extra": "forbid",
    }


class ArchitectureGraph(BaseModel):
    """Canonical graph artifact stored by DOPA."""

    graph_id: str = Field(..., min_length=1)
    project_id: str = Field(..., min_length=1)
    version: str = Field(default="1.0")
    metadata: dict[str, object] = Field(default_factory=dict)
    nodes: list[Node] = Field(default_factory=list)
    edges: list[Edge] = Field(default_factory=list)

    model_config = {
        "str_strip_whitespace": True,
        "extra": "forbid",
    }


class ArchitectureTemplateNode(BaseModel):
    """Template node definition used by the Graph Engine."""

    id: str = Field(..., min_length=1)
    type: str = Field(..., min_length=1)
    service: str = Field(..., min_length=1)

    model_config = {
        "str_strip_whitespace": True,
        "extra": "forbid",
    }


class ArchitectureTemplateEdge(BaseModel):
    """Template edge definition used by the Graph Engine."""

    source: str = Field(..., min_length=1)
    target: str = Field(..., min_length=1)
    relationship: str = Field(..., min_length=1)

    model_config = {
        "str_strip_whitespace": True,
        "extra": "forbid",
    }


class ArchitectureTemplate(BaseModel):
    """Pattern-level blueprint for deterministic graph creation."""

    pattern_id: str = Field(..., min_length=1)
    services: list[str] = Field(default_factory=list)
    nodes: list[ArchitectureTemplateNode] = Field(default_factory=list)
    edges: list[ArchitectureTemplateEdge] = Field(default_factory=list)
    allowed_modes: list[str] = Field(default_factory=lambda: ["basic", "advanced", "expert"])

    model_config = {
        "str_strip_whitespace": True,
        "extra": "forbid",
    }