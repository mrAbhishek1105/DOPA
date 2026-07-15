# DOPA Agent Rules

## 1. What DOPA Is
DOPA (DevOps Planning & Architecture) is an AI-assisted infrastructure architecture platform.

It converts business requirements into:
- validated cloud architectures
- cost estimates
- security findings
- Terraform artifacts
- human-readable reports

DOPA is not a general-purpose chatbot. It is an architecture system with a strict pipeline.

## 2. Core Principles
1. Architecture first: the architecture graph is the source of truth.
2. Human in the loop: DOPA recommends, the user approves.
3. Deterministic by default: infrastructure outputs must be reproducible.
4. Explain every decision: every recommendation needs a clear why.
5. Graph-centric flow: requirements -> graph -> everything else.
6. No hidden side effects: services should not silently mutate project state.

## 3. Canonical System Flow
Use this order for all feature work, API design, and state transitions:

```text
Conversation Engine
  -> Requirement Engine
  -> Pattern Engine
  -> Recommendation Engine
  -> User Selection
  -> Graph Engine
  -> Terraform Engine
  -> Security Engine
  -> Cost Engine
  -> Validation Engine
  -> Explanation Engine
  -> Report Engine
```

Important:
- Terraform generation happens before security, cost, and validation analysis.
- Security, cost, and validation must analyze generated Terraform, not hypothetical designs.
- Do not shortcut the pipeline unless a design doc explicitly says so.

## 4. Project Lifecycle
Projects must move through the state machine in `projects.status`:

```text
DISCOVERY -> REQUIREMENTS_GATHERED -> OPTIONS_GENERATED -> GRAPH_GENERATED -> TERRAFORM_GENERATING -> ANALYZING -> EXPLAINING -> COMPLETED
```

Rules:
- Any deterministic engine failure sets the project to `FAILED`.
- State transitions must be explicit and guarded against race conditions.
- Never advance state without the prerequisite artifact being saved.

## 5. Centralized API Rules
All application traffic must go through the FastAPI backend and the versioned `/api/v1/` surface.

Rules:
- Frontend must never call external services directly.
- Keep the API as the single integration point.
- Use plural nouns for collections.
- Use action endpoints only where the action is not a resource CRUD operation.
- Keep route handlers thin and push logic into services.

Canonical endpoints:
```text
POST /api/v1/projects
GET  /api/v1/projects/{id}
POST /api/v1/conversation/message
POST /api/v1/requirements/extract
POST /api/v1/patterns/generate
POST /api/v1/recommendations/generate
POST /api/v1/graph/generate
POST /api/v1/terraform/generate
POST /api/v1/security/analyze
POST /api/v1/cost/analyze
POST /api/v1/validation/check
POST /api/v1/explanation/generate
POST /api/v1/reports/generate
```

## 6. Service Boundaries
Use a layered architecture:

- `api/`: HTTP routing, request parsing, response formatting
- `services/`: business logic and engine orchestration
- `repositories/`: database access only
- `schemas/`: Pydantic contracts
- `knowledge/`: versioned JSON rules

Rules:
- Controllers do not contain business logic.
- Services do not write raw SQL.
- Services should not directly depend on each other in ways that create tight coupling.
- Shared utilities belong in a common helper layer, not duplicated per service.

## 7. Frontend Rules
Build the frontend to match the backend contract, not the other way around.

Rules:
- Default to Next.js server components for data fetching and layout.
- Use `"use client"` only for interactive views such as chat, canvas, and forms.
- Route all backend calls through a centralized API client.
- Use TanStack Query for async server state.
- Use React Context only for lightweight synchronous UI state.

## 8. Validation Rules
Strict validation is mandatory everywhere.

Rules:
- Every request and response crossing the API boundary must be validated with Pydantic v2.
- Every knowledge file must be parsed and validated on startup.
- If a knowledge file is invalid, the backend must fail fast.
- Do not use regex as a substitute for structured parsing.

## 9. Knowledge Base Rules
The knowledge base is Git-versioned configuration, not database content.

Required files:
- `architecture-patterns.json`
- `service-capabilities.json`
- `tradeoff-rules.json`
- `recommendation-rules.json`
- `security-rules.json`
- `validation-rules.json`
- `cost-rules.json`
- `question-flows.json`
- `terraform-module-catalog.json`
- `provider-mappings.json`

Rules:
- Do not hardcode domain rules inside engine code.
- Keep rule changes reviewable through Git.
- Prefer deterministic lookups over prompt-based behavior whenever possible.

## 10. LLM Rules
Use the LLM only where variability is helpful.

Allowed:
- requirement extraction
- question generation
- explanation text
- report prose

Not allowed:
- Terraform generation
- cost calculation
- security evaluation
- graph construction
- validation decisions

Rules:
- All LLM output must be structured.
- Use the internal AI gateway abstraction.
- Never parse free-form LLM text when a schema is possible.

## 11. Database Rules
The database is for state, versioning, and artifacts.

Rules:
- Use PostgreSQL with JSONB for graph and report payloads.
- Use UUID primary keys.
- Use Alembic for every schema change.
- Never modify schema manually.
- Prefer ORM and repository patterns over ad hoc SQL.
- Treat the graph as the authoritative versioned artifact.

## 12. Error Handling Rules
Failure handling must be predictable and visible.

Rules:
- Return structured API errors.
- Handle custom application exceptions centrally.
- Return HTTP 409 for conflicting project state transitions.
- Save exact tool output for Terraform, validation, and scanner failures.
- Retry transient external failures with bounded retries.

## 13. Logging And Observability
Logs should help trace a project end to end.

Rules:
- Always include `project_id` when available.
- Use structured logs.
- Never log secrets, tokens, or passwords.
- Record state transitions and major engine milestones.

## 14. Testing Rules
Deterministic behavior must be protected by tests.

Rules:
- Add unit tests for each engine.
- Add integration tests for API and database behavior.
- Add regression fixtures for deterministic outputs.
- Do not call live external services in unit tests.
- Update evaluation fixtures when deterministic behavior intentionally changes.

## 15. High-Level Software Quality Rules
When designing or changing the system, prefer these qualities:

- centralized API gateway
- clear service ownership
- deterministic processing
- versioned contracts
- fail-fast validation
- minimal coupling
- explicit state transitions
- reproducible artifacts
- human approval before impactful actions

If a design increases hidden complexity, hidden state, or non-determinism, it is probably the wrong design.

## 16. Scope Guardrails
In Sprint 1, stay focused on:
- AWS
- Terraform
- architecture graph
- static cost analysis
- security analysis
- validation
- reports
- explanation generation

Out of scope for Sprint 1:
- Azure
- GCP
- live pricing APIs
- deployment pipelines
- drift detection
- auto-remediation
- graph databases
- agent swarms

## 17. Agent Behavior Rule
When building or reviewing features:
- read the design docs first
- keep the pipeline order intact
- prefer centralized shared abstractions
- avoid duplicate business logic
- make outputs reproducible and testable
- keep the user in control of architecture decisions
