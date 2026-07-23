from __future__ import annotations

import json
import os
from typing import Any

from .models import Score, ServiceMapping


_KNOWLEDGE_DIR = os.path.join(os.path.dirname(__file__), "knowledge")


def _load_json(filename: str) -> dict[str, Any]:
    path = os.path.join(_KNOWLEDGE_DIR, filename)
    with open(path, encoding="utf-8") as f:
        return dict(json.load(f))


class ArchitectureScorer:
    """Module 6: Scores an architecture across multiple dimensions."""

    def __init__(self) -> None:
        self.weights = _load_json("scoring_weights.json")

    def score(
        self,
        services: list[ServiceMapping],
        requirements: dict[str, Any] | None = None,
        cost_multiplier: float = 1.0,
        availability_multiplier: float = 1.0,
    ) -> Score:
        """Score an architecture based on its service mappings and requirements."""
        reqs = requirements or {}

        if not services:
            return Score()

        # Calculate per-dimension scores
        availability = self._score_availability(services, reqs) * availability_multiplier
        cost = self._score_cost(services, reqs) * cost_multiplier
        security = self._score_security(services, reqs)
        operations = self._score_operations(services, reqs)
        performance = self._score_performance(services, reqs)

        # Clamp to 0-100
        availability = max(0, min(100, availability))
        cost = max(0, min(100, cost))
        security = max(0, min(100, security))
        operations = max(0, min(100, operations))
        performance = max(0, min(100, performance))

        # Calculate overall weighted score
        dims = self.weights.get("dimensions", {})
        overall = (
            availability * dims.get("availability", {}).get("weight", 0.30)
            + cost * dims.get("cost", {}).get("weight", 0.20)
            + security * dims.get("security", {}).get("weight", 0.20)
            + operations * dims.get("operations", {}).get("weight", 0.15)
            + performance * dims.get("performance", {}).get("weight", 0.15)
        )

        return Score(
            availability=round(availability, 1),
            cost=round(cost, 1),
            security=round(security, 1),
            operations=round(operations, 1),
            performance=round(performance, 1),
            overall=round(overall, 1),
        )

    def _score_availability(self, services: list[ServiceMapping], reqs: dict[str, Any]) -> float:
        """Score based on service SLAs and availability features."""
        sla_scores = []
        sla_rules = self.weights.get("scoring_rules", {}).get("sla_tier", {})
        for svc in services:
            sla = svc.properties.get("sla", "99.9")
            score = 70.0  # default
            for sla_key, sla_val in sla_rules.items():
                if str(sla).startswith(sla_key):
                    score = sla_val
                    break
            sla_scores.append(score)

        avg_sla = sum(sla_scores) / len(sla_scores) if sla_scores else 70.0

        # Bonus for high availability requirement
        if str(reqs.get("availability", "")).lower() == "high":
            avg_sla += 5

        return avg_sla

    def _score_cost(self, services: list[ServiceMapping], reqs: dict[str, Any]) -> float:
        """Score based on service cost tiers."""
        cost_tier_scores = []
        cost_rules = self.weights.get("scoring_rules", {}).get("cost_tier_score", {})
        for svc in services:
            tier = svc.properties.get("cost_tier", "medium")
            score = cost_rules.get(tier, 70)
            cost_tier_scores.append(score)

        avg_cost = sum(cost_tier_scores) / len(cost_tier_scores) if cost_tier_scores else 70.0

        # Adjust for budget
        budget = str(reqs.get("budget", "medium")).lower()
        if budget == "low":
            avg_cost += 10  # Bonus for cost optimization
        elif budget == "high":
            avg_cost -= 10  # Penalty: we're spending more

        return avg_cost

    def _score_security(self, services: list[ServiceMapping], reqs: dict[str, Any]) -> float:
        """Score based on security features and compliance."""
        base = 75.0

        # Managed services generally have better security
        for svc in services:
            cat = svc.properties.get("category", "")
            if cat == "security":
                base += 5
            if svc.properties.get("sla", "99.9") >= "99.99":
                base += 2

        # Compliance requirements boost security score
        compliance = str(reqs.get("compliance", "standard")).lower()
        if compliance in ("pci", "hipaa", "sox", "fedramp"):
            base += 10

        return base

    def _score_operations(self, services: list[ServiceMapping], reqs: dict[str, Any]) -> float:
        """Score based on operational excellence (managed services, monitoring)."""
        base = 70.0
        has_monitoring = False
        managed_count = 0

        for svc in services:
            if svc.logical_component_id in ("monitoring", "logging"):
                has_monitoring = True
            cat = svc.properties.get("category", "")
            if cat in ("management", "database") and svc.properties.get("cost_tier", "") != "self_managed":
                managed_count += 1

        if has_monitoring:
            base += 15
        if managed_count > 2:
            base += 10

        return base

    def _score_performance(self, services: list[ServiceMapping], reqs: dict[str, Any]) -> float:
        """Score based on performance capabilities (caching, CDN, scaling)."""
        base = 70.0
        has_cache = False
        has_cdn = False

        for svc in services:
            if svc.logical_component_id == "cache":
                has_cache = True
            if svc.logical_component_id == "cdn":
                has_cdn = True
            if svc.properties.get("global", False):
                base += 3

        if has_cache:
            base += 10
        if has_cdn:
            base += 10

        # High traffic requirements need performance boost
        if str(reqs.get("traffic", "")).lower() == "high":
            base += 5

        return base