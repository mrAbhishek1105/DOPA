from __future__ import annotations

from typing import Any

from .assumption_manager import AssumptionManager
from .capability_engine import CapabilityEngine
from .conflict_resolver import ConflictResolver
from .decision_logger import DecisionLogger
from .dependency_resolver import DependencyResolver
from .rule_engine import RuleEngine
from .schemas import AssumptionSchema, ConflictSchema, DecisionSchema, ReasoningResult


class ReasoningEngine:
    """End-to-end provider-neutral architectural reasoning engine for Sprint 2."""

    def __init__(self) -> None:
        self.rule_engine = RuleEngine()
        self.capability_engine = CapabilityEngine(self.rule_engine)
        self.dependency_resolver = DependencyResolver()
        self.conflict_resolver = ConflictResolver()
        self.assumption_manager = AssumptionManager()
        self.decision_logger = DecisionLogger()

    def generate(self, requirements: dict[str, Any]) -> ReasoningResult:
        capabilities = self.capability_engine.build(requirements)
        capabilities = self.dependency_resolver.resolve(capabilities)
        conflicts = self.conflict_resolver.resolve(requirements)
        assumptions = self.assumption_manager.build(requirements)

        for capability in capabilities:
            if capability.source_rule:
                self.decision_logger.log(
                    title=f"Enable {capability.name}",
                    reason=capability.reason,
                    confidence=min(0.99, 0.75 + (capability.priority / 1000)),
                    rule_id=capability.source_rule,
                )

        decisions = [
            DecisionSchema(
                title=decision.title,
                reason=decision.reason,
                confidence=decision.confidence,
                rule_id=decision.rule_id,
                timestamp=decision.timestamp,
            )
            for decision in self.decision_logger.all()
        ]

        capability_ids = [cap.id for cap in capabilities]
        confidence = 0.75 if not conflicts else 0.6
        confidence += min(0.2, len(capability_ids) * 0.02)
        confidence = round(min(confidence, 0.99), 2)

        return ReasoningResult(
            requirements=dict(requirements),
            architecture_intent=self._derive_architecture_intent(requirements),
            architectural_characteristics=self._derive_architectural_characteristics(requirements),
            capabilities=capability_ids,
            decisions=decisions,
            assumptions=[
                AssumptionSchema(
                    field=assumption.field,
                    value=assumption.value,
                    reason=assumption.reason,
                    confidence=assumption.confidence,
                )
                for assumption in assumptions
            ],
            conflicts=[
                ConflictSchema(
                    id=conflict.id,
                    severity=conflict.severity,
                    reason=conflict.reason,
                    recommendation=conflict.recommendation,
                    blocking=conflict.blocking,
                )
                for conflict in conflicts
            ],
            confidence=confidence,
        )

    def _derive_architecture_intent(self, requirements: dict[str, Any]) -> dict[str, Any]:
        application_type = str(requirements.get("application_type", "generic")).lower()
        availability = str(requirements.get("availability", "medium")).lower()
        traffic = str(requirements.get("traffic", "medium")).lower()
        database = str(requirements.get("database", "unknown")).lower()

        return {
            "style": self._infer_style(application_type),
            "deployment": "distributed" if availability == "high" or traffic == "high" else "single_region",
            "availability": availability or "medium",
            "scaling": "horizontal" if traffic == "high" else "vertical",
            "data_pattern": "transactional" if database in {"postgresql", "mysql", "sql"} else "event_driven",
            "state_management": "stateless" if application_type not in {"stateful", "batch"} else "stateful",
        }

    def _derive_architectural_characteristics(self, requirements: dict[str, Any]) -> dict[str, Any]:
        availability = str(requirements.get("availability", "medium")).lower()
        traffic = str(requirements.get("traffic", "medium")).lower()
        budget = str(requirements.get("budget", "medium")).lower()
        compliance = str(requirements.get("compliance", "standard")).lower()

        return {
            "availability": availability if availability in {"high", "medium", "low"} else "medium",
            "performance": "high" if traffic == "high" else "medium",
            "security": "high" if compliance in {"pci", "hipaa", "sox", "fedramp"} else "medium",
            "maintainability": "high" if budget in {"medium", "high"} else "medium",
            "cost": budget if budget in {"low", "medium", "high"} else "medium",
            "scalability": "horizontal" if traffic == "high" else "vertical",
        }

    def _infer_style(self, application_type: str) -> str:
        style_map = {
            "ecommerce": "web_application",
            "saas": "web_application",
            "api": "service_oriented",
            "streaming": "media_delivery",
            "batch": "data_processing",
        }
        return style_map.get(application_type, "generic_application")
