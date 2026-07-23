from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True)
class Component:
    id: str
    name: str
    layer: str
    required: bool = True
    reason: str = ""
    dependencies: list[str] = field(default_factory=list)


@dataclass(slots=True)
class ArchitectureLayer:
    id: str
    name: str
    components: list[Component] = field(default_factory=list)
    order: int = 0


@dataclass(slots=True)
class Connection:
    source: str
    target: str
    type: str = "data_flow"
    protocol: str = "https"


@dataclass(slots=True)
class Architecture:
    layers: list[ArchitectureLayer] = field(default_factory=list)
    connections: list[Connection] = field(default_factory=list)


@dataclass(slots=True)
class ServiceMapping:
    logical_component_id: str
    cloud_service_id: str
    cloud_service_name: str
    cloud_provider: str
    properties: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class Score:
    availability: float = 0.0
    cost: float = 0.0
    security: float = 0.0
    operations: float = 0.0
    performance: float = 0.0
    overall: float = 0.0


@dataclass(slots=True)
class ArchitecturePattern:
    id: str
    name: str
    description: str
    supported_apps: list[str] = field(default_factory=list)
    components: list[str] = field(default_factory=list)
    layers: list[str] = field(default_factory=list)
    characteristics: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class ArchitectureOption:
    id: str
    name: str
    pattern: str
    components: list[Component] = field(default_factory=list)
    services: list[ServiceMapping] = field(default_factory=list)
    score: Score | None = None
    reason: str = ""


@dataclass(slots=True)
class ConstraintResult:
    allowed_services: list[str] = field(default_factory=list)
    blocked_services: list[str] = field(default_factory=list)
    allowed_patterns: list[str] = field(default_factory=list)
    blocked_patterns: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)