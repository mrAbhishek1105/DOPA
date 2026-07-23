from __future__ import annotations

import json
from pathlib import Path
from typing import Any


class RuleEngine:
    """Loads JSON rules and resolves which rule entries match the incoming requirements."""

    def __init__(self, knowledge_dir: str | Path | None = None) -> None:
        base_dir = Path(knowledge_dir) if knowledge_dir else Path(__file__).resolve().parent / "knowledge"
        self._rules_path = base_dir / "capability_rules.json"
        self._priorities_path = base_dir / "priorities.json"
        self._rules = self._load_json(self._rules_path)
        self._priorities = self._load_json(self._priorities_path)

    def _load_json(self, path: Path) -> Any:
        with path.open("r", encoding="utf-8") as handle:
            return json.load(handle)

    def match(self, requirements: dict[str, Any]) -> list[dict[str, Any]]:
        matches: list[dict[str, Any]] = []
        for rule in self._rules:
            if self._conditions_match(rule.get("conditions", {}), requirements):
                matches.append(rule)
        return sorted(matches, key=lambda item: (-int(item.get("priority", 0)), item.get("id", "")))

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

    def get_priority(self, capability_id: str) -> int:
        return int(self._priorities.get(capability_id, {}).get("priority", 0))
