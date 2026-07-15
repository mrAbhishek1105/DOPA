# AWS Resource Schema Pipeline for DOPA

This document defines how DOPA should build and maintain `knowledge/aws-resource-schemas.json` from Terraform Registry provider schemas.

## 1. Goal
DOPA should use Terraform Registry as an upstream data source, but not as a runtime dependency.

The registry feeds a local offline sync pipeline, which produces a curated AWS resource schema that DOPA can safely use at runtime.

## 2. Source Of Truth Layers
1. **Terraform Registry**: authoritative source for provider resource capabilities.
2. **Raw schema cache**: machine-fetched provider schema stored offline.
3. **Curated DOPA schema**: the user-facing schema in `knowledge/aws-resource-schemas.json`.
4. **Runtime engines**: read only the curated schema.

## 3. Suggested Data Flow
```text
Terraform Registry
  -> terraform providers schema -json
  -> Raw Provider Schema Cache
  -> Normalizer
  -> Curator
  -> knowledge/aws-resource-schemas.json
  -> DOPA runtime engines
```

## 4. Concrete JSON Contract
`knowledge/aws-resource-schemas.json` should use this structure:

```json
{
  "version": "1.0.0",
  "provider": "aws",
  "source": "hashicorp/aws",
  "synced_at": "2026-06-19T00:00:00Z",
  "provider_version": "5.100.0",
  "mode": "curated",
  "resources": [
    {
      "resource_type": "aws_ecs_service",
      "logical_component": "compute",
      "description": "Managed container service for running stateless workloads.",
      "exposure": {
        "basic_fields": ["cluster", "task_definition", "desired_count"],
        "advanced_fields": ["deployment_minimum_healthy_percent", "deployment_maximum_percent"],
        "expert_fields": ["capacity_provider_strategy", "service_registries"],
        "managed_fields": ["service_connect_configuration", "deployment_circuit_breaker"]
      },
      "required_fields": ["cluster", "task_definition"],
      "optional_fields": ["desired_count", "launch_type"],
      "computed_fields": ["id", "arn"],
      "sensitive_fields": [],
      "recommended_defaults": {
        "launch_type": "FARGATE",
        "desired_count": 2
      },
      "validation_notes": [
        "Use private subnets for application tasks.",
        "Task definition must be compatible with selected launch type."
      ],
      "allowed_modes": ["basic", "advanced", "expert"],
      "tags": ["compute", "container", "managed"]
    }
  ]
}
```

## 5. Field Mapping Rules
When converting Terraform provider schema into DOPA schema, use these rules:

- `required = true` -> include in `required_fields`.
- `optional = true` -> include in `optional_fields`.
- `computed = true` -> include in `computed_fields`.
- `sensitive = true` -> include in `sensitive_fields` and never expose in basic mode.
- Nested blocks -> flatten into curation-friendly groups or keep as expert fields if they are too complex for basic UX.
- Provider-only wiring fields -> place in `managed_fields`.
- Common user decision fields -> place in `basic_fields`.
- Rare but useful tuning fields -> place in `advanced_fields`.
- Deep platform knobs -> place in `expert_fields`.

## 6. Curator Rules
The curator is responsible for turning raw provider detail into DOPA opinion.

- Prefer exposing only fields that change the user’s architecture decision.
- Hide implementation noise, provider internals, and rarely used tuning knobs.
- Promote a field to `basic_fields` only if it is commonly needed to design the system.
- Keep `managed_fields` for values DOPA can set automatically from graph or pattern context.
- If a field is sensitive or easy to misuse, do not expose it in basic mode.

## 7. Sync Steps
A scheduled sync job should follow this order:

1. Select the provider version to sync.
2. Create a temporary Terraform workspace.
3. Pin the AWS provider version.
4. Run `terraform init`.
5. Run `terraform providers schema -json`.
6. Store the raw JSON output in a cache directory.
7. Parse the provider schema and extract resource definitions.
8. Normalize raw schema into a stable internal format.
9. Curate the normalized schema into DOPA exposure tiers.
10. Write `knowledge/aws-resource-schemas.json`.
11. Validate the file with Pydantic and JSON Schema.
12. Commit the updated file through Git when the sync is intentional.

## 8. Sync Cadence
Recommended cadence:
- Manual sync for Sprint 1 and early development.
- Weekly sync once the pipeline is stable.
- Ad-hoc sync when a provider version upgrade is required.

## 9. Versioning Rules
- Store `provider_version` in the generated file.
- Store `synced_at` in UTC.
- Never overwrite schema history without Git version control.
- If the provider schema changes in a breaking way, increment the curated file version and review downstream impacts.

## 10. Implementation Notes
- Keep the sync pipeline offline.
- Never call Terraform Registry from a user request path.
- Cache raw provider schema separately from curated DOPA schema.
- Use the curated schema for UI field exposure, recommendations, and Terraform generation hints.

## 11. Recommended Next Step
After this document is accepted, implement a small sync tool that:
- reads a pinned AWS provider version
- outputs raw schema JSON
- produces `knowledge/aws-resource-schemas.json`
- validates the output before commit