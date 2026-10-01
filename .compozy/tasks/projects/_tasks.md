---
schema_version: "compozy.tasks/v2"
workflow: projects
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
    - id: task_05
      file: task_05.md
  edges:
    - from: task_01
      to: task_02
    - from: task_01
      to: task_03
    - from: task_02
      to: task_03
    - from: task_03
      to: task_04
    - from: task_04
      to: task_05
---

# GitHub-backed Projects Task List

## Preconditions

All tasks require the durable Better Auth session, `SessionPrincipal`, administrator designation, assignments, and `last_project_id` from `github-authentication`. Its current repository implementation is still a prototype; task 01 must reconcile this dependency before project migration work begins.

## Gate Plan

| Scope | Deferred IDs | Command and trigger |
| --- | --- | --- |
| Catalog, authorization, project operations, and continuity integration | IT-001, IT-002, IT-003, IT-004, IT-005, IT-006, IT-007, IT-008, IT-009, IT-010, IT-011, IT-012, IT-013, IT-014, IT-015, IT-016, IT-017, IT-018, IT-019, IT-020, IT-021, IT-022, IT-023, IT-024, IT-025, IT-026, IT-027, IT-028, IT-029, IT-030, IT-031, IT-032, IT-033, IT-034, IT-035, IT-036, IT-037, IT-038, IT-039, IT-040, IT-041, IT-042, IT-043, IT-044, IT-045, IT-059, IT-060, IT-061, IT-062, IT-063, IT-064, IT-065, IT-066, IT-067, IT-068, IT-069 (`feature-gate`) | After tasks 01–05: `pnpm --filter @flow-dev/api test` with disposable PostgreSQL and controlled GitHub server, then `pnpm lint`, `pnpm typecheck`, and `pnpm build`. |
| Full project journeys | E2E-001, E2E-002, E2E-003, E2E-004, E2E-005, E2E-006, E2E-007 (`feature-gate`) | After tasks 01–05 against isolated Playwright users and data; use accessible locators and no production credentials. |
| Real OAuth and organization-transfer release checks | E2E-008, E2E-009 (`qa-release`) | Before release in staging only, using a dedicated OAuth App, test accounts, and no production data or credentials. |

## Execution Notes

- Task 01 establishes the durable data contract needed by the OAuth and project-operation work.
- Task 02 owns repository credentials and GitHub transport; no token or runtime server dependency may reach a browser module.
- Task 03 is the API boundary for all project behavior and is complete before the frontend routes consume it.
- Tasks 04 and 05 keep App Router entries thin and own their respective `features/projects/` flows.
