---
schema_version: "compozy.tasks/v2"
workflow: flow-dev-compozy-software-configuration
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
      to: task_04
    - from: task_03
      to: task_04
    - from: task_04
      to: task_05
    - from: task_05
      to: task_06
---

# CompozyOS Software Configuration and Task Flow Choice Task List

## Gate Plan

| Gate IDs | Trigger | Owner |
| --- | --- | --- |
| IT-001, IT-008, IT-015, IT-022, IT-023, IT-024, IT-025, IT-026, IT-027, IT-028, IT-029, IT-036, IT-071, IT-112, IT-113, E2E-001 | After task_02, run the Software router/UI contract suite and the disposable Codex device-login journey. | Software configuration surface |
| IT-043, IT-050, IT-057, IT-064, IT-085, E2E-007 | After task_04, run task-flow admission/provenance integration coverage and reader-access journey. | Task-flow admission surface |
| IT-106, IT-107, E2E-003, E2E-006 | After task_05, run unified package approval, explicit create-spec review, and legacy package-preservation journeys. | Unified package and task workspace |
| IT-078, IT-079, IT-080, IT-081, IT-082, IT-083, IT-084, IT-092, IT-093, IT-094, IT-095, IT-096, IT-097, IT-098, IT-099, IT-108, IT-109, IT-110, IT-111, IT-114, IT-115, E2E-002, E2E-004, E2E-005 | After task_06, run pinned OpenAPI contract fixtures plus disposable Claude/worktree/Loop end-to-end checks. | Expanded runtime actions |

## Coverage Accounting

- Task-required cases: 94, assigned exactly once across `task_01.md` through `task_06.md`.
- Deferred gates: 46 feature-gate cases and 4 qa-release cases, owned above rather than used as individual task blockers.
