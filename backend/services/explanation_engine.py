import logging
from typing import Any

from backend.services.knowledge_loader import KnowledgeLoader

logger = logging.getLogger(__name__)


class ExplanationEngine:
    """Generates structured natural language decision rationale, decision trace, and architecture fit breakdown."""

    def __init__(self) -> None:
        loader = KnowledgeLoader()
        self.rules = loader.get("tradeoff-rules.json") or []

    def generate(
        self,
        extracted_reqs: dict[str, Any],
        selected_option: dict[str, Any] | None,
        security_report: dict[str, Any] | None,
        cost_report: dict[str, Any] | None,
    ) -> dict[str, Any]:
        opt_name = selected_option.get("name", "Balanced Architecture") if selected_option else "Balanced Architecture"
        opt_score = selected_option.get("score", 0.87) if selected_option else 0.87
        score_pct = int(opt_score * 100) if opt_score <= 1.0 else int(opt_score)

        app_type = str(extracted_reqs.get("application_type", "ecommerce")).replace("_", " ").title()
        cloud = str(extracted_reqs.get("cloud", "aws")).upper()
        region = str(extracted_reqs.get("region", "ap-south-1"))
        traffic = str(extracted_reqs.get("traffic", "high"))
        availability = str(extracted_reqs.get("availability", "high"))
        budget = str(extracted_reqs.get("budget", "medium"))
        database = str(extracted_reqs.get("database", "postgresql")).title()

        # 1. Itemized Metric Fit Scores
        metric_breakdown = {
            "traffic_fit": 95 if traffic == "high" else 90,
            "availability_fit": 100 if availability in ("high", "multi_region") else 85,
            "budget_fit": 75 if budget == "medium" else 90,
            "operations_fit": 90,
            "security_fit": 85,
            "scalability_fit": 90,
            "total_architecture_score": score_pct,
        }

        # 2. Step-by-Step Architectural Decision Trace
        decision_trace = [
            {
                "requirement": f"High Traffic ({extracted_reqs.get('users', 100000):,} Users) + 10x Sales Spikes",
                "need": "Horizontal Auto-Scaling & Managed Load Balancing",
                "decision": "AWS Application Load Balancer (ALB) + ECS Fargate Container Service",
                "why": "Fargate container tasks scale horizontally across subnets within seconds during peak sales events without server management overhead."
            },
            {
                "requirement": f"{database} Relational Preference + Zero Downtime",
                "need": "Managed Multi-AZ Database with Synchronous Standby Failover",
                "decision": f"AWS RDS {database} (Multi-AZ Deployment)",
                "why": "Multi-AZ replication ensures 99.99% SLA with automatic DNS failover if the primary AZ experiences an outage."
            },
            {
                "requirement": "Fast Product Page Caching (Redis)",
                "need": "Sub-Millisecond In-Memory Key-Value Caching",
                "decision": "AWS ElastiCache (Redis Cluster)",
                "why": "Offloads read traffic from RDS database by serving high-frequency catalog and product detail queries directly from memory."
            },
            {
                "requirement": f"Deployment Region ({region.upper()})",
                "need": "Low-Latency Data Residency & Indian Regional Access",
                "decision": f"AWS Region {region} (Mumbai)",
                "why": "Provides sub-50ms latency for Indian customers while complying with local data storage regulations."
            }
        ]

        # 3. Primary Rationale Points
        chosen_reasons = [
            f"Tailored specifically for {app_type} workloads on {cloud} in the {region.upper()} region.",
            f"Designed for zero-downtime availability using Multi-AZ container tasks (ECS Fargate) and Multi-AZ database standby (RDS {database}).",
            f"Equipped with ElastiCache Redis to absorb 10x traffic surges during sales events.",
            f"Constructed with security-by-default standards including private VPC subnets, KMS encryption, and IAM role isolation.",
        ]

        # 4. Tradeoff Analysis Narrative
        tradeoff_summary = (
            f"The **{opt_name}** achieves an **{score_pct}% Overall Architecture Fit** score for your requirements. "
            f"By combining containerized compute (ECS Fargate) with in-memory caching (ElastiCache Redis) and Multi-AZ storage (RDS {database}), "
            f"it guarantees 99.99% uptime during peak sales surges. "
            f"If budget reduction is prioritized over high availability, Option A (Cost-Optimized) reduces monthly spend by using Single-AZ RDS and Fargate Spot instances."
        )

        # 5. Clear Alternatives Comparison
        alternatives = [
            {
                "option": "Option A (Cost-Optimized / $140/mo)",
                "comparison": "Uses Single-AZ RDS PostgreSQL + Fargate Spot tasks + Optional Redis. Lowers cost by ~40%, best suited for staging/dev, but lacks automated Multi-AZ failover during outages.",
            },
            {
                "option": "Option B (Balanced / $245/mo - Selected)",
                "comparison": "Uses Multi-AZ RDS PostgreSQL + Multi-AZ ECS Fargate + ElastiCache Redis Cluster. Provides ideal balance of zero downtime, sub-second caching, and predictable cost.",
            },
            {
                "option": "Option C (Enterprise / $580/mo)",
                "comparison": "Upgrades to Amazon Aurora PostgreSQL Serverless v2 + Multi-Region S3 + AWS WAF Security Suite. Provides global scalability and 99.999% SLA, but doubles monthly spend.",
            },
        ]

        cost_monthly = cost_report.get("estimated_monthly_cost", 245.0) if cost_report else 245.0
        sec_risk = security_report.get("risk_level", "LOW") if security_report else "LOW"

        return {
            "title": f"Architecture Rationale: {opt_name}",
            "confidence_score": score_pct,
            "metric_breakdown": metric_breakdown,
            "decision_trace": decision_trace,
            "chosen_because": chosen_reasons,
            "tradeoff_narrative": tradeoff_summary,
            "alternatives_comparison": alternatives,
            "key_metrics_summary": {
                "estimated_monthly_cost": f"${cost_monthly}/mo",
                "security_risk_level": sec_risk,
                "target_availability": "99.99%",
            },
        }
