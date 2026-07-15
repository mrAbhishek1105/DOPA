# Repository Layout

This repository now has two top-level product roots:

- `backend/` for all backend code, knowledge, generated artifacts, tests, scripts, and documentation.
- `frontend/` for the user-facing application and any UI-specific assets.

## Backend

Current backend subdirectories:

- `backend/api/` for HTTP entrypoints and route wiring.
- `backend/services/` for deterministic engines and backend business logic.
- `backend/schemas/` for Pydantic request, response, and graph models.
- `backend/knowledge/` for JSON knowledge files used by the engines.
- `backend/generated/` for derived artifacts and caches.
- `backend/tests/` for regression and evaluation tests.
- `backend/docs/` for architecture notes and implementation guidance.
- `backend/scripts/` for maintenance utilities.

## Frontend

`frontend/` is intentionally minimal for now and should contain the user-facing app, routing, and presentation logic when it is introduced.

## Conventions

- Keep backend imports absolute and rooted at `backend.*`.
- Keep deterministic engine behavior in `backend/services/`.
- Keep regression fixtures under `backend/tests/evaluation/`.
- Keep knowledge files in `backend/knowledge/` and load them through `KnowledgeLoader`.
