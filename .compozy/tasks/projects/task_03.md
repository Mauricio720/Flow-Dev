---
status: pending
title: Deliver protected project operations and connection states
type: backend
complexity: high
---

# Deliver protected project operations and connection states

## Overview

Build the protected project API from the durable data and GitHub authorization foundations. This slice provides all project reads, selection, creation, detail editing, repository access, and personal connection-state behavior through thin tRPC procedures, safe DTOs, and controller-level error translation.

<critical>
- ALWAYS READ the PRD, the TechSpec, and their catalogs (`_user_stories.md`, `_tests.md`) before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — implement every task-required test case assigned in ## Tests
</critical>

<requirements>
- MUST expose exactly the project procedures and inputs defined in the TechSpec, with authenticated identity sourced only from tRPC context.
- MUST limit creation, repository selection, preview, and detail edits to administrators while preserving member visibility rules.
- MUST validate a repository again during creation, make duplicate repository/name outcomes idempotent conflicts, and never permit repository replacement by update input.
- MUST require both current Flow Dev visibility and current personal GitHub access before returning repository context; stale connection state MUST NOT authorize an action.
- MUST resolve connection states for at most 50 visible projects per request without hiding catalog entries or asserting that ambiguous GitHub 404 means deletion.
</requirements>

## Subtasks
- [ ] 3.1 Replace prototype project service behavior with validated creation, detail-edit, conflict, and selection services.
- [ ] 3.2 Implement personal repository read/write access checks and repository-context output.
- [ ] 3.3 Implement visible-project connection-state batching and safe identity-label refresh behavior.
- [ ] 3.4 Expand project DTO mapping and controller error translation without exposing credentials or raw provider failures.
- [ ] 3.5 Define reusable Zod schemas for every project procedure and reject forbidden client-owned identity or repository fields.
- [ ] 3.6 Register protected and administrator tRPC procedures that make one controller call each.
- [ ] 3.7 Compose production DAOs, services, and gateway implementations rather than in-memory production dependencies.
- [ ] 3.8 Cover service, controller, router, and integration contracts with controlled PostgreSQL and GitHub fixtures.

## Implementation Details

Use `layered-backend` and `trpc-nextjs`: application contracts live under `application/`, implementations under `infra/`, controllers own mapping/error translation, and router procedures own only guard, schema, and one controller call. Preserve type-only API exports for browser consumers.

### Relevant Files
- `packages/api/src/application/services/projects/projectCatalogService.ts` — existing prototype project service.
- `packages/api/src/application/services/access/projectAccessService.ts` — current Flow Dev access predicate to extend.
- `packages/api/src/controllers/projectsController.ts` — controller composition and error boundary.
- `packages/api/src/controllers/mappers/projectDtoMapper.ts` — outward project DTO mapping.
- `packages/api/src/schemas/projects.ts` — project procedure input schemas.
- `packages/api/src/routers/projects.ts` — domain tRPC router.
- `packages/api/src/trpc.ts` and `packages/api/src/context.ts` — protected/admin procedure and authenticated context conventions.

### Dependent Files
- `packages/api/src/routers/index.ts` — root router retains the expanded project contract.
- `packages/api/src/index.ts` — type-only router output contract used by web.
- `apps/web/src/lib/trpc/server.ts` and `apps/web/src/lib/trpc/client.ts` — consume inferred project procedures.
- `apps/web/src/features/projects/` — frontend tasks consume only DTOs and procedures defined here.

### Related ADRs
- [ADR-001: One GitHub repository is the project source of truth](adrs/adr-001.md) — creation and edit rules preserve identity.
- [ADR-002: Project membership and GitHub access both govern code use](adrs/adr-002.md) — repository context requires dual authorization.
- [ADR-005: Persistir identidade imutável do repositório e migrar o catálogo legado](adrs/adr-005.md) — DAO and conflict semantics.
- [ADR-006: Resolver estado de conexão por usuário e revalidar ações de repositório](adrs/adr-006.md) — personal state and revalidation behavior.

## Deliverables

- Complete project tRPC API and safe inferred DTO contracts.
- Repository-backed project create/edit/select/catalog behavior with conflict and optimistic-version handling.
- Dual-authorization repository context and batched per-user connection states.
- Every task-required test case assigned in `## Tests` implemented and passing **(REQUIRED)**.

## Tests

Task-required cases assigned from `_tests.md`, the test contract — read each ID's full definition there before writing tests.

- [ ] UT-013, UT-014, UT-015 — project creation normalization, version conflict, and duplicate repository behavior.
- [ ] UT-016, UT-017 — safe DTO mapping and provider-error translation.
- [ ] UT-028, UT-029, UT-030, UT-031 — dual authorization, identity mismatch, and archived repository access.
- [ ] UT-032, UT-033, UT-034 — visible-project connection-state batching and conservative unavailable state.
- [ ] UT-047, UT-048 — authenticated router delegation and forbidden input rejection.
- [ ] IT-046, IT-047, IT-048, IT-049 — list, validation, detail, and selection contracts.
- [ ] IT-050, IT-051, IT-052, IT-053 — repository candidates/preview and durable create/edit contracts.
- [ ] IT-054, IT-055, IT-071 — connection state, repository context, and field-validation contracts.

### Deferred Gates

- [ ] IT-012, IT-013, IT-017, IT-018, IT-019, IT-020, IT-021, IT-022, IT-023, IT-024, IT-025, IT-026, IT-027, IT-028 (`feature-gate`) — protected create/edit concurrency and interruption flows.
- [ ] IT-029, IT-030, IT-032, IT-034, IT-035, IT-036, IT-037, IT-038, IT-039, IT-040, IT-042, IT-044, IT-045, IT-059, IT-060, IT-063 (`feature-gate`) — dual authorization, continuity, failure tables, and boundary errors.

## Success Criteria

- Every task-required test case implemented and passing.
- Every project API operation validates context-derived identity, authorization, and input at its correct boundary.
- No repository-dependent output is returned without a new same-user GitHub check.
