---
status: completed
title: Assigned issue source, discovery, and reconciled claim foundation
type: backend
complexity: high
---

# Assigned issue source, discovery, and reconciled claim foundation

## Overview

Create the durable source and claim foundation that lets Flow Dev discover an eligible assigned GitHub issue, reuse a published task or import an external one, and safely establish one operator. This slice delivers the source/claim transport contract consumed by downstream authorization and the assigned-work UI.

<critical>
- ALWAYS READ the PRD, the TechSpec, and their catalogs (`_user_stories.md`, `_tests.md`) before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — implement every task-required test case assigned in ## Tests
</critical>

<requirements>
- MUST preserve `tasks.id`, actual publication history, and exact verified source snapshots while allowing one imported task per verified issue identity.
- MUST paginate and filter assigned Ready issues from current GitHub facts; client-supplied issue content or identity MUST never be trusted for claims.
- MUST reserve a fenced PostgreSQL claim before provider mutation and mark it claimed only after exact `In Progress` read-back of the existing board item.
- MUST retain uncertain reservations and audit history after provider failure, timeout, or rate limiting; no contender may overtake an unresolved claim.
- MUST expose bounded, authenticated assigned-issue procedures through the existing controller/router composition pattern.
</requirements>

## Subtasks
- [x] 1.1 Add migration-compatible task origin, issue-source, immutable snapshot, claim, and claim-attempt persistence.
- [x] 1.2 Backfill publication-derived sources without fabricating publication records or silently resolving duplicate identities.
- [x] 1.3 Extend GitHub project reads for paginated Ready discovery and exact board-item status mutation/read-back.
- [x] 1.4 Implement verified source, eligibility, claim, and reconciliation application services with durable fencing.
- [x] 1.5 Publish assigned issue DTOs and protected tRPC procedures for discovery, claim status, reconciliation, active work, and work lookup.
- [x] 1.6 Attach source bindings when publication settles and retain imported/published provenance.
- [x] 1.7 Prove migration, provider-race, paging, claim, and transport behavior with the assigned contract cases.

## Implementation Details

Implement the first three Build Order stages only through the claim transport boundary. Follow the TechSpec sections “Data Models” and “Assigned discovery and claim state machine”; downstream operator guards and planning adaptation belong to task 02.

### Relevant Files
- `packages/api/src/infra/database/schema/tasks/records.ts` — task origin/import constraints currently assume an author and publication-only lifecycle.
- `packages/api/src/infra/database/schema/tasks/{boundaries,operations,planning}.ts` — source-compatible references must remain safe for the next slice.
- `packages/api/src/infra/database/schema.ts` — exports new task source and claim tables.
- `packages/api/src/infra/database/dao/tasks/taskPublicationState.ts` — publication settlement must bind its actual issue source.
- `packages/api/src/application/github/projectBoardGateway.ts` — application contract for discovery and exact board mutation.
- `packages/api/src/infra/github/{githubProjectBoardGateway,projectBoardQueries}.ts` — ProjectV2 queries/mutations and provider error classification.
- `packages/api/src/application/github/issueGateway.ts` and `packages/api/src/infra/github/githubIssueGateway.ts` — verified issue-source reads.
- `packages/api/src/controllers/taskPublicationController.ts` — producer of published source bindings.
- `packages/api/src/routers/index.ts` and `packages/api/src/infra/composition.ts` — router registration and production wiring.

### Dependent Files
- `packages/api/src/application/services/assigned-issues/workAuthorization.ts` — task 02 consumes completed claims and snapshots.
- `packages/api/src/controllers/{taskPlanningController,taskSpecController,taskFlowController}.ts` — later operator/source-aware enforcement consumers.
- `apps/web/src/features/issues/assigned-work/` — task 03 consumes assigned-issue procedures and DTOs.
- `packages/api/src/cli/localConnector.ts` — task 04 later relies on durable work/project scope.

### Related ADRs
- [ADR-001: Separate issue authoring from assigned issue work](adrs/adr-001.md) — discovery and first claim begin the distinct work journey.
- [ADR-003: Reuse task identity with verified source snapshots and reconciled claims](adrs/adr-003.md) — source identity, reservation, read-back, and uncertainty rules.

## Deliverables

- Durable source/claim schema, migration/backfill, DAOs, services, GitHub gateway extensions, controller, router, and DTO contract.
- Paginated Ready discovery and reconciled first-claim flow for published and external issues.
- Every task-required test case assigned in `## Tests` implemented and passing **(REQUIRED)**.

## Tests

Task-required cases assigned from `_tests.md`.

- [x] `UT-015`–`UT-019`, `UT-021`–`UT-027`, `UT-086`–`UT-091`, `UT-094` — Ready eligibility, claim validation, source reuse, fencing, replay, provider uncertainty, and exact read-back.
- [x] `IT-001`–`IT-018` — persistence, migration/source identity, claim concurrency/recovery, and discovery provider boundaries.
- [x] `IT-069`–`IT-101` — `assignedIssues` query, claim, reconciliation, active-work, and by-task transport contracts.

### Deferred Gates

- [ ] `E2E-003`–`E2E-005` (`feature-gate`) — browser discovery, concurrent claim, and durable active-work journeys.
- [ ] `E2E-014` (`qa-release`) — sandbox GitHub Ready-to-In-Progress confirmation and duplicate prevention.

## Success Criteria

- Every task-required test case implemented and passing.
- A verified external or published issue maps to at most one durable task/source and one unresolved-or-completed claim.
- A claim cannot report success before the same Project item is read back in `In Progress`.
- No partial provider result exposes a claimable issue or bypasses uncertainty reconciliation.
