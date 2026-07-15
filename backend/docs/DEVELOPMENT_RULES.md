# DOPA Development Rules & Architectural Guidelines
**Version:** 1.0 | **Last Updated:** June 2026

---

## 1. Centralized API Gateway Pattern

### 1.1 Single Entry Point (FastAPI Gateway)
- **Rule:** All client requests must route through a **single FastAPI Gateway** (`/api/v1/`).
- **Purpose:** Enforces authentication, request validation, rate limiting, and logging at a single point.
- **Implementation:**
  ```python
  # backend/app.py
  @app.post("/api/v1/conversation/message")
  async def handle_conversation(req: ConversationRequest):
      # Authentication check happens here
      # Request validation happens here
      # Then route to ConvEngine service
  ```
- **Benefit:** Decouples frontend from internal service topology. Services can move/scale without client impact.

### 1.2 Versioned API Endpoints
- **Rule:** All public API endpoints must be versioned (`/api/v1/`, `/api/v2/`, etc.).
- **Purpose:** Allows backward compatibility during migrations.
- **Guidelines:**
  - Major version bumps = Breaking changes in request/response contracts.
  - Minor versions for non-breaking changes only.
  - Deprecate old versions 6 months after new release.

### 1.3 Centralized Request/Response Envelopes
- **Rule:** All endpoints must return standardized response envelopes.
- **Schema:**
  ```json
  {
    "status": "success|error|validation_error",
    "code": "HTTP_CODE",
    "data": {},
    "errors": ["List of error messages"],
    "metadata": {
      "timestamp": "ISO8601",
      "request_id": "uuid",
      "version": "v1"
    }
  }
  ```
- **Benefit:** Consistent error handling, tracing, and frontend expectations.

---

## 2. Service Boundary & Ownership Model

### 2.1 Clear Service Ownership
- **Rule:** Each service has a **single owner team** and well-defined responsibility boundaries.
- **Services & Owners:**

| Service | Responsibility | Input | Output | Owner |
|---------|---|---|---|---|
| **Conversation Engine** | Chat orchestration, context tracking | User message | Response, context updates | AI Integration Team |
| **Requirement Engine** | Extract & normalize requirements | Chat history | Structured requirements JSON | Requirements Team |
| **Pattern Engine** | Match requirements to architecture patterns | Requirements | Pattern options (A/B/C) | Architecture Team |
| **Recommendation Engine** | Generate Cheapest/Balanced/Enterprise tradeoffs | Pattern + cost data | Option descriptions | Product Team |
| **Graph Engine** | Build graph nodes/edges, validate DAG | Selected option | JSON graph | Graph Team |
| **Terraform Engine** | Generate TF modules, templates | Graph | TF artifacts | Infrastructure Team |
| **Security Engine** | Scan architectures for risks | TF artifacts, graph | Risk report | Security Team |
| **Cost Engine** | Calculate estimated costs | TF artifacts, graph | Cost report | FinOps Team |
| **Validation Engine** | Run `terraform validate`, schema checks | TF artifacts | Validation report | QA Team |
| **Explanation Engine** | Generate natural language rationale | Reports, graph | Markdown explanations | Docs Team |
| **Report Engine** | Compile final artifacts (Zip, PDF) | All reports | Downloadable packages | DevOps Team |

### 2.2 No Cross-Service Direct Calls
- **Rule:** Services **MUST NOT** import or call other services directly (no circular dependencies).
- **Violation:** Service A imports Service B's code module.
- **Solution:** Route through FastAPI Gateway or use message queues for async operations.
- **Exception:** Utilities in a shared `commons/` module (validation helpers, constants).

### 2.3 Service Data Contracts
- **Rule:** Each service exposes only a **Pydantic schema** for input/output.
- **Example:**
  ```python
  # backend/services/requirement_engine/schemas.py
  class ExtractRequirementsRequest(BaseModel):
      project_id: UUID
      
  class ExtractRequirementsResponse(BaseModel):
      requirements: RequirementsSchema
      version: int
  ```
