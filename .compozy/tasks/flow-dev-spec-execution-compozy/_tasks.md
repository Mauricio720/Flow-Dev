---
schema_version: "compozy.tasks/v2"
workflow: flow-dev-spec-execution-compozy
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
    - id: task_06
      file: task_06.md
  edges:
    - from: task_01
      to: task_02
    - from: task_01
      to: task_03
    - from: task_02
      to: task_03
    - from: task_01
      to: task_04
    - from: task_02
      to: task_04
    - from: task_03
      to: task_04
    - from: task_01
      to: task_05
    - from: task_02
      to: task_05
    - from: task_03
      to: task_05
    - from: task_04
      to: task_05
    - from: task_01
      to: task_06
    - from: task_02
      to: task_06
    - from: task_03
      to: task_06
    - from: task_04
      to: task_06
    - from: task_05
      to: task_06
---

# Route-driven Spec Execution with Compozy Task List

## Execution Order

`task_01` establishes the durable application contract. `task_02` adds the isolated execution platform; `task_03` persists safe activity and interactions; `task_04` captures reviewable packages; `task_05` completes recovery commands; `task_06` integrates the complete experience in the existing Issues workspace.

## Gate Plan

| Gate IDs | Trigger and command/scope | Owning surface |
| --- | --- | --- |
| IT-240 | After the additive migration is merged: apply the complete migration suite to approved publication/planning fixtures. | Database migration / task_01 |
| IT-241 | After dedicated worker admission is wired: run existing tasks-worker and two waiting Spec fixtures concurrently. | Worker topology / task_02 |
| IT-242, IT-243 | Before accepting an integrated environment: provision disposable private repositories and two isolated workspaces. | Workspace gateway / task_02 |
| IT-244 | Before production rollout: restore a backup with a prepared package and reconcile manifests/runtime. | Capture recovery / task_04 |
| IT-245 | Before frontend release: run backend parsing plus production React Human View fixtures. | Human View / task_06 |
| IT-246 | Before feature enablement: record p95 command, event-visibility and metadata latency against TechSpec budgets. | Integrated service / task_06 |
| E2E-001, E2E-002, E2E-003, E2E-004, E2E-005, E2E-006, E2E-007, E2E-008, E2E-009, E2E-010, E2E-011, E2E-012, E2E-013, E2E-014, E2E-015, E2E-016, E2E-017, E2E-018 | After all six tasks: run the Playwright author, reader, admin, interaction, review, recovery and route-flow suite. | Issues Spec workflow / task_06 |
| IT-247, IT-248, IT-249 | Release qualification: execute the pinned runtime and both separate-document routes with the managed provider account. | Runtime and bundle / task_02 |
| IT-250, IT-251 | Release qualification: exercise one real clarification and one bounded permission request. | Interaction delivery / task_03 |
| IT-252, IT-253 | Release qualification: restart while waiting and verify a real cancellation before retry. | Recovery supervision / task_05 |
| IT-254, IT-255, IT-256, IT-257 | Release qualification: prove container/network isolation, limits/retention and compatibility-drift fail-closed behavior. | Execution platform / task_02 |
| E2E-019, E2E-020 | Release qualification: perform responsive, keyboard, reduced-motion, theme and screen-reader Human View checks. | Human View / task_06 |

This plan contains 25 feature-gate and 13 qa-release obligations. They are workflow gates, not individual task completion blockers.
