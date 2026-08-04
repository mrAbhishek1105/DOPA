import logging
from typing import Any

logger = logging.getLogger(__name__)

FIELD_LABELS: dict[str, str] = {
    "application_type": "Application type",
    "cloud": "Cloud provider",
    "region": "Deployment region",
    "traffic": "Traffic pattern",
    "budget": "Budget range",
    "database": "Database preference",
    "availability": "Availability target",
    "compliance": "Compliance requirements",
    "realtime_latency": "Real-time latency needs",
    "media_storage": "Media storage needs",
}

class ResponseBuilder:
    """Builds human-like DevOps engineer responses from planner decisions."""

    def build_simple(
        self,
        extracted: dict[str, Any],
        next_question: str | None,
        is_complete: bool
    ) -> dict[str, Any]:
        
        if is_complete:
            return self._build_complete(extracted)
            
        if not extracted:
            return self._build_greeting(next_question)
            
        return self._build_discovery(extracted, next_question)
        
    def _build_greeting(self, question: str | None) -> dict[str, Any]:
        message = (
            "I'd love to help design your infrastructure. "
            "First, could you tell me what kind of application you're building?\n\n"
            f"{question}"
        )
        return {
            "message": message,
            "notebook": self._build_notebook({}),
            "response_type": "question"
        }
        
    def _build_discovery(self, extracted: dict[str, Any], question: str | None) -> dict[str, Any]:
        # We can just ask the question directly, or acknowledge something.
        message = f"{question}"
        return {
            "message": message,
            "notebook": self._build_notebook(extracted),
            "response_type": "question"
        }
        
    def _build_complete(self, extracted: dict[str, Any]) -> dict[str, Any]:
        lines = []
        for k, v in extracted.items():
            label = FIELD_LABELS.get(k, k.replace("_", " ").title())
            lines.append(f"  ✓ **{label}**: {str(v).title()}")
            
        detail = "\n".join(lines)
        message = (
            f"**All requirements gathered!** Here's a complete summary:\n\n"
            f"{detail}\n\n"
            "Everything looks good. I'll now generate the architecture recommendations."
        )
        return {
            "message": message,
            "notebook": self._build_notebook(extracted, True),
            "response_type": "complete"
        }
        
    def _build_notebook(self, extracted: dict[str, Any], complete: bool = False) -> dict[str, Any]:
        detected = {}
        for k, v in extracted.items():
            detected[k] = {
                "label": FIELD_LABELS.get(k, k.replace("_", " ").title()),
                "value": str(v).title(),
                "confidence": 100
            }
            
        return {
            "detected": detected,
            "remaining": [],
            "assumptions": [],
            "confidence": 100 if complete else 50,
            "stage": "complete" if complete else "requirements_discovery",
            "is_complete": complete
        }