- **Benefit:** Strong typing, API documentation auto-generated via OpenAPI.

---

## 3. Data Flow & Processing Pipeline

### 3.1 Unidirectional Data Flow (Request-Response)
- **Rule:** Data flows **request → service → response**. No circular dependencies or backchannels.
- **Pattern:**
  ```
  Frontend → FastAPI → Engine A → (queries DB) → Engine A → FastAPI → Frontend
  ```

### 3.2 Deterministic Processing
- **Rule:** Services must be **deterministic** (same input → same output, no randomness except where explicit).
- **Purpose:** Enables reproducibility, caching, and regression testing.
- **Example (Bad):** Pattern Engine picks random pattern.
- **Example (Good):** Pattern Engine ranks patterns by score, returns sorted list.

### 3.3 State Machine for Project Lifecycle
- **Rule:** Projects follow strict state transitions defined in `projects.status`.
- **Allowed Transitions:**
  ```
  DISCOVERY 
    → REQUIREMENTS_GATHERED 
    → OPTIONS_GENERATED 
    → GRAPH_GENERATED 
    → TERRAFORM_GENERATING 
    → ANALYZING 
    → EXPLAINING 
    → COMPLETED
  
  (Any state) → FAILED (on error)
  ```
- **Enforcement:** Database constraints + FastAPI endpoint validation.
- **Benefit:** Prevents race conditions and invalid state combinations.

### 3.4 No Implicit State Modifications
- **Rule:** Services must **not modify database state** without explicit API call.
- **Violation:** Conversation Engine auto-saves requirements (side effect).
- **Solution:** Return requirements to Gateway, let controller decide to save.

---

## 4. Knowledge Base Configuration

### 4.1 JSON-First Configuration (No Hardcoding)
- **Rule:** All domain knowledge must live in JSON files in `/backend/knowledge/`.
- **Files:**
  - `question-flows.json` — Conversation decision trees
  - `architecture-patterns.json` — Available patterns (ECS, RDS, ALB, etc.)
  - `terraform-module-catalog.json` — TF module → node property mapping
  - `security-rules.json` — Compliance checks (CIS, PCI-DSS, etc.)
  - `cost-models.json` — Hourly rates per resource type

### 4.2 Schema Validation on Startup
- **Rule:** FastAPI backend boots **only if all JSON files pass Pydantic validation**.
- **Implementation:**
  ```python
  # backend/app.py
  @app.on_event("startup")
  async def load_knowledge():
      try:
          knowledge = KnowledgeLoader.load_all()
      except ValidationError as e:
          raise RuntimeError(f"Knowledge base validation failed: {e}")
  ```
- **Benefit:** Catches configuration errors before production.

### 4.3 Knowledge Versioning
- **Rule:** Each JSON file has a `"version"` field (semantic versioning).
- **Example:**
  ```json
  {
    "version": "1.2.0",
    "timestamp": "2026-06-19T10:00:00Z",
    "patterns": [...]
  }
  ```

---

## 5. Error Handling & Resilience

### 5.1 Centralized Error Classification
- **Rule:** All errors must be classified into one of these categories:
  - `VALIDATION_ERROR` (400) — Invalid input from user/API
  - `AUTHENTICATION_ERROR` (401) — Missing/invalid auth token
  - `AUTHORIZATION_ERROR` (403) — User lacks permission
  - `NOT_FOUND_ERROR` (404) — Resource doesn't exist
  - `CONFLICT_ERROR` (409) — State conflict (e.g., concurrent edits)
  - `SERVICE_ERROR` (500) — Internal service failure
  - `EXTERNAL_SERVICE_ERROR` (502) — LLM API down, TF CLI error

