from __future__ import annotations

from typing import Any

from backend.schemas.recommendations import MetricEvaluation
from .knowledge_loader import KnowledgeLoader


# Mapping from text levels to numeric scores (0-100)
COST_MAP: dict[str, float] = {
    "low": 90.0,
    "low_to_medium": 75.0,
    "medium": 60.0,
    "medium_to_high": 45.0,
    "high": 30.0,
    "very_high": 10.0,
}

COMPLEXITY_MAP: dict[str, float] = {
    "low": 90.0,
    "low_to_medium": 75.0,
    "medium": 60.0,
    "medium_to_high": 45.0,
    "high": 30.0,
    "very_high": 10.0,
}

SCALABILITY_MAP: dict[str, float] = {
    "low": 20.0,
    "low_to_medium": 35.0,
    "medium": 50.0,
    "medium_to_high": 65.0,
    "high": 80.0,
    "very_high": 95.0,
}

# Resolve service_choice keys (from recommendation-rules.json) to canonical
# service names (as used in service-capabilities.json).
# Deployment variants (e.g. ecs_fargate_spot) map to the base service (ecs).
SERVICE_CHOICE_RESOLVER: dict[str, str | None] = {
    # Compute
    "ecs_fargate_spot": "ecs",
    "ecs_fargate": "ecs",
    "ecs": "ecs",
    "eks": "eks",
    "lambda": "lambda",
    "none": None,
    # Database
    "rds_single_az": "rds",
    "rds_multi_az": "rds",
    "rds": "rds",
    "aurora_single_region": "aurora",
    "aurora_multi_az": "aurora",
    "aurora_global": "aurora",
    "aurora": "aurora",
    "dynamodb": "dynamodb",
    # Cache
    "redis": "redis",
    "redis_cluster": "redis",
    "elasticache": "elasticache",
    # CDN
    "cloudfront": "cloudfront",
}


class MetricEngine:
    """Derive multi-metric evaluations from service capabilities.

    Metrics are derived from existing knowledge (service-capabilities.json)
    rather than hardcoded pattern×option combinations. Adding a new service
    automatically updates all option evaluations.

    Usage:
        engine = MetricEngine()
        metrics = engine.evaluate(["ecs", "rds", "cloudfront"])
        # or to evaluate from service_choices KV pairs:
        metrics = engine.evaluate_from_choices({
            "compute": "ecs_fargate",
            "database": "rds_multi_az",
            "cache": "redis",
            "cdn": "cloudfront",
        })
    """

    def __init__(self, knowledge_loader: KnowledgeLoader | None = None) -> None:
        self.loader = knowledge_loader or KnowledgeLoader()
        self._capabilities: list[dict[str, Any]] = list(self.loader.get("service-capabilities.json"))

    def evaluate(self, services: list[str]) -> MetricEvaluation:
        """Evaluate metrics for a list of canonical service names."""
        matched_svcs = [svc for svc in self._capabilities if svc.get("service") in services]

        if not matched_svcs:
            return MetricEvaluation(
                cost=50.0,
                complexity=50.0,
                scalability=50.0,
                reliability=50.0,
                security=50.0,
                total=50.0,
            )

        cost = self._aggregate_score(matched_svcs, "cost_level", COST_MAP)
        complexity = self._aggregate_score(matched_svcs, "complexity", COMPLEXITY_MAP)
        scalability = self._aggregate_score(matched_svcs, "scalability", SCALABILITY_MAP)
        reliability = self._derive_reliability(matched_svcs)
        security = self._derive_security(matched_svcs)

        total = (
            cost * DEFAULT_WEIGHTS["cost"]
            + complexity * DEFAULT_WEIGHTS["complexity"]
            + scalability * DEFAULT_WEIGHTS["scalability"]
            + reliability * DEFAULT_WEIGHTS["reliability"]
            + security * DEFAULT_WEIGHTS["security"]
        )

        return MetricEvaluation(
            cost=round(cost, 1),
            complexity=round(complexity, 1),
            scalability=round(scalability, 1),
            reliability=round(reliability, 1),
            security=round(security, 1),
            total=round(total, 1),
        )

    def evaluate_from_choices(self, service_choices: dict[str, str]) -> MetricEvaluation:
        """Evaluate metrics from service_choices KV pairs (e.g. from recommendation-rules.json)."""
        resolved: list[str] = []
        for value in service_choices.values():
            canonical = SERVICE_CHOICE_RESOLVER.get(value)
            if canonical:
                resolved.append(canonical)
        return self.evaluate(resolved)

    def _aggregate_score(
        self,
        services: list[dict[str, Any]],
        field: str,
        mapping: dict[str, float],
    ) -> float:
        """Aggregate a metric score across multiple services."""
        if not services:
            return 50.0
        scores = [mapping.get(str(svc.get(field, "")), 50.0) for svc in services]
        return sum(scores) / len(scores)

    def _derive_reliability(self, services: list[dict[str, Any]]) -> float:
        """Derive reliability score from service capabilities.

        Simple deterministic rules (not a full Well-Architected engine):
        - Multi-AZ defaults: +20
        - Backup defaults: +20
        - Managed compute (ECS/EKS): +20
        - 3+ service tiers: +20
        - HA-capable services (Aurora, Redis): +20
        """
        score = 0.0
        service_names = {svc.get("service", "") for svc in services}

        # Multi-AZ default present
        if any(svc.get("default_settings", {}).get("multi_az") for svc in services):
            score += 20.0

        # Backup retention default present
        if any("backup_retention" in str(svc.get("default_settings", {})) for svc in services):
            score += 20.0
        if any(svc.get("default_settings", {}).get("backup_retention_period") is not None for svc in services):
            score += 20.0

        # Managed compute layer
        if {"ecs", "eks"} & service_names:
            score += 20.0

        # Multiple service tiers (3+ distinct categories)
        categories = {svc.get("category", "") for svc in services}
        if len(categories) >= 3:
            score += 20.0

        # HA-capable services
        if {"aurora", "redis", "elasticache"} & service_names:
            score += 20.0

        return min(score, 100.0)

    def _derive_security(self, services: list[dict[str, Any]]) -> float:
        """Derive security score from service capabilities.

        Simple deterministic rules:
        - Has IAM/subnet/SG dependencies: +20
        - Encryption defaults present: +20
        - KMS dependency: +20
        - WAF/Shield presence: +20
        - CloudFront (edge TLS): +20
        """
        score = 0.0
        all_deps: set[str] = set()
        for svc in services:
            all_deps.update(svc.get("dependencies", []))
        service_names = {svc.get("service", "") for svc in services}

        # Explicit IAM/subnet/SG dependencies (indicates security-aware design)
        if {"iam", "iam_role", "security_group"} & all_deps:
            score += 20.0

        # Encryption defaults present
        if any(svc.get("default_settings", {}).get("storage_encrypted") for svc in services):
            score += 20.0
        if any(svc.get("default_settings", {}).get("transit_encryption_enabled") for svc in services):
            score += 20.0

        # KMS dependency
        if "kms" in all_deps or "kms_optional" in all_deps:
            score += 20.0

        # WAF presence
        if {"waf", "shield"} & service_names:
            score += 20.0

        # CloudFront (edge TLS termination)
        if "cloudfront" in service_names:
            score += 20.0

        return min(score, 100.0)


# Default weights for the total metric score
# These should sum to 1.0
DEFAULT_WEIGHTS: dict[str, float] = {
    "cost": 0.20,
    "complexity": 0.15,
    "scalability": 0.25,
    "reliability": 0.25,
    "security": 0.15,
}