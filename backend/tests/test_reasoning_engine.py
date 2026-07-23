from backend.engines.reasoning.engine import ReasoningEngine


def test_reasoning_engine_generates_capabilities_and_conflicts():
    engine = ReasoningEngine()
    result = engine.generate(
        {
            "application_type": "ecommerce",
            "traffic": "high",
            "availability": "high",
            "budget": "medium",
            "database": "postgresql",
        }
    )

    assert result.requirements["application_type"] == "ecommerce"
    assert result.architecture_intent["style"] == "web_application"
    assert result.architecture_intent["deployment"] == "distributed"
    assert result.architectural_characteristics["availability"] == "high"
    assert result.architectural_characteristics["scalability"] == "horizontal"
    assert result.confidence >= 0.5
    assert "horizontal_scaling" in result.capabilities
    assert "cache" in result.capabilities
    assert "load_balancer" in result.capabilities
    assert "managed_database" in result.capabilities
    assert "monitoring" in result.capabilities
    assert len(result.decisions) >= 1
    assert len(result.assumptions) >= 1
