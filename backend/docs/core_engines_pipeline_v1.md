# Core Engines Implementation Pipeline v1

This document rewrites the proposed core-engine plan so it matches DOPA's architecture, test strategy, and Sprint 1 boundaries.

## Goal
Build the pure Python core engines that transform structured requirements into architecture patterns, recommendations, and deterministic architecture graphs.

The Sprint 1 pipeline is:

```text
Requirement Engine -> Pattern Engine -> Recommendation Engine -> Graph Engine
```

The Requirement Engine stays in V1. The pipeline may be triggered in tests with a directly instantiated `RequirementModel`, but the production architecture still needs a real Requirement Engine for chat extraction and normalization.

## Design Principles
- Keep engines deterministic.
- Keep schemas strict and explicit.
- Keep runtime behavior separate from evaluation helpers.
- Use knowledge files as the source of domain rules.
- Use templates for graph construction, not ad hoc logic.
- Keep evaluation fixtures in pytest, not only in standalone scripts.

## Proposed Backend Schemas
Use Pydantic V2 models under `backend/schemas/`.

### `requirements.py`
Defines the structured input to the core pipeline.

Recommended model shape:
- `application_type: str`
- `cloud: str`
- `traffic: str | int`
- `availability: str`
- `region: str | None`
- `budget: str | None`
- `database: str | None`
- `compliance: str | None`
- `users: int | None`
- `team_size: str | None`

Why this matters:
- Four fields are not enough to distinguish real architecture choices.
- The pattern engine needs enough context to choose between web app, internal tool, and large-scale real-time patterns.

### `patterns.py`
Defines pattern matching output.

Recommended model shape:
- `pattern_id: str`
- `score: float`
- `matched_rules: list[str]`
- `reasoning: list[str]`
- `recommended_services: list[str]`

### `recommendations.py`
Defines the options returned to the UI.

Recommended model shape:
```python
class ArchitectureOption(BaseModel):
    id: str
    name: str
    score: float
    services: list[str]
    tradeoffs: list[str] = []

class RecommendationResult(BaseModel):
    pattern_id: str
    options: list[ArchitectureOption]
```

### `graph.py`
Defines the deterministic architecture graph contract.

Recommended model shape:
- `Node(id, type, provider, service, properties)`
- `Edge(id, source, target, relationship, properties)`
- `ArchitectureGraph(graph_id, project_id, version, metadata, nodes, edges)`
- `ArchitectureTemplate(pattern_id, services, edges)`

Important:
- Avoid `connections: list[list[str]]`.
- Use explicit edge objects so relationships can carry type, direction, and metadata.

## Knowledge Base Addition
Add `knowledge/architecture-templates.json`.

Purpose:
- Map a pattern to a deterministic graph blueprint.
- Keep the Graph Engine trivial, repeatable, and testable.

Recommended structure:
```json
{
  "pattern_id": "standard_web_app",
  "services": ["cloudfront", "alb", "ecs", "rds"],
  "nodes": [
    { "id": "cloudfront", "service": "cloudfront", "type": "cdn" },
    { "id": "alb", "service": "alb", "type": "load_balancer" },
    { "id": "ecs", "service": "ecs", "type": "compute" },
    { "id": "rds", "service": "rds", "type": "database" }
  ],
  "edges": [
    { "source": "cloudfront", "target": "alb", "relationship": "routes_to" },
    { "source": "alb", "target": "ecs", "relationship": "routes_to" },
    { "source": "ecs", "target": "rds", "relationship": "uses" }
  ]
}
```

## Core Services
Use `backend/services/` for the implementation.

### `knowledge_loader.py`
- Loads and validates knowledge JSON files.
- Caches them in memory.
- Fails fast if a file is invalid.

### `requirement_engine.py`
- Converts conversation output into a validated `RequirementModel`.
- This stays in V1.
- Tests may bypass it for direct pipeline testing, but production should not.

### `pattern_engine.py`
- Input: `RequirementModel`
- Output: `PatternMatchResult`
- Uses `architecture-patterns.json`
- Scores deterministically based on rule matches

### `recommendation_engine.py`
- Input: `PatternMatchResult`
- Output: `RecommendationResult`
- Uses `recommendation-rules.json` and `service-capabilities.json`
- Produces explicit services for each option

### `graph_engine.py`
- Input: selected `ArchitectureOption`
- Optional template lookup: `ArchitectureTemplate`
- Output: `ArchitectureGraph`
- Builds nodes from the service list and edges from the template

## Evaluation And Testing
Use pytest as the canonical test runner.

### Keep
- `backend/tests/evaluation/patterns/*.json` fixtures
- `backend/tests/evaluation/requirements/*.json` fixtures
- `backend/tests/evaluation/graphs/*.json` fixtures

### Prefer
- `pytest backend/tests/evaluation/` for CI
- `test_pipeline.py` as a debugging helper
- `run_pattern_tests.py` only if it is also wired into pytest or called by a pytest test

### Avoid
- relying only on standalone scripts for verification
- making tests depend on hidden magic behavior in the engines

## Recommended Test Flow
1. Create a `RequirementModel` fixture.
2. Run the Pattern Engine.
3. Assert the pattern ID and matched rules.
4. Run the Recommendation Engine.
5. Select one option.
6. Run the Graph Engine.
7. Assert the node and edge structure.
8. Compare graph output against a regression fixture.

## Scope Correction
The original draft suggested removing `RequirementEngine` for V1. That is not recommended.

Why:
- DOPA needs a real production path for discovery and normalization.
- The engine boundary is part of the architecture.
- Tests can bypass the engine for convenience, but the product should not.

## Summary
This version keeps the good parts of the original proposal:
- strict Pydantic models
- explicit graph templates
- deterministic engines
- fixture-based evaluation

And it fixes the risky parts:
- Requirement Engine remains in V1
- requirement input is richer than four fields
- graph connections become explicit edges
- pytest remains the canonical test path
