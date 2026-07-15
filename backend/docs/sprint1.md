# DOPA Sprint 1 End-to-End Flow

Before starting implementation, review [Docs/pre_sprint1_launch_checklist.md](D:/Mine/DOPA/Docs/pre_sprint1_launch_checklist.md).


## ðŸŒŸ Sprint 1 Execution Pipeline

```mermaid
graph TD
    A[Discovery] --> B[Requirements]
    B --> C[Pattern Selection]
    C --> D[Recommendations]
    D --> E[User Approval]
    E --> F[Architecture Graph]
    F --> G[Terraform Generation]
    G --> H[Security Analysis]
    G --> I[Cost Analysis]
    G --> J[Validation]
    H --> K[Explanation Engine]
    I --> K
    J --> K
    K --> L[Report Generation]
    L --> M[Artifact Packaging]
```

---

## ðŸ› ï¸ Detailed Sequence Diagrams

### Phase 1: Project Creation
```mermaid
graph TD
    User -->|Create Project| Frontend
    Frontend -->|POST /projects| Project_Service
    Project_Service --> projects_table[(projects table)]
    projects_table --> Output[Output: project_id]
```

### Phase 2: Requirement Discovery
```mermaid
graph TD
    User -->|I need an ecommerce platform| Conversation_Engine
    Conversation_Engine --> Requirement_Completeness_Check
    Requirement_Completeness_Check --> question_flows[question-flows.json]
    question_flows --> Missing_Fields{Missing Fields?}
    Missing_Fields -->|Yes| Ask_Question[Ask Question]
    Missing_Fields -->|No| Requirement_Engine
```
*Example requirements gathered: Cloud Provider, Traffic, Region, Database, Availability, Budget.*

### Phase 3: Requirement Normalization
```mermaid
graph TD
    Conversation_Engine --> Requirement_Engine
    Requirement_Engine --> Extract_Data[Extract Structured Data]
    Extract_Data --> requirements_table[(requirements table)]
    requirements_table --> Output[Requirement Model]
```

### Phase 4: Pattern Selection
```mermaid
graph TD
    Requirement_Model --> Pattern_Engine
    Pattern_Engine --> architecture_patterns[architecture-patterns.json]
    architecture_patterns --> Pattern_Matching
    Pattern_Matching --> Pattern_Scoring
    Pattern_Scoring --> Output[Best Pattern]
```
**Cloud-Agnostic Knowledge Base:** The `architecture-patterns.json` schema is designed to be cloud-agnostic, easily supporting AWS, Azure, or GCP configurations later.

### Phase 5: Recommendation Generation
```mermaid
graph TD
    Pattern_Engine --> Recommendation_Engine
    Recommendation_Engine --> recommendation_rules[recommendation-rules.json]
    recommendation_rules --> Generate_Options[Generate: Option A, Option B, Option C]
```

### Phase 6: User Approval
```mermaid
graph TD
    Recommendations --> Frontend
    Frontend --> User_Selects[User Selects Option]
    User_Selects --> Save_Selection[Save Selection]
```

### Phase 7: Architecture Graph Generation
```mermaid
graph TD
    Selected_Option --> Graph_Engine
    Graph_Engine --> service_capabilities[service-capabilities.json]
    service_capabilities --> Build_Nodes[Build Nodes & Edges]
    Build_Nodes --> Graph_Validation
    Graph_Validation --> architecture_graphs_table[(architecture_graphs table)]
    architecture_graphs_table --> Output[Nodes & Edges]
```
**Interactive Architecture Canvas:** The generated Architecture Graph functions as an interactive sandbox in the UI. Users can click nodes to change configurations, triggering real-time re-runs of Security validations and Architecture Checks (Cost validations run once at final generation).

### Phase 8: Terraform Generation
```mermaid
graph TD
    Graph --> Terraform_Engine
    Terraform_Engine --> terraform_catalog[terraform-module-catalog.json]
    terraform_catalog --> Template_Resolver
    Template_Resolver --> Module_Generator
    Module_Generator --> TF_Package[Terraform Package: provider.tf, variables.tf, modules/]
```

### Phase 9: Parallel Analysis
```mermaid
graph TD
    TF_Package --> Security_Engine
    TF_Package --> Cost_Engine
    TF_Package --> Validation_Engine
```

**Security Flow**
```mermaid
graph TD
    TF_Package --> security_rules[security-rules.json]
    security_rules --> Checkov
    Checkov --> Trivy
    Trivy --> Security_Findings[Output: Risk Level]
```

**Cost Flow**
```mermaid
graph TD
    TF_Package --> cost_rules[cost-rules.json]
    cost_rules --> Pricing_Engine
    Pricing_Engine --> Cost_Report[Output: Monthly Cost]
```

**Validation Flow**
```mermaid
graph TD
    TF_Package --> validation_rules[validation-rules.json]
    validation_rules --> Architecture_Checks
    Architecture_Checks --> Validation_Report[Output: Status]
```

### Phase 10: Terraform Validation
```mermaid
graph TD
    TF_Package --> tf_fmt[terraform fmt]
    tf_fmt --> tf_validate[terraform validate]
    tf_validate --> Validation_Result[Output: tf_status]
```

### Phase 11: Explanation Engine
```mermaid
graph TD
    Inputs[Security Report, Cost Report, Validation Report, Architecture Graph] --> Explanation_Engine
    Explanation_Engine --> Decision_Rationale[Decision Rationale]
    Explanation_Engine --> Tradeoff_Analysis[Tradeoff Analysis]
    Explanation_Engine --> NL_Summary[Natural Language Summary]
```
*The Explanation Engine generates natural language rationale for why each architectural decision was made, including tradeoff analysis and justification for component selections.*

### Phase 12: Report Generation
```mermaid
graph TD
    Inputs2[Graph, Security Report, Cost Report, TF Report, Validation, Explanation] --> Report_Engine
    Report_Engine --> HLD
    Report_Engine --> LLD
    Report_Engine --> Security
    Report_Engine --> Cost
    Report_Engine --> Validation
    Report_Engine --> Explanation[Explanation Report]
```

### Phase 13: Artifact Packaging
```mermaid
graph TD
    Outputs[TF, HLD, LLD, Security, Cost, Validation, Explanation] --> Artifact_Builder
    Artifact_Builder --> ZIP_Package
    ZIP_Package --> Storage[(Storage/artifacts)]
```

---

##  Final User Flow

```mermaid
graph TD
    A[Create Project] --> B[Answer Discovery Questions]
    B --> C[Review Architecture Options]
    C --> D[Select Option]
    D --> E[Review Estimated Cost]
    E --> F[Review Real-time Security]
    F --> G[Approve & Download Artifacts]
```
