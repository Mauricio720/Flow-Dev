---
schema_version: "compozy.tasks/v2"
workflow: issue-deletion
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
      to: task_03
    - from: task_02
      to: task_04
    - from: task_03
      to: task_04
    - from: task_04
      to: task_05
---

# Issue Deletion Task List

The graph is the only source of task dependencies. Tasks 01 and 02 may proceed independently. A task is complete after its own task-required tests pass; the gate plan below is evaluated at the stated workflow point.

| Task | Type | Complexity | Deliverable | Task-required cases |
| --- | --- | --- | --- | ---: |
| [01 — Durable operation, fences, and purge](task_01.md) | backend | critical | Persist identity-bound operations, block conflicting writes, and clean task-owned records transactionally. | 7 |
| [02 — GitHub Issue deletion gateway](task_02.md) | backend | high | Inspect the exact Issue, enforce provider permission, delete it, and prove absence. | 8 |
| [03 — Local deletion and work interruption](task_03.md) | backend | critical | Expose protected preview/start/status/retry and complete safe local-only deletion after stopping work. | 27 |
| [04 — Linked and Ready Issue deletion](task_04.md) | backend | critical | Complete published/imported/queue deletion with remote reconciliation and safe retry. | 23 |
| [05 — Deletion experience](task_05.md) | frontend | high | Add confirmation, progress, recovery, and safe navigation to all three issue surfaces. | 3 |

## Gate Plan

The API command for each `IT-*` gate is `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts -t '<ID>'`. The web command for each `E2E-*` gate is `pnpm --dir apps/web exec playwright test --grep '<ID>'`, against isolated development fixtures as required by `.agents/rules/e2e-testing.md`. Each gate's exact ID replaces `<ID>`; the focused command identifies the case independently of its eventual spec filename.

| ID | Tier | Trigger point | Owning surface / scope |
| --- | --- | --- | --- |
| IT-005 | feature-gate | After task 03 | API task edit/start transaction race and post-fence write exclusion. |
| IT-006 | feature-gate | After task 03 | API persisted status after client disconnect. |
| IT-009 | feature-gate | After task 03 | API saved-task pagination and search after purge. |
| IT-013 | feature-gate | After task 04 | API concurrent starts for one linked Issue identity. |
| IT-019 | feature-gate | After task 04 | API Ready claim/deletion transaction race. |
| IT-020 | feature-gate | After task 04 | API queue status despite board failure or stale board data. |
| IT-023 | feature-gate | After task 04 | API multi-assignee queue refresh and duplicate prevention. |
| IT-028 | feature-gate | After task 03 | API worker restart, exact-run recovery, and stale lease rejection. |
| IT-032 | feature-gate | After task 03 | API isolation of cancellation between concurrent task runs. |
| IT-036 | feature-gate | After task 04 | API concurrent retry and single provider sequence. |
| IT-037 | feature-gate | After task 04 | API restart after remote deletion and before local cleanup. |
| IT-041 | feature-gate | After task 04 | API independent progress across rate-limited pending operations. |
| IT-048 | feature-gate | After task 04 | API PR opened during stop remains untouched. |
| IT-052 | feature-gate | After task 04 | API independently merged branch/closed PR remain unchanged. |
| IT-053 | feature-gate | After task 04 | API artifacts and active work of another issue remain untouched. |
| E2E-001 | feature-gate | After task 05 | Web saved draft confirmation, cancel, deletion, and stale route. |
| E2E-002 | feature-gate | After task 05 | Web published Issue progress and second-tab convergence. |
| E2E-003 | feature-gate | After task 05 | Web Ready queue deletion and refreshed pagination. |
| E2E-005 | feature-gate | After task 05 | Web GitHub refusal, retry, and truthful completion. |
| E2E-006 | feature-gate | After task 05 | Web unauthorized control and direct mutation protection. |
| E2E-004 | qa-release | Release verification after task 05 | Web isolated local execution stop and preserved worktree. |
| E2E-007 | qa-release | Release verification after task 05 | Web keyboard, screen-reader, narrow-viewport confirmation and navigation. |

The release verification also runs the package suites and checks required by `AGENTS.md`: `pnpm --dir packages/api test`, `pnpm --dir packages/api test:integration`, `pnpm --dir apps/web test`, relevant typechecks/lint, and `pnpm --dir apps/web build` because the flow changes visible routes. Full E2E is reserved for the feature or release gate.
