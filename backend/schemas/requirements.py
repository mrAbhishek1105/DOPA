from __future__ import annotations

from typing import Literal
from pydantic import BaseModel, Field


class RequirementModel(BaseModel):
    """Structured requirements used by the core DOPA pipeline."""

    application_type: str = Field(..., min_length=1)
    cloud: Literal["aws", "gcp", "azure"] = "aws"
    traffic: str | int | None = None
    availability: str | None = None
    region: str | None = None
    budget: str | None = None
    database: str | None = None
    compliance: str | None = None
    users: int | None = Field(default=None, ge=0)
    team_size: str | None = None
    latency_sla: str | None = None
    media_storage: str | None = None
    realtime_latency: str | None = None
    capabilities: list[str] = Field(default_factory=list)

    model_config = {
        "str_strip_whitespace": True,
        "extra": "ignore",
    }