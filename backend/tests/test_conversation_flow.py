import pytest
from backend.services.discovery_engine import DiscoveryEngine
from backend.services.conversation_planner import ConversationPlanner
from backend.schemas.requirements import RequirementModel
from backend.services.pattern_engine import PatternEngine
from backend.services.recommendation_engine import RecommendationEngine
from backend.services.graph_engine import GraphEngine


def test_ecommerce_prompt_extraction_and_recommendations():
    prompt = (
        "Hi DOPA! I'm building an e-commerce marketplace similar to Amazon. "
        "We expect 100,000 registered users with peak traffic surges of 10,000 requests/sec during sales events. "
        "We want to deploy on AWS in the Mumbai region (ap-south-1). "
        "Our budget is medium ($200-$300/mo). We prefer PostgreSQL for relational data and Redis for fast product page caching. "
        "Downtime during sales is unacceptable so we need high availability with zero single points of failure."
    )

    engine = DiscoveryEngine()
    res = engine.process_message(prompt)

    extracted = res.extracted
    print("\nEXTRACTED FIELDS:", extracted)

    assert extracted.get("application_type") == "ecommerce"
    assert extracted.get("cloud") == "aws"
    assert extracted.get("region") == "ap-south-1"
    assert extracted.get("budget") == "medium"
    assert extracted.get("users") == 100000
    assert extracted.get("database") in ("postgresql", "sql")
    assert extracted.get("availability") == "high"
    assert extracted.get("traffic") == "high"
    assert extracted.get("cache") == "redis"
    assert "Cache (Redis)" in extracted.get("capabilities", [])

    # Test requirement model instantiation
    clean_extracted = {k: v for k, v in extracted.items() if not k.startswith("__")}
    req_model = RequirementModel(**clean_extracted)

    # Test pattern engine
    pattern_engine = PatternEngine()
    pattern_result = pattern_engine.match(req_model)
    assert pattern_result.pattern_id == "medium_saas" or "ecommerce" in pattern_result.pattern_id or pattern_result.confidence > 0.5

    # Test recommendation engine
    rec_engine = RecommendationEngine()
    recommendations = rec_engine.generate(pattern_result)
    assert len(recommendations.options) > 0

    # Test graph engine
    selected_option = recommendations.options[0]
    graph_engine = GraphEngine()
    graph = graph_engine.build(selected_option)
    assert len(graph.nodes) > 0
    assert len(graph.edges) > 0

    print(f"Generated {len(recommendations.options)} options and {len(graph.nodes)} graph nodes successfully!")
