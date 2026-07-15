# ADR-001: Offline Terraform Schema Sync and Curation Layer

- **Status:** Proposed
- **Date:** 2026-06-19
- **Owner:** DOPA Architecture

## Context
DOPA is intentionally designed to stay deterministic and fast at runtime. As the platform grows, it will need richer Terraform provider metadata than a hand-written catalog can comfortably hold forever.

The architecture challenge is to keep DOPA opinionated and easy to use while avoiding request-time dependence on Terraform Registry.

## Problem
DOPA needs Terraform provider metadata to help generate high-quality infrastructure recommendations and to expose only the fields that matter to the user.

Fetching Terraform Registry schemas at request time would make the platform slower, less reliable, and dependent on an external service for core architecture work.

The team also needs a way to separate:
- what Terraform allows
- what DOPA should expose
- what DOPA should recommend

Those concerns are not the same.

## Decision Drivers
- Runtime latency must stay low.
- Runtime behavior must stay deterministic.
- External registry availability must not affect user requests.
- The system must remain scalable as provider schemas grow.
- Sprint 1 must stay simple and shippable.
- DOPA should expose architecture-relevant fields, not every Terraform knob.

## Options

### Option 1: Fetch Terraform Registry schemas on every request
Use live Terraform Registry calls whenever a user asks DOPA to design infrastructure.

**Pros**
- Always uses the latest provider metadata
- No local sync job to maintain

**Cons**
- Adds latency to every request
- Makes DOPA dependent on external availability
- Creates provider version drift during user sessions
- Scales poorly as schema volume grows

### Option 2: Manual knowledge files only
Keep only hand-written files such as `terraform-module-catalog.json`.

**Pros**
- Simple for Sprint 1
- Fully deterministic
- No external dependency

**Cons**
- Hard to maintain at scale
- Slow to expand across many Terraform resources
- Manual updates become a bottleneck
- Does not capture the full richness of provider schemas

### Option 3: Offline schema sync plus curation layer
Run a background sync job that fetches Terraform provider schemas, normalizes them, and stores them locally. DOPA then uses a curation layer to expose only the fields relevant to each architecture context.

**Pros**
- Fast runtime behavior
- No request-time dependency on Terraform Registry
- Versioned and cacheable
- Enables basic/advanced/expert exposure modes
- Separates raw schema knowledge from DOPA opinion

**Cons**
- More moving parts than manual files
- Requires sync tooling, versioning, and cache invalidation rules
- Best introduced after Sprint 1

## Decision
DOPA will **not** fetch Terraform Registry schemas at runtime.

Instead, DOPA will use a layered model:

1. Terraform Registry schema fetch happens offline in a sync job.
2. The raw schema is normalized into a local cache.
3. A curation layer maps raw provider fields to DOPA-exposed fields.
4. The architecture engine consumes the curated metadata, not the raw registry directly.

For Sprint 1, DOPA will continue using manual knowledge files such as:
- `terraform-module-catalog.json`
- `service-capabilities.json`
- `architecture-patterns.json`

The offline schema sync and curation layer is a **Sprint 2+ capability**.

## Implementation Notes
- Run schema fetches as an offline sync job, not per request.
- Normalize provider schemas before storing them locally.
- Version cached schemas so DOPA can reproduce historical architectures.
- Add a curation layer that marks fields as:
  - exposed
  - recommended
  - hidden
  - managed automatically
- Keep manual knowledge files as the Sprint 1 source of truth.

## Consequences

### Positive
- DOPA stays fast and predictable at runtime
- Provider registry outages do not break user requests
- DOPA remains an architecture product, not a raw Terraform explorer
- The system can scale to many provider schemas without exposing unnecessary complexity

### Negative
- A separate sync pipeline must be built and maintained
- Schema versioning must be tracked carefully
- Curation rules need governance so they do not drift from real provider behavior

### Notes
- Request-time registry fetching is rejected for DOPA.
- Cached schemas should be treated as versioned knowledge, not live dependencies.
- The curation layer should separate:
  - valid fields
  - recommended fields
  - hidden/managed fields

## Follow-up Actions
- Define the local schema cache format.
- Define the curation JSON schema.
- Decide the offline sync cadence.
- Add provider version tracking to the schema cache.
- Add tests for curated field exposure.

## References
- [Docs/knowledge_schema.md](D:/Mine/DOPA/Docs/knowledge_schema.md)
- [Docs/DEVELOPMENT_RULES.md](D:/Mine/DOPA/Docs/DEVELOPMENT_RULES.md)
- [Docs/sprint1.md](D:/Mine/DOPA/Docs/sprint1.md)