- **Implementation:**
  ```python
  class DOPAException(Exception):
      def __init__(self, category, message, code=None):
          self.category = category
          self.message = message
          self.code = code
  
  @app.exception_handler(DOPAException)
  async def handle_dopa_error(request, exc):
      return JSONResponse({
          "status": "error",
          "error_category": exc.category,
          "message": exc.message,
          "code": exc.code
      }, status_code=map_category_to_http_code(exc.category))
  ```

### 5.2 Retry Logic for External Calls
- **Rule:** Any call to external services (LLM, TF, Checkov) must have exponential backoff retry.
- **Configuration:**
  - Max retries: 3
  - Initial backoff: 1 second
  - Max backoff: 16 seconds
  - Jitter: random ±10%

### 5.3 Graceful Degradation
- **Rule:** If non-critical service fails (e.g., Cost Engine), return partial results.
- **Example:** If Cost Engine fails, still return architecture and security report.
- **Never degrade:** Requirements extraction, Graph generation, Terraform generation.

### 5.4 LLM Hallucination Mitigation
- **Rule:** LLM output must always be validated via Pydantic + retry loop (max 3 times).
- **Flow:**
  1. LLM generates response
  2. Try to parse via `RequirementsSchema.model_validate(llm_output)`
  3. If fails: Inject error into prompt, retry up to 3 times
  4. If still fails: Fall back to manual user input UI

---

## 6. Database & Persistence

### 6.1 ORM-First Approach
- **Rule:** All database access **must** use SQLAlchemy ORM (no raw SQL).
- **Exception:** Complex analytical queries (with performance justification in PR).
- **Benefit:** Type safety, query logging, easier migrations.

### 6.2 Database Migrations (Alembic)
- **Rule:** Every schema change **must** have a corresponding Alembic migration.
- **Workflow:**
  ```bash
  # Create migration
  alembic revision --autogenerate -m "Add security_score column"
  # Review generated migration
  # Test: alembic downgrade -1 && alembic upgrade +1
  ```

### 6.3 Data Isolation
- **Rule:** Every query must include `WHERE user_id = current_user.id`.
- **Implementation (SQLAlchemy listener):**
  ```python
  @event.listens_for(Query, "before_execute")
  def receive_before_execute(query, *args):
      if not current_user:
          return  # Unauthenticated, gateway layer should reject
      # Append user filter to query
  ```
- **Benefit:** Prevents accidental cross-tenant data leakage.

### 6.4 Database Locking for State Transitions
- **Rule:** State transitions use row-level locking to prevent race conditions.
- **Implementation:**
  ```python
  project = db.query(Project).with_for_update().filter(
      Project.id == project_id
  ).first()
  project.status = "ANALYZING"
  db.commit()
  ```

---

## 7. Testing Strategy

### 7.1 Test Coverage Hierarchy
- **Unit Tests (80%):** Individual services, isolated from DB/LLM.
- **Integration Tests (15%):** Service + DB, mocked external APIs.
- **End-to-End Tests (5%):** Full pipeline with real LLM/TF (slow, run nightly).

### 7.2 Evaluation Layer (Regression Testing)
- **Rule:** Every deterministic engine must have evaluation snapshots.
- **Location:** `/backend/tests/evaluation/`
- **Contents:**
  - `requirements/`: Input (chat) → Expected output (requirements JSON)
  - `patterns/`: Requirements → Expected pattern ID
  - `graphs/`: Pattern + requirements → Expected graph structure
  - `security/`: Graph → Expected risk scores
  - `cost/`: Graph → Expected cost breakdown

- **Execution:** CI runs `pytest backend/tests/evaluation/` to detect regressions.

### 7.3 Test Naming Convention
- **Format:** `test_{service}_{scenario}_{expected_outcome}`
- **Examples:**
  - `test_requirement_engine_extracts_traffic_from_chat`
  - `test_pattern_engine_selects_cheapest_for_startup`
  - `test_graph_validator_detects_cyclic_edges`

### 7.4 Mocking External Services
- **Rule:** Never call real LLM/TF CLI in unit tests. Use `unittest.mock.patch()`.
- **Fixtures:** Maintain `/backend/tests/fixtures/` with sample responses.

