from __future__ import annotations

import json
import os
from typing import Any

from .models import Component


_KNOWLEDGE_DIR = os.path.join(os.path.dirname(__file__), "knowledge")

_COMPONENT_META: dict[str, dict[str, Any]] = {
    "internet": {"name": "Internet", "layer": "presentation", "required": True, "reason": "Entry point for all user traffic"},
    "cdn": {"name": "CDN", "layer": "presentation", "required": False, "reason": "Global content delivery and DDoS protection"},
    "load_balancer": {"name": "Load Balancer", "layer": "presentation", "required": True, "reason": "Traffic distribution across compute instances"},
    "application": {"name": "Application", "layer": "application", "required": True, "reason": "Core application logic and API endpoints"},
    "compute": {"name": "Compute", "layer": "application", "required": True, "reason": "General compute for business logic"},
    "functions": {"name": "Functions", "layer": "application", "required": False, "reason": "Serverless function execution"},
    "database": {"name": "Database", "layer": "data", "required": True, "reason": "Persistent data storage"},
    "cache": {"name": "Cache", "layer": "data", "required": False, "reason": "In-memory caching for performance"},
    "storage": {"name": "Storage", "layer": "data", "required": True, "reason": "Object and file storage"},
    "static_storage": {"name": "Static Storage", "layer": "data", "required": True, "reason": "Static asset hosting"},
    "monitoring": {"name": "Monitoring", "layer": "management", "required": True, "reason": "System observability and alerting"},
    "logging": {"name": "Logging", "layer": "management", "required": False, "reason": "Centralized log aggregation"},
    "api_gateway": {"name": "API Gateway", "layer": "presentation", "required": True, "reason": "API request routing and throttling"},
    "queue": {"name": "Queue", "layer": "application", "required": False, "reason": "Async task decoupling"},
    "event_bus": {"name": "Event Bus", "layer": "application", "required": False, "reason": "Event-driven communication"},
    "stream_processor": {"name": "Stream Processor", "layer": "application", "required": False, "reason": "Real-time data stream processing"},
    "search": {"name": "Search", "layer": "data", "required": False, "reason": "Full-text search capability"},
    "auth": {"name": "Auth", "layer": "security", "required": False, "reason": "User authentication and authorization"},
    "ingestion": {"name": "Ingestion", "layer": "ingestion", "required": True, "reason": "Data/media ingestion endpoint"},
    "transcoder": {"name": "Transcoder", "layer": "processing", "required": False, "reason": "Media transcoding pipeline"},
    "data_ingestion": {"name": "Data Ingestion", "layer": "ingestion", "required": True, "reason": "Batch/stream data ingestion"},
    "data_storage": {"name": "Data Storage", "layer": "storage", "required": True, "reason": "Data lake storage layer"},
    "data_processing": {"name": "Data Processing", "layer": "processing", "required": False, "reason": "Big data processing engine"},
    "data_catalog": {"name": "Data Catalog", "layer": "management", "required": False, "reason": "Data discovery and governance"},
    "analytics": {"name": "Analytics", "layer": "analytics", "required": True, "reason": "Query and analytics engine"},
    "websocket_gateway": {"name": "WebSocket Gateway", "layer": "presentation", "required": False, "reason": "WebSocket connection management"},
}


def _load_json(filename: str) -> dict[str, Any]:
    path = os.path.join(_KNOWLEDGE_DIR, filename)
    with open(path, encoding="utf-8") as f:
        return dict(json.load(f))


class ComponentPlanner:
    """Module 2: Generates provider-neutral logical components based on capabilities."""

    def __init__(self) -> None:
        self.templates = _load_json("component_templates.json")

    def plan(self, capabilities: list[str], application_type: str = "generic") -> list[Component]:
        """Generate logical components from capabilities and application type."""
        template = self.templates.get(application_type, self.templates.get("generic", {}))
        template_components: list[str] = list(template.get("components", []))

        # Extend with capability-derived components
        cap_to_component: dict[str, str] = {
            "load_balancer": "load_balancer",
            "cdn": "cdn",
            "cache": "cache",
            "object_storage": "storage",
            "managed_database": "database",
            "message_queue": "queue",
            "event_stream": "event_bus",
            "search": "search",
            "auth": "auth",
            "monitoring": "monitoring",
            "logging": "logging",
            "api_gateway": "api_gateway",
            "websocket": "websocket_gateway",
            "stream_processing": "stream_processor",
            "data_analytics": "analytics",
            "data_lake": "data_storage",
            "batch_processing": "data_processing",
            "media_transcoding": "transcoder",
            "serverless": "functions",
        }

        for cap in capabilities:
            if cap in cap_to_component:
                comp_id = cap_to_component[cap]
                if comp_id not in template_components:
                    template_components.append(comp_id)

        # Deduplicate while preserving order
        seen: set[str] = set()
        unique_components: list[str] = []
        for cid in template_components:
            if cid not in seen:
                seen.add(cid)
                unique_components.append(cid)

        # Build Component objects
        components: list[Component] = []
        for cid in unique_components:
            meta = _COMPONENT_META.get(cid, {"name": cid.replace("_", " ").title(), "layer": "application", "required": False, "reason": ""})
            components.append(
                Component(
                    id=cid,
                    name=meta["name"],
                    layer=meta["layer"],
                    required=meta.get("required", False),
                    reason=meta.get("reason", ""),
                )
            )

        return components