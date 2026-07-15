# DOPA Low-Level Design (LLD)

## 1. Repository Structure
For Sprint 1, DOPA will use a modular monorepo approach.

```text
dopa/
â”œâ”€â”€ apps/
â”‚   â”œâ”€â”€ frontend/
â”‚   â””â”€â”€ backend/
â”œâ”€â”€ services/
â”‚   â”œâ”€â”€ conversation-engine/
â”‚   â”œâ”€â”€ requirement-engine/
â”‚   â”œâ”€â”€ pattern-engine/
â”‚   â”œâ”€â”€ recommendation-engine/
â”‚   â”œâ”€â”€ graph-engine/
â”‚   â”œâ”€â”€ security-engine/
â”‚   â”œâ”€â”€ cost-engine/
â”‚   â”œâ”€â”€ validation-engine/
â”‚   â”œâ”€â”€ terraform-engine/
â”‚   â”œâ”€â”€ report-engine/
â”‚   â””â”€â”€ explanation-engine/
â”œâ”€â”€ knowledge/
â”œâ”€â”€ templates/
â”œâ”€â”€ schemas/
â”œâ”€â”€ generated/
â”œâ”€â”€ evaluation/
â”‚   â”œâ”€â”€ requirements/
â”‚   â”œâ”€â”€ patterns/
â”‚   â”œâ”€â”€ graphs/
â”‚   â””â”€â”€ security/
â””â”€â”€ docs/
```

## 2. Backend Architecture
```mermaid
graph TD
    Frontend[Frontend: Next.js] --> FastAPI[Backend: FastAPI]
    FastAPI --> App_Services[Application Services]
    App_Services --> DB[(PostgreSQL)]
    App_Services --> Cache[(Redis - Optional)]
    App_Services --> Storage[Local / S3]
```

## 3. Conversation Engine
* **Purpose:** Requirement discovery.
* **Input:** `{"message": "Deploy ecommerce application"}`
* **Output:** `{"next_question": "Expected daily traffic?"}`
* **Data Model:** `{"project_id": "123", "conversation": []}`

**Internal Flow:**
```mermaid
graph TD
    User_Message --> Context_Loader
    Context_Loader --> Requirement_Completeness_Checker
    Requirement_Completeness_Checker --> Question_Generator
    Question_Generator --> Response
```

## 4. Requirement Engine
* **Purpose:** Convert chat into structured data.
* **APIs:** 
  * `POST /requirements/extract`
  * `GET /requirements/{projectId}`

**Schema:**
```json
{
 "project_id": "123",
 "cloud": "aws",
 "region": "ap-south-1",
 "application_type": "ecommerce",
 "users_per_day": 10000,
 "availability": "high",
 "database": "postgresql",
 "budget": "medium"
}
```

## 5. Knowledge Base
* **Folder:** `knowledge/`
* **Contents:**
  * `architecture-patterns.json`
  * `tradeoff-rules.json`
  * `service-capabilities.json`
  * `security-rules.json`
  * `validation-rules.json`
  * `cost-rules.json`
  * `question-flows.json`
  * `terraform-module-catalog.json`
  * `recommendation-rules.json`

**Example `architecture-patterns.json`:**
```json
{
 "pattern": "ecommerce",
 "conditions": {
   "traffic": "medium"
 },
 "services": [
   "cloudfront",
   "alb",
   "ecs",
   "rds"
 ]
}
```

## 6. Pattern Engine
* **Purpose:** Requirement â†’ Architecture Pattern
* **Input:** `{"application_type": "social_media", "users": 5000000}`
* **Output:** `{"pattern": "global_realtime_platform"}`
* **APIs:** `POST /patterns/match`

**Process:**
```mermaid
graph TD
    Requirement --> Pattern_Matcher
    Pattern_Matcher --> Pattern_Scorer
    Pattern_Scorer --> Pattern_Selection
```

## 7. Recommendation Engine
* **Purpose:** Generate A/B/C architectures.
* **Output Example:**
```json
{
 "options": [
   {"name": "A", "type": "cheapest"},
   {"name": "B", "type": "balanced"},
   {"name": "C", "type": "enterprise"}
 ]
}
```

**Internal Flow:**
```mermaid
graph TD
    Pattern --> Rule_Engine
    Rule_Engine --> Generate_Options
```

## 8. Architecture Graph Engine
*The most important module. It serves as the Source of Truth.*

**Internal Flow:**
```mermaid
graph TD
    Input --> Node_Builder
    Node_Builder --> Edge_Builder
    Edge_Builder --> Graph_Validator
    Graph_Validator --> Graph_Serializer
```

* **APIs:** 
  * `POST /graph/generate`
  * `GET /graph/{projectId}`

