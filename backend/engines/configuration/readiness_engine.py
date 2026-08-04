from __future__ import annotations

from typing import Any
from backend.engines.configuration.models import ResourceInstance, ResolvedConfiguration


class ReadinessEngine:
    """Calculates completion percentages per resource and overall project readiness score (0-100%)."""

    def calculate_resource_readiness(
        self, resource: ResourceInstance, sections_schema: list[dict[str, Any]]
    ) -> tuple[float, str]:
        required_fields = []
        for section in sections_schema:
            for f in section.get("fields", []):
                f_id = f.get("id") or f.get("name")
                if f.get("required", False) or f.get("importance") == "required":
                    required_fields.append(f_id)

        if not required_fields:
            return 100.0, "COMPLETE"

        filled_count = sum(
            1 for fid in required_fields
            if fid in resource.properties and resource.properties[fid].value not in (None, "", [])
        )

        pct = round((filled_count / len(required_fields)) * 100.0, 1)
        status = "COMPLETE" if pct >= 100.0 else "PARTIALLY_CONFIGURED" if pct > 0 else "UNCONFIGURED"
        if len(resource.validation_errors) > 0 and status == "COMPLETE":
            status = "PARTIALLY_CONFIGURED"

        return pct, status

    def calculate_project_readiness(
        self, artifact: ResolvedConfiguration, schemas_by_resource: dict[str, list[dict[str, Any]]]
    ) -> float:
        if not artifact.resources:
            return 0.0

        total_pct = 0.0
        for res_id, res in artifact.resources.items():
            sections = schemas_by_resource.get(res.resource_type, [])
            pct, status = self.calculate_resource_readiness(res, sections)
            res.completion_percentage = pct
            res.status = status
            total_pct += pct

        overall = round(total_pct / len(artifact.resources), 1)
        artifact.readiness_score = overall
        artifact.is_complete = overall >= 100.0
        return overall
