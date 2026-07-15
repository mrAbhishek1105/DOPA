from __future__ import annotations

import re
from typing import Any

from backend.schemas.conversation import (
    CompletenessResult,
    ConversationMessage,
    ConversationState,
    DiscoveryResponse,
)
from .knowledge_loader import KnowledgeLoader


# Regex patterns for extracting requirement values from natural language
USER_PATTERN = re.compile(
    r"(\d[\d,]*)\s*((?:million|thousand|k|m))?\s*(?:users?|visitors?|customers?|people|audience)",
    re.IGNORECASE,
)
USER_WORD_PATTERN = re.compile(r"(a|one|two|three|four|five|six|seven|eight|nine|ten)\s+(million|thousand)\s+(?:users?|visitors?|customers?)", re.IGNORECASE)
BUDGET_PATTERNS = {
    "low": re.compile(r"\b(?:low|small|cheap|minimal|tight|limited)\s+(?:budget|cost|spend)", re.IGNORECASE),
    "medium": re.compile(r"\b(?:medium|moderate|average|reasonable)\s+(?:budget|cost|spend)", re.IGNORECASE),
    "high": re.compile(r"\b(?:high|large|big|generous|unlimited|enterprise)\s+(?:budget|cost|spend)", re.IGNORECASE),
}
TRAFFIC_PATTERNS = {
    "low": re.compile(r"\b(?:low|small|light|minimal|occasional)\s+(?:traffic|requests|events|throughput|users)", re.IGNORECASE),
    "medium": re.compile(r"\b(?:medium|moderate|average)\s+(?:traffic|requests|events|throughput|users)", re.IGNORECASE),
    "high": re.compile(r"\b(?:very\s*high|high|heavy|large)\s+(?:traffic|requests|events|throughput|users)", re.IGNORECASE),
}
AVAILABILITY_PATTERNS = {
    "standard": re.compile(r"\b(?:standard|normal|basic|single.?az)\s+(?:availability|uptime)?\b", re.IGNORECASE),
    "high": re.compile(r"\b(?:high|ha|production)\s+(?:availability|uptime)?\b", re.IGNORECASE),
    "multi_region": re.compile(r"\b(?:multi.?region|global|worldwide|disaster.?recovery|dr)\b", re.IGNORECASE),
}
REGION_PATTERN = re.compile(r"\b(us-east-[12]|us-west-[12]|eu-west-[12]|eu-central-1|ap-southeast-[12]|ap-northeast-[12]|sa-east-1|ca-central-1|ap-south-1)\b", re.IGNORECASE)
REGION_ALIASES = {
    "mumbai": "ap-south-1",
    "india": "ap-south-1",
    "singapore": "ap-southeast-1",
    "london": "eu-west-2",
    "frankfurt": "eu-central-1",
    "sydney": "ap-southeast-2",
    "tokyo": "ap-northeast-1",
    "canada": "ca-central-1",
    "ireland": "eu-west-1",
    "ohio": "us-east-2",
    "oregon": "us-west-2",
}
CLOUD_PATTERN = re.compile(r"\b(aws|gcp|azure|google cloud|microsoft azure)\b", re.IGNORECASE)
REALTIME_PATTERNS = {
    "yes": re.compile(r"\b(?:realtime|real.time|sub.second|low.latency)\b", re.IGNORECASE),
}
COMPLIANCE_PATTERNS = {
    "soc2": re.compile(r"\bsoc-?2\b", re.IGNORECASE),
    "hipaa": re.compile(r"\b(?:hipaa|hippa|hippa)\b", re.IGNORECASE),
    "pci": re.compile(r"\bpci(?:\.dss)?\b", re.IGNORECASE),
    "gdpr": re.compile(r"\bgdpr\b", re.IGNORECASE),
    "none": re.compile(r"\b(?:none|no|n/a)\s+(?:compliance|regulations)\b", re.IGNORECASE),
}
STORAGE_PATTERNS = {
    "low": re.compile(r"\b(?:low|small|minimal)\s+(?:storage|media)", re.IGNORECASE),
    "medium": re.compile(r"\b(?:medium|moderate|average)\s+(?:storage|media)", re.IGNORECASE),
    "high": re.compile(r"\b(?:high|large|massive|unlimited)\s+(?:storage|media)", re.IGNORECASE),
}
DATABASE_PATTERNS = {
    "sql": re.compile(r"\b(sql|relational|postgres(?:ql)?|mysql|aurora|rds)\b", re.IGNORECASE),
    "nosql": re.compile(r"\b(nosql|dynamodb|mongodb|document|cassandra|key\.value)\b", re.IGNORECASE),
}
SIZE_PATTERNS = {
    "small": re.compile(r"\b(?:small|tiny|few|startup)\s+(?:team|org)", re.IGNORECASE),
    "medium": re.compile(r"\b(?:medium|moderate|growing|mid.size)\s+(?:team|org)", re.IGNORECASE),
    "large": re.compile(r"\b(?:large|big|enterprise)\s+(?:team|org)", re.IGNORECASE),
}


