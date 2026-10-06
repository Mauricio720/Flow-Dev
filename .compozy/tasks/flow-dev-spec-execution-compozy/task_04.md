---
status: completed
title: Pacotes imutáveis, validação, captura e aprovação exata
type: backend
complexity: high
---

# Task 04: Pacotes imutáveis, validação, captura e aprovação exata

## Overview

Interpretar pacotes Spec como documentos completos e imutáveis, com relações verificáveis e uma promoção recuperável para o checkout canônico. A revisão e a aprovação passam a referenciar bytes capturados, hash, versão e documentos companheiros exatos, nunca o conteúdo corrente do disco.

<critical>
- ALWAYS READ the PRD, the TechSpec, and their catalogs (`_user_stories.md`, `_tests.md`) before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — implement every task-required test case assigned in ## Tests
</critical>

<requirements>
- 1. MUST parse bounded UTF-8 regular files losslessly and reject traversal, links, unexpected paths and altered approved inputs before promotion.
- 2. MUST validate required companions, source byte ranges/hashes, document/index relations, dependency graph, decision state and unique test ownership before review readiness.
- 3. MUST capture source bytes, hashes, blocks, diagnostics and package index immutably; current checkout files MUST NOT be the review source.
- 4. MUST use a durable prepared-to-installed promotion journal with compare-and-swap hashes and recover conflicts/crashes without overwriting external drift.
- 5. MUST approve only the exact current unapproved package, manifest hash and version after worker-owned disk verification; approval MUST NOT dispatch a next stage.
</requirements>

## Subtasks
- [x] 4.1 Define the source-linked document, package-index, manifest and diagnostic contracts.
- [x] 4.2 Parse PRD, TechSpec and Tasks documents with complete safe source-block retention.
- [x] 4.3 Validate companion documents, graph targets/cycles, decisions and test/gate ownership.
- [x] 4.4 Capture bounded candidate bytes and immutable package/document records.
- [x] 4.5 Implement journaled promotion, verification and crash/conflict reconciliation.
- [x] 4.6 Implement exact-version approval gates and immutable approval persistence.
- [x] 4.7 Test package integrity, recovery, source coverage and approval races with real PostgreSQL.

## Implementation Details

Follow TechSpec sections “Data Models”, “Workspace, isolation and artifact consistency”, and “Human View and client behavior”. Consume the candidate workspace from task 02 and settled runtime attempts from task 03; do not implement frontend rendering or the adjustment/retry command flows here.

### Relevant Files
- `packages/api/src/infra/database/schema/tasks/planning.ts` — focused Drizzle schema, constraints and trigger precedent.
- `packages/api/drizzle/0012_steady_planning.sql` — generated migration, FK, trigger and rollback pattern.
- `packages/api/src/infra/database/dao/tasks/planningReviewCommands.ts` — locked command/receipt/approval transaction precedent.
- `packages/api/src/infra/database/dao/tasks/taskPublicationApproval.ts` — immutable approval pattern.
- `packages/api/src/application/database/dao/taskPlanningDao.ts` — application DAO versus infra implementation boundary.
- `packages/api/src/infra/database/dao/tasks/drizzleTaskPlanningDao.ts` — focused Drizzle DAO composition.
- `apps/web/src/features/issues/issue-composer/markdownModel.ts` — intentionally insufficient regex preview that this backend model must not reuse.

### Dependent Files
- `packages/api/src/application/spec/documents/` — new parser, validator, diff and link helpers.
- `packages/api/src/application/services/spec/specCaptureService.ts` — capture and finalization orchestration.
- `packages/api/src/application/database/dao/taskSpecDao.ts` — package, document, finalization and approval persistence.
- `packages/api/src/infra/database/schema/tasks/spec*.ts` — Spec tables and constraints.
- `packages/api/src/infra/database/dao/spec/` — capture, finalization and approval helpers.
- `packages/api/test/database.ts` — Spec migration registration for disposable PostgreSQL tests.

### Related ADRs
- [ADR-003: Review every stage through a Human View and request changes from the agent](adrs/adr-003.md) — exact reviewed version and explicit approval.
- [ADR-005: Keep repository artifacts and the Flow Dev review synchronized without Git publication](adrs/adr-005.md) — local artifact and review consistency.
- [ADR-009: Capture immutable document packages with recoverable filesystem promotion](adrs/adr-009.md) — byte capture and promotion journal.
- [ADR-010: Build faithful stage-specific Human Views from a validated document model](adrs/adr-010.md) — lossless source-linked model.

## Deliverables

- Validated, immutable Spec package/document model and package-index contract.
- Recoverable workspace promotion and exact-version approval behavior.
- Every task-required test case assigned in `## Tests` implemented and passing **(REQUIRED)**.

## Tests

Task-required cases assigned from `_tests.md`, the test contract — read each ID's full definition there before writing tests.

- [x] UT-011, UT-012, UT-021, UT-022, UT-023, UT-024, UT-025, UT-026, UT-033, UT-034, UT-035, UT-036, UT-077, UT-078, UT-079, UT-080 — capture, parse, graph, ownership, source-link, approval and package-index contracts.
- [x] IT-051, IT-052, IT-054, IT-055, IT-056, IT-057, IT-058, IT-059, IT-061, IT-062, IT-064, IT-065, IT-068 — companion completeness, captured package reads and approval integrity.
- [x] IT-071, IT-072, IT-073, IT-074, IT-075, IT-076, IT-077, IT-078, IT-079, IT-153, IT-154, IT-155, IT-165 — Tasks graph/index, package read and scope validation.
- [x] IT-186, IT-187, IT-188, IT-214, IT-215, IT-216, IT-217, IT-218, IT-219, IT-220, IT-221, IT-222, IT-223, IT-224, IT-225, IT-226, IT-227, IT-228, IT-229, IT-235 — approval blockers, promotion journal recovery, artifact validation, ownership and limits.

## Success Criteria

- Every task-required test case implemented and passing.
- Review-ready packages are complete, immutable and faithfully represented from captured source bytes.
- Any external drift, malformed artifact or blocking interpretation gap prevents promotion or approval safely.
