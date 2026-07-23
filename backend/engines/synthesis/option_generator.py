from __future__ import annotations

from typing import Any

from .models import ArchitectureOption, Component, Score, ServiceMapping

# Option profile definitions (loaded from knowledge)
_OPTION_PROFILES: dict[str, dict[str, Any]] = {
    "standard": {
        "id": "standard",
        "name": "Standard",
        "reason": "Balanced cost and availability. Recommended for most production workloads.",
        "cost_multiplier": 1.0,
        "availability_multiplier": 1.0,
        "service_tier": "standard",
    },
    "cost_optimized": {
        "id": "cost_optimized",
        "name": "Cost Optimized",
        "reason": "Minimizes infrastructure cost while maintaining core functionality. Best for startups and dev/test environments.",
        "cost_multiplier": 1.2,
        "availability_multiplier": 0.8,
        "service_tier": "cost",
    },
    "enterprise": {
        "id": "enterprise",
        "name": "Enterprise",
        "reason": "Maximum availability and security for mission-critical workloads. Includes redundant multi-AZ deployment.",
        "cost_multiplier": 0.8,
        "availability_multiplier": 1.2,
        "service_tier": "enterprise",
    },
}


class OptionGenerator:
    """Module 7: Generates multiple architecture options (Standard, Cost Optimized, Enterprise)."""

    def __init__(self) -> None:
        self.profiles = _OPTION_PROFILES

    def generate(
        self,
        pattern_id: str,
        pattern_name: str,
        components: list[Component],
        services: list[ServiceMapping],
        base_score: Score,
        requirements: dict[str, Any] | None = None,
    ) -> list[ArchitectureOption]:
        """Generate three architecture options from a base architecture."""
        options: list[ArchitectureOption] = []

        for profile_id, profile in self.profiles.items():
            # Adjust services for the profile
            profile_services = self._adjust_services(services, profile)

            # Create adjusted score
            adjusted_score = Score(
                availability=min(100, base_score.availability * profile["availability_multiplier"]),
                cost=min(100, base_score.cost * profile["cost_multiplier"]),
                security=base_score.security,
                operations=base_score.operations,
                performance=base_score.performance,
                overall=0.0,  # Recalculated
            )

            # Recalculate overall
            dims = {"availability": 0.30, "cost": 0.20, "security": 0.20, "operations": 0.15, "performance": 0.15}
            adjusted_score.overall = round(
                adjusted_score.availability * dims["availability"]
                + adjusted_score.cost * dims["cost"]
                + adjusted_score.security * dims["security"]
                + adjusted_score.operations * dims["operations"]
                + adjusted_score.performance * dims["performance"],
                1,
            )

            option = ArchitectureOption(
                id=profile_id,
                name=profile["name"],
                pattern=pattern_id,
                components=list(components),
                services=profile_services,
                score=adjusted_score,
                reason=profile["reason"],
            )
            options.append(option)

        # Sort by overall score descending
        options.sort(key=lambda o: o.score.overall if o.score else 0, reverse=True)
        return options

    def _adjust_services(self, services: list[ServiceMapping], profile: dict[str, Any]) -> list[ServiceMapping]:
        """Adjust service mappings based on the option profile."""
        tier = profile.get("service_tier", "standard")
        if tier == "cost":
            # For cost option, prefer cheaper service variants
            return [
                ServiceMapping(
                    logical_component_id=s.logical_component_id,
                    cloud_service_id=s.cloud_service_id,
                    cloud_service_name=s.cloud_service_name,
                    cloud_provider=s.cloud_provider,
                    properties={**s.properties, "cost_tier": "low"},
                )
                for s in services
            ]
        elif tier == "enterprise":
            # For enterprise, prefer higher SLA services
            return [
                ServiceMapping(
                    logical_component_id=s.logical_component_id,
                    cloud_service_id=s.cloud_service_id,
                    cloud_service_name=s.cloud_service_name,
                    cloud_provider=s.cloud_provider,
                    properties={**s.properties, "sla": "99.99"},
                )
                for s in services
            ]
        return list(services)