from __future__ import annotations

from datetime import datetime, timezone

from .models import Decision


class DecisionLogger:
    """Records decisions as traceable evidence for later UI display."""

    def __init__(self) -> None:
        self._decisions: list[Decision] = []

    def log(self, title: str, reason: str, confidence: float, rule_id: str | None = None) -> Decision:
        decision = Decision(
            title=title,
            reason=reason,
            confidence=confidence,
            rule_id=rule_id,
            timestamp=datetime.now(timezone.utc).isoformat(),
        )
        self._decisions.append(decision)
        return decision

    def all(self) -> list[Decision]:
        return list(self._decisions)
