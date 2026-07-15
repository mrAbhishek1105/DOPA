from __future__ import annotations

from typing import Any

from backend.schemas import ArchitectureGraph, ArchitectureOption, ArchitectureTemplate, Edge, Node
from .knowledge_loader import KnowledgeLoader


class GraphEngine:
    """Build deterministic architecture graphs from selected options and templates."""

    def __init__(self, knowledge_loader: KnowledgeLoader | None = None) -> None:
        self.loader = knowledge_loader or KnowledgeLoader()
        self._templates = self.loader.get("architecture-templates.json")

    def build(self, selected_option: ArchitectureOption, project_id: str = "project-test") -> ArchitectureGraph:
        template = self._find_template(selected_option.services)
        if not template:
            raise ValueError("No matching architecture template found for selected services.")

        nodes = [
            Node(
                id=node_def["id"],
                type=node_def["type"],
                provider="aws",
                service=node_def["service"],
                metadata={"selected_option": selected_option.name},
            )
            for node_def in template.get("nodes", [])
        ]

        edges = [
            Edge(
                id=f"edge-{index + 1}",
                source=edge_def["source"],
                target=edge_def["target"],
                relationship=edge_def["relationship"],
                properties={},
            )
            for index, edge_def in enumerate(template.get("edges", []))
        ]

        graph_id = f"graph-{selected_option.id}-{template['pattern_id']}"
        metadata = {
            "pattern_id": template["pattern_id"],
            "selected_option": selected_option.name,
            "services": selected_option.services,
        }
        return ArchitectureGraph(
            graph_id=graph_id,
            project_id=project_id,
            version="1.0",
            metadata=metadata,
            nodes=nodes,
            edges=edges,
        )

    def _find_template(self, services: list[str]) -> dict[str, Any] | None:
        service_set = set(services)
        for template in self._templates:
            template_services = set(template.get("services", []))
            if template_services.issubset(service_set):
                return template
        return None