class DiscoveryEngine:
    """Knowledge-driven discovery engine.

    Converts natural language messages into structured requirements
    by scanning question-flows.json for keywords and regex extraction patterns.
    Pure deterministic — no LLM dependency.
    """

    def __init__(self, knowledge_loader: KnowledgeLoader | None = None) -> None:
        self.loader = knowledge_loader or KnowledgeLoader()
        self._flows: list[dict[str, Any]] = list(self.loader.get("question-flows.json"))

    def process_message(self, message: str, extracted_so_far: dict[str, Any] | None = None) -> DiscoveryResponse:
        """Process a single user message and return the discovery response."""
        extracted = dict(extracted_so_far or {})

        # 0. Determine expected field
        expected_field = None
        app_type = extracted.get("application_type")
        if app_type:
            comp = self._check_completeness(app_type, extracted)
            if comp.missing_fields:
                expected_field = comp.missing_fields[0]

        # 1. Always extract general fields (cloud, users, region, etc.) regardless of app_type
        general_fields = self._extract_general_fields(message, expected_field)
        extracted.update(general_fields)

        # 2. Detect application type (if not already known)
        if "application_type" not in extracted:
            app_type = self._detect_application_type(message)
            if app_type:
                extracted["application_type"] = app_type

        # 3. If we still don't know the application type, ask for it
        if "application_type" not in extracted:
            return DiscoveryResponse(
                extracted=extracted,
                missing_fields=["application_type"],
                completed_fields=[],
                next_question=self._build_application_type_question(extracted),
                is_complete=False,
            )


        # 4. Check completeness against the flow's required questions
        app_type = extracted["application_type"]
        completeness = self._check_completeness(app_type, extracted)

        # 5. Generate next question
        next_question = None
        if not completeness.is_complete and completeness.missing_fields:
            next_field = completeness.missing_fields[0]
            next_question = self._get_question_text(app_type, next_field)
            if not next_question:
                next_question = f"What is your {next_field.replace('_', ' ')}?"

        return DiscoveryResponse(
            extracted=extracted,
            missing_fields=completeness.missing_fields,
            completed_fields=completeness.completed_fields,
            next_question=next_question,
            is_complete=completeness.is_complete,
        )

    # ── Intent Classification ──────────────────────────────

    def _detect_application_type(self, message: str) -> str | None:
        """Scan question-flows.json keywords to find the most likely application type."""
        message_lower = message.lower()
        best_match = None
        best_score = 0
        runner_up = 0

        for flow in self._flows:
            score = self._score_application_type(message_lower, flow)
            if score > best_score:
                runner_up = best_score
                best_score = score
                best_match = flow.get("application_type")
            elif score > runner_up:
                runner_up = score

        if best_score <= 0:
            return None
        if best_score == runner_up:
            return None
        return best_match

    def _score_application_type(self, message_lower: str, flow: dict[str, Any]) -> int:
        """Score a flow by keyword overlap, rewarding more specific multi-word matches."""
        score = 0
        for keyword in flow.get("keywords", []):
            keyword_lower = str(keyword).strip().lower()
            if not keyword_lower:
                continue
            if keyword_lower in message_lower:
                score += 2 if " " in keyword_lower else 1
        return score

    def _build_application_type_question(self, extracted: dict[str, Any]) -> str:
        """Build a contextual question when app type is still unknown."""
        hints: list[str] = []
        if cloud := extracted.get("cloud"):
            hints.append(f"cloud={cloud}")
        if users := extracted.get("users"):
            hints.append(f"users={users}")
        if budget := extracted.get("budget"):
            hints.append(f"budget={budget}")

        app_types = sorted({str(flow.get("application_type")) for flow in self._flows if flow.get("application_type")})
        examples = ", ".join(app_types[:4])
        hint_text = ""
        if hints:
            hint_text = " I already inferred {}.".format(", ".join(hints))
        return f"What kind of application do you want to deploy?{hint_text} For example: {examples}."

    # -- General Field Extraction -------------------------------------------

    def _extract_general_fields(self, message: str, expected_field: str | None = None) -> dict[str, Any]:
        """Extract fields that are always relevant regardless of app type."""
        extracted: dict[str, Any] = {}
        message_lower = message.lower().strip()

        # Context-aware exact matches
        if expected_field == "realtime_latency":
            if message_lower in ("yes", "y", "yeah", "yep", "sure", "true"):
                extracted["realtime_latency"] = "yes"
            elif message_lower in ("no", "n", "nope", "nah", "false"):
                extracted["realtime_latency"] = "no"

        is_exact_size = False
        if expected_field in ("budget", "traffic", "media_storage", "team_size"):
            if message_lower in ("low", "small", "minimal"):
                extracted[expected_field] = "low"
                is_exact_size = True
            elif message_lower in ("medium", "moderate", "average"):
                extracted[expected_field] = "medium"
                is_exact_size = True
            elif message_lower in ("high", "large", "heavy", "very high", "very_high"):
                extracted[expected_field] = "high"
                is_exact_size = True

        # Cloud provider
        cloud_match = CLOUD_PATTERN.search(message_lower)
        if cloud_match:
            val = cloud_match.group(1).lower()
            if val in ("aws",):
                extracted["cloud"] = val
            elif val in ("gcp", "google cloud"):
                extracted["cloud"] = "gcp"
            elif val in ("azure", "microsoft azure"):
                extracted["cloud"] = "azure"

        # User count — match numeric value before user keyword
        user_match = USER_PATTERN.search(message)
        if user_match:
            raw = user_match.group(1).replace(",", "")
            try:
                count = int(raw)
                multiplier = user_match.group(2)
                if multiplier:
                    ml = multiplier.lower()
                    if ml in ("million", "m"):
                        count *= 1000000
                    elif ml in ("thousand", "k"):
                        count *= 1000
                extracted["users"] = count
            except ValueError:
                pass
        else:
            # Try word-number patterns (e.g. "five million users")
            user_word_match = USER_WORD_PATTERN.search(message)
            if user_word_match:
                word_num = user_word_match.group(1).lower()
                multiplier_word = user_word_match.group(2).lower()
                num_map = {"a": 1, "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
                           "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10}
                count = num_map.get(word_num, 0)
                if multiplier_word == "million":
                    count *= 1000000
                elif multiplier_word == "thousand":
                    count *= 1000
                if count > 0:
                    extracted["users"] = count

        if not is_exact_size:
            # Budget
            for value, pattern in BUDGET_PATTERNS.items():
                if pattern.search(message_lower):
                    extracted["budget"] = value
                    break

            # Traffic
            for value, pattern in TRAFFIC_PATTERNS.items():
                if pattern.search(message_lower):
                    extracted["traffic"] = value
                    break

        # Availability
        for value, pattern in AVAILABILITY_PATTERNS.items():
            if pattern.search(message_lower):
                extracted["availability"] = value
                break

        # Region
        region_match = REGION_PATTERN.search(message)
        if region_match:
            extracted["region"] = region_match.group(1).lower()
        else:
            for alias, proper_region in REGION_ALIASES.items():
                if alias in message_lower:
                    extracted["region"] = proper_region
                    break

        # Database
        for value, pattern in DATABASE_PATTERNS.items():
            if pattern.search(message_lower):
                extracted["database"] = value
                break

        # Compliance
        for value, pattern in COMPLIANCE_PATTERNS.items():
            if pattern.search(message_lower):
                extracted["compliance"] = value
                break

        # Realtime Latency
        if "realtime_latency" not in extracted:
            for value, pattern in REALTIME_PATTERNS.items():
                if pattern.search(message_lower):
                    extracted["realtime_latency"] = value
                    break

        if not is_exact_size:
            # Media Storage
            if "media_storage" not in extracted:
                for value, pattern in STORAGE_PATTERNS.items():
                    if pattern.search(message_lower):
                        extracted["media_storage"] = value
                        break

            # Team Size
            if "team_size" not in extracted:
                for value, pattern in SIZE_PATTERNS.items():
                    if pattern.search(message_lower):
                        extracted["team_size"] = value
                        break

        return extracted

    # ── Completeness Checking ──────────────────────────────

    def _check_completeness(self, app_type: str, extracted: dict[str, Any]) -> CompletenessResult:
        """Check which required fields are completed and which are missing."""
        flow = self._get_flow(app_type)
        if not flow:
            return CompletenessResult(
                application_type=app_type,
                completed_fields=[],
                missing_fields=[],
                is_complete=True,
            )

        required_questions = flow.get("required_questions", [])
        required_fields = [q["field"] if isinstance(q, dict) else q for q in required_questions]

        completed: list[str] = []
        missing: list[str] = []

        for field in required_fields:
            if field in extracted and extracted[field] is not None and extracted[field] != "":
                completed.append(field)
            else:
                missing.append(field)

        return CompletenessResult(
            application_type=app_type,
            completed_fields=completed,
            missing_fields=missing,
            is_complete=len(missing) == 0,
        )

    # ── Helpers ────────────────────────────────────────────

    def _get_flow(self, app_type: str) -> dict[str, Any] | None:
        for flow in self._flows:
            if flow.get("application_type") == app_type:
                return flow
        return None

    def _get_question_text(self, app_type: str, field: str) -> str | None:
        flow = self._get_flow(app_type)
        if not flow:
            return None
        for q in flow.get("required_questions", []):
            if isinstance(q, dict) and q.get("field") == field:
                return q.get("question")
        for q in flow.get("fallback_questions", []):
            if isinstance(q, dict) and q.get("field") == field:
                return q.get("question")
        return None
