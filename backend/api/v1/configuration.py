from __future__ import annotations

import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.services.configuration_service import ConfigurationService

router = APIRouter()


class UpdatePropertyRequest(BaseModel):
    property_name: str
    value: Any


@router.get("/schemas/{provider}/{resource_type}")
async def get_resource_schema(
    provider: str, resource_type: str, db: AsyncSession = Depends(get_db)
):
    """Retrieve field schema metadata for dynamic form rendering."""
    service_layer = ConfigurationService(db)
    schema = service_layer.get_service_schema(provider, resource_type)
    if not schema:
        raise HTTPException(status_code=404, detail=f"No schema found for {provider}/{resource_type}")
    return schema


@router.get("/resolved/{project_id}")
@router.get("/{project_id}")
async def get_project_configuration(
    project_id: uuid.UUID, db: AsyncSession = Depends(get_db)
):
    """Fetch current UI-ready ResolvedConfiguration payload & readiness score."""
    service_layer = ConfigurationService(db)
    try:
        artifact = await service_layer.get_or_create_configuration(project_id)
        return artifact.model_dump(mode="json")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.patch("/{project_id}/resource/{resource_id}")
async def update_resource_property(
    project_id: uuid.UUID,
    resource_id: str,
    body: UpdatePropertyRequest,
    db: AsyncSession = Depends(get_db),
):
    """Update a specific resource property, saving a new version checkpoint."""
    service_layer = ConfigurationService(db)
    try:
        updated = await service_layer.update_resource_property(
            project_id=project_id,
            resource_id=resource_id,
            property_name=body.property_name,
            new_value=body.value,
        )
        return updated.model_dump(mode="json")
    except ValueError as val_err:
        raise HTTPException(status_code=404, detail=str(val_err)) from val_err
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/{project_id}/explain/{resource_id}/{field_id}")
async def get_property_explanation(
    project_id: uuid.UUID,
    resource_id: str,
    field_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Fetch Why & Impact architectural rationale for a specific property."""
    service_layer = ConfigurationService(db)
    artifact = await service_layer.get_or_create_configuration(project_id)
    resource = artifact.resources.get(resource_id)
    if not resource:
        raise HTTPException(status_code=404, detail=f"Resource '{resource_id}' not found")
    
    prop = resource.properties.get(field_id)
    return {
        "field_id": field_id,
        "why": prop.explanation if prop else "Recommended default based on AWS architecture best practices.",
        "impact": prop.impact if prop else None,
        "learn_more": prop.learn_more if prop else None,
    }


@router.get("/{project_id}/readiness")
async def get_readiness_score(
    project_id: uuid.UUID, db: AsyncSession = Depends(get_db)
):
    """Calculate real-time Terraform readiness score for a project."""
    service_layer = ConfigurationService(db)
    artifact = await service_layer.get_or_create_configuration(project_id)
    return {
        "project_id": str(project_id),
        "readiness_score": artifact.readiness_score,
        "is_complete": artifact.is_complete,
        "version": artifact.version,
    }
