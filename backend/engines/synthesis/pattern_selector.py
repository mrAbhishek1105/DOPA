from __future__ import annotations

import json
import os
from typing import Any

from .models import ArchitecturePattern


_KNOWLEDGE_DIR = os.path.join(os.path.dirname(__file__), "knowledge")


def _load_json(filename: str) -> dict[str, Any]:
    path = os.path.join(_KNOWLEDGE_DIR, filename)
    with open(path, encoding="utf-8") as f:
        return dict(json.load(f))


class PatternSelector:
    """Module 3: Selects the best architecture pattern based on application type and requirements."""

    def __init__(self) -> None:
        raw = _load_json("architecture_patterns.json")
        self.patterns: dict[str, ArchitecturePattern] = {}
        for pid, data in raw.items():
            self.patterns[pid] = ArchitecturePattern(
                id=pid,
                name=data["name"],
                description=data.get("description", ""),
                supported_apps=data.get("supported_apps", []),
                components=data.get("components", []),
                layers=data.get("layers", []),
                characteristics=data.get("characteristics", {}),
            )

    def select(
        self,
        application_type: str,
        capabilities: list[str] | None = None,
        constraint_allowed: list[str] | None = None,
        constraint_blocked: list[str] | None = None,
    ) -> tuple[ArchitecturePattern, float]:
        """Select the best matching pattern for the application type."""
        app_type = application_type.lower()
        capabilities = capabilities or []
        constraint_allowed = constraint_allowed or []
        constraint_blocked = constraint_blocked or []

        scored: list[tuple[str, ArchitecturePattern, float]] = []

        for pid, pattern in self.patterns.items():
            # Skip blocked patterns
            if pid in constraint_blocked:
                continue

            # Check if application type matches
            app_match = app_type in pattern.supported_apps

            # Check capability overlap
            cap_overlap = len(set(capabilities) & set(pattern.components))

            base_score = 0.0
            if app_match:
                base_score += 0.6  # Strong match

            # Additional score from capability overlap
            if capabilities and pattern.components:
                total_components = len(pattern.components)
                if total_components > 0:
                    base_score += 0.4 * (cap_overlap / total_components)

            # Bonus for allowed patterns
            if pid in constraint_allowed:
                base_score += 0.1

            if base_score > 0:
                scored.append((pid, pattern, min(base_score, 1.0)))

        if not scored:
            # Fallback: use three_tier as default
            fallback = self.patterns.get("three_tier")
            if fallback:
                return fallback, 0.5
            msg = "No architecture pattern found and no fallback available"
            raise ValueError(msg)

        # Sort by score descending
        scored.sort(key=lambda x: x[2], reverse=True)
        return scored[0][1], round(scored[0][2], 2)