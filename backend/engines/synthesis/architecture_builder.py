from __future__ import annotations

from typing import Any

from .models import Architecture, ArchitectureLayer, Component, Connection


class ArchitectureBuilder:
    """Module 4: Assembles components into a layered architecture with connections."""

    LAYER_ORDER: dict[str, int] = {
        "internet": 0,
        "presentation": 1,
        "ingestion": 1,
        "gateway": 1,
        "delivery": 1,
        "application": 2,
        "compute": 2,
        "processing": 2,
        "security": 2,
        "data": 3,
        "storage": 3,
        "database": 3,
        "analytics": 4,
        "management": 5,
    }

    def build(self, components: list[Component], pattern_layers: list[str] | None = None) -> Architecture:
        """Assemble components into layers and create connections."""
        # Group components by layer
        layer_map: dict[str, list[Component]] = {}
        for comp in components:
            layer = comp.layer
            if layer not in layer_map:
                layer_map[layer] = []
            layer_map[layer].append(comp)

        # Determine layer order
        all_layers = list(layer_map.keys())
        ordered_layers = sorted(all_layers, key=lambda x: self.LAYER_ORDER.get(x, 5))

        architecture_layers: list[ArchitectureLayer] = []
        for order, layer_id in enumerate(ordered_layers):
            comps = layer_map[layer_id]
            architecture_layers.append(
                ArchitectureLayer(
                    id=layer_id,
                    name=layer_id.replace("_", " ").title(),
                    components=comps,
                    order=order,
                )
            )

        # Create connections between layers
        connections = self._create_connections(ordered_layers, layer_map)

        return Architecture(layers=architecture_layers, connections=connections)

    def _create_connections(self, ordered_layers: list[str], layer_map: dict[str, list[Component]]) -> list[Connection]:
        """Create data flow connections between adjacent layers."""
        connections: list[Connection] = []
        prev_components: list[str] = ["internet"] if "internet" in {c.id for layers in layer_map.values() for c in layers} else []

        # Collect all component IDs
        for layer_id in ordered_layers:
            current_components = [c.id for c in layer_map.get(layer_id, [])]
            if not current_components:
                continue

            # Connect previous layer to current layer
            for src in prev_components:
                for tgt in current_components:
                    connections.append(
                        Connection(
                            source=src,
                            target=tgt,
                            type="data_flow",
                            protocol="https",
                        )
                    )

            prev_components = current_components

        return connections