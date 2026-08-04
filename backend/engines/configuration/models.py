from __future__ import annotations

from typing import Any, Optional
from pydantic import BaseModel, Field


class StructuredPropertyValue(BaseModel):
    value: Any = None
    default_value: Any = None
    recommended_value: Any = None
    source: str = "dopa_recommended"  # "aws" | "terraform" | "dopa_recommended" | "user"
    explanation: Optional[str] = None
    impact: Optional[str] = None
    learn_more: Optional[str] = None
    is_modified: bool = False


class ResourceDependencyGraph(BaseModel):
    depends_on: list[str] = Field(default_factory=list)
    required_by: list[str] = Field(default_factory=list)
    optional_with: list[str] = Field(default_factory=list)
    conflicts_with: list[str] = Field(default_factory=list)


class ResourceInstance(BaseModel):
    id: str                                # "node-s3-1"
    logical_component: str                 # "Object Storage Tier"
    provider: str                          # "aws"
    resource_type: str                     # "aws_s3_bucket"
    topology_node_id: str
    properties: dict[str, StructuredPropertyValue] = Field(default_factory=dict)
    dependencies: ResourceDependencyGraph = Field(default_factory=ResourceDependencyGraph)
    completion_percentage: float = 0.0
    status: str = "UNCONFIGURED"            # "UNCONFIGURED" | "PARTIALLY_CONFIGURED" | "COMPLETE"
    validation_errors: list[dict[str, str]] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)


class ResolvedConfiguration(BaseModel):
    project_id: str
    version: int = 1
    readiness_score: float = 0.0
    is_complete: bool = False
    resources: dict[str, ResourceInstance] = Field(default_factory=dict)
    ui_schema: dict[str, Any] = Field(default_factory=dict) # Section & Field layout payload for UI


# Alias for backward compatibility
ProjectConfigurationArtifact = ResolvedConfiguration
