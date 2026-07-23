"""Comprehensive tests for Sprint 3: Architecture Synthesis Engine.

Each test scenario verifies:
1. Correct pattern selection
2. Correct logical component generation
3. Correct cloud service mapping
4. Sensible architecture scores
5. Multiple architecture options where applicable
"""

import pytest
from backend.engines.synthesis.engine import SynthesisEngine
from backend.engines.synthesis.constraint_engine import ConstraintEngine
from backend.engines.synthesis.component_planner import ComponentPlanner
from backend.engines.synthesis.pattern_selector import PatternSelector
from backend.engines.synthesis.architecture_builder import ArchitectureBuilder
from backend.engines.synthesis.service_selector import ServiceSelector
from backend.engines.synthesis.scorer import ArchitectureScorer
from backend.engines.synthesis.option_generator import OptionGenerator


# ─── Fixtures ───────────────────────────────────────────

@pytest.fixture
def engine() -> SynthesisEngine:
    return SynthesisEngine()


@pytest.fixture
def constraint_engine() -> ConstraintEngine:
    return ConstraintEngine()


@pytest.fixture
def component_planner() -> ComponentPlanner:
    return ComponentPlanner()


@pytest.fixture
def pattern_selector() -> PatternSelector:
    return PatternSelector()


@pytest.fixture
def architecture_builder() -> ArchitectureBuilder:
    return ArchitectureBuilder()


@pytest.fixture
def service_selector() -> ServiceSelector:
    return ServiceSelector()


@pytest.fixture
def scorer() -> ArchitectureScorer:
    return ArchitectureScorer()


@pytest.fixture
def option_generator() -> OptionGenerator:
    return OptionGenerator()


# ─── Test Scenarios ─────────────────────────────────────

SCENARIOS = [
    {
        "name": "E-commerce",
        "requirements": {
            "application_type": "ecommerce",
            "traffic": "high",
            "budget": "high",
            "availability": "high",
            "database": "postgresql",
            "compliance": "standard",
        },
        "capabilities": ["load_balancer", "cdn", "cache", "managed_database", "object_storage", "search"],
        "expected_pattern": "three_tier",
        "expected_components": {"cdn", "load_balancer", "application", "database", "cache", "storage", "monitoring", "search"},
    },
    {
        "name": "SaaS CRM",
        "requirements": {
            "application_type": "saas",
            "traffic": "medium",
            "budget": "medium",
            "availability": "high",
            "database": "postgresql",
            "compliance": "hipaa",
        },
        "capabilities": ["load_balancer", "managed_database", "cache", "auth", "message_queue"],
        "expected_pattern": "three_tier",
        "expected_components": {"cdn", "load_balancer", "application", "database", "cache", "storage", "monitoring", "queue", "auth"},
    },
    {
        "name": "REST API",
        "requirements": {
            "application_type": "api",
            "traffic": "medium",
            "budget": "low",
            "availability": "medium",
            "database": "postgresql",
        },
        "capabilities": ["api_gateway", "managed_database", "cache", "logging", "serverless"],
        # Low budget pushes to serverless pattern; API-centric also matches but serverless is preferred for cost
        "expected_pattern": "serverless",
        "expected_components": {"api_gateway", "functions", "database", "cache", "monitoring", "logging"},
    },
    {
        "name": "Chat App",
        "requirements": {
            "application_type": "chat",
            "traffic": "high",
            "budget": "medium",
            "availability": "high",
            "realtime_latency": "true",
            "database": "postgresql",
        },
        "capabilities": ["event_stream", "cache", "managed_database", "websocket"],
        "expected_pattern": "event_driven",
        "expected_components": {"event_bus", "stream_processor", "compute", "database", "cache", "monitoring"},
    },
    {
        "name": "Video Streaming",
        "requirements": {
            "application_type": "streaming",
            "traffic": "high",
            "budget": "high",
            "availability": "high",
            "storage": "high",
            "compliance": "standard",
        },
        "capabilities": ["cdn", "media_transcoding", "object_storage", "managed_database"],
        "expected_pattern": "media_pipeline",
        "expected_components": {"cdn", "ingestion", "transcoder", "storage", "database", "monitoring"},
    },
    {
        "name": "Analytics Platform",
        "requirements": {
            "application_type": "analytics",
            "traffic": "medium",
            "budget": "high",
            "availability": "medium",
            "database": "bigquery",
            "compliance": "standard",
        },
        "capabilities": ["data_analytics", "data_lake", "batch_processing", "data_ingestion"],
        "expected_pattern": "data_lake",
        "expected_components": {"data_ingestion", "data_storage", "data_processing", "data_catalog", "analytics", "monitoring"},
    },
    {
        "name": "IoT Platform",
        "requirements": {
            "application_type": "iot",
            "traffic": "high",
            "budget": "medium",
            "availability": "high",
            "realtime_latency": "true",
        },
        "capabilities": ["event_stream", "stream_processing", "managed_database", "cache"],
        "expected_pattern": "event_driven",
        "expected_components": {"event_bus", "stream_processor", "database", "compute", "monitoring"},
    },
    {
        "name": "Static Website",
        "requirements": {
            "application_type": "static",
            "traffic": "low",
            "budget": "low",
            "availability": "low",
        },
        "capabilities": ["cdn", "object_storage"],
        "expected_pattern": "static_hosting",
        "expected_components": {"cdn", "static_storage", "monitoring"},
    },
]


