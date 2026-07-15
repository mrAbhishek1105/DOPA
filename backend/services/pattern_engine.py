from __future__ import annotations

from collections.abc import Mapping
from typing import Any

from backend.schemas import PatternMatchResult, RequirementModel, ScoredDimension
from backend.schemas.patterns import DEFAULT_SCORING_WEIGHTS
from .knowledge_loader import KnowledgeLoader


class PatternEngine:
    """Match structured requirements to the best architecture pattern.

    Uses weighted scoring with per-dimension breakdown for explainability.
    """

    def __init__(self, knowledge_loader: KnowledgeLoader | None = None) -> None:
        self.loader = knowledge_loader or KnowledgeLoader()
        self._patterns = self.loader.get("architecture-patterns.json")

    def match(self, requirement: RequirementModel) -> PatternMatchResult:
        best_score = -1
        best_pattern: dict[str, Any] | None = None
        best_dimensions: list[ScoredDimension] = []
        best_services: list[str] = []

        runner_up_score = -1

        for pattern in self._patterns:
            dimensions = self._score_pattern(requirement, pattern)
            total = sum(d.score for d in dimensions)

            if total > best_score:
                runner_up_score = best_score
                best_score = total
                best_pattern = pattern
                best_dimensions = dimensions
                best_services = list(pattern.get("default_services", []))
            elif total > runner_up_score:
                runner_up_score = total

        if not best_pattern:
            raise ValueError("No architecture patterns available.")

        confidence = self._derive_confidence(best_score, runner_up_score)

        return PatternMatchResult(
            pattern_id=best_pattern["pattern_id"],
            total_score=min(max(best_score, 0), 100),
            confidence=confidence,
            dimensions=best_dimensions,
            recommended_services=best_services,
        )

    def _score_pattern(self, requirement: RequirementModel, pattern: Mapping[str, Any]) -> list[ScoredDimension]:
        """Score a single pattern against the requirement, returning per-dimension results."""
        conditions = pattern.get("conditions", {}) or {}
        dimensions: list[ScoredDimension] = []

        # ── application_type (weight: 40) ──────────────────
        app_type = conditions.get("application_type")
        app_score = 0
        app_reason = ""
        if isinstance(app_type, list):
            if requirement.application_type in app_type:
                app_score = DEFAULT_SCORING_WEIGHTS["application_type"]
                app_reason = f"application_type '{requirement.application_type}' matches pattern"
        elif app_type and requirement.application_type == app_type:
            app_score = DEFAULT_SCORING_WEIGHTS["application_type"]
            app_reason = f"application_type '{requirement.application_type}' matches pattern"
        else:
            app_reason = f"application_type '{requirement.application_type}' does not match pattern conditions"
        dimensions.append(ScoredDimension(
            dimension="application_type",
            weight=DEFAULT_SCORING_WEIGHTS["application_type"],
            score=app_score,
            reason=app_reason,
        ))

        # ── traffic (weight: 20) ───────────────────────────
        traffic = conditions.get("traffic")
        traffic_score = 0
        traffic_reason = ""
        if traffic and requirement.traffic is not None:
            if str(requirement.traffic).lower() == str(traffic).lower():
                traffic_score = DEFAULT_SCORING_WEIGHTS["traffic"]
                traffic_reason = f"traffic '{requirement.traffic}' matches pattern"
            else:
                traffic_reason = f"traffic '{requirement.traffic}' does not match pattern '{traffic}'"
        else:
            traffic_reason = "traffic not specified or not required"
        dimensions.append(ScoredDimension(
            dimension="traffic",
            weight=DEFAULT_SCORING_WEIGHTS["traffic"],
            score=traffic_score,
            reason=traffic_reason,
        ))

        # ── availability (weight: 20) ──────────────────────
        availability = conditions.get("availability")
        avail_score = 0
        avail_reason = ""
        if availability and requirement.availability is not None:
            if str(requirement.availability).lower() == str(availability).lower():
                avail_score = DEFAULT_SCORING_WEIGHTS["availability"]
                avail_reason = f"availability '{requirement.availability}' matches pattern"
            else:
                avail_reason = f"availability '{requirement.availability}' does not match pattern '{availability}'"
        else:
            avail_reason = "availability not specified or not required"
        dimensions.append(ScoredDimension(
            dimension="availability",
            weight=DEFAULT_SCORING_WEIGHTS["availability"],
            score=avail_score,
            reason=avail_reason,
        ))

        # ── budget (weight: 10) ────────────────────────────
        budget_score = 0
        budget_reason = ""
        if requirement.budget is not None:
            tags = set(pattern.get("tags", []))
            pattern_name = str(pattern.get("name", "")).lower()
            if requirement.budget.lower() in tags or requirement.budget.lower() in pattern_name:
                budget_score = DEFAULT_SCORING_WEIGHTS["budget"]
                budget_reason = f"budget '{requirement.budget}' aligns with pattern"
            else:
                budget_reason = f"budget '{requirement.budget}' does not align with pattern tags"
        else:
            budget_reason = "budget not specified"
        dimensions.append(ScoredDimension(
            dimension="budget",
            weight=DEFAULT_SCORING_WEIGHTS["budget"],
            score=budget_score,
            reason=budget_reason,
        ))

        # ── compliance (weight: 10) ────────────────────────
        compliance_score = 0
        compliance_reason = ""
        if requirement.compliance is not None:
            tags = set(pattern.get("tags", []))
            if requirement.compliance.lower() in tags:
                compliance_score = DEFAULT_SCORING_WEIGHTS["compliance"]
                compliance_reason = f"compliance '{requirement.compliance}' matches pattern"
            else:
                compliance_reason = f"compliance '{requirement.compliance}' not found in pattern tags"
        else:
            compliance_reason = "compliance not specified"
        dimensions.append(ScoredDimension(
            dimension="compliance",
            weight=DEFAULT_SCORING_WEIGHTS["compliance"],
            score=compliance_score,
            reason=compliance_reason,
        ))

        return dimensions

    def _derive_confidence(self, best_score: int, runner_up_score: int) -> float:
        """Derive confidence from score magnitude and margin over runner-up."""
        margin = best_score - runner_up_score

        if best_score >= 80 and margin >= 20:
            return 0.95
        elif best_score >= 70 and margin >= 10:
            return 0.85
        elif best_score >= 60:
            return 0.70
        elif best_score >= 50:
            return 0.55
        elif best_score >= 30:
            return 0.40
        else:
            return 0.25