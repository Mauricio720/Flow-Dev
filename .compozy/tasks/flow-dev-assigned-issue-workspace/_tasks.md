---
schema_version: "compozy.tasks/v2"
workflow: flow-dev-assigned-issue-workspace
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
    - from: task_02
      to: task_03
    - from: task_02
      to: task_04
    - from: task_03
      to: task_05
    - from: task_04
      to: task_05
---

# Assigned Issue Workspace and Local Project Execution Task List

## Execution Plan

1. `task_01` establishes the durable issue-source and claim contract, then exposes discovery and claim transport.
2. `task_02` migrates author-based controls to current administrator/operator authorization and makes the downstream journey source-aware.
3. `task_03` moves the browser product surface into focused authoring, assigned work, and private local-project settings.
4. `task_04` adds the user-scoped outbound companion, pairing, links, safe HTTP protocol, and CLI.
5. `task_05` consumes the completed contracts to execute local actions safely and settle required gates/evidence.

## Gate Plan

| Gate IDs | Trigger and command | Owning surface |
| --- | --- | --- |
| `IT-031` | After source/claim migration and cutover wiring: `pnpm --dir packages/api test:integration` with the cutover fixture | Source/claim migration |
| `IT-043`, `IT-050`, `IT-053`–`IT-056`, `IT-065` | After local executor, companion protocol, and gate settlement are integrated: focused integration fixture suite | Native companion and gate settlement |
| `E2E-001`–`E2E-008` | After browser authoring, assigned-work, and downstream wiring are integrated: `pnpm --dir apps/web test:e2e` | Feature journey |
| `E2E-009`–`E2E-019` | Release qualification using sandbox GitHub OAuth, two user machines, a local fixture service, and the declared project browsers/services | Hosted/remote-machine release |
| Feature-wide | After all tasks: `pnpm lint`, `pnpm typecheck`, `pnpm build`, affected API integration tests, web tests, and one seeded Chromium journey | Full feature |

All `UT-` and task-required `IT-` cases are assigned exactly once in the task files. Gate IDs above are workflow obligations, not individual task completion blockers.
