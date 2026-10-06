---
status: completed
title: Eventos ao vivo e resolução de interações do autor
type: backend
complexity: high
---

# Task 03: Eventos ao vivo e resolução de interações do autor

## Overview

Transformar eventos do runtime em uma projeção persistida, segura e paginada, e permitir que apenas o autor resolva perguntas e permissões. A fatia mantém distinção entre resposta gravada e entrega confirmada, preservando estados incertos para reconciliação.

<critical>
- ALWAYS READ the PRD, the TechSpec, and their catalogs (`_user_stories.md`, `_tests.md`) before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — implement every task-required test case assigned in ## Tests
</critical>

<requirements>
- 1. MUST persist an allowlisted public event projection with workflow-local ordering and MUST exclude thoughts, credentials, host paths and raw provider payloads.
- 2. MUST expose signed, scoped cursor paging and preserve snapshot/pending-interaction authority independently of historical event pages.
- 3. MUST arbitrate exactly one interaction resolution under lock and retain runtime delivery as pending, delivered, orphaned or unknown truthfully.
- 4. MUST reject stale, foreign, nonauthor and out-of-scope interaction actions without mutating the runtime.
</requirements>

## Subtasks
- [x] 3.1 Normalize safe runtime events and persist an ordered replayable projection.
- [x] 3.2 Implement scoped event/event-detail reads with signed directional cursors.
- [x] 3.3 Persist questions and permission requests with complete safe decision context.
- [x] 3.4 Implement answer and permission arbitration, validation and receipt handling.
- [x] 3.5 Reconcile queue-full, restart and orphan outcomes with the runtime gateway.
- [x] 3.6 Surface interaction state in the workflow snapshot without exposing private runtime data.
- [x] 3.7 Test redaction, ordering, pagination, races and delivery reconciliation.

## Implementation Details

Follow TechSpec sections “Lifecycle and command consistency”, “API Endpoints”, and “Pinned Compozy protocol and evidence”. Build on the contracts and gateways from tasks 01–02; do not implement cancellation/retry settlement or document finalization here.

### Relevant Files
- `packages/api/src/controllers/planningEvents.ts` — persisted worker-event projection precedent.
- `packages/api/src/controllers/planningWorkerEvents.ts` — worker event ingestion boundary.
- `packages/api/src/application/pagination/` — existing cursor/pagination contracts.
- `packages/api/src/routers/taskPlanning.ts` — query/mutation validation and safe transport pattern.
- `packages/api/src/controllers/taskErrorMapper.ts` — safe error translation boundary.
- `packages/api/src/controllers/taskPlanningWorkerController.ts` — worker-side authorization recheck precedent.

### Dependent Files
- `packages/api/src/application/services/spec/specInteractionService.ts` — interaction service and arbitration.
- `packages/api/src/application/services/spec/normalizeSpecEvent.ts` — safe event normalization.
- `packages/api/src/application/services/spec/specEventCursor.ts` — signed cursor scope/direction handling.
- `packages/api/src/controllers/specWorkerController.ts` — runtime ingest and reconciliation caller.
- `packages/api/src/routers/taskSpec.ts` — event, answer and permission procedures.

### Related ADRs
- [ADR-004: Preserve context across interactive runs, cancellation, and retry](adrs/adr-004.md) — durable interaction context and truthful recovery.
- [ADR-008: Persist a separate Spec lifecycle and deliver a cursor-based live projection](adrs/adr-008.md) — sanitized persisted activity and polling contract.

## Deliverables

- Safe, ordered event history and scoped cursor API.
- Durable question/permission workflow with single-winner resolution and confirmed delivery states.
- Every task-required test case assigned in `## Tests` implemented and passing **(REQUIRED)**.

## Tests

Task-required cases assigned from `_tests.md`, the test contract — read each ID's full definition there before writing tests.

- [x] UT-009, UT-010, UT-037, UT-038, UT-039, UT-040 — interaction service, event normalization and reducer behavior.
- [x] IT-021, IT-024, IT-025, IT-027, IT-028, IT-029 — safe activity, access revocation, replay ordering and incomplete output visibility.
- [x] IT-031, IT-032, IT-033, IT-034, IT-035, IT-037, IT-038, IT-039, IT-041, IT-042, IT-044, IT-045, IT-047, IT-048, IT-049 — answer/permission validation, author checks and concurrent resolution.
- [x] IT-152, IT-157, IT-160, IT-161, IT-175, IT-189, IT-190, IT-191, IT-192, IT-193, IT-194 — cursors, error contracts, stale interactions and delivery outcomes.
- [x] IT-204, IT-205, IT-206, IT-207, IT-208, IT-209, IT-210 — replay gap detection, transactional sequencing, redaction and runtime-winner reconciliation.

## Success Criteria

- Every task-required test case implemented and passing.
- No browser-facing event or interaction leaks private runtime content.
- A saved response is never represented as delivered until the runtime confirms it.
