import json
import logging
from typing import Any, Dict
import os
import asyncio

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
        latest_message: str
    ) -> BusinessUnderstanding:
        
        if not self.client:
            logger.error("No API key provided. Returning mock response for local testing.")
            return BusinessUnderstanding(
                explicit_facts={},
                inferred_facts={},
                uncertainties=["API Key Missing"],
                reasoning="Mock response because GEMINI_API_KEY is not set."
            )
            
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
                # Use asyncio.to_thread since the google-genai client might not be natively async
                # or use generate_content if it supports it
                # Actually, according to google-genai docs, we can use client.aio.models.generate_content
                response = await self.client.aio.models.generate_content(
                    model=self.model,
                    contents=prompt,
                    config=genai.types.GenerateContentConfig(
                        response_mime_type="application/json",
                        response_schema=BusinessUnderstanding,
                        temperature=0.1,
                    )
                )
                
                # The response.text should be a JSON string that matches BusinessUnderstanding
                # The SDK might return it as text or parsed. We'll parse it just in case.
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
