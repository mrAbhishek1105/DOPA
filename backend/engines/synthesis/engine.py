from __future__ import annotations

from typing import Any

from .architecture_builder import ArchitectureBuilder
from .component_planner import ComponentPlanner
from .constraint_engine import ConstraintEngine
from .models import ArchitectureOption
from .option_generator import OptionGenerator
from .pattern_selector import PatternSelector
from .scorer import ArchitectureScorer
from .service_selector import ServiceSelector


class SynthesisEngine:
    """End-to-end architecture synthesis engine for Sprint 3.

    Pipeline:
        ConstraintEngine → ComponentPlanner → PatternSelector
        → ArchitectureBuilder → ServiceSelector → Scorer → OptionGenerator
    """

    def __init__(self) -> None:
        self.constraint_engine = ConstraintEngine()
        self.component_planner = ComponentPlanner()
        self.pattern_selector = PatternSelector()
        self.architecture_builder = ArchitectureBuilder()
        self.service_selector = ServiceSelector()
        self.scorer = ArchitectureScorer()
        self.option_generator = OptionGenerator()

    def generate(
        self,
        requirements: dict[str, Any],
        capabilities: list[str],
        cloud_provider: str = "aws",
    ) -> list[ArchitectureOption]:
        """Run the full synthesis pipeline and return architecture options."""
        # Step 1: Constraint Engine — filter impossible architectures
        constraint_result = self.constraint_engine.evaluate(requirements)

        # Step 2: Component Planner — generate logical components
        app_type = str(requirements.get("application_type", "generic")).lower()
        components = self.component_planner.plan(capabilities, app_type)

        # Step 3: Pattern Selector — choose architecture pattern
        pattern, pattern_confidence = self.pattern_selector.select(
            application_type=app_type,
            capabilities=capabilities,
            constraint_allowed=constraint_result.allowed_patterns,
            constraint_blocked=constraint_result.blocked_patterns,
        )

        # Step 4: Architecture Builder — assemble layered architecture
        architecture = self.architecture_builder.build(components, pattern.layers)

        # Step 5: Service Selector — map logical to cloud services
        component_ids = [c.id for c in components]
        services = self.service_selector.map_components(component_ids, cloud_provider)

        # Step 6: Scorer — score the architecture
        base_score = self.scorer.score(services, requirements)

        # Step 7: Option Generator — generate 3 options
        options = self.option_generator.generate(
            pattern_id=pattern.id,
            pattern_name=pattern.name,
            components=components,
            services=services,
            base_score=base_score,
            requirements=requirements,
        )

        return options