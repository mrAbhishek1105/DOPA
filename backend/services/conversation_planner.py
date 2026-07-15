"""Conversation Planner — the intelligence layer between Discovery and Requirements.

The Discovery Engine handles deterministic field extraction (regex/keyword).
The Conversation Planner decides *what to ask next* by evaluating:
  1. Which discovery goals are satisfied vs. unsatisfied
  2. Goal priority ordering
  3. Context-aware clarification rules (triggered by known fields)
  4. Confidence-based verification (low confidence → confirm assumption)
  5. Conversation history (no repeated questions)

Architecture flow:
  User Message → Discovery Engine → Conversation Planner → Requirement Store
"""

from __future__ import annotations

import logging
from typing import Any

from backend.schemas.conversation import DiscoveryResponse
from backend.schemas.planner import (
    Assumption,
    GoalStatus,
    PlannerResult,
    PlannerState,
)
from backend.services.knowledge_loader import KnowledgeLoader

logger = logging.getLogger(__name__)

# Confidence threshold below which the planner will ask a verification question
CONFIDENCE_VERIFICATION_THRESHOLD = 0.60

# Minimum confidence for the overall requirements to be considered solid
OVERALL_CONFIDENCE_THRESHOLD = 0.70


class ConversationPlanner:
    """Goal-based conversation planner with clarification priority.

    Takes the output of the Discovery Engine (extracted fields + missing fields)
    and decides the most contextual, human-like next question to ask.
    """

    def __init__(self, knowledge_loader: KnowledgeLoader | None = None) -> None:
        self.loader = knowledge_loader or KnowledgeLoader()
        self._goals: list[dict[str, Any]] = list(
            self.loader.get("discovery-goals.json")
        )
        self._rules: list[dict[str, Any]] = list(
            self.loader.get("clarification-rules.json")
        )

    def plan(
        self,
        discovery_response: DiscoveryResponse,
        planner_state: PlannerState | None = None,
    ) -> tuple[PlannerResult, PlannerState]:
        """Main entry point. Evaluate goals and pick the best next question.

        Args:
            discovery_response: Output from DiscoveryEngine.process_message()
            planner_state: Previous planner state (None on first turn)

        Returns:
            Tuple of (PlannerResult, updated PlannerState)
        """
        state = planner_state or PlannerState()
        state.turn_count += 1
        state.discovered_fields = dict(discovery_response.extracted)

        # If discovery engine says complete, we're done
        if discovery_response.is_complete:
            state.conversation_stage = "complete"
            state.active_goal = None
            state.active_question = None
            return (
                PlannerResult(
                    is_complete=True,
                    confidence=self._compute_overall_confidence(state),
                    conversation_stage="complete",
                    goals_summary=self._evaluate_all_goals(state.discovered_fields),
                ),
                state,
            )

        # Evaluate all goals
        goal_statuses = self._evaluate_all_goals(state.discovered_fields)

        # Update conversation stage
        if state.turn_count <= 1 and not state.discovered_fields.get("application_type"):
            state.conversation_stage = "initial"
        else:
            state.conversation_stage = "requirements_discovery"

        # Check if any assumption needs verification (low confidence)
        verification = self._check_confidence_verification(state)
        if verification:
            state.active_goal = "verification"
            state.active_question = verification.question
            state.conversation_stage = "clarification"
            return (
                PlannerResult(
                    next_question=verification.question,
                    active_goal="verification",
                    confidence=self._compute_overall_confidence(state),
                    conversation_stage="clarification",
                    goals_summary=goal_statuses,
                    used_rule_id=verification.rule_id,
                ),
                state,
            )

        # Select the highest-priority unsatisfied goal
        selected_goal = self._select_next_goal(goal_statuses, state.clarification_history)
        if not selected_goal:
            # All applicable goals are satisfied — mark complete
            state.conversation_stage = "complete"
            state.active_goal = None
            state.active_question = None
            return (
                PlannerResult(
                    is_complete=True,
                    confidence=self._compute_overall_confidence(state),
                    conversation_stage="complete",
                    goals_summary=goal_statuses,
                ),
                state,
            )

        # Find the best clarification rule for this goal
        question, rule_id = self._generate_question(
            selected_goal,
            state.discovered_fields,
            state.clarification_history,
        )

        # Update state
        state.active_goal = selected_goal.goal_id
        state.active_question = question
        if rule_id:
            state.clarification_history.append(rule_id)

        return (
            PlannerResult(
                next_question=question,
                active_goal=selected_goal.goal_id,
                confidence=self._compute_overall_confidence(state),
                conversation_stage=state.conversation_stage,
                goals_summary=goal_statuses,
                used_rule_id=rule_id,
            ),
            state,
        )

    # ── Goal Evaluation ───────────────────────────────────────

    def _evaluate_all_goals(self, known_fields: dict[str, Any]) -> list[GoalStatus]:
        """Evaluate all goals and return their status, sorted by priority."""
        statuses: list[GoalStatus] = []
        app_type = known_fields.get("application_type")

        for goal_def in sorted(self._goals, key=lambda g: g.get("priority", 99)):
            goal_id = goal_def["goal_id"]
            satisfied_by = goal_def.get("satisfied_by", [])
            satisfied_by_any = goal_def.get("satisfied_by_any", False)
            triggers = goal_def.get("triggers")

            # Check if this goal is applicable (trigger conditions)
            is_applicable = True
            if triggers and app_type:
                trigger_app_types = triggers.get("application_type", [])
                if trigger_app_types and app_type not in trigger_app_types:
                    is_applicable = False
            elif triggers and not app_type:
                # Can't evaluate triggers without knowing the app type yet
                is_applicable = False

            # Check satisfaction
            satisfied_fields = [f for f in satisfied_by if f in known_fields and known_fields[f]]
            missing_fields = [f for f in satisfied_by if f not in known_fields or not known_fields[f]]

            if satisfied_by_any:
                is_satisfied = len(satisfied_fields) > 0
            else:
                is_satisfied = len(missing_fields) == 0

            statuses.append(
                GoalStatus(
                    goal_id=goal_id,
                    priority=goal_def.get("priority", 99),
                    is_satisfied=is_satisfied,
                    is_applicable=is_applicable,
                    satisfied_fields=satisfied_fields,
                    missing_fields=missing_fields,
                )
            )

        return statuses

    def _select_next_goal(
        self, goal_statuses: list[GoalStatus], history: list[str]
    ) -> GoalStatus | None:
        """Pick the highest-priority unsatisfied, applicable goal.

        If a goal's rules have all been exhausted in history, skip it to avoid
        getting stuck in a loop.
        """
        for status in sorted(goal_statuses, key=lambda g: g.priority):
            if status.is_applicable and not status.is_satisfied:
                # Check if we have at least one unused rule for this goal
                available_rules = [
                    r for r in self._rules
                    if r.get("goal_id") == status.goal_id and r.get("rule_id") not in history
                ]
                if available_rules:
                    return status
                # No unused rules, but still unsatisfied — we can use a fallback
                return status
        return None

    # ── Question Generation ───────────────────────────────────

    def _generate_question(
        self,
        goal: GoalStatus,
        known_fields: dict[str, Any],
        history: list[str],
    ) -> tuple[str, str | None]:
        """Find the best clarification rule for the given goal and context.

        Selection strategy:
        1. Find rules matching the goal_id
        2. Filter out already-used rules (from history)
        3. Prefer rules whose trigger matches known fields
        4. Prefer rules with context_keywords matching the conversation context
        5. Fall back to generic (empty trigger) rules
        6. If no rules at all, generate a plain fallback question

        Returns:
            Tuple of (question_text, rule_id or None)
        """
        app_type = known_fields.get("application_type")
        candidate_rules = [
            r for r in self._rules
            if r.get("goal_id") == goal.goal_id and r.get("rule_id") not in history
        ]

        if not candidate_rules:
            # Absolute fallback — generate a basic question from the missing field
            if goal.missing_fields:
                field = goal.missing_fields[0]
                return (f"Could you tell me about your {field.replace('_', ' ')} requirements?", None)
            return ("Could you tell me more about your requirements?", None)

        # Score each candidate
        scored: list[tuple[float, dict[str, Any]]] = []
        for rule in candidate_rules:
            score = 0.0
            trigger = rule.get("trigger", {})

            # Trigger match: does the rule's trigger match known fields?
            if trigger:
                trigger_matches = all(
                    known_fields.get(k) == v for k, v in trigger.items()
                )
                if trigger_matches:
                    score += 100  # Strong match
                else:
                    score -= 200  # Trigger exists but doesn't match — deprioritize
            else:
                score += 10  # Generic rule (no trigger) — mild preference

            # Context keyword match: bonus for keyword overlap with known context
            context_kw = rule.get("context_keywords", [])
            if context_kw:
                # Check if any context keywords appear in previously extracted info
                all_known_values = " ".join(
                    str(v).lower() for v in known_fields.values() if v
                )
                for kw in context_kw:
                    if kw.lower() in all_known_values:
                        score += 20

            # Lower rule priority number = more specific = better
            rule_priority = rule.get("priority", 10)
            score -= rule_priority  # Lower priority number → higher score

            scored.append((score, rule))

        # Pick the best
        scored.sort(key=lambda x: x[0], reverse=True)
        best_rule = scored[0][1]

        return (best_rule["question"], best_rule.get("rule_id"))

    # ── Confidence ────────────────────────────────────────────

    def _check_confidence_verification(
        self, state: PlannerState
    ) -> _VerificationQuestion | None:
        """Check if any assumption has low confidence and needs user verification."""
        for assumption in state.assumptions:
            if assumption.confidence < CONFIDENCE_VERIFICATION_THRESHOLD:
                rule_id = f"verify_{assumption.field}"
                if rule_id in state.clarification_history:
                    continue  # Already asked
                question = (
                    f"I think your {assumption.field.replace('_', ' ')} is "
                    f"\"{assumption.value}\". Is that correct, or would you "
                    f"like to specify something different?"
                )
                return _VerificationQuestion(question=question, rule_id=rule_id)
        return None

    def _compute_overall_confidence(self, state: PlannerState) -> float:
        """Compute an overall confidence score for the current requirements.

        Based on:
        - Number of goals satisfied vs total applicable goals
        - Individual field confidence scores
        """
        goal_statuses = self._evaluate_all_goals(state.discovered_fields)
        applicable = [g for g in goal_statuses if g.is_applicable]
        if not applicable:
            return 1.0

        satisfied = [g for g in applicable if g.is_satisfied]
        goal_ratio = len(satisfied) / len(applicable)

        # Factor in individual confidence scores
        if state.confidence_scores:
            avg_field_confidence = sum(state.confidence_scores.values()) / len(
                state.confidence_scores
            )
        else:
            avg_field_confidence = 1.0 if satisfied else 0.5

        # Weighted combination
        return round(goal_ratio * 0.7 + avg_field_confidence * 0.3, 3)


class _VerificationQuestion:
    """Internal helper for confidence verification questions."""

    __slots__ = ("question", "rule_id")

    def __init__(self, question: str, rule_id: str) -> None:
        self.question = question
        self.rule_id = rule_id
