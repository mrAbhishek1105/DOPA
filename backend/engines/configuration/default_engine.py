from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from backend.engines.configuration.models import StructuredPropertyValue
from backend.engines.configuration.explanation_engine import ExplanationEngine

KNOWLEDGE_DIR = Path(__file__).resolve().parent.parent.parent / "knowledge"


class DefaultEngine:
    """Infers and populates property values, defaults, and recommendations from resource schemas."""

    def __init__(self):
        self._explanation_engine = ExplanationEngine()

    def apply_defaults_from_sections(
        self,
        sections: list[dict[str, Any]],
        requirements: dict[str, Any],
        environment: str = "production",
    ) -> dict[str, StructuredPropertyValue]:
        """Iterate over sections & fields to compute initial property values."""
        properties: dict[str, StructuredPropertyValue] = {}

        for section in sections:
            for field in section.get("fields", []):
                field_id = field.get("id") or field.get("name")
                if not field_id:
                    continue

                default_obj = field.get("default", {})
                if isinstance(default_obj, dict):
                    base_val = default_obj.get("value")
                    src = default_obj.get("source", "dopa_recommended")
                else:
                    base_val = default_obj
                    src = "dopa_recommended"

                recommended_obj = field.get("recommended", {})
                if isinstance(recommended_obj, dict):
                    rec_val = recommended_obj.get(environment, recommended_obj.get("production", base_val))
                else:
                    rec_val = recommended_obj if recommended_obj is not None else base_val

                # If requirements specify environment override
                final_val = rec_val if rec_val is not None else base_val

                why, impact, learn_more = self._explanation_engine.resolve_field_explanation(field, final_val)

                properties[field_id] = StructuredPropertyValue(
                    value=final_val,
                    default_value=base_val,
                    recommended_value=rec_val,
                    source=src,
                    explanation=why,
                    impact=impact,
                    learn_more=learn_more,
                    is_modified=False,
                )

        return properties
