"""Response Builder — the personality layer of DOPA.

Takes structured decisions from the Conversation Planner and the parsed
facts from the Discovery Engine, then crafts human-like responses that
sound like a senior DevOps engineer.

This layer has zero decision-making logic. It only formats and words things.
"""

from __future__ import annotations

import logging
from typing import Any

from backend.schemas.conversation import DiscoveryResponse
from backend.schemas.planner import GoalStatus, PlannerResult

logger = logging.getLogger(__name__)

# ── Field display names for human-readable output ──────────────────

FIELD_LABELS: dict[str, str] = {
    "application_type": "Application type",
    "cloud": "Cloud provider",
    "region": "Deployment region",
    "users": "Expected users",
    "traffic": "Traffic pattern",
    "budget": "Budget range",
    "database": "Database preference",
    "availability": "Availability target",
    "compliance": "Compliance requirements",
    "realtime_latency": "Real-time latency needs",
    "media_storage": "Media storage needs",
    "team_size": "Team size",
}

# ── App type → friendly name mapping ──────────────────────────────

APP_TYPE_LABELS: dict[str, str] = {
    "ecommerce": "E-commerce platform",
    "social_media": "Chat/real-time application",
    "saas": "SaaS/multi-tenant platform",
    "internal_tool": "Internal business tool",
    "event_driven": "Event-driven / stream processing system",
    "ai_workload": "AI/ML workload",
    "streaming": "Media streaming platform",
}

# ── Budget → description mapping ──────────────────────────────────

BUDGET_DESCRIPTIONS: dict[str, str] = {
    "low": "cost-optimized",
    "medium": "balanced",
    "high": "performance-first",
}

# ── Traffic → description mapping ─────────────────────────────────

TRAFFIC_DESCRIPTIONS: dict[str, str] = {
    "low": "light, predictable traffic",
    "medium": "moderate traffic with some variation",
    "high": "high traffic with potential spikes",
}

REALTIME_DESCRIPTIONS: dict[str, str] = {
    "yes": "real-time communication",
    "no": "asynchronous/batch processing",
}


