from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from .models import Conflict


class ConflictResolver:
    """Detects conflicts from structured constraints and returns blocking tradeoff warnings."""

    def __init__(self, knowledge_dir: str | Path | None = None) -> None:
        base_dir = Path(knowledge_dir) if knowledge_dir else Path(__file__).resolve().parent / "knowledge"
        self._conflicts = self._load_json(base_dir / "conflicts.json")

    def _load_json(self, path: Path) -> list[dict[str, Any]]:
        with path.open("r", encoding="utf-8") as handle:
            return json.load(handle)

    def resolve(self, requirements: dict[str, Any]) -> list[Conflict]:
        conflicts: list[Conflict] = []
        for entry in self._conflicts:
            if self._conditions_match(entry.get("conditions", {}), requirements):
                conflicts.append(
                    Conflict(
                        id=entry.get("id", "conflict_001"),
                        severity=entry.get("severity", "medium"),
                        reason=entry.get("message", "Unspecified conflict."),
                        recommendation=entry.get("recommendation", "Revisit the conflicting requirement set."),
                        blocking=bool(entry.get("blocking", False)),
                    )
                )
        return conflicts

    def _conditions_match(self, conditions: dict[str, Any], requirements: dict[str, Any]) -> bool:
        for field, expected in conditions.items():
            value = requirements.get(field)
            if isinstance(expected, list):
                if value not in expected:
                    return False
            else:
                if value != expected:
                    return False
        return True