---

## 8. Frontend Architecture

### 8.1 Component-First Organization
- **Rule:** React components organized by feature, not by type.
- **Bad Structure:**
  ```
  components/
    buttons/
    forms/
    pages/
  ```
- **Good Structure:**
  ```
  components/
    conversation-panel/
    architecture-canvas/
    reports-viewer/
  ```

### 8.2 React Query for Server State
- **Rule:** All API calls go through React Query (TanStack Query) for caching.
- **Benefits:** Automatic request deduplication, background refetching, offline support.
- **Example:**
  ```typescript
  const { data: project } = useQuery({
      queryKey: ['project', projectId],
      queryFn: () => api.getProject(projectId),
      staleTime: 5 * 60 * 1000
  });
  ```

### 8.3 React Context for User/Project State
- **Rule:** Use React Context for global app state (authenticated user, current project).
- **Do NOT store:** Complex nested state, list data (use React Query).

### 8.4 Type Safety (TypeScript)
- **Rule:** 100% TypeScript coverage. No `any` types without justification.
- **Linter:** ESLint + `@typescript-eslint` rules enabled.

---

## 9. Security & Authentication

### 9.1 Authentication Flow
- **Rule:** Frontend → NextAuth → JWT → FastAPI.
- **Workflow:**
  1. User logs in via NextAuth (OAuth or credential provider)
  2. NextAuth generates JWT token
  3. Frontend includes `Authorization: Bearer <JWT>` in API calls
  4. FastAPI middleware validates JWT signature via secret key
  5. Extract `user_id`, attach to `request.user`

### 9.2 Authorization Checks
- **Rule:** Every endpoint must verify resource ownership before returning data.
- **Pattern:**
  ```python
  @app.get("/api/v1/projects/{project_id}")
  async def get_project(project_id: UUID, current_user: User = Depends(get_current_user)):
      project = db.query(Project).filter(Project.id == project_id).first()
      if project.user_id != current_user.id:
          raise AuthorizationError("You do not own this project")
      return project
  ```

### 9.3 Sensitive Data Masking
- **Rule:** Logs must NOT include API keys, tokens, or passwords.
- **Implementation:** Use a logging filter.
  ```python
  class SensitiveDataFilter(logging.Filter):
      def filter(self, record):
          record.msg = re.sub(r'(api_key|token|password)=\S+', r'\1=***', str(record.msg))
          return True
  ```

### 9.4 HTTPS Enforcement
- **Rule:** All traffic must use HTTPS in production (TLS 1.2 or higher).
- **Local Development:** HTTPS via self-signed certificates (optional but recommended).

---

## 10. Deployment & DevOps

### 10.1 Infrastructure as Code (Terraform)
- **Rule:** All infrastructure defined in Terraform, version controlled in Git.
- **Modules:** Organized by concern (compute, database, networking).

### 10.2 Docker Containerization
- **Rule:** Every service (frontend, backend, DB) runs in a Docker container.
- **Images:**
  - `frontend:latest` — Node.js base, Next.js prod build
  - `backend:latest` — Python 3.12 slim base, FastAPI + Gunicorn
  - `db:latest` — PostgreSQL 16 official image

### 10.3 CI/CD Pipelines (GitHub Actions)
- **Run on:** Every push to `main` and pull requests.
- **Jobs:**
  1. **Lint** (Prettier, ESLint, Black, Flake8) — Fail if issues
  2. **Type Check** (TypeScript, mypy) — Fail if type errors
  3. **Unit Tests** (pytest, Jest) — Fail if coverage < 80%
  4. **Knowledge Base Validation** (Pydantic) — Fail if JSON invalid
  5. **Evaluation Tests** (pytest backend/tests/evaluation/) — Fail if regression
  6. **Build Docker Images** — Push to registry
  7. **Deploy to Staging** — Automated (if main branch)

