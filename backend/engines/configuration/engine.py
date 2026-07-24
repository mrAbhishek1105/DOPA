from __future__ import annotations

import uuid
from typing import Any

from backend.engines.configuration.models import (
    ResourceInstance,
    StructuredPropertyValue,
    ResourceDependencyGraph,
    ResolvedConfiguration,
)
from backend.engines.configuration.schema_engine import SchemaEngine
from backend.engines.configuration.default_engine import DefaultEngine
from backend.engines.configuration.explanation_engine import ExplanationEngine
from backend.engines.configuration.validation_engine import ValidationEngine
from backend.engines.configuration.readiness_engine import ReadinessEngine


class InfrastructureConfigurationEngine:
    """Master Orchestrator executing the 10-stage Provider-Agnostic Infrastructure Configuration Pipeline."""

    def __init__(self):
        self.schema_engine = SchemaEngine()
        self.default_engine = DefaultEngine()
        self.explanation_engine = ExplanationEngine()
        self.validation_engine = ValidationEngine()
        self.readiness_engine = ReadinessEngine()

    def build_initial_configuration(
        self,
        project_id: str,
        graph_nodes: list[dict[str, Any]],
        graph_edges: list[dict[str, Any]],
        requirements: dict[str, Any],
        provider: str = "aws",
    ) -> ResolvedConfiguration:
        """Execute 10-stage pipeline to seed ResourceInstances and assemble ResolvedConfiguration artifact."""
        resources: dict[str, ResourceInstance] = {}
        schemas_by_resource: dict[str, list[dict[str, Any]]] = {}
        ui_schema_map: dict[str, Any] = {}

        # Determine target environment from requirements (default: production)
        env = requirements.get("environment", "production")

        for node in graph_nodes:
            node_id = node.get("id", str(uuid.uuid4()))
            raw_label = node.get("data", {}).get("label") or node.get("data", {}).get("service") or node_id
            resource_type = self._normalize_resource_type(raw_label)

            # 1. Knowledge & Schema Loader
            schema_data = self.schema_engine.get_resource_schema(provider, resource_type) or {}
            sections = schema_data.get("sections", [])
            
            # Fallback sections if no schema file exists yet
            if not sections:
                sections = self._generate_fallback_sections(raw_label, resource_type)

            schemas_by_resource[resource_type] = sections
            ui_schema_map[node_id] = {
                "display_name": schema_data.get("display_name", raw_label.title()),
                "category": schema_data.get("category", "compute"),
                "description": schema_data.get("description", ""),
                "sections": sections,
            }

            # 2. Resource Instance Builder & Default Engine
            props = self.default_engine.apply_defaults_from_sections(sections, requirements, environment=env)

            # 3. Dependency Engine
            deps = ResourceDependencyGraph(
                depends_on=[e["source"] for e in graph_edges if e.get("target") == node_id],
                required_by=[e["target"] for e in graph_edges if e.get("source") == node_id],
            )

            resource = ResourceInstance(
                id=node_id,
                logical_component=raw_label.title(),
                provider=provider,
                resource_type=resource_type,
                topology_node_id=node_id,
                properties=props,
                dependencies=deps,
            )

            # 4. Validation Engine
            errors = self.validation_engine.validate_resource(resource, sections)
            resource.validation_errors = errors

            # 5. Readiness Engine
            pct, status = self.readiness_engine.calculate_resource_readiness(resource, sections)
            resource.completion_percentage = pct
            resource.status = status

            resources[node_id] = resource

        # 6. Assemble Master UI-Ready ResolvedConfiguration
        artifact = ResolvedConfiguration(
            project_id=project_id,
            version=1,
            resources=resources,
            ui_schema=ui_schema_map,
        )

        self.readiness_engine.calculate_project_readiness(artifact, schemas_by_resource)
        return artifact

    def update_resource_property(
        self,
        artifact: ResolvedConfiguration,
        resource_id: str,
        property_name: str,
        new_value: Any,
    ) -> ResolvedConfiguration:
        """Update a specific resource property value and re-run validation & readiness calculations."""
        resource = artifact.resources.get(resource_id)
        if not resource:
            raise ValueError(f"Resource instance '{resource_id}' not found in configuration artifact")

        schema_data = self.schema_engine.get_resource_schema(resource.provider, resource.resource_type) or {}
        sections = schema_data.get("sections", [])
        if not sections:
            sections = self._generate_fallback_sections(resource.logical_component, resource.resource_type)

        # Find field schema
        field_schema = None
        for sec in sections:
            for f in sec.get("fields", []):
                if (f.get("id") or f.get("name")) == property_name or f.get("var_name") == property_name:
                    field_schema = f
                    break

        if not field_schema:
            field_schema = {"id": property_name, "label": property_name}

        why, impact, learn_more = self.explanation_engine.resolve_field_explanation(field_schema, new_value)
        existing = resource.properties.get(property_name)

        resource.properties[property_name] = StructuredPropertyValue(
            value=new_value,
            default_value=existing.default_value if existing else new_value,
            recommended_value=existing.recommended_value if existing else new_value,
            source="user",
            explanation=why,
            impact=impact,
            learn_more=learn_more,
            is_modified=True,
        )

        # Re-validate
        resource.validation_errors = self.validation_engine.validate_resource(resource, sections)

        # Re-evaluate readiness
        schemas_by_resource = {
            r.resource_type: (self.schema_engine.get_resource_schema(r.provider, r.resource_type) or {}).get("sections", [])
            for r in artifact.resources.values()
        }
        self.readiness_engine.calculate_project_readiness(artifact, schemas_by_resource)
        return artifact

    def _normalize_resource_type(self, label: str) -> str:
        l = label.lower()
        if "s3" in l or "bucket" in l:
            return "aws_s3_bucket"
        if "ecs" in l or "fargate" in l:
            return "aws_ecs_service"
        if "ec2" in l or "instance" in l:
            return "aws_instance"
        if "lambda" in l or "function" in l:
            return "aws_lambda_function"
        if "eks" in l or "kubernetes" in l:
            return "aws_eks_cluster"
        return f"aws_{l.replace(' ', '_')}"

    def _generate_fallback_sections(self, label: str, resource_type: str) -> list[dict[str, Any]]:
        return [
          {
            "id": "general",
            "title": "General Settings",
            "description": f"Configuration properties for {label}",
            "fields": [
              {
                "id": "name",
                "var_name": "name",
                "label": "Resource Name",
                "ui_component": "text",
                "importance": "required",
                "visibility": "basic",
                "default": { "value": label.lower().replace(" ", "-"), "source": "dopa_recommended" },
                "why": f"Identifier name for the {label} resource.",
                "impact": "Changing name on active deployments recreates the resource."
              }
            ]
          }
        ]
