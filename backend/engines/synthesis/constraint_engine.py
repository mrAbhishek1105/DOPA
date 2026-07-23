from __future__ import annotations

import json
import os
from typing import Any

from .models import ConstraintResult


_KNOWLEDGE_DIR = os.path.join(os.path.dirname(__file__), "knowledge")


def _load_json(filename: str) -> dict[str, Any]:
    path = os.path.join(_KNOWLEDGE_DIR, filename)
    with open(path, encoding="utf-8") as f:
        return dict(json.load(f))


class ConstraintEngine:
    """Module 1: Evaluates requirements against constraints to filter impossible architectures."""

    def __init__(self) -> None:
        self.constraints = _load_json("constraints.json")

    def evaluate(self, requirements: dict[str, Any]) -> ConstraintResult:
        allowed_services: set[str] = set()
        blocked_services: set[str] = set()
        allowed_patterns: set[str] = set()
        blocked_patterns: set[str] = set()
        warnings: list[str] = []

        for dimension, value in requirements.items():
            if dimension not in self.constraints:
                continue
            dim_config = self.constraints[dimension]
            str_value = str(value).lower()

            if str_value in dim_config:
                rules = dim_config[str_value]
                blocked_services.update(rules.get("blocked_services", []))
                blocked_patterns.update(rules.get("blocked_patterns", []))
                warnings.extend(rules.get("warnings", []))
                allowed_services.update(rules.get("preferred_services", []))

        # If budget is low, allow only cost-effective patterns
        budget = str(requirements.get("budget", "medium")).lower()
        if budget == "low":
            allowed_patterns.update({"static_hosting", "serverless"})
        elif budget == "high":
            allowed_patterns.update({"three_tier", "event_driven", "data_lake"})

        return ConstraintResult(
            allowed_services=sorted(allowed_services),
            blocked_services=sorted(blocked_services),
            allowed_patterns=sorted(allowed_patterns),
            blocked_patterns=sorted(blocked_patterns),
            warnings=warnings,
        )