### 10.4 Environment Variables
- **Rule:** All configuration via environment variables, NO hardcoding.
- **Files:**
  - `.env.local` (local dev, git-ignored)
  - `.env.test` (test environment)
  - GitHub Secrets (production credentials)
- **Variables must include:**
  - `DATABASE_URL`, `OPENAI_API_KEY`, `LLM_PROVIDER`, `LOG_LEVEL`, `ENVIRONMENT`

### 10.5 Logging & Monitoring
- **Rule:** Every service logs to **centralized logging** (ELK stack or cloud equivalent).
- **Log Levels:**
  - `ERROR` — Unrecoverable failures, page user immediately
  - `WARN` — Recovered errors, degraded performance
  - `INFO` — State transitions, key milestones
  - `DEBUG` — Detailed execution traces (only in dev)
- **Structured Logging:** All logs as JSON with `{timestamp, level, service, request_id, message, context}`.

### 10.6 Health Checks
- **Rule:** Every service exposes `/health` and `/ready` endpoints.
- **`/health`:** Returns `200 OK` if service is alive.
- **`/ready`:** Returns `200 OK` if service is ready to handle traffic (DB connected, etc.).

---

## 11. Code Organization & Naming

### 11.1 Backend Directory Structure
```
backend/
├── app.py                          # FastAPI app setup
├── config.py                       # Environment config
├── models/                         # SQLAlchemy ORM models
│   ├── project.py
│   ├── conversation.py
│   └── ...
├── services/                       # Business logic
│   ├── conversation_engine/
│   ├── requirement_engine/
│   ├── pattern_engine/
│   └── ...
├── schemas/                        # Pydantic request/response models
│   ├── conversation.py
│   ├── requirements.py
│   └── ...
├── routes/                         # FastAPI route handlers
│   ├── conversation.py
│   ├── requirements.py
│   └── ...
├── commons/                        # Shared utilities
│   ├── validators.py
│   ├── constants.py
│   └── exceptions.py
├── knowledge/                      # JSON configuration
│   ├── question-flows.json
│   ├── architecture-patterns.json
│   └── ...
├── evaluation/                     # Regression tests
│   ├── requirements/
│   ├── patterns/
│   └── ...
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
└── migrations/                     # Alembic DB migrations
```

### 11.2 Naming Conventions
- **Classes:** PascalCase (e.g., `ConversationEngine`, `RequirementsSchema`)
- **Functions/Methods:** snake_case (e.g., `extract_requirements`, `validate_graph`)
- **Constants:** UPPER_SNAKE_CASE (e.g., `MAX_RETRIES`, `LLM_TIMEOUT_SECONDS`)
- **Database Tables:** snake_case plural (e.g., `users`, `projects`, `conversations`)
- **API Endpoints:** kebab-case (e.g., `/api/v1/projects`, `/api/v1/conversation/message`)

### 11.3 Module Imports
- **Rule:** Avoid deep relative imports. Use absolute imports.
- **Bad:** `from ../../services.requirement_engine import extract`
- **Good:** `from backend.services.requirement_engine import extract`

---

## 12. Documentation Standards

### 12.1 Code Comments
- **Rule:** Only document the "why", not the "what". Code should be self-explanatory.
- **Bad:** `count += 1  # Add 1 to count`
- **Good:** `count += 1  # Account for zero-indexed array offset`

### 12.2 Docstrings
- **Rule:** Every public function/class must have a docstring (Google style).
- **Format:**
  ```python
  def extract_requirements(project_id: UUID) -> RequirementsSchema:
      """
      Extract structured requirements from a project's chat history.
      
      Uses LLM to analyze conversation and maps to RequirementsSchema.
      Falls back to manual input if LLM output is unparseable (3 retries max).
      
      Args:
          project_id: The project UUID to extract requirements from.
          
      Returns:
          RequirementsSchema: Validated requirements object.
          
      Raises:
          ProjectNotFoundError: If project doesn't exist.
          ValidationError: If LLM output cannot be parsed after 3 retries.
      """
  ```

