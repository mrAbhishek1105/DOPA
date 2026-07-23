from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from .models import Assumption


class AssumptionManager:
    """Creates explicit assumptions for missing fields using JSON defaults."""

    def __init__(self, knowledge_dir: str | Path | None = None) -> None:
        base_dir = Path(knowledge_dir) if knowledge_dir else Path(__file__).resolve().parent / "knowledge"
        self._assumptions = self._load_json(base_dir / "assumptions.json")

    def _load_json(self, path: Path) -> list[dict[str, Any]]:
        with path.open("r", encoding="utf-8") as handle:
            return json.load(handle)

    def build(self, requirements: dict[str, Any]) -> list[Assumption]:
        assumptions: list[Assumption] = []
        for entry in self._assumptions:
            field = entry.get("field")
            if field and field not in requirements:
                assumptions.append(
                    Assumption(
                        field=field,
                        value=str(entry.get("default", "")),
                        reason=entry.get("reason", f"Assumed default for missing {field} field."),
                        confidence=entry.get("confidence", 0.8),
                    )
                )
        return assumptions
