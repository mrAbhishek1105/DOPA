import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.models.project import Architecture, Project, Report, Requirement


class ProjectRepository:
    """Handles database operations for the Project aggregate."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create_project(self, name: str) -> Project:
        project = Project(name=name)
        self.session.add(project)
        await self.session.commit()
        await self.session.refresh(project)
        return project

    async def list_projects(self, limit: int = 50) -> list[Project]:
        """List all projects ordered by most recently updated."""
        stmt = (
            select(Project)
            .order_by(Project.updated_at.desc())
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_project(self, project_id: uuid.UUID | str) -> Project | None:
        if isinstance(project_id, str):
            project_id = uuid.UUID(project_id)
        
        stmt = (
            select(Project)
            .where(Project.id == project_id)
            .options(
                selectinload(Project.requirements),
                selectinload(Project.architectures),
                selectinload(Project.reports),
            )
        )
        result = await self.session.execute(stmt)
        return result.scalars().first()

    async def update_status(self, project_id: uuid.UUID | str, status: str) -> None:
        if isinstance(project_id, str):
            project_id = uuid.UUID(project_id)
            
        project = await self.get_project(project_id)
        if project:
            project.status = status
            await self.session.commit()

    async def save_requirement(self, project_id: uuid.UUID | str, extracted: dict[str, Any], missing: list[str], is_complete: bool) -> Requirement:
        if isinstance(project_id, str):
            project_id = uuid.UUID(project_id)
            
        req = Requirement(
            project_id=project_id,
            extracted=extracted,
            missing_fields=missing,
            is_complete=is_complete
        )
        self.session.add(req)
        await self.session.commit()
        await self.session.refresh(req)
        return req

    async def save_architecture(self, project_id: uuid.UUID | str, pattern_id: str, score: float, nodes: list[dict], edges: list[dict], metadata: dict) -> Architecture:
        if isinstance(project_id, str):
            project_id = uuid.UUID(project_id)
            
        arch = Architecture(
            project_id=project_id,
            pattern_id=pattern_id,
            score=score,
            nodes=nodes,
            edges=edges,
            metadata_info=metadata
        )
        self.session.add(arch)
        await self.session.commit()
        await self.session.refresh(arch)
        return arch

    async def save_report(self, project_id: uuid.UUID | str, report_type: str, payload: dict) -> Report:
        if isinstance(project_id, str):
            project_id = uuid.UUID(project_id)
            
        report = Report(
            project_id=project_id,
            report_type=report_type,
            payload=payload
        )
        self.session.add(report)
        await self.session.commit()
        await self.session.refresh(report)
        return report

    async def get_latest_report(self, project_id: uuid.UUID | str, report_type: str) -> Report | None:
        if isinstance(project_id, str):
            project_id = uuid.UUID(project_id)

        stmt = (
            select(Report)
            .where(Report.project_id == project_id, Report.report_type == report_type)
            .order_by(Report.created_at.desc())
        )
        result = await self.session.execute(stmt)
        return result.scalars().first()

    async def get_latest_architecture(self, project_id: uuid.UUID | str) -> Architecture | None:
        if isinstance(project_id, str):
            project_id = uuid.UUID(project_id)
            
        stmt = (
            select(Architecture)
            .where(Architecture.project_id == project_id)
            .order_by(Architecture.created_at.desc())
            .limit(1)
        )
        result = await self.session.execute(stmt)
        return result.scalars().first()

    async def delete_project(self, project_id: uuid.UUID | str) -> bool:
        project = await self.get_project(project_id)
        if project:
            await self.session.delete(project)
            await self.session.commit()
            return True
        return False
