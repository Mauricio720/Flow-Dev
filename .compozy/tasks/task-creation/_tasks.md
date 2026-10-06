---
schema_version: "compozy.tasks/v2"
workflow: task-creation
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
      to: task_04
    - from: task_02
      to: task_03
    - from: task_01
      to: task_05
    - from: task_02
      to: task_05
    - from: task_03
      to: task_05
    - from: task_04
      to: task_05
---

# Task Creation Task List

## Execution Plan

| ID | Task | Type | Complexity | Depends on | Task-required cases |
| --- | --- | --- | --- | --- | ---: |
| task_01 | Durable task core and protected tRPC | backend | high | — | 53 |
| task_02 | Durable generation worker and scoped Issue Author context | backend | critical | task_01 | 45 |
| task_03 | Canonical review and safe GitHub publication | backend | high | task_01, task_02 | 84 |
| task_04 | Groq dictation service and audio boundary | backend | high | task_01 | 34 |
| task_05 | Real, accessible task workspace | frontend | high | task_01, task_02, task_03, task_04 | 57 |

## Gate Plan

These checks are workflow obligations. They are not completion blockers for one task file; run them after their listed surface is integrated, against dedicated test resources only.

| Tier | IDs | Command and trigger |
| --- | --- | --- |
| Feature gate: durable API, authorization, persistence and transport | IT-084, IT-085, IT-086, IT-087, IT-088, IT-089, IT-090, IT-091, IT-114, IT-115, IT-116, IT-117, IT-118, IT-119, IT-127, IT-128, IT-129, IT-130, IT-131, IT-132, IT-133, IT-134, IT-135, IT-140, IT-142, IT-149, IT-151, IT-153, IT-158, IT-159, IT-161, IT-163, IT-236, IT-237, IT-238, IT-239, IT-240, IT-241, IT-242, IT-243, IT-244, IT-245, IT-246, IT-247, IT-248, IT-249, IT-250, IT-251, IT-252, IT-253, IT-254, IT-255, IT-263, IT-266 | `pnpm --dir packages/api test` with disposable PostgreSQL and controlled OAuth/GitHub fixtures after tasks 01 and 03 |
| Feature gate: worker, agent protocol and scoped evidence | IT-076, IT-077, IT-078, IT-079, IT-080, IT-081, IT-082, IT-083, IT-092, IT-093, IT-094, IT-095, IT-096, IT-097, IT-098, IT-099, IT-100, IT-101, IT-102, IT-103, IT-104, IT-105, IT-106, IT-107, IT-108, IT-109, IT-110, IT-111, IT-112, IT-113, IT-164, IT-168, IT-169, IT-171, IT-173, IT-174, IT-175, IT-176, IT-177, IT-178, IT-179, IT-180, IT-181, IT-182, IT-185, IT-187, IT-189, IT-256, IT-257, IT-264, IT-265 | `pnpm --dir packages/api test` plus `npm --prefix ../Dev_Control run build` and its scoped route regression after task 02; use the stub Dev_Control/GitHub service |
| Feature gate: reviewed publication and recovery | IT-194, IT-201, IT-202, IT-204, IT-206, IT-211, IT-212, IT-214, IT-216, IT-217, IT-218, IT-219, IT-220, IT-221, IT-222, IT-223, IT-224, IT-225, IT-226, IT-231, IT-233, IT-235 | `pnpm --dir packages/api test` against a controllable GitHub Issue stub after task 03 |
| Feature gate: Groq and capture cleanup | IT-120, IT-121, IT-122, IT-123, IT-124, IT-125, IT-126, IT-258, IT-259, IT-260, IT-261, IT-262 | `pnpm --dir packages/api test` with real container fixtures and a Groq stub after task 04 |
| Feature gate: browser journeys | E2E-004, E2E-005, E2E-006, E2E-007, E2E-008, E2E-009, E2E-010, E2E-011, E2E-012, E2E-013, E2E-014, E2E-015, E2E-016, E2E-017, E2E-018, E2E-019 | `pnpm --dir apps/web test:e2e` after task 05 with isolated database/session/provider fixtures |
| QA release: scale and responsive accessibility | IT-144, E2E-001, E2E-002, E2E-003, E2E-025, E2E-027 | `pnpm --dir apps/web test:e2e` plus dedicated 100,000-task performance environment before release |
| QA release: real microphone and retention | E2E-020, E2E-021, E2E-022, E2E-026 | Manual matrix on current desktop Chrome, Edge, Firefox, Safari, Android Chrome and iOS Safari; verify Groq ZDR and proxy/trace configuration before release |
| QA release: live external integration | E2E-023, E2E-024 | Dedicated sandbox OAuth user and repository before release; never use production artifacts |

## Assignment Audit

- Task-required cases: 273 — `UT-001` through `UT-146` and 127 `IT-*` cases, assigned once in task files.
- Feature-gate cases: 154 — assigned to this Gate Plan.
- QA-release cases: 12 — assigned to this Gate Plan.
