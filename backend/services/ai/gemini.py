import json
import logging
from typing import Any, Dict
import os
import asyncio
import re

from google import genai
from pydantic import ValidationError

from backend.schemas.understanding import BusinessUnderstanding
from .provider import AIProvider

logger = logging.getLogger(__name__)


class GeminiProvider(AIProvider):
    """
    Google Gemini implementation of the AIProvider.
    Uses google-genai SDK for structured outputs.
    """

    def __init__(self):
        # We assume GEMINI_API_KEY is in the environment
        self.api_key = os.getenv("GEMINI_API_KEY")
        if self.api_key:
            self.client = genai.Client(api_key=self.api_key)
        else:
            self.client = None
            logger.warning("GEMINI_API_KEY not found in environment. AI requests will fail.")

        # Fallback to flash if not specified
        self.model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

    async def extract_understanding(
        self,
        system_prompt: str,
        project_state: Dict[str, Any],
        latest_message: str,
    ) -> BusinessUnderstanding:

        if not self.client:
            logger.error("No API key provided. Returning mock response for local testing.")
            return self._build_local_understanding(project_state, latest_message)

        # Build the payload
        prompt = f"""
{system_prompt}

CURRENT PROJECT STATE:
{json.dumps(project_state, indent=2)}

LATEST USER MESSAGE:
{latest_message}
"""

        max_retries = 3
        for attempt in range(max_retries):
            try:
                response = await self.client.aio.models.generate_content(
                    model=self.model,
                    contents=prompt,
                    config=genai.types.GenerateContentConfig(
                        response_mime_type="application/json",
                        response_schema=BusinessUnderstanding,
                        temperature=0.1,
                    )
                )

                return BusinessUnderstanding.model_validate_json(response.text)

            except ValidationError as e:
                logger.warning(f"Validation error on attempt {attempt + 1}: {e}")
                if attempt == max_retries - 1:
                    logger.error("Max retries reached for Gemini extract_understanding")
                    raise
            except Exception as e:
                logger.error(f"Error calling Gemini API: {e}")
                if attempt == max_retries - 1:
                    raise
                await asyncio.sleep(2 ** attempt)  # Exponential backoff

        raise Exception("Failed to extract business understanding")

    def _build_local_understanding(self, project_state: Dict[str, Any], latest_message: str) -> BusinessUnderstanding:
        text = f"{json.dumps(project_state)} {latest_message}".lower()
        explicit_facts: Dict[str, Any] = {}
        inferred_facts: Dict[str, InferredFact] = {}
        confidence: Dict[str, int] = {}
        uncertainties: list[str] = []
        reasoning: list[str] = []

        if any(keyword in text for keyword in ["portfolio", "showcase", "personal site", "personal website"]):
            explicit_facts["application_type"] = "web_app"
            inferred_facts["traffic"] = InferredFact(value="tiny", confidence=72)
            confidence["application_type"] = 85
            confidence["traffic"] = 72
            reasoning.append("Portfolio-style applications usually have low traffic and simple web delivery.")

        if re.search(r"\b(ecommerce|e-commerce|store|shopping|marketplace|retail)\b", text):
            explicit_facts["application_type"] = "ecommerce"
            confidence["application_type"] = 95
            reasoning.append("Keywords indicate an ecommerce workload.")

        if re.search(r"\b(saas|subscription|multi-tenant|multi tenant|b2b)\b", text):
            explicit_facts["application_type"] = "saas"
            confidence["application_type"] = 92
            reasoning.append("Keywords indicate a SaaS workload.")

        if re.search(r"\b(postgresql|postgres|mysql|dynamodb|mongodb)\b", text):
            if "postgres" in text:
                explicit_facts["database"] = "postgresql"
            elif "mysql" in text:
                explicit_facts["database"] = "mysql"
            elif "dynamodb" in text:
                explicit_facts["database"] = "dynamodb"
            elif "mongodb" in text:
                explicit_facts["database"] = "mongodb"
            confidence["database"] = 95
            reasoning.append("A database preference was stated directly.")

        region_match = re.search(r"(us-east-[12]|us-west-[12]|eu-west-[12]|eu-central-1|ap-southeast-[12]|ap-northeast-[12]|sa-east-1|ca-central-1|ap-south-1)", text)
        if region_match:
            explicit_facts["region"] = region_match.group(1)
            confidence["region"] = 98
            reasoning.append("A deployment region was explicitly mentioned.")

        if re.search(r"\b(5 million|millions|100k|100,000|high traffic|scale|large)\b", text):
            explicit_facts["traffic"] = "high"
            confidence["traffic"] = 95
            reasoning.append("The user described a high-scale workload.")
        elif re.search(r"\b(low traffic|small app|few users|portfolio|showcase|tiny)\b", text):
            inferred_facts["traffic"] = InferredFact(value="tiny", confidence=72)
            confidence.setdefault("traffic", 72)
            reasoning.append("The workload sounds small, so low traffic is a safe assumption.")

        if re.search(r"\b(low budget|cheap|cost-optimized|frugal|tight budget)\b", text):
            explicit_facts["budget"] = "low"
            confidence["budget"] = 90
        elif re.search(r"\b(medium budget|balanced budget|moderate budget)\b", text):
            explicit_facts["budget"] = "medium"
            confidence["budget"] = 90
        elif re.search(r"\b(high budget|enterprise budget|performance-first)\b", text):
            explicit_facts["budget"] = "high"
            confidence["budget"] = 90

        if re.search(r"\b(need high availability|zero downtime|always on|mission critical|critical uptime)\b", text):
            explicit_facts["availability"] = "high"
            confidence["availability"] = 92
        elif re.search(r"\b(disaster recovery|multi-region|multi region|global)\b", text):
            explicit_facts["availability"] = "multi_region"
            confidence["availability"] = 92
        elif re.search(r"\b(standard availability|basic availability)\b", text):
            explicit_facts["availability"] = "standard"
            confidence["availability"] = 90

        if re.search(r"\b(real-time|realtime|instant|live|websocket|chat|streaming)\b", text):
            explicit_facts["realtime_latency"] = "yes"
            confidence["realtime_latency"] = 90
        elif re.search(r"\b(async|batch|delayed|background|queued)\b", text):
            explicit_facts["realtime_latency"] = "no"
            confidence["realtime_latency"] = 90

        if re.search(r"\b(video|videos|images|media|uploads|files)\b", text):
            if re.search(r"\b(video|videos)\b", text):
                explicit_facts["media_storage"] = "high"
            elif re.search(r"\b(images|media|uploads|files)\b", text):
                explicit_facts["media_storage"] = "medium"
            confidence["media_storage"] = 85

        if re.search(r"\b(hipaa|health|medical)\b", text):
            explicit_facts["compliance"] = "hipaa"
            confidence["compliance"] = 95
        elif re.search(r"\b(pci|payment|credit card)\b", text):
            explicit_facts["compliance"] = "pci"
            confidence["compliance"] = 95
        elif re.search(r"\b(soc2|soc 2)\b", text):
            explicit_facts["compliance"] = "soc2"
            confidence["compliance"] = 95
        elif re.search(r"\b(no compliance|none|n/a|not required)\b", text):
            explicit_facts["compliance"] = "none"
            confidence["compliance"] = 90

        if not explicit_facts.get("application_type"):
            uncertainties.append("application_type")
        if not explicit_facts.get("traffic") and "traffic" not in inferred_facts:
            uncertainties.append("traffic")
        if not explicit_facts.get("region"):
            uncertainties.append("region")
        if not explicit_facts.get("budget"):
            uncertainties.append("budget")
        if not explicit_facts.get("availability"):
            uncertainties.append("availability")
        if not explicit_facts.get("database"):
            uncertainties.append("database")

        if not reasoning:
            reasoning.append("Used local deterministic heuristics because GEMINI_API_KEY is not configured.")

        return BusinessUnderstanding(
            explicit_facts=explicit_facts,
            inferred_facts=inferred_facts,
            confidence=confidence,
            uncertainties=sorted(set(uncertainties)),
            reasoning=" ".join(reasoning),
        )
