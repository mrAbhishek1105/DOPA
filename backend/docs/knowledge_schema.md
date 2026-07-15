# DOPA Knowledge Base Schema v0.1

## ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸Ãƒâ€šÃ‚Â§Ãƒâ€šÃ‚Â  Core Design Principle
Knowledge must be:
* **Structured**
* **Versioned**
* **Explainable**
* **Searchable**
* **Provider Agnostic**
* **Human Editable**

**No hardcoded rules inside services.** Everything possible should come from knowledge files.

---

## ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒâ€šÃ‚Â Knowledge Directory
```text
knowledge/
ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ architecture-patterns.json
ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ service-capabilities.json
ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ tradeoff-rules.json
ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ recommendation-rules.json
ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ security-rules.json
ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ validation-rules.json
ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ cost-rules.json
ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ question-flows.json
ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ terraform-module-catalog.json
ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ provider-mappings.json
```

---

## ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ File Schemas

### 1. `architecture-patterns.json`
*(Most important file)*
* **Purpose:** Maps Requirements ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ Architecture Pattern.

**Schema & Example:**
```json
{
 "pattern_id": "global_realtime_platform",
 "name": "Social Media Platform",
 "description": "High throughput, globally distributed real-time platform",
 "conditions": {
   "application_type": "social_media",
   "users": ">1000000"
 },
 "logical_components": [
   "cdn",
   "compute",
   "database",
   "cache",
   "search"
 ],
 "default_services": [
   "cloudfront",
   "eks",
   "aurora",
   "redis",
   "opensearch"
 ],
 "tags": ["global", "realtime", "high-scale"]
}
```

### 2. `service-capabilities.json`
* **Purpose:** Service Selection & Evaluation.

**Schema & Example:**
```json
{
 "service": "ecs",
 "provider": "aws",
 "category": "compute",
 "best_for": [
   "webapps",
   "microservices"
 ],
 "cost_level": "medium",
 "complexity": "medium",
 "scalability": "high",
 "managed": true
}
```

### 3. `tradeoff-rules.json`
* **Purpose:** Decision Intelligence. Explains choices like ECS vs EKS, Aurora vs DynamoDB, Redis vs DAX.

**Schema & Example:**
```json
{
 "decision": "ecs_vs_eks",
 "recommended_when": [
   "small_team",
   "simple_operations"
 ],
 "avoid_when": [
   "complex_kubernetes_needs"
 ],
 "advantages": [
   "easy_management"
 ],
 "disadvantages": [
   "less_control"
 ]
}
```

### 4. `recommendation-rules.json`
* **Purpose:** Generates A/B/C Options (Cheapest, Balanced, Enterprise).

**Schema & Example:**
```json
{
 "pattern": "ecommerce",
 "option_a": {
   "database": "rds_single_az"
 },
 "option_b": {
   "database": "aurora_multi_az"
 },
 "option_c": {
   "database": "aurora_global"
 }
}
```

### 5. `security-rules.json`
* **Purpose:** Security Analysis against the Architecture Graph.

**Schema & Example:**
```json
{
 "rule_id": "db_public",
 "severity": "critical",
 "target_type": "database",
 "condition": {
   "public_access": true
 },
 "message": "Database publicly accessible",
 "recommendation": "Move database into private subnet"
}
```

### 6. `validation-rules.json`
* **Purpose:** Architecture Structural Validation.

**Schema & Example:**
```json
{
 "rule_id": "single_point_failure",
 "severity": "high",
 "condition": {
   "multi_az": false
 },
 "message": "Single point of failure detected"
}
```

### 7. `cost-rules.json`
* **Purpose:** Quick Cost Estimates (Powers the static pricing models in V1).

**Schema & Example:**
```json
{
 "service": "alb",
 "pricing_type": "monthly",
 "baseline_monthly": 25,
 "unit": "per_instance"
}
```

### 8. `question-flows.json`
* **Purpose:** Discovery Engine logic (Extremely Important).

**Schema & Example:**
```json
{
 "application_type": "ecommerce",
 "required_questions": [
   "traffic",
   "database",
   "availability",
   "region",
   "budget"
 ]
}
```

**Dynamic Flow:**
```mermaid
graph TD
    AppType[Application Type] --> ReqQ[Required Questions]
    ReqQ --> MissF[Missing Fields]
    MissF --> NextQ[Next Question to Ask]
```

### 9. `terraform-module-catalog.json`
* **Purpose:** Maps Graph Nodes to Terraform modules.