### 12.3 API Documentation
- **Rule:** All endpoints auto-documented via OpenAPI (Swagger).
- **Generated from:** Pydantic schemas + FastAPI docstrings.
- **Access:** `/docs` (Swagger UI), `/redoc` (ReDoc).

### 12.4 Architecture Decision Records (ADR)
- **Rule:** Any major architectural decision documented in `/docs/adr/`.
- **File format:** `ADR-{number}-{title}.md`
- **Sections:** Problem, Options, Decision, Consequences.

---

## 13. Performance Optimization

### 13.1 API Response Caching
- **Rule:** Immutable endpoints (GET /projects) use HTTP caching headers.
- **Headers:**
  ```
  Cache-Control: public, max-age=300  # 5 minutes
  ETag: "abc123"
  ```

### 13.2 Database Query Optimization
- **Rule:** All queries should complete in < 100ms. Profile with `EXPLAIN`.
- **Guidelines:**
  - Add indexes on foreign keys and WHERE clauses.
  - Use `select()` with explicit columns, not `select(*)`
  - Avoid N+1 queries (use `joinedload` in SQLAlchemy).

### 13.3 Frontend Bundle Optimization
- **Rule:** Frontend JS bundle < 200KB (gzipped), CSS < 50KB.
- **Tools:** Webpack bundle analyzer, Next.js built-in optimization.

### 13.4 Lazy Loading & Pagination
- **Rule:** Large lists paginated (default 20 items per page, max 100).
- **Endpoints:** Support `?limit=20&offset=0` query params.

---

## 14. Conflict Resolution & Code Review

### 14.1 Pull Request Requirements
- **Rule:** Every change must have a PR with:
  - ✅ At least 1 approval from team owner
  - ✅ All tests passing
  - ✅ Code coverage maintained
  - ✅ No lint/type errors
  - ✅ Descriptive title & body

### 14.2 Conflict Resolution Process
- **Architectural Conflicts:** Escalate to Tech Lead, document decision in ADR.
- **Service Boundary Conflicts:** Owners agree on data contract, test integration thoroughly.
- **Test Failures:** Author must investigate, fix, and update evaluation snapshots if intentional.

---

## 15. Quick Reference: Development Checklist

Before pushing code:

- [ ] All tests passing locally (`pytest`, `npm test`)
- [ ] Linting passed (`black`, `flake8`, `eslint`, `prettier`)
- [ ] Type checking passed (`mypy`, `tsc`)
- [ ] Knowledge base JSON validated
- [ ] Pydantic schemas updated for new fields
- [ ] No hardcoded secrets/API keys
- [ ] Database migration created (if schema changes)
- [ ] Comments explain "why", not "what"
- [ ] Service boundaries respected (no cross-imports)
- [ ] Error handling covers all paths
- [ ] External service calls have retry logic
- [ ] Evaluation tests updated (if behavior changed)
- [ ] PR description includes what/why/how

---

## Appendix: External Service Integration Standards

### LLM Integration
- **Retry Strategy:** Exponential backoff, max 3 attempts
- **Timeout:** 30 seconds per request
- **Fallback:** Return error to frontend, suggest manual input
- **Validation:** Pydantic schema strict mode

### Terraform CLI
- **Execution:** Subprocess with timeout (60 seconds)
- **Working Directory:** Temporary project directory (`/tmp/project_{id}/`)
- **Output Parsing:** Capture stdout/stderr as structured JSON
- **Cleanup:** Remove temp directory after analysis

### Security Scanners (Checkov, Trivy)
- **Invocation:** Via Python SDK or CLI subprocess
- **Output Format:** Normalize to standardized risk score (0-100)
- **Caching:** Cache results for 1 hour per artifact

---

**Document Version:** 1.0  
**Last Updated:** June 2026  
**Owner:** Tech Lead (@DOPA-Architecture-Team)  
**Review Cycle:** Quarterly

