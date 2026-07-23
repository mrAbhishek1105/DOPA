from __future__ import annotations

import json
import os
from typing import Any

from .models import ServiceMapping


_KNOWLEDGE_DIR = os.path.join(os.path.dirname(__file__), "knowledge")


def _load_json(filename: str) -> dict[str, Any]:
    path = os.path.join(_KNOWLEDGE_DIR, filename)
    with open(path, encoding="utf-8") as f:
        return dict(json.load(f))


class ServiceSelector:
    """Module 5: Maps logical components to concrete cloud provider services."""

    def __init__(self) -> None:
        self.mappings = _load_json("service_mappings.json")
        self.catalog = _load_json("service_catalog.json")

    def map_components(
        self,
        component_ids: list[str],
        cloud_provider: str = "aws",
    ) -> list[ServiceMapping]:
        """Map logical components to cloud services for the given provider."""
        cloud_provider = cloud_provider.lower()
        if cloud_provider not in self.catalog:
            cloud_provider = "aws"

        provider_catalog = self.catalog.get(cloud_provider, {})
        results: list[ServiceMapping] = []

        for cid in component_ids:
            mapping = self.mappings.get(cid, {})
            service_key = mapping.get(cloud_provider)

            if not service_key:
                # Try generic fallback
                service_key = cid

            service_info = provider_catalog.get(service_key, {})
            if not service_info:
                service_info = provider_catalog.get(cid, {})

            results.append(
                ServiceMapping(
                    logical_component_id=cid,
                    cloud_service_id=service_info.get("id", service_key),
                    cloud_service_name=service_info.get("name", service_key.replace("_", " ").title()),
                    cloud_provider=cloud_provider,
                    properties=dict(service_info),
                )
            )

        return results