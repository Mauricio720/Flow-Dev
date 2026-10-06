---
status: completed
title: Durable task core and protected tRPC
type: backend
complexity: high
---

# Task 01: Durable task core and protected tRPC

## Overview
Deliver the persistent task domain and its protected API boundary. This slice makes task history, accepted commands, revisions and author-scoped access durable before any provider work is attempted.

<critical>
- ALWAYS READ the PRD, the TechSpec, and their catalogs (`_user_stories.md`, `_tests.md`) before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — implement every task-required test case assigned in ## Tests
</critical>

<requirements>
- MUST persist immutable project, author and stable repository bindings, messages, revisions, operations and command receipts in PostgreSQL.
- MUST accept and scope all task reads and mutations through the verified session, current project/repository access and author ownership.
- MUST make start, send, retry, save and refinement commands idempotent with request keys, payload hashes and optimistic versions.
- MUST expose safe, typed tRPC DTOs and errors without driver, credential or provider details.
- SHOULD preserve existing project and repository authorization behavior while replacing only the issue-workspace demo boundary.
</requirements>

## Subtasks
- [x] 1.1 Define the task domain contracts, validation limits and safe error vocabulary.
- [x] 1.2 Add task persistence tables, invariants, migration and transaction-scoped DAOs.
- [x] 1.3 Implement read access, author mutation access, task lifecycle and command receipt rules.
- [x] 1.4 Extend repository credential refresh with database serialization and identity verification.
- [x] 1.5 Expose protected task history, detail, messages, revisions and core mutation procedures.
- [x] 1.6 Compose production dependencies and authenticated request metadata without a demo fallback.
- [x] 1.7 Establish reusable disposable database fixtures for later task-domain integration tests.

## Implementation Details
Follow the TechSpec data model, lifecycle and tRPC failure contract. Keep the router thin; controllers map domain errors while application services and DAOs enforce invariants. Generate the next migration from the current journal and preserve unrelated pending migrations.

### Relevant Files
- `packages/api/src/routers/index.ts` — current root router requires the tasks domain registration.
- `packages/api/src/infra/database/schema.ts` — current schema re-export boundary for Drizzle.
- `packages/api/src/application/services/projects/repositoryAccessService.ts` — existing project and repository authorization rules.
- `packages/api/src/application/github/repositoryAuthorizationService.ts` — credential refresh needs cross-process serialization.
- `packages/api/src/context.ts` — verified principal context requires trusted session metadata.
- `packages/api/src/infra/composition.ts` — existing production dependency composition.
- `apps/web/src/app/api/trpc/[trpc]/route.ts` — existing tRPC adapter boundary.

### Dependent Files
- `packages/api/drizzle/` — generated task-domain migration and journal updates.
- `packages/api/src/controllers/` — task controller and safe DTO/error translation.
- `packages/api/src/routers/` — schemas and task router procedures.
- `packages/api/src/application/` — contracts, services and DAO interfaces.
- `packages/api/src/infra/database/` — Drizzle DAO implementations and table exports.

### Related ADRs
- [ADR-002: Share task history while reserving changes to the author](adrs/adr-002.md) — durable shared read and author-only mutation.
- [ADR-006: Persist task revisions and execute durable operations in PostgreSQL](adrs/adr-006.md) — records, receipts, versions and transactions.

## Deliverables
- PostgreSQL-backed task records, immutable revisions and command receipts with a generated migration.
- Protected `tasks` tRPC core procedures with safe error DTOs and trusted session data.
- Serialized repository credential refresh that rejects a mismatched GitHub identity.
- Every task-required test case assigned in `## Tests` implemented and passing **(REQUIRED)**.

## Tests

Task-required cases assigned from `_tests.md`, the test contract — read each ID's full definition there before writing tests.

- [x] UT-001, UT-002, UT-003, UT-004, UT-005, UT-006, UT-007, UT-008, UT-009, UT-010, UT-011, UT-012 — task transport, controller, access, lifecycle and DAO contracts.
- [x] UT-043, UT-044, UT-045, UT-046 — credential refresh serialization and production composition.
- [x] UT-067, UT-068, UT-069, UT-070, UT-071, UT-072 — immutable record bindings, HTTP policy and input limits.
- [x] UT-090, UT-091, UT-102 — command receipt idempotency and invalid stored-content handling.
- [x] IT-001, IT-002, IT-003, IT-004, IT-005, IT-006, IT-007, IT-008, IT-009, IT-010 — real router/controller/DAO wiring for history and core commands.
- [x] IT-136, IT-137, IT-138, IT-139, IT-141, IT-143 — history loading, pagination, filtering and protected project scope.
- [x] IT-145, IT-146, IT-147, IT-148, IT-150, IT-152 — durable resumption, ordering and revision access.
- [x] IT-154, IT-155, IT-156, IT-157, IT-160, IT-162 — typed-message validation, acceptance and request-key recovery.

### Deferred Gates

- [ ] IT-084 through IT-091 — migration and persistent invariants in a disposable database.
- [ ] IT-114 through IT-119, IT-127 through IT-135 — OAuth identity, transport and redaction checks.

## Verification evidence

- API unit tests: 151 passed; API PostgreSQL integration tests: 136 passed.
- Web tests: 129 passed; API and web typechecks passed; monorepo lint passed.
- Web production build passed with disposable PostgreSQL and local build-only auth values.
- Dev_Control Issue Author contract tests: 6 passed; production build passed.

## Success Criteria
- Every task-required test case implemented and passing.
- A fresh authenticated request can create, resume and safely mutate its own durable task without browser-memory state.
- Readers can see only currently authorized task content and cannot acquire author mutation powers.
