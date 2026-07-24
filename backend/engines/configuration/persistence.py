from __future__ import annotations

import uuid
from typing import Any
from sqlalchemy.ext.asyncio import AsyncSession

from backend.repositories.project_repository import ProjectRepository
from backend.engines.configuration.models import ProjectConfigurationArtifact


class ConfigurationPersistence:
    """Manages versioned project configuration artifact persistence (v1, v2, v3) in database."""

    def __init__(self, db: AsyncSession):
        self._repo = ProjectRepository(db)

    async def save_artifact(
        self, project_id: uuid.UUID, artifact: ProjectConfigurationArtifact
    ) -> ProjectConfigurationArtifact:
        """Save a new version of project configuration payload."""
        latest_report = await self._repo.get_latest_report(project_id, "infrastructure_configuration")
        next_version = (latest_report.payload.get("version", 0) + 1) if latest_report else 1
        
        artifact.version = next_version
        payload = artifact.model_dump(mode="json")

        await self._repo.save_report(
            project_id=project_id,
            report_type="infrastructure_configuration",
            payload=payload,
        )
        return artifact

    async def load_latest_artifact(
        self, project_id: uuid.UUID
    ) -> ProjectConfigurationArtifact | None:
        """Load latest versioned configuration artifact from database."""
        report = await self._repo.get_latest_report(project_id, "infrastructure_configuration")
        if not report:
            return None
        return ProjectConfigurationArtifact(**report.payload)
