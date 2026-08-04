"""Requirement Analyzer — understands what the user wants.

Responsibility: Parse extracted requirements and produce a clean,
structured requirement object. No architecture decisions.
"""

from __future__ import annotations

from typing import Any

from backend.schemas.requirements import RequirementModel


class RequirementAnalyzer:
    """Analyzes raw extracted fields and produces a validated RequirementModel.

    This is a thin wrapper around RequirementModel validation that adds
    normalization and inference of implicit constraints.

    No architecture decisions are made here.
    """

    def analyze(self, extracted: dict[str, Any]) -> RequirementModel:
        """Validate and normalize extracted requirements.

        Args:
            extracted: Raw extracted fields from DiscoveryEngine

        Returns:
            A validated RequirementModel with sensible defaults for missing fields

        Raises:
            ValueError: If required fields (application_type) are missing
        """
        if not extracted.get("application_type"):
            raise ValueError("application_type is required for architecture generation")

        # Infer cloud provider if not specified
        if "cloud" not in extracted or not extracted.get("cloud"):
            extracted["cloud"] = "aws"

        try:
            return RequirementModel(**extracted)
        except Exception as e:
            raise ValueError(f"Failed to parse requirements: {e}")