# ─── Module-Level Tests ─────────────────────────────────

class TestConstraintEngine:
    def test_low_budget_blocks_expensive_services(self, constraint_engine: ConstraintEngine):
        result = constraint_engine.evaluate({"budget": "low"})
        assert "aurora_postgresql" in result.blocked_services
        assert "static_hosting" in result.allowed_patterns or "serverless" in result.allowed_patterns
        assert len(result.warnings) > 0

    def test_high_availability_allows_premium(self, constraint_engine: ConstraintEngine):
        result = constraint_engine.evaluate({"availability": "high"})
        assert "elasticache_redis" in result.allowed_services or "redis_cache" in result.allowed_services

    def test_high_traffic_gives_warnings(self, constraint_engine: ConstraintEngine):
        result = constraint_engine.evaluate({"traffic": "high"})
        assert len(result.warnings) > 0

    def test_compliance_adds_warnings(self, constraint_engine: ConstraintEngine):
        result = constraint_engine.evaluate({"compliance": "pci"})
        pci_warnings = [w for w in result.warnings if "PCI" in w]
        assert len(pci_warnings) > 0


class TestComponentPlanner:
    def test_ecommerce_components(self, component_planner: ComponentPlanner):
        components = component_planner.plan(
            ["load_balancer", "cdn", "cache", "managed_database", "object_storage", "search"],
            "ecommerce",
        )
        ids = {c.id for c in components}
        assert "cdn" in ids
        assert "load_balancer" in ids
        assert "database" in ids
        assert "cache" in ids
        assert "search" in ids

    def test_api_components(self, component_planner: ComponentPlanner):
        components = component_planner.plan(
            ["api_gateway", "managed_database", "cache", "logging"],
            "api",
        )
        ids = {c.id for c in components}
        assert "api_gateway" in ids
        assert "compute" in ids
        assert "database" in ids

    def test_chat_includes_event_bus(self, component_planner: ComponentPlanner):
        components = component_planner.plan(
            ["event_stream", "cache", "managed_database", "websocket"],
            "chat",
        )
        ids = {c.id for c in components}
        assert "event_bus" in ids
        assert "websocket_gateway" in ids

    def test_static_minimal_components(self, component_planner: ComponentPlanner):
        components = component_planner.plan(["cdn", "object_storage"], "static")
        ids = {c.id for c in components}
        assert "cdn" in ids
        assert "static_storage" in ids
        assert "monitoring" in ids


