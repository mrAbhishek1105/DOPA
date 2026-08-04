from typing import Any, Dict
from abc import ABC, abstractmethod
from backend.schemas.understanding import BusinessUnderstanding

class AIProvider(ABC):
    """
    Abstract base class for AI Providers.
    All providers must implement business understanding extraction.
    """
    
    @abstractmethod
    async def extract_understanding(
        self, 
        system_prompt: str, 
        project_state: Dict[str, Any], 
        latest_message: str
    ) -> BusinessUnderstanding:
        """
        Extract business understanding from the current state and message.
        """
        pass
