import asyncio
import logging
from typing import Any, Dict

from backend.schemas.understanding import BusinessUnderstanding
from backend.services.ai.gemini import GeminiProvider
from backend.services.normalizer import Normalizer

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are a Senior Cloud Business Analyst.
Your sole responsibility is to understand the customer's business needs and application requirements.
You must infer reasonable defaults from industry best practices based on the application type.
Do NOT generate infrastructure, Terraform, or questions.
Output only the structured JSON of your understanding.

Core Dimensions to track:
- application_type (e.g. web_app, ecommerce, saas, internal_tool, event_driven, streaming, ai_workload)
- traffic (low, medium, high)
- availability (standard, high, multi_region)
- database (postgresql, mysql, dynamodb, mongodb, sql)
- region (e.g. us-east-1, ap-south-1, eu-west-1)
- budget (low, medium, high)
- realtime_latency (yes, no)
- media_storage (low, medium, high)
- compliance (none, soc2, hipaa, pci)

Extract explicit facts the user stated.
Infer facts based on what they are building (e.g., a portfolio is low traffic).
Provide your confidence (0-100) for each inferred fact.
List uncertainties (fields where you have no clue, e.g. region if not mentioned).
"""


class DiscoveryResult:
    """Compatibility wrapper that works both with await and legacy sync callers."""

    def __init__(self, awaitable):
        self._awaitable = awaitable
        self._resolved: BusinessUnderstanding | None = None

    async def _resolve_async(self) -> BusinessUnderstanding:
        if self._resolved is None:
            self._resolved = await self._awaitable
        return self._resolved

    def _resolve_sync(self) -> BusinessUnderstanding:
        if self._resolved is not None:
            return self._resolved

        try:
            asyncio.get_running_loop()
        except RuntimeError:
            self._resolved = asyncio.run(self._resolve_async())
            return self._resolved

        raise RuntimeError("DiscoveryResult must be awaited inside async code.")

    def __await__(self):
        return self._resolve_async().__await__()

    def __getattr__(self, name: str):
        return getattr(self._resolve_sync(), name)

    @property
    def extracted(self) -> Dict[str, Any]:
        return self._resolve_sync().extracted


class DiscoveryEngine:
    """
    AI-driven discovery engine that extracts business understanding from a conversation snapshot.
    """

    def __init__(self):
        self.ai_provider = GeminiProvider()

    async def _process_message(
        self,
        latest_message: str,
        current_state: Dict[str, Any],
    ) -> BusinessUnderstanding:
        logger.info("Extracting business understanding via AI")

        understanding = await self.ai_provider.extract_understanding(
            system_prompt=SYSTEM_PROMPT,
            project_state=current_state,
            latest_message=latest_message,
        )

        return Normalizer.normalize(understanding)

    def process_message(
        self,
        latest_message: str,
        current_state: Dict[str, Any] | None = None,
    ) -> DiscoveryResult:
        """
        Return a result that can be awaited by async callers or resolved lazily by sync callers.
        """
        return DiscoveryResult(self._process_message(latest_message, current_state or {}))