class TestPatternSelector:
    def test_ecommerce_selects_three_tier(self, pattern_selector: PatternSelector):
        pattern, confidence = pattern_selector.select("ecommerce", ["cdn", "load_balancer"])
        assert pattern.id == "three_tier"
        assert confidence > 0.5

    def test_api_selects_api_centric(self, pattern_selector: PatternSelector):
        pattern, confidence = pattern_selector.select("api", ["api_gateway"])
        assert pattern.id == "api_centric"
        assert confidence > 0.5

    def test_chat_selects_event_driven(self, pattern_selector: PatternSelector):
        pattern, confidence = pattern_selector.select("chat", ["event_bus"])
        assert pattern.id == "event_driven"
        assert confidence > 0.5

    def test_static_selects_static_hosting(self, pattern_selector: PatternSelector):
        pattern, confidence = pattern_selector.select("static", ["cdn", "static_storage"])
        assert pattern.id == "static_hosting"
        assert confidence > 0.5

    def test_streaming_selects_media_pipeline(self, pattern_selector: PatternSelector):
        pattern, confidence = pattern_selector.select("streaming", ["cdn", "transcoder"])
        assert pattern.id == "media_pipeline"
        assert confidence > 0.5

    def test_analytics_selects_data_lake(self, pattern_selector: PatternSelector):
        pattern, confidence = pattern_selector.select("analytics", ["data_ingestion", "data_storage"])
        assert pattern.id == "data_lake"
        assert confidence > 0.5

    def test_blocked_patterns_are_excluded(self, pattern_selector: PatternSelector):
        pattern, confidence = pattern_selector.select(
            "chat", ["event_bus"],
            constraint_blocked=["event_driven"],
        )
        # Should fall back to three_tier when event_driven is blocked
        assert pattern.id == "three_tier"


class TestArchitectureBuilder:
    def test_build_creates_layers(self, architecture_builder: ArchitectureBuilder, component_planner: ComponentPlanner):
        components = component_planner.plan(["cdn", "load_balancer", "managed_database", "cache"], "ecommerce")
        arch = architecture_builder.build(components)
        assert len(arch.layers) > 0
        assert len(arch.connections) > 0

    def test_connections_flow_through_layers(self, architecture_builder: ArchitectureBuilder, component_planner: ComponentPlanner):
        components = component_planner.plan(["cdn", "load_balancer", "managed_database"], "ecommerce")
        arch = architecture_builder.build(components)
        # CDN should connect to load_balancer, load_balancer to application, etc.
        assert len(arch.connections) >= 2


class TestServiceSelector:
    def test_maps_to_aws(self, service_selector: ServiceSelector):
        mappings = service_selector.map_components(["cdn", "load_balancer", "database"], "aws")
        ids = {m.cloud_service_id for m in mappings}
        assert "cloudfront" in ids
        assert "alb" in ids
        assert "aurora_postgresql" in ids

    def test_maps_to_azure(self, service_selector: ServiceSelector):
        mappings = service_selector.map_components(["cdn", "load_balancer", "database"], "azure")
        ids = {m.cloud_service_id for m in mappings}
        assert "front_door" in ids
        assert "application_gateway" in ids

    def test_maps_to_gcp(self, service_selector: ServiceSelector):
        mappings = service_selector.map_components(["cdn", "load_balancer", "database"], "gcp")
        ids = {m.cloud_service_id for m in mappings}
        assert "cloud_cdn" in ids
        assert "cloud_load_balancer" in ids

    def test_fallback_to_aws(self, service_selector: ServiceSelector):
        mappings = service_selector.map_components(["cdn"], "unknown_provider")
        assert len(mappings) > 0


class TestScorer:
    def test_scores_are_reasonable(self, scorer: ArchitectureScorer, service_selector: ServiceSelector):
        services = service_selector.map_components(
            ["cdn", "load_balancer", "application", "database", "cache", "monitoring"],
            "aws",
        )
        score = scorer.score(services, {"budget": "medium", "availability": "high"})
        assert 0 < score.overall <= 100
        assert 0 < score.availability <= 100
        assert 0 < score.cost <= 100
        assert score.overall > 60  # Should be decent for this setup

    def test_cost_optimization_lowers_cost_score(self, scorer: ArchitectureScorer, service_selector: ServiceSelector):
        services = service_selector.map_components(["database"], "aws")
        score_low = scorer.score(services, {"budget": "low"})
        score_high = scorer.score(services, {"budget": "high"})
        assert score_low.cost >= score_high.cost

    def test_monitoring_boosts_operations_score(self, scorer: ArchitectureScorer, service_selector: ServiceSelector):
        services_with_monitoring = service_selector.map_components(
            ["monitoring", "database"], "aws"
        )
        services_without = service_selector.map_components(["database"], "aws")
        score_with = scorer.score(services_with_monitoring)
        score_without = scorer.score(services_without)
        assert score_with.operations >= score_without.operations


