from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from .models import Capability


class DependencyResolver:
    """Expands capability dependencies from JSON knowledge."""

    def __init__(self, knowledge_dir: str | Path | None = None) -> None:
        base_dir = Path(knowledge_dir) if knowledge_dir else Path(__file__).resolve().parent / "knowledge"
        self._dependencies = self._load_json(base_dir / "dependencies.json")

    def _load_json(self, path: Path) -> dict[str, Any]:
        with path.open("r", encoding="utf-8") as handle:
            return json.load(handle)

    def resolve(self, capabilities: list[Capability]) -> list[Capability]:
        resolved_map: dict[str, Capability] = {cap.id: cap for cap in capabilities}

        for capability in list(capabilities):
            for dependency in self._dependencies.get(capability.id, []):
                if dependency not in resolved_map:
                    resolved_map[dependency] = Capability(
                        id=dependency,
                        name=dependency.replace("_", " ").title(),
                        reason=f"Auto-added dependency from '{capability.id}'",
                        importance="derived",
                        priority=0,
                        dependencies=[],
                    )
                resolved_map[capability.id].dependencies.append(dependency)

        ordered = sorted(resolved_map.values(), key=lambda item: (-item.priority, item.id))
        return ordered
