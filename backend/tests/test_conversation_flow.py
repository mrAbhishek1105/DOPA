import pytest

from backend.schemas.understanding import BusinessUnderstanding, Facts, ConfidenceScores
from backend.schemas.planner import PlannerState, ProjectGraphNode
from backend.services.conversation_planner import ConversationPlanner
from backend.services.discovery_engine import DiscoveryEngine


class FakeAIProvider:
    def __init__(self) -> None:
        self.calls: list[dict[str, object]] = []

    async def extract_understanding(self, system_prompt: str, project_state: dict[str, object], latest_message: str) -> BusinessUnderstanding:
        self.calls.append(
            {
                "system_prompt": system_prompt,
                "project_state": project_state,
                "latest_message": latest_message,
            }
        )
        return BusinessUnderstanding(
            explicit_facts=Facts(application_type="portfolio"),
            inferred_facts=Facts(traffic="tiny"),
            uncertainties=["region"],
            confidence=ConfidenceScores(traffic=61),
            reasoning="A portfolio site usually has low traffic.",
        )


def test_discovery_engine_uses_state_snapshot_and_normalizes_output():
    engine = DiscoveryEngine()
    fake_ai = FakeAIProvider()
    engine.ai_provider = fake_ai

    result = engine.process_message(
        "I am building a portfolio",
        {"application_type": "web_app", "traffic": "medium", "draft": True},
    )

    extracted = result.extracted

    assert extracted["application_type"] == "web_app"
    assert extracted["traffic"] == "low"
    assert fake_ai.calls[0]["project_state"] == {"application_type": "web_app", "traffic": "medium", "draft": True}
    assert fake_ai.calls[0]["latest_message"] == "I am building a portfolio"


def test_planner_upgrades_confirmed_inferred_fact_to_verified():
    planner = ConversationPlanner()
    state = PlannerState(
        graph={
            "traffic": ProjectGraphNode(value="low", confidence=61, source="inferred", verified=False)
        }
    )

    understanding = BusinessUnderstanding(
        explicit_facts={"traffic": "high"},
        confidence={"traffic": 100},
        reasoning="The user explicitly expects millions of users.",
    )

    _, updated_state = planner.plan(understanding, state)

    assert updated_state.graph["traffic"].value == "high"
    assert updated_state.graph["traffic"].verified is True
    assert updated_state.graph["traffic"].source == "explicit"