class TestOptionGenerator:
    def test_three_options_generated(self, option_generator: OptionGenerator, component_planner: ComponentPlanner, service_selector: ServiceSelector, scorer: ArchitectureScorer):
        components = component_planner.plan(["cdn", "load_balancer", "managed_database"], "ecommerce")
        services = service_selector.map_components([c.id for c in components], "aws")
        base_score = scorer.score(services, {"budget": "medium"})
        options = option_generator.generate("three_tier", "Three Tier", components, services, base_score)
        assert len(options) == 3
        ids = {o.id for o in options}
        assert "standard" in ids
        assert "cost_optimized" in ids
        assert "enterprise" in ids

    def test_options_have_different_scores(self, option_generator: OptionGenerator, component_planner: ComponentPlanner, service_selector: ServiceSelector, scorer: ArchitectureScorer):
        components = component_planner.plan(["cdn", "load_balancer", "managed_database", "cache"], "ecommerce")
        services = service_selector.map_components([c.id for c in components], "aws")
        base_score = scorer.score(services)
        options = option_generator.generate("three_tier", "Three Tier", components, services, base_score)
        scores = [o.score.overall for o in options if o.score]
        # Scores should differ between options
        assert len(set(scores)) > 1


# ─── End-to-End Tests ──────────────────────────────────

class TestEndToEnd:
    @pytest.mark.parametrize("scenario", SCENARIOS, ids=[s["name"] for s in SCENARIOS])
    def test_full_pipeline(self, engine: SynthesisEngine, scenario: dict):
        """Run the full synthesis pipeline for each scenario and verify all outputs."""
        options = engine.generate(scenario["requirements"], scenario["capabilities"])

        # 1. Three architecture options are generated
        assert len(options) == 3, f"{scenario['name']}: Expected 3 options, got {len(options)}"

        # 2. Correct pattern is selected
        # At least one option should match the expected pattern
        patterns = {o.pattern for o in options}
        assert scenario["expected_pattern"] in patterns, (
            f"{scenario['name']}: Expected pattern '{scenario['expected_pattern']}' not in {patterns}"
        )

        # 3. The first option (highest scored) uses the expected pattern
        primary_pattern = options[0].pattern
        assert primary_pattern == scenario["expected_pattern"], (
            f"{scenario['name']}: Best option uses '{primary_pattern}' but expected '{scenario['expected_pattern']}'"
        )

        # 4. Correct logical components are generated
        all_component_ids = set()
        for opt in options:
            for c in opt.components:
                all_component_ids.add(c.id)

        for expected_comp in scenario["expected_components"]:
            assert expected_comp in all_component_ids, (
                f"{scenario['name']}: Missing expected component '{expected_comp}'"
            )

        # 5. Cloud services are mapped
        for opt in options:
            assert len(opt.services) > 0, f"{scenario['name']}: Option '{opt.id}' has no services"
            for svc in opt.services:
                assert svc.cloud_provider == "aws"
                assert svc.cloud_service_id
                assert svc.cloud_service_name

        # 6. Scores are sensible
        for opt in options:
            assert opt.score is not None, f"{scenario['name']}: Option '{opt.id}' has no score"
            assert 0 <= opt.score.overall <= 100
            assert 0 <= opt.score.availability <= 100
            assert 0 <= opt.score.cost <= 100
            assert 0 <= opt.score.security <= 100
            assert 0 <= opt.score.operations <= 100
            assert 0 <= opt.score.performance <= 100

        # 7. Options have different scores
        scores = [o.score.overall for o in options]
        assert len(set(scores)) > 1, f"{scenario['name']}: All options have same overall score {scores[0]}"

    def test_pipeline_with_all_cloud_providers(self, engine: SynthesisEngine):
        """Verify the pipeline works with all three major cloud providers."""
        reqs = {"application_type": "ecommerce", "budget": "medium", "availability": "high"}
        caps = ["load_balancer", "cdn", "managed_database"]

        for provider in ["aws", "azure", "gcp"]:
            options = engine.generate(reqs, caps, cloud_provider=provider)
            assert len(options) == 3
            for opt in options:
                for svc in opt.services:
                    assert svc.cloud_provider == provider