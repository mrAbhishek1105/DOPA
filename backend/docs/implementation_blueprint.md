# DOPA Sprint 1 Implementation Blueprint

## ðŸŽ¯ Goal
Build a production-quality MVP that can collect requirements, generate architecture options, build architecture graphs, analyze security, estimate cost, generate Terraform, generate HLD, generate LLD, and package artifacts within **30 - 45 Days**.

## âœ… Success Criteria
A user should be able to:
1. Create a Project
2. Answer Discovery Questions
3. Select an Architecture
4. Review Cost
5. Review Security
6. Download Terraform
7. Download HLD
8. Download LLD
*(All without any manual engineering work).*

---

## ðŸ› ï¸ Technology Stack

### Frontend
* **Recommended:** Next.js 15, TypeScript, TailwindCSS, Shadcn UI, React Flow, TanStack Query.
* **Why:** Fast Development, Excellent UI, Built-in Graph Visualization capabilities.

### Backend
* **Recommended:** FastAPI, Python 3.12, Pydantic, SQLAlchemy, Alembic.
* **Why:** Strong AI Integration ecosystem, Native JSON Handling, Terraform Automation capability.

### Infrastructure
* **Database:** PostgreSQL (Stores Projects, Requirements, Graphs, Reports, Artifacts).
* **Cache:** None (Skipped for Sprint 1, add Redis later).
* **Object Storage:** Local Storage for Sprint 1 (Amazon S3 in Production).

### AI Layer
* **Recommended:** OpenAI / Anthropic / Gemini.
* **Architecture:** Through an **AI Gateway Layer**. Never call providers directly from business logic.

---

## ðŸ“ Repository Structure
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

### Backend Internal Structure
```text
backend/
â”œâ”€â”€ api/
â”œâ”€â”€ services/
â”œâ”€â”€ repositories/
â”œâ”€â”€ models/
â”œâ”€â”€ schemas/
â”œâ”€â”€ utils/
â”œâ”€â”€ knowledge/
â””â”€â”€ templates/
```

---

## ðŸ“… Sprint Phases

### Phase 1 (Week 1): Foundation Setup
* **Backend:** FastAPI Setup, PostgreSQL Setup, Alembic, Authentication.
* **Frontend:** Next.js Setup, Login Page, Dashboard, Project Creation.
* **Database:** Implement `users`, `projects`, `requirements`, `architecture_graphs`.
* ðŸ† **Milestone 1:** User can create projects.

### Phase 2 (Week 2): Discovery Engine
* **Build:** Conversation Engine, Requirement Engine, Question Flow Loader.
* **Implement:** `question-flows.json`.
* ðŸ† **Milestone 2:** Requirements can be collected automatically.

### Phase 3 (Week 3): Pattern Engine & Recommendations
* **Pattern Engine:** Build Pattern Matching, Scoring, and Selection using `architecture-patterns.json`.
* **Recommendation Engine:** Generate Option A, Option B, and Option C using `recommendation-rules.json`.
* ðŸ† **Milestone 3:** Architecture options generated.

### Phase 4 (Week 4): Architecture Graph Engine
* **Build:** Node Builder, Edge Builder, Graph Validator, Graph Serializer.
* **Implement:** Architecture Graph Schema.
* **Store:** `architecture_graphs`.
* ðŸ† **Milestone 4:** Graph generation works.

### Phase 5 (Week 5): Analysis Engines
* **Security:** Rule Loader, Security Scanner (`security-rules.json`).
* **Cost:** Pricing Engine, Cost Calculator (`cost-rules.json` - Static estimation for V1).
* **Validation:** Architecture Validation, Terraform Validation (`validation-rules.json`).
* ðŸ† **Milestone 5:** Security + Cost + Validation reports available.

### Phase 6 (Week 6): Terraform & Reporting
* **Terraform Engine:** Template Resolver, Module Generator, Artifact Builder (`terraform-module-catalog.json`). Templates for `vpc`, `ecs`, `rds`, `alb`, `s3`. Generates `provider.tf`, `variables.tf`, `outputs.tf`.
* **Explanation Engine:** Translates deterministic graph and selection data into natural language rationale (Why Option A was chosen).
* **Report Engine:** Generate `HLD`, `LLD`, `Security`, `Cost`, `Validation`, and `Explanation` documents.
* ðŸ† **Milestone 6:** Downloadable artifacts available.

---

## ðŸ”Œ API Contracts
* **Project:** `POST /projects`, `GET /projects/{id}`
* **Conversation:** `POST /conversation/message`
* **Requirements:** `GET /requirements/{projectId}`
* **Pattern:** `POST /patterns/generate`
* **Recommendations:** `POST /recommendations/generate`
* **Graph:** `POST /graph/generate`
* **Security:** `POST /security/analyze`
* **Cost:** `POST /cost/analyze`
* **Terraform:** `POST /terraform/generate`
* **Reports:** `POST /reports/generate`

---

## ðŸ§  AI Strategy (Critical)

**âœ… USE AI FOR:**
* Requirement Extraction
* Question Generation
* Pattern Explanation
* Tradeoff Explanation
* Report Narratives

**âŒ DO NOT USE AI FOR:**
* Terraform Generation
* Cost Calculation
* Graph Creation
* Security Validation
* Rule Execution
*(These must be deterministic).*

---

## ðŸ”’ Sprint 1 Scope Lock
* **Allowed:** AWS, Terraform, Architecture Graph, Cost, Security, Validation, Reports.
* **Not Allowed:** Azure, GCP, Deployment, Drift Detection, Monitoring, Compliance, Auto Remediation, Agent Swarms.

---

## ðŸŽ¯ Sprint 1 Final Deliverable
* **User Enters:** "Build ecommerce application."
* **DOPA Returns:** Architecture Diagram, Options A/B/C, Cost Report, Security Report, Validation Report, Terraform Package, HLD, LLD.

---

## ðŸ›£ï¸ Post-Sprint 1 Roadmap
```mermaid
graph TD
    S1[MVP Complete] --> S2[Sprint 2]
    S2 -->|Features| F2[Architecture Evolution, Deployment Engine, Multi-Cloud Layer, Graph Diff]
    
    S2 --> S3[Sprint 3]
    S3 -->|Features| F3[Drift Detection, Monitoring, Compliance]
    
    S3 --> S4[Sprint 4]
    S4 -->|Features| F4[AI Advisor, Continuous Optimization, Enterprise Collaboration]
```

---

## ðŸ’¡ Final Recommendation
**Before writing any code, create these files first:**
```text
knowledge/
â”œâ”€â”€ architecture-patterns.json
â”œâ”€â”€ recommendation-rules.json
â”œâ”€â”€ service-capabilities.json
â”œâ”€â”€ security-rules.json
â”œâ”€â”€ validation-rules.json
â”œâ”€â”€ cost-rules.json
â”œâ”€â”€ tradeoff-rules.json
â”œâ”€â”€ question-flows.json
â””â”€â”€ terraform-module-catalog.json
```

---

## Related Pipeline Note
- See [Docs/core_engines_pipeline_v1.md](D:/Mine/DOPA/Docs/core_engines_pipeline_v1.md) for the pure-Python core engine implementation plan and graph template contract.
