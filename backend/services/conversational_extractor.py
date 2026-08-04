"""
ConversationalExtractor — Context-aware free-text to structured value resolver.

Called when the main regex-based extractor cannot match a value.
Uses:
  1. A synonym/phrase map per field (catches natural language variations)
  2. The `last_asked_field` context (so "medium" is resolved as budget=medium
     when budget was the last asked field)
  3. Lettered option detection (catches "a", "b", "c", "d" answers)
"""

from __future__ import annotations
import re
from typing import Any

# Synonym maps per field — maps user phrases to canonical values
FIELD_SYNONYMS: dict[str, dict[str, list[str]]] = {
    "budget": {
        "low": [
            "tight", "minimal", "bootstrapped", "cheap", "limited",
            "no budget", "not much", "small budget", "frugal",
            "cost effective", "save money", "as little as possible",
            "minimum spend", "economical", "affordable",
        ],
        "medium": [
            "reasonable", "flexible", "some budget", "not too expensive",
            "moderate", "middle ground", "balanced", "standard", "average",
            "neither", "between", "moderate spend",
        ],
        "high": [
            "no limit", "enterprise", "money is not an issue",
            "go all in", "best possible", "performance first",
            "unlimited", "whatever it takes", "top tier", "premium",
            "generous", "large budget", "big budget",
        ],
    },
    "availability": {
        "high": [
            "always on", "can't afford downtime", "zero downtime",
            "must be up", "no outages", "99.9", "four nines", "five nines",
            "mission critical", "critical", "ha", "high availability",
            "always available", "production", "never down", "99",
        ],
        "standard": [
            "some downtime ok", "maintenance windows fine", "not critical",
            "can restart", "tolerate downtime", "weekends ok", "basic",
            "normal", "acceptable outage", "occasional downtime",
        ],
        "multi_region": [
            "global", "worldwide", "disaster recovery", "dr",
            "multi region", "cross region", "failover", "geographic",
            "replicated globally",
        ],
    },
    "traffic": {
        "low": [
            "small", "just me", "few users", "low load",
            "not much traffic", "internal only", "prototype",
            "hundreds", "under a thousand", "light",
        ],
        "medium": [
            "growing", "moderate", "few thousand", "some traffic",
            "thousands", "10k", "mid level", "average",
        ],
        "high": [
            "millions", "peak load", "spikes", "viral", "launch traffic",
            "heavy load", "scale", "high load", "surge", "festivals",
            "sales events", "black friday", "flash sale",
        ],
    },
    "realtime_latency": {
        "yes": [
            "instant", "real time", "live", "immediate", "milliseconds",
            "sub second", "fast response", "streaming", "websocket",
            "push notifications", "chat", "gaming", "interactive",
        ],
        "no": [
            "batch", "async", "delayed", "few seconds ok",
            "not instant", "periodic", "background", "offline",
            "report", "scheduled", "queue", "eventual consistency",
        ],
    },
    "team_size": {
        "small": [
            "just me", "solo", "two people", "2 people", "few people",
            "small team", "startup", "indie", "couple of devs",
            "tiny team", "3 devs", "4 people",
        ],
        "medium": [
            "medium team", "department", "10 to 50", "growing team",
            "small company", "squad", "20 engineers",
        ],
        "large": [
            "hundred", "enterprise team", "large org", "big company",
            "hundreds of engineers", "corporate", "1000 employees",
        ],
    },
    "media_storage": {
        "low": [
            "no media", "text only", "no files", "minimal storage",
            "just data", "no images", "no uploads",
        ],
        "medium": [
            "some images", "moderate media", "photos occasionally",
            "profile pictures", "thumbnails", "small attachments",
        ],
        "high": [
            "lots of video", "media heavy", "terabytes", "tons of files",
            "user uploads", "videos", "large files", "petabytes",
        ],
    },
    "compliance": {
        "pci": ["payment", "pci", "pci dss", "credit card", "card processing"],
        "hipaa": ["hipaa", "health", "medical", "patient data", "phi", "ehr"],
        "soc2": ["soc2", "soc 2", "b2b", "saas compliance", "enterprise clients"],
        "gdpr": ["gdpr", "europe", "eu", "european", "data privacy"],
        "none": ["none", "no compliance", "not required", "n/a", "not applicable"],
    },
}

# Lettered option resolution per field
# When a field is being asked with options a/b/c/d, this maps index → value
FIELD_OPTION_LETTERS: dict[str, list[str]] = {
    "budget": ["low", "medium", "high"],
    "availability": ["standard", "high", "multi_region"],
    "traffic": ["low", "medium", "high"],
    "realtime_latency": ["yes", "no"],
    "team_size": ["small", "medium", "large"],
    "media_storage": ["low", "medium", "high"],
    "compliance": ["none", "soc2", "hipaa", "pci"],
}

LETTER_MAP = {"a": 0, "b": 1, "c": 2, "d": 3}


class ConversationalExtractor:
    """Resolves free-text answers to structured field values."""

    def resolve(
        self,
        message: str,
        last_asked_field: str | None,
    ) -> dict[str, Any]:
        """
        Try to extract structured values from a free-text message.
        Uses synonym matching and lettered-option detection.
        Returns a dict of {field: value} for any matches found.
        """
        extracted: dict[str, Any] = {}
        msg_lower = message.lower().strip()

        # 1. Letter-option detection (a/b/c/d) — highest priority when context is known
        if last_asked_field and last_asked_field in FIELD_OPTION_LETTERS:
            letter_match = re.match(r"^([a-d])[\.\)\s]?$", msg_lower)
            if letter_match:
                idx = LETTER_MAP[letter_match.group(1)]
                options = FIELD_OPTION_LETTERS[last_asked_field]
                if idx < len(options):
                    extracted[last_asked_field] = options[idx]
                    return extracted

        # 2. Context-first synonym matching — try the asked field first
        if last_asked_field and last_asked_field in FIELD_SYNONYMS:
            val = self._match_synonyms(msg_lower, last_asked_field)
            if val:
                extracted[last_asked_field] = val

        # 3. Broad synonym sweep across all fields (if context match failed)
        if not extracted:
            for field, synonyms in FIELD_SYNONYMS.items():
                val = self._match_synonyms(msg_lower, field)
                if val:
                    extracted[field] = val

        return extracted

    def _match_synonyms(self, msg_lower: str, field: str) -> str | None:
        """Match message against synonym map for a given field."""
        synonyms = FIELD_SYNONYMS.get(field, {})
        best_value = None
        best_match_len = 0
        for value, phrases in synonyms.items():
            for phrase in phrases:
                if phrase in msg_lower and len(phrase) > best_match_len:
                    best_value = value
                    best_match_len = len(phrase)
        return best_value
