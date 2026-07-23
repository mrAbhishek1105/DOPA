import logging
from typing import Any

from backend.services.knowledge_loader import KnowledgeLoader

logger = logging.getLogger(__name__)


class CostEngine:
    """Calculates static infrastructure cost estimates and itemized monthly breakdowns."""

    def __init__(self) -> None:
        loader = KnowledgeLoader()
        self.rules = loader.get("cost-rules.json") or []
        self._price_map = { r["service"]: r.get("baseline_monthly", 20) for r in self.rules if "service" in r }

    def calculate(self, graph_nodes: list[dict[str, Any]], graph_edges: list[dict[str, Any]]) -> dict[str, Any]:
        itemized = []
        total_monthly = 0.0

        services_present = []
        for node in graph_nodes:
            srv = (node.get("data", {}).get("service") or node.get("type") or node.get("id")).lower()
            services_present.append(srv)

        # 1. Base VPC Networking (NAT Gateway + Data Transfer)
        vpc_cost = 32.0  # Single NAT Gateway baseline
        itemized.append({
            "service": "vpc_networking",
            "name": "AWS VPC & NAT Gateway",
            "category": "Networking",
            "quantity": 1,
            "monthly_cost": vpc_cost,
            "notes": "Single NAT Gateway + Egress traffic baseline",
        })
        total_monthly += vpc_cost

        # 2. Map present services to price map
        service_category_map = {
            "alb": ("Application Load Balancer", "Networking", 22.0),
            "ecs": ("ECS Fargate Compute Cluster", "Compute", 28.0),
            "rds": ("RDS PostgreSQL Database (Multi-AZ)", "Database", 95.0),
            "redis": ("ElastiCache Redis Cache Cluster", "Database", 60.0),
            "s3": ("S3 Object Storage", "Storage", 5.0),
            "kms": ("KMS Key Management Service", "Security", 1.0),
            "cloudfront": ("CloudFront Content Delivery Network", "Networking", 8.0),
        }

        for srv, (name, category, default_price) in service_category_map.items():
            if srv in services_present:
                cost = float(self._price_map.get(srv, default_price))
                if srv == "rds_single_az":
                    cost = 45.0
                elif srv == "rds" and "multi_az" in services_present:
                    cost = 95.0

                itemized.append({
                    "service": srv,
                    "name": name,
                    "category": category,
                    "quantity": 1,
                    "monthly_cost": cost,
                    "notes": f"Estimated baseline for {name}",
                })
                total_monthly += cost

        # Compute Category Totals
        categories = {}
        for item in itemized:
            cat = item["category"]
            categories[cat] = categories.get(cat, 0.0) + item["monthly_cost"]

        # Recommendations
        recommendations = []
        if total_monthly > 150:
            recommendations.append({
                "title": "Use AWS Graviton Processors",
                "savings_pct": 20,
                "description": "Switch ECS Fargate and RDS instances to ARM64 Graviton instances for up to 20% lower compute costs.",
            })
        if "rds" in services_present:
            recommendations.append({
                "title": "Purchase 1-Year Reserved Instance for RDS",
                "savings_pct": 35,
                "description": "Commit to a 1-year Reserved Instance for PostgreSQL to reduce database compute costs by ~35%.",
            })
        if vpc_cost > 30:
            recommendations.append({
                "title": "Use VPC Endpoints for S3",
                "savings_pct": 10,
                "description": "Route S3 traffic through Gateway VPC Endpoints to eliminate NAT Gateway data processing charges.",
            })

        return {
            "estimated_monthly_cost": round(total_monthly, 2),
            "currency": "USD",
            "categories": { k: round(v, 2) for k, v in categories.items() },
            "itemized_breakdown": itemized,
            "optimization_recommendations": recommendations,
        }
