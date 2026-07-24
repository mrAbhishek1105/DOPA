from __future__ import annotations

import re
from typing import Any
from backend.engines.configuration.models import ResourceInstance


class ValidationEngine:
    """Validates resource instance properties against regex patterns, required flags, and conditional rules."""

    def validate_resource(
        self, resource: ResourceInstance, sections_schema: list[dict[str, Any]]
    ) -> list[dict[str, str]]:
        errors: list[dict[str, str]] = []

        for section in sections_schema:
            for field in section.get("fields", []):
                field_id = field.get("id") or field.get("name")
                prop = resource.properties.get(field_id)
                val = prop.value if prop else None

                # Check conditions (show_if / required_if)
                conds = field.get("conditions", {})
                req_if = conds.get("required_if", {})
                if req_if:
                    target_f = req_if.get("field_id") or req_if.get("field")
                    eq_val = req_if.get("equals")
                    target_prop = resource.properties.get(target_f)
                    target_val = target_prop.value if target_prop else None

                    if target_val == eq_val and (val is None or val == "" or val == []):
                        errors.append({
                            "field": field_id,
                            "error": f"'{field.get('label', field_id)}' is required when {target_f} is '{eq_val}'.",
                        })

                # Check importance / required
                importance = field.get("importance")
                is_req = field.get("required", False) or importance == "required"
                if is_req and (val is None or val == "" or val == []):
                    errors.append({
                        "field": field_id,
                        "error": f"Required property '{field.get('label', field_id)}' is missing.",
                    })

                # Regex validation
                validation_cfg = field.get("validation", {})
                regex_pattern = validation_cfg.get("regex")
                if regex_pattern and val is not None and str(val) != "":
                    try:
                        if not re.match(regex_pattern, str(val)):
                            errors.append({
                                "field": field_id,
                                "error": validation_cfg.get("error_message", f"Invalid format for '{field.get('label', field_id)}'."),
                            })
                    except Exception:
                        pass

        return errors
