from __future__ import annotations

from typing import Any


class ExplanationEngine:
    """Resolves 'Why?', 'Impact', and 'Learn More' architectural rationale for property fields."""

    def resolve_field_explanation(
        self, field_schema: dict[str, Any], current_val: Any
    ) -> tuple[str, str | None, str | None]:
        why = field_schema.get("why")
        impact = field_schema.get("impact")
        learn_more = field_schema.get("learn_more")

        if not why:
            label = field_schema.get("label", field_schema.get("id", "Property"))
            why = f"Configures {label} according to AWS cloud architecture best practices."

        return why, impact, learn_more
