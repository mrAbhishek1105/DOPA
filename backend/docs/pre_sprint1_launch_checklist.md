# DOPA Sprint 1 Pre-Launch Checklist

Use this checklist before writing Sprint 1 feature code. The goal is to remove ambiguity, lock contracts, and make the first implementation deterministic.

## 1. Scope And Goals
- [ ] Freeze Sprint 1 scope to AWS, Terraform, architecture graph, static cost, security, validation, explanations, and reports.
- [ ] Confirm out-of-scope items: Azure, GCP, live pricing APIs, drift detection, auto-remediation, deployment pipelines, graph databases, and agent swarms.
- [ ] Write the Sprint 1 success criteria in plain language.
- [ ] Decide what "done" means for the first release.

## 2. Architecture Decisions
- [ ] Confirm FastAPI as the single backend API gateway.
- [ ] Confirm Next.js as the frontend framework.
- [ ] Confirm PostgreSQL JSONB as the graph/report persistence layer.
- [ ] Confirm Git-versioned JSON files as the knowledge source of truth.
- [ ] Confirm deterministic engines for graph, Terraform, cost, security, and validation.
- [ ] Confirm that Terraform Registry schema sync is Sprint 2+ only.

## 3. Canonical Documents
- [ ] Review and align `Docs/DEVELOPMENT_RULES.md`.
- [ ] Review and align `Docs/system_design_v1.md`.
- [ ] Review and align `Docs/lld.md`.
- [ ] Review and align `Docs/knowledge_schema.md`.
- [ ] Review and align `Docs/sprint1.md`.
- [ ] Keep ADRs as the record for major architecture decisions.

## 4. Core Contracts
- [ ] Finalize the `projects` state machine.
- [ ] Finalize request/response envelopes for all API endpoints.
- [ ] Finalize the project, requirement, graph, recommendation, Terraform package, and report schemas.
- [ ] Finalize graph node and edge schema definitions.
- [ ] Finalize validation and error response formats.

## 5. Knowledge Base
- [ ] Define schemas for all required JSON knowledge files.
- [ ] Validate `architecture-patterns.json` structure.
- [ ] Validate `service-capabilities.json` structure.
- [ ] Validate `tradeoff-rules.json` structure.
- [ ] Validate `recommendation-rules.json` structure.
- [ ] Validate `security-rules.json` structure.
- [ ] Validate `validation-rules.json` structure.
- [ ] Validate `cost-rules.json` structure.
- [ ] Validate `question-flows.json` structure.
- [ ] Validate `terraform-module-catalog.json` structure.
- [ ] Validate `provider-mappings.json` structure.
- [ ] Decide knowledge-file versioning rules.

## 6. ADRs
- [ ] Keep ADR-001 up to date with the schema-sync and curation-layer decision.
- [ ] Create ADRs for any major choice that affects runtime behavior, data ownership, or external dependencies.
- [ ] Add an ADR index if the number of decisions grows quickly.

## 7. Repo And Runtime Setup
- [ ] Confirm backend folder structure and ownership.
- [ ] Confirm frontend folder structure and ownership.
- [ ] Confirm where generated artifacts will live.
- [ ] Confirm where evaluation fixtures will live.
- [ ] Define local development commands for frontend, backend, and database.
- [ ] Define migration workflow with Alembic.
- [ ] Define startup validation for knowledge files.

## 8. Test Fixtures
- [ ] Prepare sample discovery conversations.
- [ ] Prepare sample requirement outputs.
- [ ] Prepare sample recommendation outputs.
- [ ] Prepare sample graph outputs.
- [ ] Prepare sample Terraform package outputs.
- [ ] Prepare expected cost, security, and validation snapshots.
- [ ] Prepare regression fixtures for deterministic engines.

## 9. Testing And Quality Gates
- [ ] Decide unit test coverage expectations for each engine.
- [ ] Decide integration test coverage for API and DB behavior.
- [ ] Decide evaluation snapshot strategy for deterministic outputs.
- [ ] Confirm no live external calls in unit tests.
- [ ] Confirm CI jobs for linting, type checking, testing, and knowledge validation.

## 10. Implementation Order
- [ ] Project creation.
- [ ] Conversation flow.
- [ ] Requirement extraction.
- [ ] Pattern matching.
- [ ] Recommendation generation.
- [ ] Graph generation.
- [ ] Terraform generation.
- [ ] Security analysis.
- [ ] Cost analysis.
- [ ] Validation checks.
- [ ] Explanation generation.
- [ ] Report generation.

## 11. UI Decisions
- [ ] Decide what the user sees at each state transition.
- [ ] Define the project creation screen.
- [ ] Define the discovery chat flow.
- [ ] Define the recommendation review flow.
- [ ] Define the graph review/edit flow.
- [ ] Define the final report download flow.

## 12. Launch Readiness Check
- [ ] No unresolved architecture questions remain.
- [ ] No hidden service coupling remains.
- [ ] No ambiguous schema fields remain.
- [ ] No knowledge file schema gaps remain.
- [ ] No missing ADRs remain for major decisions.
- [ ] The first Sprint 1 slice can be built without reworking the architecture.