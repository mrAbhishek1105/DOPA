from __future__ import annotations

import json
from pathlib import Path
from typing import Any

KNOWLEDGE_DIR = Path(__file__).resolve().parent.parent.parent / "knowledge"


class SchemaEngine:
    """Loads and resolves resource field metadata schemas and service manifests dynamically across all provider directories."""

    def __init__(self):
        self._resource_schemas: dict[str, dict[str, Any]] = {} # key: "aws/aws_s3_bucket" or "aws_s3_bucket"
        self._service_manifests: dict[str, dict[str, Any]] = {} # key: "aws/amazon_ecs_fargate" or "amazon_ecs_fargate"
        self._load_all_knowledge()

    def _load_all_knowledge(self):
        """Recursively scan knowledge directory for provider JSON schemas."""
        if not KNOWLEDGE_DIR.exists():
            return

        for json_file in KNOWLEDGE_DIR.glob("**/*.json"):
            try:
                with open(json_file, "r", encoding="utf-8") as f:
                    data = json.load(f)

                if "resource_type" in data:
                    res_type = data["resource_type"].lower()
                    self._resource_schemas[res_type] = data
                    # Also index with provider relative path
                    rel_path = json_file.relative_to(KNOWLEDGE_DIR).as_posix().lower()
                    self._resource_schemas[rel_path.replace(".json", "")] = data

                elif "service_id" in data:
                    svc_id = data["service_id"].lower()
                    self._service_manifests[svc_id] = data
            except Exception:
                pass

        # Fallback to root resource-fields.json if present
        root_fields = KNOWLEDGE_DIR / "resource-fields.json"
        if root_fields.exists():
            try:
                with open(root_fields, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    for prov, svcs in data.items():
                        for s_key, s_data in svcs.items():
                            self._resource_schemas[s_key.lower()] = s_data
            except Exception:
                pass

    def get_resource_schema(self, provider: str, resource_type: str) -> dict[str, Any] | None:
        """Fetch resource schema definition (with sections and fields)."""
        key = resource_type.lower()
        if key in self._resource_schemas:
            return self._resource_schemas[key]
        
        path_key = f"{provider.lower()}/{key}"
        if path_key in self._resource_schemas:
            return self._resource_schemas[path_key]

        # Fuzzy match fallback
        for r_key, schema in self._resource_schemas.items():
            if key in r_key or r_key in key:
                return schema
        return None

    def get_service_manifest(self, provider: str, service_id: str) -> dict[str, Any] | None:
        """Fetch service-level manifest defining components and order."""
        key = service_id.lower()
        if key in self._service_manifests:
            return self._service_manifests[key]
        return None