**Schema & Example:**
```json
{
 "service": "ecs",
 "module_path": "templates/aws/ecs",
 "required_inputs": [
   "vpc_id",
   "subnet_ids"
 ]
}
```

### 10. `provider-mappings.json`
* **Purpose:** Future Multi-Cloud Support. This enables Cloud-Agnostic design.

**Schema & Example:**
```json
{
 "logical_component": "object_storage",
 "aws": "s3",
 "azure": "blob_storage",
 "gcp": "cloud_storage"
}
```

---

## ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ Final Knowledge Flow

### Knowledge Loading Layer
All files are loaded at startup into memory.
```mermaid
graph TD
    Loader[Knowledge Loader] --> MemCache[(In-Memory Cache)]
    MemCache --> PE[Pattern Engine]
    MemCache --> SE[Security Engine]
    MemCache --> CE[Cost Engine]
```

### End-to-End Resolution Flow
```mermaid
graph TD
    Req[Requirements] --> AP[architecture-patterns.json]
    AP --> Pat[Pattern]
    Pat --> RR[recommendation-rules.json]
    RR --> Opt[Options A/B/C]
    Opt --> SC[service-capabilities.json]
    SC --> SS[Service Selection]
    SS --> AG[Architecture Graph]
    
    AG --> TE[Terraform Engine]
    TE --> TMC[terraform-module-catalog.json]
    
    TMC --> SEC[security-rules.json]
    TMC --> COST[cost-rules.json]
    TMC --> VAL[validation-rules.json]
    
    SEC --> EE[Explanation Engine]
    COST --> EE
    VAL --> EE
    
    EE --> RPT[Reports]
```

---

## ÃƒÆ’Ã‚Â¢Ãƒâ€¦Ã‚Â¡ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“ÃƒÆ’Ã‚Â¯Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â Architectural Decision Record (ADR)
**For Sprint 1: Do NOT store knowledge in PostgreSQL initially.**

Instead, use Git-versioned JSON Files.

**Benefits:**
* Easy Updates
* Easy Review (Pull Requests)
* Easy Testing
* Easy AI Generation (LLMs excel at modifying JSON)
* Zero Database Complexity

### 11. `aws-resource-schemas.json`
* **Purpose:** Curated AWS resource schema layer for the Terraform Engine and UI exposure rules.

**How to write it:**
* Create one resource entry per AWS resource type DOPA supports.
* Group resource fields into `basic`, `advanced`, and `expert` exposure tiers.
* Keep `required_fields` separate from `recommended_defaults`.
* Put values DOPA should manage automatically into `managed_fields`.
* Treat this file as the Sprint 1 curated schema; later it can be generated from the offline provider sync cache.

**Example:**
```json
{
  "version": "1.0.0",
  "provider": "aws",
  "mode": "curated",
  "resources": [
    {
      "resource_type": "aws_ecs_service",
      "logical_component": "compute",
      "exposure": {
        "basic_fields": ["cluster", "task_definition", "desired_count"],
        "advanced_fields": ["deployment_minimum_healthy_percent"],
        "expert_fields": ["capacity_provider_strategy"],
        "managed_fields": ["service_connect_configuration"]
      },
      "required_fields": ["cluster", "task_definition"],
      "recommended_defaults": {"launch_type": "FARGATE"}
    }
  ]
}
```
---

## Related Design Note
- [Docs/aws_resource_schema_pipeline.md](D:/Mine/DOPA/Docs/aws_resource_schema_pipeline.md) contains the sync pipeline and field-mapping rules for generating knowledge/aws-resource-schemas.json.

### 12. `architecture-templates.json`
* **Purpose:** Deterministic graph blueprints for the Graph Engine.

**How to write it:**
* One template per architecture pattern.
* Include the exact services that should appear in the graph.
* Use explicit node objects and edge objects.
* Keep edge relationships named and directional.
* Use this file to make graph generation repeatable and easy to regression test.

**Example:**
```json
{
  "pattern_id": "standard_web_app",
  "services": ["cloudfront", "alb", "ecs", "rds"],
  "nodes": [
    { "id": "cloudfront", "type": "cdn", "service": "cloudfront" },
    { "id": "alb", "type": "load_balancer", "service": "alb" },
    { "id": "ecs", "type": "compute", "service": "ecs" },
    { "id": "rds", "type": "database", "service": "rds" }
  ],
  "edges": [
    { "source": "cloudfront", "target": "alb", "relationship": "routes_to" },
    { "source": "alb", "target": "ecs", "relationship": "routes_to" },
    { "source": "ecs", "target": "rds", "relationship": "uses" }
  ]
}
```