class ResponseBuilder:
    """Builds human-like DevOps engineer responses from planner decisions."""

    def build(
        self,
        discovery: DiscoveryResponse,
        planner_result: PlannerResult,
    ) -> dict[str, Any]:
        """Build the complete response including message text and notebook update.

        Args:
            discovery: Output from DiscoveryEngine
            planner_result: Output from ConversationPlanner

        Returns:
            Dict with keys:
                - message: The human-like response text
                - notebook: Notebook update dict
                - response_type: Type of response (question/observation/complete)
        """
        app_type = discovery.extracted.get("application_type")

        # Determine what kind of response to build
        if planner_result.is_complete or discovery.is_complete:
            return self._build_complete_response(discovery, planner_result)

        if planner_result.conversation_stage == "initial" and not app_type:
            return self._build_greeting_response(discovery, planner_result)

        if planner_result.conversation_stage == "clarification":
            # Confidence was low — we need to verify an assumption
            return self._build_clarification_response(discovery, planner_result)

        # Normal requirements discovery — ask a contextual question
        return self._build_discovery_response(discovery, planner_result)

    # ── Response Types ──────────────────────────────────────────

    def _build_greeting_response(
        self,
        discovery: DiscoveryResponse,
        planner: PlannerResult,
    ) -> dict[str, Any]:
        """First turn — user hasn't specified an application type yet."""
        hints = []
        if cloud := discovery.extracted.get("cloud"):
            hints.append(f"deploying on **{cloud.upper()}**")
        if users := discovery.extracted.get("users"):
            friendly = self._format_user_count(users)
            hints.append(f"expecting **~{friendly} users**")
        if budget := discovery.extracted.get("budget"):
            desc = BUDGET_DESCRIPTIONS.get(budget, budget)
            hints.append(f"working with a **{desc} budget**")

        question = planner.next_question or ""

        if hints:
            message = (
                "Thanks! I can see you're " + ", ".join(hints) + ".\n\n"
                f"{question}"
            )
        else:
            message = (
                "I'd love to help design your infrastructure. "
                "First, could you tell me what kind of application you're building?\n\n"
                f"{question}"
            )

        return {
            "message": message,
            "notebook": self._build_notebook(discovery, planner),
            "response_type": "question",
        }

    def _build_discovery_response(
        self,
        discovery: DiscoveryResponse,
        planner: PlannerResult,
    ) -> dict[str, Any]:
        """Standard discovery turn — we know some things, need more info."""
        app_type = discovery.extracted.get("application_type", "")
        app_label = APP_TYPE_LABELS.get(app_type, app_type.replace("_", " ").title())
        question = planner.next_question or ""

        # Build an observation section showing what we know
        observations = self._build_observation_list(discovery)
        reasoning = self._build_reasoning(discovery, planner)

        message_parts = [f"Great, here's what I've understood so far:\n"]

        if observations:
            message_parts.append(observations)
            message_parts.append("")

        if reasoning:
            message_parts.append(reasoning)
            message_parts.append("")

        message_parts.append(question)

        return {
            "message": "\n".join(message_parts),
            "notebook": self._build_notebook(discovery, planner),
            "response_type": "question",
        }

    def _build_clarification_response(
        self,
        discovery: DiscoveryResponse,
        planner: PlannerResult,
    ) -> dict[str, Any]:
        """Confidence was low — asking the user to verify an assumption."""
        question = planner.next_question or ""

        message = (
            "I want to double-check something before I proceed further.\n\n"
            f"{question}"
        )

        return {
            "message": message,
            "notebook": self._build_notebook(discovery, planner),
            "response_type": "clarification",
        }

    def _build_complete_response(
        self,
        discovery: DiscoveryResponse,
        planner: PlannerResult,
    ) -> dict[str, Any]:
        """All requirements gathered — ready to generate architecture."""
        app_type = discovery.extracted.get("application_type", "")
        app_label = APP_TYPE_LABELS.get(app_type, app_type.replace("_", " ").title())

        observation_detail = self._build_detailed_summary(discovery)

        message = (
            f"**All requirements gathered!** Here's a complete summary of your "
            f"{app_label}:\n\n"
            f"{observation_detail}\n\n"
            "Everything looks good. I'll now generate the architecture "
            "recommendations based on these inputs."
        )

        return {
            "message": message,
            "notebook": self._build_notebook(discovery, planner),
            "response_type": "complete",
        }

    # ── Observations & Reasoning ────────────────────────────────

    def _build_observation_list(self, discovery: DiscoveryResponse) -> str:
        """Build a bullet-point observation section."""
        lines: list[str] = []
        extracted = discovery.extracted

        for field, value in extracted.items():
            if value is None or value == "" or field.startswith("__") or field == "capabilities":
                continue
            label = FIELD_LABELS.get(field, field.replace("_", " ").title())
            formatted = self._format_value(field, value)
            lines.append(f"  ✓ **{label}**: {formatted}")

        # Add detected workloads/capabilities if present
        capabilities = extracted.get("capabilities", [])
        if capabilities and isinstance(capabilities, list):
            for cap in capabilities:
                lines.append(f"  ✓ **Capability**: {cap}")

        for field in discovery.missing_fields:
            if field not in extracted or extracted[field] is None:
                label = FIELD_LABELS.get(field, field.replace("_", " ").title())
                lines.append(f"  ? **{label}**: Not yet specified")

        return "\n".join(lines) if lines else ""

    def _build_reasoning(
        self, discovery: DiscoveryResponse, planner: PlannerResult
    ) -> str:
        """Build a reasoning paragraph explaining *why* a question matters."""
        active_goal = planner.active_goal
        app_type = discovery.extracted.get("application_type", "")

        if not active_goal:
            return ""

        explanations = {
            "understand_application": (
                "Knowing the application type helps me pick the right "
                "architecture pattern and services."
            ),
            "understand_scale": (
                "Understanding your user base and traffic patterns is critical "
                "for sizing compute, database, and network resources correctly."
            ),
            "understand_latency": (
                "Latency requirements fundamentally change the architecture. "
                "Real-time apps need WebSockets, caching, and global distribution."
            ),
            "understand_availability": (
                "Availability targets determine whether we need multi-AZ, "
                "multi-region, or disaster recovery setups — which significantly "
                "impacts both architecture and cost."
            ),
            "understand_region": (
                "Choosing the right region reduces latency for your users "
                "and can affect compliance with data residency requirements."
            ),
            "understand_storage": (
                "Storage needs affect database choice, caching strategy, "
                "and media asset pipeline design."
            ),
            "understand_cost": (
                "Budget helps me balance between performance, availability, "
                "and cost — the classic architecture trade-off."
            ),
            "understand_compliance": (
                "Compliance requirements (HIPAA, SOC2, PCI-DSS) add specific "
                "security layers, audit logging, and data encryption needs."
            ),
        }

        explanation = explanations.get(active_goal, "")
        return explanation

    def _build_detailed_summary(self, discovery: DiscoveryResponse) -> str:
        """Build a detailed final summary for completion."""
        lines: list[str] = []
        for field, value in discovery.extracted.items():
            if value is None or value == "" or field.startswith("__"):
                continue
            label = FIELD_LABELS.get(field, field.replace("_", " ").title())
            formatted = self._format_value(field, value)
            lines.append(f"  ✓ **{label}**: {formatted}")

        return "\n".join(lines)

    # ── Notebook Building ────────────────────────────────────────

    def _build_notebook(
        self,
        discovery: DiscoveryResponse,
        planner: PlannerResult,
    ) -> dict[str, Any]:
        """Build the live-updating project notebook data."""
        detected = {}
        for field, value in discovery.extracted.items():
            if value is None or value == "" or field.startswith("__"):
                continue
            confidence = planner.confidence
            detected[field] = {
                "label": FIELD_LABELS.get(field, field.replace("_", " ").title()),
                "value": self._format_value(field, value),
                "confidence": confidence,
            }

        remaining = []
        for field in discovery.missing_fields:
            remaining.append({
                "field": field,
                "label": FIELD_LABELS.get(field, field.replace("_", " ").title()),
            })

        assumptions = []
        if planner.goals_summary:
            for goal in planner.goals_summary:
                for field in goal.satisfied_fields:
                    if field in discovery.extracted:
                        value = discovery.extracted[field]
                        assumptions.append({
                            "field": field,
                            "value": self._format_value(field, value),
                            "confidence": planner.confidence,
                        })

        return {
            "detected": detected,
            "remaining": remaining,
            "assumptions": assumptions,
            "confidence": round(planner.confidence * 100),
            "stage": planner.conversation_stage,
            "is_complete": planner.is_complete or discovery.is_complete,
        }

    # ── Helpers ──────────────────────────────────────────────────

    def _format_value(self, field: str, value: Any) -> str:
        """Format a field value for human-readable display."""
        if field == "users" and isinstance(value, (int, float)):
            return self._format_user_count(value)
        if field == "cloud" and isinstance(value, str):
            return value.upper()
        if field == "database" and isinstance(value, str):
            db_map = {"postgresql": "PostgreSQL", "mysql": "MySQL", "dynamodb": "DynamoDB", "mongodb": "MongoDB", "sql": "SQL"}
            return db_map.get(value.lower(), value.title())
        if field == "application_type":
            return APP_TYPE_LABELS.get(value, str(value).replace("_", " ").title())
        if field == "budget":
            return BUDGET_DESCRIPTIONS.get(value, str(value)) + f" ({value})"
        if field == "traffic" and isinstance(value, str):
            return TRAFFIC_DESCRIPTIONS.get(value, value.replace("_", " ").title())
        if field == "realtime_latency" and isinstance(value, str):
            return REALTIME_DESCRIPTIONS.get(value, value.replace("_", " ").title())
        if isinstance(value, str):
            return value.replace("_", " ").title()
        return str(value)

    def _format_user_count(self, count: int) -> str:
        """Format user count in human-readable form."""
        if count >= 1_000_000:
            return f"{count / 1_000_000:.1f}M"
        if count >= 1_000:
            return f"{count / 1_000:.0f}K"
        return str(count)