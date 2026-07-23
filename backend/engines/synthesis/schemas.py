from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class ComponentSchema(BaseModel):
    id: str = Field(..., min_length=1)
    name: str = Field(..., min_length=1)
    layer: str = Field(..., min_length=1)
    required: bool = True
    reason: str = ""
    dependencies: list[str] = Field(default_factory=list)


class ArchitectureLayerSchema(BaseModel):
    id: str = Field(..., min_length=1)
    name: str = Field(..., min_length=1)
    components: list[ComponentSchema] = Field(default_factory=list)
    order: int = 0


class ConnectionSchema(BaseModel):
    source: str = Field(..., min_length=1)
    target: str = Field(..., min_length=1)
    type: str = "data_flow"
    protocol: str = "https"


class ServiceMappingSchema(BaseModel):
    logical_component_id: str = Field(..., min_length=1)
    cloud_service_id: str = Field(..., min_length=1)
    cloud_service_name: str = Field(..., min_length=1)
    cloud_provider: str = Field(..., min_length=1)
    properties: dict[str, Any] = Field(default_factory=dict)


class ScoreSchema(BaseModel):
    availability: float = 0.0
    cost: float = 0.0
    security: float = 0.0
    operations: float = 0.0
    performance: float = 0.0
    overall: float = 0.0


class ArchitecturePatternSchema(BaseModel):
    id: str = Field(..., min_length=1)
    name: str = Field(..., min_length=1)
    description: str = ""
    supported_apps: list[str] = Field(default_factory=list)
    components: list[str] = Field(default_factory=list)
    layers: list[str] = Field(default_factory=list)
    characteristics: dict[str, Any] = Field(default_factory=dict)


class ArchitectureOptionSchema(BaseModel):
    id: str = Field(..., min_length=1)
    name: str = Field(..., min_length=1)
    pattern: str = Field(..., min_length=1)
    components: list[ComponentSchema] = Field(default_factory=list)
    services: list[ServiceMappingSchema] = Field(default_factory=list)
    score: ScoreSchema | None = None
    reason: str = ""


class ArchitectureOptionsSchema(BaseModel):
    architecture_options: list[ArchitectureOptionSchema] = Field(default_factory=list)


class ConstraintResultSchema(BaseModel):
    allowed_services: list[str] = Field(default_factory=list)
    blocked_services: list[str] = Field(default_factory=list)
    allowed_patterns: list[str] = Field(default_factory=list)
    blocked_patterns: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)