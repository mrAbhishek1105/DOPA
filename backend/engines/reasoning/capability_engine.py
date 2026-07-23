from __future__ import annotations

from typing import Any

from .models import Capability
from .rule_engine import RuleEngine


class CapabilityEngine:
    """Aggregates matched rule outputs into normalized capability objects."""

    def __init__(self, rule_engine: RuleEngine | None = None) -> None:
        self.rule_engine = rule_engine or RuleEngine()

    def build(self, requirements: dict[str, Any]) -> list[Capability]:
        matched_rules = self.rule_engine.match(requirements)
        capabilities: dict[str, Capability] = {}

        for rule in matched_rules:
            for capability_id in rule.get("capabilities", []):
                capability_name = capability_id.replace("_", " ").title()
                capabilities[capability_id] = Capability(
                    id=capability_id,
                    name=capability_name,
                    reason=rule.get("reason") or f"Derived from rule '{rule.get('id', capability_id)}'",
                    importance=rule.get("importance", "required"),
                    priority=self.rule_engine.get_priority(capability_id),
                    source_rule=rule.get("id"),
                    dependencies=[],
                )

        ordered = sorted(capabilities.values(), key=lambda item: (-item.priority, item.id))
        return ordered
