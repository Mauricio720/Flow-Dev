---
status: completed
title: Durable generation worker and scoped Issue Author context
type: backend
complexity: critical
---

# Task 02: Durable generation worker and scoped Issue Author context

## Overview
Deliver durable generation execution and bind the existing Issue Author to the selected Flow Dev task. The worker owns leases and fences while the scoped broker keeps project access and GitHub credentials inside Flow Dev.

<critical>
- ALWAYS READ the PRD, the TechSpec, and their catalogs (`_user_stories.md`, `_tests.md`) before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — implement every task-required test case assigned in ## Tests
</critical>

<requirements>
- MUST claim and settle queued generation through short PostgreSQL leases and fencing without keeping database transactions open during HTTP calls.
- MUST call only the versioned Flow Dev Issue Author route and reject mismatched execution, output or activity envelopes.
- MUST derive repository, actor and access from the active operation; model-controlled input MUST NOT select a token, repository or local filesystem.
- MUST persist actual evidence and tool activity, distinguish done, empty and unavailable outcomes, and validate source bindings.
- MUST keep GitHub credentials and unhashed capabilities out of job payloads, model input and telemetry.
</requirements>

## Subtasks
- [x] 2.1 Define generation envelopes, capability records and scoped context contracts.
- [x] 2.2 Implement the worker command, claims, heartbeats, fences and generation recovery.
- [x] 2.3 Add the Flow Dev Issue Author adapter and validated generation-result handling.
- [x] 2.4 Implement the protected context broker, evidence persistence and repository-scoped GitHub lookups.
- [x] 2.5 Add the Dev_Control v1 route and RequestContext-bound tool client without altering legacy callers.
- [x] 2.6 Verify retained evidence, refinement input limits and stale execution behavior.

## Implementation Details
Follow the worker, Dev_Control and broker design in the TechSpec. Before changing the sibling service, read `../Dev_Control/AGENTS.md` and its required Mastra skill. Keep the existing `/issue-author` route intact; the v1 route must fail closed if trusted Flow Dev context is absent.

### Relevant Files
- `packages/api/src/cli/` — existing CLI convention for the supervised worker command.
- `packages/api/src/application/github/repositoryGateway.ts` — existing GitHub gateway contract to extend with scoped context reads.
- `packages/api/src/infra/github/` — HTTP adapter location for repository context operations.
- `../Dev_Control/src/mastra/agents/issue-author.ts` — existing canonical authoring agent.
- `../Dev_Control/src/mastra/server/issue-author-route.ts` — legacy route that must remain compatible.
- `../Dev_Control/src/mastra/index.ts` — registration point for v1 route and scoped tools.

### Dependent Files
- `packages/api/src/application/services/tasks/` — generation, evidence and operation services.
- `packages/api/src/controllers/` — issue-context controller and worker orchestration.
- `packages/api/src/infra/` — Issue Author HTTP adapter and capability-aware GitHub adapters.
- `../Dev_Control/src/mastra/tools/` — Flow Dev broker client tools.
- `../Dev_Control/src/mastra/schemas/` — canonical v1 envelope parser.

### Related ADRs
- [ADR-004: Ground generation in the selected project's GitHub repository](adrs/adr-004.md) — selected-repository evidence.
- [ADR-006: Persist task revisions and execute durable operations in PostgreSQL](adrs/adr-006.md) — worker ownership and recovery.
- [ADR-007: Bind the existing Issue Author to an operation-scoped context broker](adrs/adr-007.md) — service boundary and capabilities.

## Deliverables
- Supervised API-package worker with durable generation claims, fences and recovery.
- Flow Dev context broker, persisted evidence/activity and scoped GitHub context gateway.
- Compatible Dev_Control v1 Issue Author route and RequestContext tools.
- Every task-required test case assigned in `## Tests` implemented and passing **(REQUIRED)**.

## Tests

Task-required cases assigned from `_tests.md`, the test contract — read each ID's full definition there before writing tests.

- [x] UT-013, UT-014, UT-015, UT-016, UT-017, UT-018, UT-019, UT-020, UT-027, UT-028 — generation result, Issue Author HTTP, context lookup and evidence-binding contracts.
- [x] UT-035, UT-036, UT-063, UT-064, UT-065, UT-066 — worker startup, v1 route authentication and RequestContext tool binding.
- [x] UT-073, UT-074, UT-079, UT-080, UT-081, UT-089 — generation capacity, retained evidence and stale-fence handling.
- [x] UT-097, UT-098, UT-099, UT-100, UT-105, UT-106 — context budgets, safe GitHub scope and final envelope validation.
- [x] IT-069, IT-070, IT-071, IT-072, IT-073, IT-074, IT-075 — authenticated issue-context HTTP contract and durable evidence failures.
- [x] IT-164, IT-165, IT-166, IT-167, IT-170, IT-172 — clarification and generation recovery behavior.
- [x] IT-183, IT-184, IT-186, IT-188 — scoped repository evidence, unavailable lookup and provenance behavior.

### Deferred Gates

- [ ] IT-076 through IT-083 — full Dev_Control v1 HTTP protocol.
- [ ] IT-092 through IT-113, IT-256, IT-257, IT-264, IT-265 — worker restart, broker and cross-service race coverage.

## Verification evidence

- API unit tests: 151 passed; API PostgreSQL integration tests: 136 passed.
- Web tests: 129 passed; API and web typechecks passed; monorepo lint passed.
- Web production build passed with disposable PostgreSQL and local build-only auth values.
- Dev_Control Issue Author contract tests: 6 passed; production build passed.

## Success Criteria
- Every task-required test case implemented and passing.
- A worker can safely resume generation after restart without applying stale results.
- Issue Author tools can retrieve only authorized evidence for the task-bound repository.