**Schemas:**
```json
// Graph
{ "nodes": [], "edges": [] }

// Node
{
 "id": "ecs_1",
 "type": "compute",
 "service": "ecs",
 "metadata": {}
}

// Edge
{
 "source": "alb",
 "target": "ecs",
 "relation": "routes_to"
}
```

## 9. Security Engine
* **Purpose:** Graph Security Analysis
* **Output:** `{"risk": "medium", "findings": []}`

**Flow:**
```mermaid
graph TD
    Graph --> Rule_Loader
    Rule_Loader --> Check_Engine
    Check_Engine --> Findings
```

## 10. Cost Engine
* **Purpose:** Cost Estimation (V1 relies exclusively on `cost-rules.json` to bypass live AWS API latency).
* **Output Example:** `{"monthly_cost": 350, "currency": "USD"}`
* **Breakdown Example:** `{"ecs": 100, "rds": 150, "s3": 20, "alb": 80}`

**Flow:**
```mermaid
graph TD
    Graph --> Resource_Mapper
    Resource_Mapper --> cost_rules[cost-rules.json]
    cost_rules --> Cost_Report
```

## 11. Validation Engine
* **Purpose:** Final Quality Gate
* **Validation Types:** Terraform Validation, Architecture Validation, Security Validation.
* **Tools:** `terraform fmt`, `terraform validate`, Checkov, Trivy.
* **Output:** `{"status": "pass"}`

## 12. Terraform Engine
* **Purpose:** Generate IaC (Infrastructure as Code)
* **Folder Generated:**
```text
terraform/
â”œâ”€â”€ provider.tf
â”œâ”€â”€ variables.tf
â”œâ”€â”€ outputs.tf
â””â”€â”€ modules/
```

**Internal Flow:**
```mermaid
graph TD
    Graph --> Template_Resolver
    Template_Resolver --> Module_Generator
    Module_Generator --> Terraform_Package
```

## 13. Explanation Engine
* **Purpose:** Provide user trust by answering *Why* an architecture was chosen.
* **Input:** Selected Option (e.g., Option A).
* **Output Example:**
  ```json
  {
   "chosen_because": [
     "Team size small",
     "Lower operational overhead",
     "Cost target under $300/month",
     "Kubernetes not required"
   ]
  }
  ```

## 14. Report Engine
* **Purpose:** Generate Documents
* **Inputs:** Graph, Security Report, Cost Report, Terraform Report, Explanation Narrative.
* **Outputs:** `HLD.md`, `LLD.md`, `Security.pdf`, `Cost.pdf`

## 15. Database Design (PostgreSQL)
| Table | Key Columns |
|---|---|
| **users** | id, email, name, plan, created_at |
| **projects** | id, user_id, name, description, cloud_provider, status, current_graph_version, created_at |
| **conversations** | id, project_id, role, message, created_at |
| **requirements** | id, project_id, version, requirements_json, created_at |
| **architecture_graphs** | id, project_id, version, graph_json, pattern_id, created_at |
| **security_reports** | id, project_id, graph_version, risk_score, report_json |
| **cost_reports** | id, project_id, graph_version, estimated_monthly_cost, report_json |
| **validation_reports** | id, project_id, graph_version, status, report_json |
| **terraform_packages** | id, project_id, graph_version, package_path, created_at |
| **reports** | id, project_id, report_type, graph_version, file_path |

## 16. API Layer
**Endpoints:**
* `POST /api/v1/projects`
* `GET  /api/v1/projects/{id}`
* `POST /api/v1/conversation/message`
* `POST /api/v1/requirements/extract`
* `POST /api/v1/patterns/generate`
* `POST /api/v1/recommendations/generate`
* `POST /api/v1/graph/generate`
* `POST /api/v1/terraform/generate`
* `POST /api/v1/security/analyze`
* `POST /api/v1/cost/analyze`
* `POST /api/v1/validation/check`
* `POST /api/v1/explanation/generate`
* `POST /api/v1/reports/generate`

---

## ðŸš€ Sprint 1 Service Flow
```mermaid
graph TD
    User --> CE[Conversation Engine]
    CE --> RE[Requirement Engine]
    RE --> PE[Pattern Engine]
    PE --> RecE[Recommendation Engine]
    RecE --> US[User Selects Option]
    US --> GE[Graph Engine]
    GE --> TE[Terraform Engine]
    TE --> SE[Security Engine]
    TE --> CE2[Cost Engine]
    TE --> VE[Validation Engine]
    SE --> EE[Explanation Engine]
    CE2 --> EE
    VE --> EE
    EE --> RepE[Report Engine]
    RepE --> Artifacts
```

## 17. Core Engines Pipeline Reference

For the pure-Python engine implementation plan, see [Docs/core_engines_pipeline_v1.md](D:/Mine/DOPA/Docs/core_engines_pipeline_v1.md).

