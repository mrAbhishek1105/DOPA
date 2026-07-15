# DOPA Architecture Flow

## 📋 Table of Contents
1. [High-Level System Overview](#1-high-level-system-overview)
2. [Frontend Architecture](#2-frontend-architecture)
3. [Backend Architecture & API Layer](#3-backend-architecture--api-layer)
4. [Core Pipeline: Stage-by-Stage Flow](#4-core-pipeline-stage-by-stage-flow)
5. [Data Formats & Contracts](#5-data-formats--contracts)
6. [Database Models](#6-database-models)
7. [State Management & Communication Patterns](#7-state-management--communication-patterns)
8. [End-to-End Flow Walkthrough](#8-end-to-end-flow-walkthrough)

---

## 1. High-Level System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          DOPA SYSTEM                                     │
│                                                                          │
│  ┌──────────────────────────────────────────────────────┐               │
│  │                    FRONTEND (Next.js)                 │               │
│  │                                                      │               │
│  │  ┌─────────┐  ┌──────────────┐  ┌─────────────────┐  │               │
│  │  │ Pages & │  │  Components  │  │   Hooks          │  │               │
│  │  │ Layout  │  │  (UI)        │  │  (useConversation)│  │               │
│  │  └────┬────┘  └──────┬───────┘  └────────┬────────┘  │               │
│  │       │              │                    │           │               │
│  │       └──────────────┴────────────────────┘           │               │
│  │                        │                                │               │
│  │              ┌─────────▼──────────┐                    │               │
│  │              │  Zustand Store      │                    │               │
│  │              │  (Global State)     │                    │               │
│  │              └────────────────────┘                    │               │
│  │                        │                                │               │
│  │              ┌─────────▼──────────┐                    │               │
│  │              │  API Client Layer   │                    │               │
│  │              │  (axios → localhost:8000/api/v1)         │               │
│  │              └─────────┬──────────┘                    │               │
│  └────────────────────────┼──────────────────────────────┘               │
│                           │ HTTP REST (JSON)                              │
│  ┌────────────────────────▼──────────────────────────────────────────┐   │
│  │                    BACKEND (FastAPI)                               │   │
│  │                                                                    │   │
│  │  ┌────────────────────────────────────────────────────────────┐    │   │
│  │  │                    API ROUTERS (v1)                         │    │   │
│  │  │                                                             │    │   │
│  │  │  POST /projects          → Create project                    │    │   │
│  │  │  GET  /projects/{id}     → Get project details               │    │   │
│  │  │  GET  /projects/{id}/...→ requirements, graph, status, etc.  │    │   │
│  │  │  POST /conversation/message → Process user message           │    │   │
│  │  │  POST /generate          → Generate architecture             │    │   │
│  │  └────────────────────────────────────────────────────────────┘    │   │
│  │                           │                                         │   │
│  │  ┌────────────────────────▼────────────────────────────────────┐   │   │
│  │  │                     SERVICE LAYER                            │   │   │
│  │  │                                                              │   │   │
│  │  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │   │   │
│  │  │  │ Discovery     │  │ Pattern       │  │ Recommendation   │   │   │   │
│  │  │  │ Engine        │──▶ Engine        │──▶ Engine           │   │   │   │
│  │  │  │ (NL→Struct)   │  │ (Match→Score) │  │ (Rank→Options)   │   │   │   │
│  │  │  └──────────────┘  └──────────────┘  └────────┬─────────┘   │   │   │
│  │  │                                                 │             │   │   │
│  │  │  ┌──────────────┐  ┌──────────────────┐        │             │   │   │
│  │  │  │ Graph         │◀─│ Graph Validator  │        │             │   │   │
│  │  │  │ Engine        │  │ (Integrity Checks)│       │             │   │   │
│  │  │  │ (Build Graph) │  └──────────────────┘        │             │   │   │
│  │  │  └──────────────┘                              │             │   │   │
│  │  │                                                 │             │   │   │
│  │  │  ┌──────────────────────────────────────────────┘             │   │   │
│  │  │  │  Knowledge Loader (Reads JSON files from knowledge/)        │   │   │
│  │  │  │    ├── question-flows.json                                  │   │   │
│  │  │  │    ├── architecture-patterns.json                           │   │   │
│  │  │  │    ├── recommendation-rules.json                            │   │   │
│  │  │  │    ├── architecture-templates.json                          │   │   │
│  │  │  │    └── service-capabilities.json                            │   │   │
│  │  │  └────────────────────────────────────────────────────────     │   │   │
│  │  └─────────────────────────────────────────────────────────────────┘   │
│  │                           │                                             │
│  │  ┌────────────────────────▼────────────────────────────────────┐       │
│  │  │              REPOSITORY LAYER (ProjectRepository)            │       │
│  │  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │       │
│  │  │  │ create/get   │  │ save_require-│  │ save_architecture│   │       │
│  │  │  │ Project      │  │ ment         │  │                  │   │       │
│  │  │  └──────────────┘  └──────────────┘  └──────────────────┘   │       │
│  │  └────────────────────────┬────────────────────────────────────┘       │
│  └───────────────────────────┼────────────────────────────────────────────┘
│                              │
│  ┌───────────────────────────▼────────────────────────────────────────┐
│  │                      DATABASE (PostgreSQL)                         │
│  │                                                                    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌───────┐ │
│  │  │   projects   │  │ requirements │  │architectures │  │reports│ │
│  │  │              │──▶              │──▶              │──▶       │ │
│  │  │ id (UUID)    │  │ id (UUID)    │  │ id (UUID)    │  │id(UUID)│ │
│  │  │ name         │  │ project_id   │  │ project_id   │  │...     │ │
│  │  │ status       │  │ extracted    │  │ pattern_id   │  │        │ │
│  │  │ created_at   │  │ (JSONB)      │  │ nodes (JSONB)│  │        │ │
│  │  │ updated_at   │  │ missing_fields│ │ edges (JSONB)│  │        │ │
│  │  │              │  │ is_complete  │  │ score (Float)│  │        │ │
│  │  │              │  │              │  │ metadata     │  │        │ │
│  │  │              │  │              │  │ (JSONB)      │  │        │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └───────┘ │
│  └────────────────────────────────────────────────────────────────────┘
└───────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Frontend Architecture

### 2.1 Component Hierarchy
```
<Layout>
├── <ProjectSidebar />          (List/create projects)
├── <WorkspaceLayout>
│   ├── <ConversationPanel />   (Chat UI for discovery)
│   ├── <RequirementsSummary /> (Shows extracted fields)
│   ├── <RecommendationCards /> (Architecture options)
│   ├── <GraphCanvas />         (Visual architecture graph)
│   └── <PipelineStatus />      (Current stage indicator)
└── <HealthIndicator />         (Backend connection status)
```

### 2.2 State Management (Zustand Store)
**File:** `frontend/src/store/index.ts`

The store holds:
- `messagesByProject: Record<string, ChatMessage[]>` — conversation history per project
- `isChatActiveByProject: Record<string, boolean>` — per-project chat active state
- `currentProject: Project | null` — active project
- `selectedRecommendation: RecommendationOption | null` — selected architecture option
- `selectedNode: GraphNode | null` — selected graph node
- `leftSidebarOpen: boolean` — toggle left sidebar
- `rightSidebarOpen: boolean` — toggle right sidebar

### 2.3 Data Flow Hooks

**`useConversation(projectId)`** — Central orchestrator hook:
- Initializes welcome message in store
- Polls project status every 3s (`refetchInterval: 3000`)
- Sends user messages → `POST /conversation/message`
- On response `is_complete`: auto-triggers `POST /generate`
- Invalidates queries on success (status, requirements)
- Manages loading/error states

### 2.4 API Client Layer
**File:** `frontend/src/lib/api/client.ts`

Axios client configured with:
- `baseURL: 'http://localhost:8000/api/v1'`
- `Content-Type: application/json`

API modules:
- `conversationApi.sendMessage(payload)` → `POST /conversation/message`
- `projectsApi.create(name)` → `POST /projects`
- `projectsApi.getStatus(id)` → `GET /projects/{id}/status`
- `projectsApi.getRequirements(id)` → `GET /projects/{id}/requirements`
- `projectsApi.getGraph(id)` → `GET /projects/{id}/graph`
- `projectsApi.getRecommendations(id)` → `GET /projects/{id}/recommendations`
- `generationApi.generateArchitecture(id)` → `POST /generate`

---

## 3. Backend Architecture & API Layer

### 3.1 FastAPI Application Entry
**File:** `backend/main.py`
- Mounts 3 routers under `/api/v1`:
  - `/projects` → Project CRUD & data retrieval
  - `/conversation` → Discovery message processing
  - `/generate` → Architecture generation pipeline
- CORS enabled for all origins

### 3.2 Data Access (Repository Pattern)
**File:** `backend/repositories/project_repository.py`

Repository methods:
- `create_project(name)` → Creates Project ORM record
- `get_project(id)` → Fetches project with eager-loaded relationships
- `save_requirement(project_id, extracted, missing, is_complete)` → Persists Requirement snapshot
- `save_architecture(project_id, pattern_id, score, nodes, edges, metadata)` → Persists Architecture
- `update_status(project_id, status)` → Updates project lifecycle status

### 3.3 Knowledge Base (JSON Files)
**File:** `backend/services/knowledge_loader.py`

Loads structured knowledge from `knowledge/` directory:
| File | Purpose |
|------|---------|
| `question-flows.json` | For each app_type: keywords, required questions, fallback questions |
| `architecture-patterns.json` | Architecture patterns with conditions + scoring criteria |
| `recommendation-rules.json` | For each pattern: 3 options (A/B/C) with services & tradeoffs |
| `architecture-templates.json` | Template nodes & edges for graph generation |
| `service-capabilities.json` | AWS service capabilities & metrics for evaluation |

---

## 4. Core Pipeline: Stage-by-Stage Flow

### STAGE 0: Project Creation
```
User Action:
  → Frontend: Create Project (name input)
  → API: POST /api/v1/projects/
  → Backend: ProjectRepository.create_project(name)
  → DB: INSERT INTO projects (id, name, status='discovery')
  → Response: { id, name, status: "discovery" }
  → Frontend: Stores projectId → Enters Discovery Phase
```

### STAGE 1: Requirements Discovery

```
→ API Endpoint: POST /api/v1/conversation/message
→ Request Body:
    {
      "project_id": "uuid",
      "message": "I want a web app for 100k users, hosted on AWS"
    }

→ Backend Flow:
    1. ProjectRepository.get_project(project_id)
       → Loads Project + Requirements (eager loaded)
       → Gets latest extracted_so_far from most recent Requirement

    2. DiscoveryEngine.process_message(message, extracted_so_far)
       ├── 1. Merge: extracted = extracted_so_far (preserve previous state)
       ├── 2. Determine expected_field from missing_fields[0] (if app_type known)
       ├── 3. Extract general fields via regex (cloud, users, region, budget, etc.)
       ├── 4. Detect application_type via keyword scoring (if not known)
       │      └── Uses question-flows.json keywords → highest score wins
       ├── 5. If app_type unknown → return next_question asking for it
       ├── 6. Check completeness against required_questions in flow
       ├── 7. Build next_question from first missing field's question text
       └── 8. Return DiscoveryResponse

    3. Repository.save_requirement(project_id, extracted, missing, is_complete)
       → DB: INSERT INTO requirements (...)

→ Response:
    {
      "extracted": { "application_type": "web_app", "cloud": "aws", "users": 100000, ... },
      "missing_fields": ["traffic", "budget", "availability"],
      "completed_fields": ["application_type", "cloud", "users"],
      "next_question": "What level of traffic do you expect?",
      "is_complete": false
    }

→ Frontend (useConversation):
    ├── If is_complete=true → Auto-trigger POST /generate
    ├── If next_question present → Display as assistant message
    └── Else → Show missing fields summary
```

#### DiscoveryEngine Internals

**Input**: Natural language string + previous extracted dict
**Output**: `DiscoveryResponse` (structured)

**Extraction Mechanisms**:
| Field | Extraction Method | Example Input | Extracted Value |
|-------|------------------|---------------|-----------------|
| `application_type` | Keyword scoring (multi-word = 2pts, single = 1pt) | "web app" → web_app | `"web_app"` |
| `cloud` | Regex match | "aws" / "gcp" / "azure" | `"aws"` |
| `users` | Numeric regex + multiplier | "100k users" / "5 million users" | `100000` / `5000000` |
| `budget` | Pattern match (low/medium/high) | "tight budget" | `"low"` |
| `traffic` | Pattern match | "high traffic" | `"high"` |
| `availability` | Pattern match | "high availability" / "multi-region" | `"high"` / `"multi_region"` |
| `region` | AWS region regex + alias map | "mumbai" / "us-east-1" | `"ap-south-1"` / `"us-east-1"` |
| `database` | Pattern match | "postgres" / "dynamodb" | `"sql"` / `"nosql"` |
| `compliance` | Pattern match | "soc2" / "gdpr" | `"soc2"` / `"gdpr"` |
| `realtime_latency` | Pattern match | "realtime" / "yes" | `"yes"` |
| `media_storage` | Pattern match | "large storage" | `"high"` |
| `team_size` | Pattern match | "small team" | `"small"` |

**Completeness Check** → Compares extracted fields against the app_type's `required_questions` from `question-flows.json`.

---

### STAGE 2: Pattern Matching

```
→ Triggered when is_complete=true from Discovery
→ API Endpoint: POST /api/v1/generate
→ Request Body:
    { "project_id": "uuid" }

→ Backend Flow:
    1. Load project + latest Requirement (must be is_complete)
    2. Transform extracted dict → RequirementModel Pydantic
       {
         "application_type": "web_app",
         "cloud": "aws",
         "traffic": "high",
         "availability": "high",
         "budget": "medium",
         "database": "sql",
         "users": 100000,
         ...
       }

    3. PatternEngine.match(requirement_model)
       ├── For each pattern in architecture-patterns.json:
       │   ├── Score: application_type (weight: 40)
       │   ├── Score: traffic           (weight: 20)
       │   ├── Score: availability      (weight: 20)
       │   ├── Score: budget            (weight: 10)
       │   └── Score: compliance        (weight: 10)
       │   (Each dimension = weight if matched, 0 if not)
       ├── Select pattern with highest total score
       ├── Compute confidence from (best_score - runner_up) margin
       └── Return PatternMatchResult

    4. RecommendationEngine.generate(pattern_match)
       ├── Find recommendation rule for matched pattern_id
       ├── Load architecture template for same pattern_id
       ├── Build 3 options (A, B, C) from rule:
       │   ├── Each option has: name, service_choices, tradeoffs
       │   └── MetricEngine evaluates each option from service-capabilities.json
       │       ├── cost score
       │       ├── complexity score
       │       ├── scalability score
       │       ├── security score
       │       └── reliability score
       ├── Rank options by total metric score (descending)
       └── Return RecommendationResult

    5. GraphEngine.build(selected_option)
       ├── Find matching architecture template by service subset
       ├── Build Node objects from template nodes
       │   Node { id, type, provider="aws", service, metadata }
       ├── Build Edge objects from template edges
       │   Edge { id, source, target, relationship, properties }
       └── Return ArchitectureGraph

    6. GraphValidator.validate(graph)
       ├── Check: Invalid edges (source/target nodes exist)
       ├── Check: Orphan nodes (nodes with no edges)
       ├── Check: Cycles (DFS detection)
       ├── Check: Invalid service references
       ├── Check: Unsupported relationships
       ├── Check: Layer compliance (e.g., CDN→DB prohibited)
       ├── Compute score: 100 - (errors*35) - (warnings*5)
       └── Return ValidationResult { passed: bool, score: int, issues: [] }

    7. Repository.save_architecture(...)
       → DB: INSERT INTO architectures (nodes, edges, metadata, ...)

    8. Repository.update_status(project.id, "graph_generated")
       → DB: UPDATE projects SET status='graph_generated'

→ Response:
    {
      "architecture_id": "uuid",
      "pattern": { "pattern_id": "...", "total_score": 85, "confidence": 0.85, ... },
      "selected_option": {
        "id": "a", "name": "Option A",
        "score": 0.85,
        "metrics": { "cost": 65, "complexity": 45, "scalability": 90, ... },
        "services": ["ecs", "rds", "elb", ...],
        "tradeoffs": ["Higher cost", "Better scalability"]
      },
      "graph": {
        "nodes": [
          { "id": "node-1", "type": "load_balancer", "provider": "aws",
            "service": "alb", "metadata": {...} },
          { "id": "node-2", "type": "compute", "provider": "aws",
            "service": "ecs", "metadata": {...} },
          ...
        ],
        "edges": [
          { "id": "edge-1", "source": "node-1", "target": "node-2",
            "relationship": "routes_to", "properties": {} },
          ...
        ]
      },
      "validation": {
        "graph_id": "graph-a-web_app-1",
        "validation_score": 100,
        "passed": true,
        "issues": []
      }
    }
```

---

## 5. Data Formats & Contracts

### 5.1 API Request/Response Formats

#### Projects API

| Endpoint | Method | Request | Response |
|----------|--------|---------|----------|
| `/api/v1/projects/` | POST | `{ "name": "string" }` | `{ "id": "uuid", "name": "string", "status": "string" }` |
| `/api/v1/projects/{id}` | GET | — | `{ "id", "name", "status", "requirements": int, "architectures": int, "reports": int }` |
| `/api/v1/projects/{id}/requirements` | GET | — | `{ "extracted": {}, "missing_fields": [], "is_complete": bool }` |
| `/api/v1/projects/{id}/status` | GET | — | `{ "status": "discovery" \| "graph_generated" }` |
| `/api/v1/projects/{id}/graph` | GET | — | `{ "nodes": [], "edges": [] }` |
| `/api/v1/projects/{id}/recommendations` | GET | — | `{ "options": [{ "id", "name", "score", "is_selected", "cost", ... }] }` |

#### Conversation API

| Endpoint | Method | Request | Response |
|----------|--------|---------|----------|
| `/api/v1/conversation/message` | POST | `{ "project_id": "uuid", "message": "string" }` | `{ "extracted": {}, "missing_fields": [], "completed_fields": [], "next_question": "string\|null", "is_complete": bool }` |

#### Generate API

| Endpoint | Method | Request | Response |
|----------|--------|---------|----------|
| `/api/v1/generate/` | POST | `{ "project_id": "uuid" }` | `{ "architecture_id": "uuid", "pattern": {}, "selected_option": {}, "graph": {"nodes":[], "edges":[]}, "validation": {} }` |

### 5.2 Backend Schema → Service → Schema Flow

```
Request Body
    │
    ▼
Pydantic Model (Input Schema)
    │  e.g., ConversationMessageRequest, GenerateArchitectureRequest
    │  Validates: types, lengths, UUIDs
    ▼
API Router (FastAPI)
    │  Orchestrates: repo calls, service calls, error handling
    ▼
Service Layer
    │  Receives: Pydantic model or primitive types
    │  Returns: Pydantic model (internal schema)
    ▼
Pydantic Model (Output/Internal)
    │  e.g., DiscoveryResponse, PatternMatchResult,
    │         RecommendationResult, ArchitectureGraph, ValidationResult
    ▼
dict → JSON Response
```

### 5.3 Key Schema Definitions

**RequirementModel (input to PatternEngine)**
```python
class RequirementModel(BaseModel):
    application_type: str
    cloud: Literal["aws"] = "aws"
    traffic: str | int | None = None
    availability: str | None = None
    region: str | None = None
    budget: str | None = None
    database: str | None = None
    compliance: str | None = None
    users: int | None = None
    team_size: str | None = None
    latency_sla: str | None = None
    media_storage: str | None = None
    realtime_latency: str | None = None
```

**DiscoveryResponse (output from DiscoveryEngine)**
```python
class DiscoveryResponse(BaseModel):
    extracted: dict[str, Any]        # All extracted requirement fields
    missing_fields: list[str]        # Fields still needed
    completed_fields: list[str]      # Fields already gathered
    next_question: str | None        # Question to ask user next
    is_complete: bool                # Whether all fields gathered
```

**PatternMatchResult (output from PatternEngine → input to RecommendationEngine)**
```python
class PatternMatchResult(BaseModel):
    pattern_id: str                  # Matched pattern ID
    total_score: int                 # 0-100
    confidence: float                # 0.25 - 0.95
    dimensions: list[ScoredDimension]  # Per-dimension breakdown
    recommended_services: list[str]    # Default services list
```

**RecommendationResult (output from RecommendationEngine)**
```python
class RecommendationResult(BaseModel):
    pattern_id: str
    options: list[ArchitectureOption]  # Ranked options A, B, C
```

**ArchitectureGraph (output from GraphEngine)**
```python
class ArchitectureGraph(BaseModel):
    graph_id: str
    project_id: str
    version: str = "1.0"
    metadata: dict
    nodes: list[Node]                # { id, type, provider, service, metadata }
    edges: list[Edge]                # { id, source, target, relationship, properties }
```

**ValidationResult (output from GraphValidator)**
```python
class ValidationResult(BaseModel):
    graph_id: str
    validation_score: int            # 0-100
    passed: bool                     # True if score >= 70
    issues: list[ValidationIssue]    # { severity, category, rule_id, message, ... }
```

---

## 6. Database Models

### ER Diagram (Simplified)

```
┌─────────────────────┐          ┌─────────────────────────┐
│       projects       │          │      requirements        │
├─────────────────────┤          ├─────────────────────────┤
│ id (UUID, PK)       │◄─────────│ id (UUID, PK)            │
│ name (String)       │   1:N    │ project_id (UUID, FK)    │
│ status (String)     │          │ extracted (JSONB)        │
│ created_at (DateTime)│         │ missing_fields (JSONB)   │
│ updated_at (DateTime)│         │ is_complete (Boolean)    │
└─────────────────────┘          │ created_at (DateTime)   │
         │                       └─────────────────────────┘
         │ 1:N
         ▼
┌─────────────────────────┐      ┌─────────────────────────┐
│     architectures        │      │        reports           │
├─────────────────────────┤      ├─────────────────────────┤
│ id (UUID, PK)            │      │ id (UUID, PK)            │
│ project_id (UUID, FK)   │      │ project_id (UUID, FK)   │
│ pattern_id (String)     │      │ report_type (String)    │
│ score (Float)           │      │ payload (JSONB)          │
│ nodes (JSONB)           │      │ created_at (DateTime)   │
│ edges (JSONB)           │      └─────────────────────────┘
│ metadata_info (JSONB)   │
│ created_at (DateTime)   │
└─────────────────────────┘
```

### Key JSONB Structures

**`requirements.extracted` (JSONB)** — Stores all discovered field key-value pairs:
```json
{
  "application_type": "web_app",
  "cloud": "aws",
  "users": 100000,
  "traffic": "high",
  "budget": "medium",
  "availability": "high",
  "region": "us-east-1",
  "database": "sql",
  "compliance": "soc2",
  "team_size": "medium",
  "realtime_latency": "no",
  "media_storage": "low"
}
```

**`architectures.nodes` (JSONB)** — Array of graph nodes:
```json
[
  {
    "id": "node-1",
    "type": "cdn",
    "provider": "aws",
    "service": "cloudfront",
    "metadata": { "selected_option": "Option A" }
  },
  {
    "id": "node-2",
    "type": "load_balancer",
    "provider": "aws",
    "service": "alb",
    "metadata": {}
  }
]
```

**`architectures.edges` (JSONB)** — Array of graph edges:
```json
[
  {
    "id": "edge-1",
    "source": "node-1",
    "target": "node-2",
    "relationship": "routes_to",
    "properties": {}
  }
]
```

**`architectures.metadata_info` (JSONB)** — Architecture metadata:
```json
{
  "recommendation_id": "a",
  "recommendation_name": "Option A",
  "validation_passed": true,
  "validation_issues": [],
  "metrics": {
    "cost": 65,
    "complexity": 45,
    "scalability": 90,
    "security": 70,
    "reliability": 80
  }
}
```

---

## 7. State Management & Communication Patterns

### 7.1 Project Lifecycle States
```
  ┌──────────────┐
  │   discovery   │ ← Initial state when project created
  └──────┬───────┘
         │ (Discovery completed → is_complete=true)
         ▼
  ┌──────────────────┐
  │  graph_generated │ ← Architecture generated & validated
  └──────────────────┘
```

### 7.2 Frontend State Flow (Zustand Store)
```
┌──────────────────────────────────────────────────┐
│                Zustand Store                       │
│                                                    │
│  messagesByProject: Record<string, ChatMessage[]>  │
│    ├── Keyed by projectId                          │
│    ├── { id, role: "user"|"dopa", content }       │
│    └── Managed by: addMessage(projectId, msg)      │
│                                                    │
│  isChatActiveByProject: Record<string, boolean>    │
│    └── Per-project chat active tracking            │
│                                                    │
│  currentProject: Project | null                    │
│  selectedRecommendation: RecommendationOption | null│
│  selectedNode: GraphNode | null                    │
│  leftSidebarOpen / rightSidebarOpen: boolean       │
└──────────────────────────────────────────────────┘
```

### 7.3 Frontend ↔ Backend Communication Pattern

1. **React Query (TanStack Query)** manages all server state:
   - Queries (GET) auto-fetch on mount, poll at intervals, cache
   - Mutations (POST) trigger on user actions, invalidate queries on success

2. **Auto-Generation Trigger** — When conversation response has `is_complete: true`, the frontend automatically calls `POST /generate` (no user action needed)

3. **Polling** — Project status is polled every 3 seconds to detect state transitions

### 7.4 Three-Layer Conversation Architecture

The conversation system is split into three clean layers, each with a single responsibility:

```
User Message
     │
     ▼
┌─────────────────────────────────┐
│ Layer 1: Discovery Engine       │
│ (Deterministic Parser)          │
│                                 │
│ Input:  Raw text                │
│ Output: Structured facts        │
│         + confidence per field  │
│ No personality, no wording.     │
└─────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────┐
│ Layer 2: Conversation Planner   │
│ (Decision Maker)                │
│                                 │
│ Input:  Structured facts        │
│         + known state           │
│ Output: What's needed next      │
│         What's uncertain        │
│         Assumptions to confirm  │
│ No UI concerns, no wording.     │
└─────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────┐
│ Layer 3: Response Builder       │
│ (Persona / Personality)         │
│                                 │
│ Input:  Planner decisions       │
│ Output: Human-like response     │
│         + Notebook update       │
│ All personality lives here.     │
└─────────────────────────────────┘
     │
     ▼
  Frontend UI
```

**Layer 1 — Discovery Engine** (`discovery_engine.py`):
- Pure deterministic regex/keyword extraction
- Outputs structured facts with confidence scores
- Never generates questions, never sounds human

**Layer 2 — Conversation Planner** (`conversation_planner.py`):
- Goal-based decision making using `discovery-goals.json`
- Priority-ordered evaluation of what's missing
- Context-aware clarification rules from `clarification-rules.json`
- Confidence-based verification (low confidence → ask to confirm)
- No awareness of how responses are worded

**Layer 3 — Response Builder** (`response_builder.py`):
- Takes planner decisions, formats as senior DevOps engineer
- Generates "Observations" sections summarizing what's known
- Adds reasoning explanations (*why* a question matters)
- Builds live-updating Architecture Notebook data
- All personality, no decision-making logic

### 7.5 Architecture Notebook

A live-updating panel that shows the current project state:

```
┌─ Project Overview ───────────────┐
│ Confidence: 74%                  │
│                                   │
│ ✓ Detected:                      │
│   Chat System         (98%)      │
│   AWS                              │
│   India Region                     │
│   ~100k users        (85%)       │
│                                   │
│ ? Remaining:                      │
│   • Real-time latency?            │
│   • Media storage?                │
│   • Peak concurrent users?       │
└───────────────────────────────────┘
```

Updates automatically after every message via React Query polling.

### 7.6 Service-to-Service Communication (Backend)

All services are **deterministic** and **LLM-free**:
```
DiscoveryEngine  ──(DiscoveryResponse)──▶  ConversationPlanner
       │                                          │
       │                                          ▼
       │                                   PlannerResult
       │                                          │
       └──────────────┬───────────────────────────┘
                      │
                      ▼
            ResponseBuilder
                      │
                      ▼
           { message, notebook }
                      │
                      ▼
              Frontend UI
                      │
                      ▼
         (Stored in DB as Requirement)
                      │
                      ▼
PatternEngine    ◀──(RequirementModel)
       │
       ▼
RecommendationEngine ◀──(PatternMatchResult)
       │
       ▼
GraphEngine       ◀──(ArchitectureOption)
       │
       ▼
GraphValidator    ◀──(ArchitectureGraph)
       │
       ▼
(Stored in DB as Architecture)
```

Each service:
- Takes a well-defined Pydantic model as input
- Returns a well-defined Pydantic model as output
- Is stateless (all state is in DB or in the HTTP request scope)
- Reads knowledge base files via `KnowledgeLoader` (singleton-like loader)

---

## 8. End-to-End Flow Walkthrough

### Complete Happy Path

```
Step 1: User creates a project
   └─ Frontend → POST /api/v1/projects/ { name: "My App" }
   └─ Backend → Creates project, status="discovery"
   └─ Response → { id: "proj-123", name: "My App", status: "discovery" }

Step 2: Discovery conversation begins
   └─ Frontend shows: "Describe the application you want to deploy..."
   └─ User: "I want a web app for 100k users"
   └─ Frontend → POST /api/v1/conversation/message { project_id, message }
   └─ Backend DiscoveryEngine:
       ├─ Detects: application_type="web_app", users=100000
       └─ Returns: extracted={...}, missing=["traffic", "budget", ...],
                    next_question="What traffic level?", is_complete=false
   └─ Frontend shows DOPA's follow-up question

Step 3: User provides more info
   └─ User: "High traffic, AWS, medium budget"
   └─ Frontend → POST /api/v1/conversation/message { project_id, message }
   └─ Backend DiscoveryEngine:
       ├─ Extracts: cloud="aws", traffic="high", budget="medium"
       └─ Returns: extracted={...}, missing=["availability", "database"],
                    next_question="What availability?", is_complete=false

Step 4: Continues until is_complete=true
   └─ User provides availability, database, etc.
   └─ Backend returns: is_complete=true
   └─ Frontend detects is_complete:
       ├─ Shows: "✅ All requirements gathered! Generating your architecture..."
       └─ Auto-triggers: POST /api/v1/generate/ { project_id }

Step 5: Architecture generation pipeline
   └─ Backend Generate:
       ├─ PatternEngine: Match pattern (e.g., "elastic-web-app") with score 85
       ├─ RecommendationEngine: Generate 3 options ranked by metrics
       ├─ GraphEngine: Build architecture graph from template
       ├─ GraphValidator: Validate (score=100, passed=true)
       └─ Save to DB & return full response

Step 6: Frontend displays results
   └─ Shows: Recommendation cards with scores & tradeoffs
   └─ Shows: Interactive graph (nodes + edges) with React Flow
   └─ Shows: Validation status, metrics breakdown
```

---

## Appendix: File Mapping

| Layer | File | Purpose |
|-------|------|---------|
| **Frontend Entry** | `frontend/src/app/page.tsx` | Main page |
| **Frontend Layout** | `frontend/src/app/layout.tsx` | Root layout |
| **Frontend API Client** | `frontend/src/lib/api/client.ts` | Axios config |
| **Frontend Conversation API** | `frontend/src/lib/api/conversation.ts` | Message API calls |
| **Frontend Projects API** | `frontend/src/lib/api/projects.ts` | Project API calls |
| **Frontend Generation API** | `frontend/src/lib/api/generation.ts` | Generate API calls |
| **Frontend Hook** | `frontend/src/hooks/use-conversation.ts` | Chat orchestrator |
| **Frontend Store** | `frontend/src/store/index.ts` | Global state |
| **Frontend Types** | `frontend/src/types/*.ts` | TS interfaces |
| **Backend Entry** | `backend/main.py` | FastAPI app |
| **Backend Database** | `backend/database.py` | Async SQLAlchemy engine |
| **Backend Project Router** | `backend/api/v1/projects.py` | Project CRUD endpoints |
| **Backend Conversation Router** | `backend/api/v1/conversation.py` | Message processing endpoint |
| **Backend Generate Router** | `backend/api/v1/generate.py` | Architecture generation endpoint |
| **Backend Discovery Engine** | `backend/services/discovery_engine.py` | NL→structured extraction |
| **Backend Pattern Engine** | `backend/services/pattern_engine.py` | Pattern matching & scoring |
| **Backend Recommendation Engine** | `backend/services/recommendation_engine.py` | Option generation & ranking |
| **Backend Metric Engine** | `backend/services/metric_engine.py` | Service metric evaluation |
| **Backend Graph Engine** | `backend/services/graph_engine.py` | Graph building from templates |
| **Backend Graph Validator** | `backend/services/graph_validator.py` | Graph integrity validation |
| **Backend Knowledge Loader** | `backend/services/knowledge_loader.py` | JSON knowledge base loader |
| **Backend Repository** | `backend/repositories/project_repository.py` | Data access layer |
| **Backend Schemas** | `backend/schemas/` | Pydantic models |
| **Backend Models** | `backend/models/project.py` | SQLAlchemy ORM models |
| **Backend Knowledge** | `backend/knowledge/` | JSON rule files |