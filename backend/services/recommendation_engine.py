from __future__ import annotations

from typing import Any

from backend.schemas import ArchitectureOption, PatternMatchResult, RecommendationResult
from backend.schemas.recommendations import DEFAULT_RANKING_WEIGHTS, MetricEvaluation
from .knowledge_loader import KnowledgeLoader
from .metric_engine import MetricEngine


class RecommendationEngine:
    """Generate and rank DOPA architecture options from a matched pattern.

    Uses multi-metric evaluation (cost, complexity, scalability, reliability, security)
    derived from service-capabilities.json for explainable ranking.
    """

    def __init__(self, knowledge_loader: KnowledgeLoader | None = None) -> None:
        self.loader = knowledge_loader or KnowledgeLoader()
        self._rules = self.loader.get("recommendation-rules.json")
        self._templates = self.loader.get("architecture-templates.json")
        self._metric_engine = MetricEngine(self.loader)

    def generate(self, pattern_match: PatternMatchResult) -> RecommendationResult:
        rule = self._find_rule(pattern_match.pattern_id)
        if not rule:
            raise ValueError(f"No recommendation rule found for pattern {pattern_match.pattern_id}")

        template = self._find_template(pattern_match.pattern_id)
        template_services = list(template.get("services", [])) if template else []

        options = [
            self._build_option("a", rule.get("option_a", {}), template_services),
            self._build_option("b", rule.get("option_b", {}), template_services),
            self._build_option("c", rule.get("option_c", {}), template_services),
        ]

        # Rank by total metric score descending
        options = sorted(options, key=lambda opt: opt.metrics.total if opt.metrics else 0.0, reverse=True)

        return RecommendationResult(pattern_id=pattern_match.pattern_id, options=options)

    def _find_rule(self, pattern_id: str) -> dict[str, Any] | None:
        for rule in self._rules:
            if rule.get("pattern") == pattern_id:
                return rule
        return None

    def _find_template(self, pattern_id: str) -> dict[str, Any] | None:
        for template in self._templates:
            if template.get("pattern_id") == pattern_id:
                return template
        return None

    def _build_option(self, option_id: str, payload: dict[str, Any], template_services: list[str]) -> ArchitectureOption:
        name = payload.get("name") or option_id.upper()

        # Determine option-specific services from service_choices
        service_choices = payload.get("service_choices", {})
        option_services = list(template_services)

        # Evaluate metrics from the service_choices (each option can have different services)
        if service_choices:
            metrics = self._metric_engine.evaluate_from_choices(service_choices)
        else:
            metrics = self._metric_engine.evaluate(option_services)

        # Normalize the total metric score to a 0-1 range for the option score
        score = round(metrics.total / 100.0, 3)

        tradeoffs = payload.get("tradeoffs", []) or []

        return ArchitectureOption(
            id=option_id,
            name=name,
            score=score,
            metrics=metrics,
            services=option_services,
            tradeoffs=list(tradeoffs),
        )
