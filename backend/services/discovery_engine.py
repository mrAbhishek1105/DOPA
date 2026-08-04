import json
import logging
from typing import Any, Dict, List

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

class DiscoveryEngine:
    """
    AI-driven discovery engine that extracts business understanding from a conversation snapshot.
    """
    
    def __init__(self):
        # Could be injected based on config
        self.ai_provider = GeminiProvider()

    async def process_message(
        self,
        latest_message: str,
        current_state: Dict[str, Any]
    ) -> BusinessUnderstanding:
        """
        Extract structured business understanding from the current project state and latest message.
        """
        logger.info("Extracting business understanding via AI")
        
        # 1. Ask AI for understanding
        understanding = await self.ai_provider.extract_understanding(
            system_prompt=SYSTEM_PROMPT,
            project_state=current_state,
            latest_message=latest_message
        )
        
        # 2. Normalize the AI's output to canonical ontology values
        understanding = Normalizer.normalize(understanding)
        
        return understanding
