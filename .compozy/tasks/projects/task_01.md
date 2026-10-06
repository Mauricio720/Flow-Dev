---
status: completed
title: Persist the repository-backed project foundation
type: backend
complexity: high
---

# Persist the repository-backed project foundation

## Overview

Replace the prototype project catalog with the durable PostgreSQL representation required by a project that has exactly one verified GitHub repository. This slice establishes the immutable identity, migration safety, access-filtered catalog queries, and versioned detail persistence that every later project operation relies on.

<critical>
- ALWAYS READ the PRD, the TechSpec, and their catalogs (`_user_stories.md`, `_tests.md`) before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — implement every task-required test case assigned in ## Tests
</critical>

<requirements>
- MUST verify that the authentication dependency supplies durable sessions, assignments, administrator state, and `last_project_id` before replacing the prototype catalog.
- MUST persist exactly one immutable GitHub numeric ID and node ID for every retained project, with case-insensitive unique project names and no unverified legacy exception.
- MUST make legacy backfill atomic: unresolved mappings abort before partial constraints or project changes are committed.
- MUST filter catalog and direct project reads by the current actor in SQL, use stable `(created_at,id)` pagination, and never expose raw database errors.
- MUST preserve the project repository ID on versioned detail edits and reject database-level identity replacement.
</requirements>

## Subtasks
- [x] 1.1 Reconcile the delivered authentication persistence contract with the project schema and document any required compatibility changes.
- [x] 1.2 Define the repository-backed project records and DAO contracts used by subsequent project services.
- [x] 1.3 Add durable schema fields, constraints, indexes, and immutable-identity protection for project repositories.
- [x] 1.4 Provide the verified legacy mapping and transactional backfill path, including deployment failure for unresolved rows.
- [x] 1.5 Replace prototype catalog persistence with access-filtered PostgreSQL DAO queries and versioned writes.
- [x] 1.6 Remove or disable import paths that could create a repository-less project after migration.
- [x] 1.7 Cover DAO behavior and migration invariants with focused unit and integration fixtures.

## Implementation Details

Follow the TechSpec data-model, migration, and deployment-precondition sections. Keep application DAO contracts separate from Drizzle implementations; preserve the authentication-owned user, assignment, and session data rather than duplicating it.

### Relevant Files
- `packages/api/src/infra/database/schema.ts` — current Drizzle project and authentication tables.
- `packages/api/drizzle/0000_catalog.sql` — legacy catalog migration baseline.
- `packages/api/drizzle/0001_auth_access.sql` — authentication and assignment migration baseline.
- `packages/api/src/application/database/dao/projectDao.ts` — project persistence contract to replace.
- `packages/api/src/infra/database/dao/projects/drizzleProjectDao.ts` — existing PostgreSQL DAO implementation.
- `packages/api/src/infra/database/dao/projects/inMemoryProjectDao.ts` — prototype implementation to retire from production composition.
- `packages/api/src/cli/catalogImport.ts` — legacy import entrypoint requiring verified-repository behavior or retirement.

### Dependent Files
- `packages/api/src/application/services/projects/projectCatalogService.ts` — will consume verified persistence primitives.
- `packages/api/src/application/services/access/projectAccessService.ts` — will consume durable visible-project queries.
- `packages/api/src/controllers/projectsController.ts` — will map the expanded project record into safe DTOs.
- `packages/api/src/routers/projects.ts` — will switch from in-memory composition after task 03.
- `packages/api/src/infra/database/dao/accessInMemoryDao.ts` — must not remain a production authorization source.

### Related ADRs
- [ADR-001: One GitHub repository is the project source of truth](adrs/adr-001.md) — requires one durable source per project.
- [ADR-005: Persistir identidade imutável do repositório e migrar o catálogo legado](adrs/adr-005.md) — governs backfill, immutable IDs, and deployment failure.

## Deliverables

- Versioned Drizzle migration and verified operational backfill path for repository-backed projects.
- Project DAO contract and PostgreSQL implementation with secure visibility, pagination, uniqueness, and version semantics.
- Removal or prohibition of repository-less project creation after migration.
- Every task-required test case assigned in `## Tests` implemented and passing **(REQUIRED)**.

## Tests

Task-required cases assigned from `_tests.md`, the test contract — read each ID's full definition there before writing tests.

- [x] UT-049 — actor-filtered `ProjectDao.listVisible` returns a stable page and cursor.
- [x] UT-050 — repository uniqueness errors become a safe project conflict rather than a raw SQL error.

### Deferred Gates

- [ ] IT-066 (`feature-gate`) — migration aborts atomically for incomplete backfill and applies verified mappings.
- [ ] IT-068 (`feature-gate`) — direct SQL cannot replace a saved GitHub repository identity.

## Success Criteria

- Every task-required test case implemented and passing.
- A retained project cannot exist without a verified GitHub repository identity.
- Catalog persistence survives restart and enforces authorization, stable pagination, and database invariants.
