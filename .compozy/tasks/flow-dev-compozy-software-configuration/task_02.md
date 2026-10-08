---
status: completed
title: "Deliver Software configuration and Codex connection"
type: backend
complexity: high
---

# Task 02: Deliver Software configuration and Codex connection

## Overview

Deliver the administrator-owned Software vertical slice: global settings, readiness, audit, safe connection catalog, and browser-led Codex lifecycle. This makes configuration visible and actionable without granting task authors administrative access or exposing credential material.

<critical>
- ALWAYS READ the PRD, the TechSpec, and their catalogs (`_user_stories.md`, `_tests.md`) before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — implement every task-required test case assigned in ## Tests
</critical>

<requirements>
- MUST make every `software.compozy.*` read and mutation administrator-only, including direct route access and operations after an administrator role changes.
- MUST persist settings, connections, authentication operations, and redacted audit entries with compare-and-swap revisions and idempotent writes.
- MUST offer the Codex ChatGPT subscription/device flow without accepting an API key, token, auth file, private path, or raw upstream transcript in the browser.
- MUST render application, account, runtime, and host readiness as distinct safe states; a saved form or authenticated account MUST NOT imply runnable status.
- MUST preserve historical identities and existing legacy data while connections are renamed, disconnected, retried, or unavailable.
</requirements>

## Subtasks

- [x] 2.1 Add the additive Software settings, connection, auth-operation, and audit persistence contract.
- [x] 2.2 Deliver administrator authorization, CAS, idempotency, validation, and redacted audit behavior.
- [x] 2.3 Expose the Software tRPC query and mutation surface through thin controllers and routers.
- [x] 2.4 Integrate the opaque capability and credential services into Codex connection, polling, confirmation, reconnect, and disconnect behavior.
- [x] 2.5 Add the guarded global Software navigation and `/admin/software/compozy` experience.
- [x] 2.6 Implement accessible settings, readiness, connection, device-login, and audit UI states with safe pagination.
- [x] 2.7 Cover administrator, validation, concurrency, recovery, catalog, and audit cases at the designated test boundaries.

## Implementation Details

Follow the TechSpec “Data Models”, “API Endpoints”, and “Config Lifecycle”, plus the UI/UX map. Consume task 01 ports; do not give this feature browser authority over host provisioning or legacy global provider execution. Use thin App Router entrypoints and the project tRPC/layered backend patterns when implementing this vertical slice.

### Relevant Files

- `packages/api/src/routers/access.ts` — router authorization and composition pattern.
- `packages/api/src/controllers/accessController.ts` — controller/DTO error-translation pattern.
- `packages/api/src/infra/composition.ts` — server dependency composition.
- `packages/api/src/infra/database/schema.ts` — schema export boundary.
- `packages/api/src/infra/spec/specConfiguration.ts` — legacy configuration authority to preserve for old workflows.
- `packages/api/src/infra/spec/specConfigurationProbe.ts` — host/runtime diagnostics input.
- `apps/web/src/app/admin/access/page.tsx` — server-side global admin guard pattern.
- `apps/web/src/features/access/access-management/index.tsx` — global admin feature composition precedent.
- `apps/web/src/components/shared/AppHeader.tsx` — global navigation integration point.

### Dependent Files

- `packages/api/src/infra/database/schema/software.ts` — new Software data model.
- `packages/api/drizzle/0014_software_configuration.sql` — additive Software migration and generated metadata.
- `packages/api/src/application/database/dao/softwareDao.ts` — Software persistence contract.
- `packages/api/src/infra/database/dao/software/drizzleSoftwareDao.ts` — transactional persistence implementation.
- `packages/api/src/application/services/software/softwareService.ts` — permissions, settings, readiness, Codex lifecycle, and audit rules.
- `packages/api/src/controllers/softwareController.ts` and `packages/api/src/routers/software.ts` — tRPC boundary.
- `packages/api/src/schemas/software.ts` — bounded Zod inputs and pagination.
- `apps/web/src/app/admin/software/compozy/page.tsx` — thin protected route entry.
- `apps/web/src/features/software/compozy/` — feature-owned Software components, hooks, and local view models.

### Related ADRs

- [ADR-001: Configure Compozy from a global Software area](adrs/adr-001.md) — global ownership and host diagnostics.
- [ADR-003: Connect Codex with ChatGPT in-app without exposing credentials](adrs/adr-003.md) — Codex subscription flow and safe account state.
- [ADR-004: Use pinned CompozyOS control contracts and catalog](adrs/adr-004.md) — source of runtime readiness.

## Deliverables

- Additive Software persistence, tRPC API, and administrator UI for settings, readiness, connections, and audit.
- A safe browser-led Codex connection/reconnection/disconnection lifecycle backed by task 01's opaque broker.
- Every task-required test case assigned in `## Tests` implemented and passing **(REQUIRED)**.

## Tests

Task-required cases assigned from `_tests.md`, the test contract — read each ID's full definition there before writing tests.

- [x] UT-001, UT-002, UT-003, UT-004, UT-022 — administrator enforcement, settings CAS/idempotency, audit, and setting bounds.
- [x] IT-002, IT-003, IT-004, IT-005, IT-006, IT-007 — guarded global Software route, session recovery, role loss, concurrent/retried reads, and global discoverability.
- [x] IT-010, IT-011, IT-012, IT-013, IT-014 — first-run, stale, changed, and shared-host readiness states.
- [x] IT-016, IT-017, IT-018, IT-019, IT-020, IT-021 — settings validation, authorization, CAS, idempotency, and revalidation.
- [x] IT-030, IT-031, IT-032, IT-034 — safe reconnect identity, absent connections, authorization, and repeated disconnect.
- [x] IT-037, IT-038, IT-039, IT-040, IT-041, IT-042 — connection labels, empty state, access, collision, historical identity, and pagination.
- [x] IT-072, IT-073, IT-074, IT-075, IT-076, IT-077 — redacted audit write, access, ordering, idempotency, and pagination behavior.

### Deferred Gates

- [ ] IT-001, IT-008, IT-015, IT-022, IT-023, IT-024, IT-025, IT-026, IT-027, IT-028, IT-029, IT-036, IT-071, IT-112, IT-113 (`feature-gate`) — execute the full Software contract and lifecycle integration suite after this slice.
- [ ] E2E-001 (`qa-release`) — execute Codex device authorization only with a disposable test account and isolated test environment.

## Success Criteria

- Every task-required test case implemented and passing.
- Only administrators can read or change Software state, including via a direct URL.
- Settings, account state, readiness, and audit history are safe, paged, and non-secret.
- No Codex API-key fallback or host-provisioning claim is introduced.
