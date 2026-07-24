from __future__ import annotations

import uuid
from typing import Any
from sqlalchemy.ext.asyncio import AsyncSession

from backend.engines.configuration.engine import InfrastructureConfigurationEngine
from backend.engines.configuration.persistence import ConfigurationPersistence
from backend.engines.configuration.models import ProjectConfigurationArtifact
from backend.repositories.project_repository import ProjectRepository


class ConfigurationService:
    """Business logic service layer for managing Infrastructure Configuration Phase."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.engine = InfrastructureConfigurationEngine()
        self.persistence = ConfigurationPersistence(db)
        self.project_repo = ProjectRepository(db)

    async def get_or_create_configuration(
        self, project_id: uuid.UUID
    ) -> ProjectConfigurationArtifact:
        """Fetch latest configuration artifact for project, or build initial config from current graph topology."""
        existing = await self.persistence.load_latest_artifact(project_id)
        if existing:
            return existing

        # Fetch graph topology and requirements
        graph_report = await self.project_repo.get_latest_report(project_id, "graph")
        req_report = await self.project_repo.get_latest_report(project_id, "requirements")

        graph_nodes = graph_report.payload.get("nodes", []) if graph_report else []
        graph_edges = graph_report.payload.get("edges", []) if graph_report else []
        requirements = req_report.payload if req_report else {}

        artifact = self.engine.build_initial_configuration(
            project_id=str(project_id),
            graph_nodes=graph_nodes,
            graph_edges=graph_edges,
            requirements=requirements,
        )

        saved = await self.persistence.save_artifact(project_id, artifact)
        
        # Transition project state to configuring_infrastructure
        await self.project_repo.update_status(project_id, "configuring_infrastructure")
        return saved

    async def update_resource_property(
        self, project_id: uuid.UUID, resource_id: str, property_name: str, new_value: Any
    ) -> ProjectConfigurationArtifact:
        """Update property value for a resource instance and increment version checkpoint."""
        artifact = await self.get_or_create_configuration(project_id)
        updated_artifact = self.engine.update_resource_property(
            artifact=artifact,
            resource_id=resource_id,
            property_name=property_name,
            new_value=new_value,
        )

        # Save new version
        saved = await self.persistence.save_artifact(project_id, updated_artifact)

        # If complete, transition to infrastructure_configured
        if saved.is_complete:
            await self.project_repo.update_status(project_id, "infrastructure_configured")

        return saved

    def get_service_schema(self, provider: str, service: str) -> dict[str, Any] | None:
        """Retrieve field schema metadata for a service."""
        return self.engine.schema_engine.get_resource_schema(provider, service)
