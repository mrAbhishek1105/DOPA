import logging
import json
from typing import Any, Dict, List, Tuple

from backend.schemas.understanding import BusinessUnderstanding
from backend.schemas.planner import PlannerState, PlannerResult, ProjectGraphNode
from backend.services.knowledge_loader import KnowledgeLoader

logger = logging.getLogger(__name__)

# Questions and suggested replies mapping
FIELD_QUESTIONS: Dict[str, Dict[str, Any]] = {
    "application_type": {
        "question": "Could you tell me more about what kind of application you are building?",
    },
    "traffic": {
        "question": "What is your expected daily traffic or peak volume?",
        "suggested_replies": ["Low (<1K/day)", "Medium (1K-100K/day)", "High (100K+/day)"]
    },
    "availability": {
        "question": "What availability level do you need?",
        "suggested_replies": ["Standard", "High (99.9%+)", "Multi-region DR"]
    },
    "database": {
        "question": "Do you have a database preference?",
        "suggested_replies": ["PostgreSQL", "MySQL", "DynamoDB", "MongoDB"]
    },
    "region": {
        "question": "Which cloud region do you prefer to deploy in?",
        "example": "e.g. ap-south-1 (Mumbai), us-east-1 (Virginia)"
    },
    "budget": {
        "question": "What is your budget range?",
        "suggested_replies": ["Low (cost-optimized)", "Medium (balanced)", "High (performance-first)"]
    },
    "realtime_latency": {
        "question": "Do you need real-time instant updates or is slight delay acceptable?",
        "suggested_replies": ["Yes — real-time", "No — async/batch"]
    },
    "media_storage": {
        "question": "How much media storage do you expect to need?",
        "suggested_replies": ["Low (no media)", "Medium (images)", "High (video/heavy)"]
    },
    "compliance": {
        "question": "Do you have any specific compliance requirements?",
        "suggested_replies": ["None", "SOC 2", "HIPAA", "PCI-DSS"]
    }
}

# The order in which we should ask questions if missing
PRIORITY_ORDER = [
    "application_type",
    "traffic",
    "region",
    "budget",
    "availability",
    "database",
    "realtime_latency",
    "media_storage",
    "compliance"
]

class ConversationPlanner:
    """
    Deterministic planner that updates the Project Knowledge Graph
    and decides what to ask the user next.
    """
    
    def __init__(self, knowledge_loader: KnowledgeLoader | None = None) -> None:
        self.loader = knowledge_loader or KnowledgeLoader()
        self.ontology = self.loader.get("architecture-ontology.json") or {}

    def plan(
        self,
        understanding: BusinessUnderstanding,
        planner_state: PlannerState | None = None,
    ) -> Tuple[PlannerResult, PlannerState]:
        
        state = planner_state or PlannerState()
        state.turn_count += 1
        
        # 1. Update Graph with Explicit Facts
        for field, value in understanding.explicit_facts.model_dump(exclude_none=True).items():
            if field in self.ontology:
                # User stated this explicitly. Upgrade to verified.
                state.graph[field] = ProjectGraphNode(
                    value=value,
                    confidence=100,
                    source="explicit",
                    verified=True
                )
                
        # 2. Update Graph with Inferred Facts (if not already verified)
        for field, value in understanding.inferred_facts.model_dump(exclude_none=True).items():
            if field in self.ontology:
                existing = state.graph.get(field)
                if not existing or not existing.verified:
                    conf = getattr(understanding.confidence, field, 50)
                    if conf is None:
                        conf = 50
                    state.graph[field] = ProjectGraphNode(
                        value=value,
                        confidence=conf,
                        source="inferred",
                        verified=False
                    )

        # 3. Handle attempt counts
        if state.last_asked_field:
            # Did the AI resolve the field?
            if state.last_asked_field in understanding.explicit_facts or state.last_asked_field in understanding.inferred_facts:
                if state.last_asked_field not in state.asked_fields:
                    state.asked_fields.append(state.last_asked_field)
                state.field_attempt_counts.pop(state.last_asked_field, None)
            else:
                state.field_attempt_counts[state.last_asked_field] = state.field_attempt_counts.get(state.last_asked_field, 0) + 1
        
        # 4. Check for low confidence inferred assumptions that need verification
        field_to_ask = None
        is_verification = False
        verification_value = None
        
        for field, node in state.graph.items():
            if not node.verified and node.confidence < 75:
                # We need to verify this assumption
                field_to_ask = field
                is_verification = True
                verification_value = node.value
                break
                
        # 5. Check for missing required fields if no verification needed
        if not field_to_ask:
            for field in PRIORITY_ORDER:
                if field not in state.graph:
                    field_to_ask = field
                    break
        
        # Calculate overall confidence
        required_count = len(PRIORITY_ORDER)
        present_count = len([f for f in PRIORITY_ORDER if f in state.graph])
        confidence_avg = sum([n.confidence for n in state.graph.values()]) / max(len(state.graph), 1)
        overall_confidence = (present_count / required_count) * 0.7 + (confidence_avg / 100) * 0.3
        overall_confidence = round(min(overall_confidence, 1.0), 3)
        
        # 6. If everything is present and verified/high-confidence, we're done
        if not field_to_ask:
            state.is_complete = True
            state.last_asked_field = None
            return (
                PlannerResult(
                    is_complete=True,
                    confidence=overall_confidence,
                ),
                state
            )
            
        # 7. Generate Question
        question = ""
        suggested_replies = []
        
        if is_verification:
            question = f"I'm assuming your {field_to_ask.replace('_', ' ')} is {verification_value}. Is that correct?"
            suggested_replies = ["Yes", "No"]
        else:
            q_info = FIELD_QUESTIONS.get(field_to_ask, {})
            question = q_info.get("question", f"Could you provide information about your {field_to_ask.replace('_', ' ')}?")
            suggested_replies = q_info.get("suggested_replies", [])
            
            # Wrap in lettered options if attempts >= 2
            attempts = state.field_attempt_counts.get(field_to_ask, 0)
            if attempts >= 2 and suggested_replies:
                lettered = []
                chips = []
                for i, r in enumerate(suggested_replies):
                    char = chr(97 + i)
                    lettered.append(f"{char}) {r}")
                    chips.append(f"{char.upper()}) {r}")
                question += "\n\n" + "\n".join(lettered) + "\n\n(Reply with a letter)"
                suggested_replies = chips
                
        state.last_asked_field = field_to_ask
        
        return (
            PlannerResult(
                next_question=question,
                confidence=overall_confidence,
                is_complete=False,
                field_being_asked=field_to_ask,
                suggested_replies=suggested_replies
            ),
            state
        )
