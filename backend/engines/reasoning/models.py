from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True)
class Capability:
    id: str
    name: str
    reason: str
    importance: str = "required"
    priority: int = 0
    source_rule: str | None = None
    dependencies: list[str] = field(default_factory=list)


@dataclass(slots=True)
class Decision:
    title: str
    reason: str
    confidence: float
    rule_id: str | None = None
    timestamp: str | None = None


@dataclass(slots=True)
class Conflict:
    id: str
    severity: str
    reason: str
    recommendation: str
    blocking: bool = False


@dataclass(slots=True)
class Assumption:
    field: str
    value: str
    reason: str
    confidence: float = 0.8
