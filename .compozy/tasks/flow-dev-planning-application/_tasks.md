---
schema_version: "compozy.tasks/v2"
workflow: flow-dev-planning-application
graph:
  nodes:
    - id: task_01
      file: task_01.md
    - id: task_02
      file: task_02.md
    - id: task_03
      file: task_03.md
    - id: task_04
      file: task_04.md
  edges:
    - from: task_01
      to: task_02
    - from: task_01
      to: task_03
    - from: task_02
      to: task_03
    - from: task_03
      to: task_04
---

# Continue Published Issues into Planning Task List

## Execution Notes

- `task_01` establishes additive durable planning state; it never replaces `tasks.status = published`.
- `task_02` is the protected command/read boundary. `task_03` may be built after it because worker completion requires its authoritative projection and error contract.
- `task_04` consumes the completed API and worker behavior inside the existing Issues feature. No task starts a route after planning approval.
- Dev Control planning v1 is an external delivery under ADR-006. Local implementation may use deterministic fixtures; only its staging gates establish provider readiness.

## Gate Plan

| Owning surface | Deferred IDs | Command and trigger |
| --- | --- | --- |
| Local API/worker integration | IT-022, IT-033, IT-082 (`feature-gate`) | After tasks 01–03: `pnpm --filter @flow-dev/api test:integration` with disposable PostgreSQL and controlled Dev Control HTTP fixtures. |
| Real Dev Control contract | IT-071, IT-072, IT-073, IT-074, IT-075 (`feature-gate`); IT-076 (`qa-release`) | Before release, after the external owner deploys staging: execute the API contract harness against staging, including replay and provider-controlled retention. |
| API performance | IT-077 (`qa-release`) | Before release: run the documented 10,000-task/20-reader projection measurement against representative PostgreSQL infrastructure. |
| Complete local browser journeys | E2E-001, E2E-002, E2E-003, E2E-004, E2E-005, E2E-006, E2E-007, E2E-008, E2E-009, E2E-010, E2E-011, E2E-012, E2E-013, E2E-014, E2E-015, E2E-016, E2E-017, E2E-018, E2E-021, E2E-022, E2E-023, E2E-025, E2E-026, E2E-027, E2E-029, E2E-030 (`feature-gate`) | After task 04: `pnpm --filter web test:e2e` with isolated users, seeded publications, and deterministic local provider fixtures. |
| Release UX/browser and external non-action checks | E2E-019, E2E-020, E2E-024, E2E-028, E2E-031 (`qa-release`) | Before release: run accessibility/browser matrix and Dev Control/GitHub audit checks in dedicated staging; record human rationale-review evidence. |
