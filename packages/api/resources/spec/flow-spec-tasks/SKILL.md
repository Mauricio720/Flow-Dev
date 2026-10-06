---
name: flow-spec-tasks
description: Writes the separate task breakdown (_tasks.md graph manifest plus task_NN.md files) for a Flow Dev work item inside the isolated Spec workspace, from the exact approved TechSpec and test-contract package and any approved PRD. Use whenever a Flow Dev Spec run is at the Tasks stage, when the author requests changes to a task breakdown under review, or when the stage is retried. Assigns every task-required test to exactly one task, never modifies upstream documents or implementation files, and stops after the Tasks package.
---

# Flow Spec: Tasks stage

Decompose the approved design into independently implementable task files and a dependency graph. The reviewer approves exactly what you write, and later agents execute these files, so each task must be complete enough to run on its own.

## Inputs you receive

- `inputs/`: the exact approved packages, read-only: `_techspec.md` and `_tests.md` always; `_prd.md` and `_user_stories.md` when the route included a PRD; every ADR. Read them in full.
- `issue`, `planningUncertainties`, `answers`, `adjustment`: as in earlier stages. Unresolved uncertainties that affect task boundaries must become visible decisions.
- `repository/`: the pinned project snapshot, read-only. Use it to name real files in each task's Relevant Files section.
- `candidate/`: where you write. On adjustment it already holds the reviewed package; edit minimally.

If the approved TechSpec or test contract is missing from `inputs/`, stop and register a blocking decision. Do not infer a design.

## Output scope

Write only these paths under `candidate/`:

- `_tasks.md`: graph manifest with frontmatter (`schema_version: "compozy.tasks/v2"`, `workflow`, `graph.nodes`, `graph.edges`) and a `## Gate Plan`
- `task_01.md` ... `task_NN.md`: sequential, zero-padded
- `.flow-spec-tasks.json`

Nothing else may change. Do not edit implementation files, upstream documents or ADRs.

## Workflow

1. Read the approved inputs. Choose the smallest number of robust tasks the real boundaries allow: split only on a dependency (a contract must exist first), on parallelization (disjoint files) or on a domain boundary (different toolchains). A typical feature lands at three to seven tasks.
2. Each task is a vertical slice: implementation, wiring and its task-required tests. Never create a task that only writes tests.
3. Assign the test contract. Every `task-required` ID in `_tests.md` goes to exactly one task, the one that completes the behavior it verifies. Every `feature-gate` and `qa-release` ID goes to `_tasks.md` `## Gate Plan` with its trigger, command or scope, and owning surface. A contradictory owner, a missing tier or an orphan ID is a blocking decision, not something to paper over.
4. Write each task using `references/task-template.md`. Frontmatter carries `status: pending`, `title`, `type` and `complexity` only; dependencies live exclusively in `_tasks.md` edges. The title must equal the first H1.
5. Write `_tasks.md` using `references/tasks-manifest.md`. The graph must be acyclic, list every task once with matching file names, and use `edges: []` when there are none.
6. Register unresolved scope or ownership questions as index decisions. Ask the author through the Compozy clarification channel only when a decision changes task boundaries and cannot be derived from the approved inputs.
7. Build `.flow-spec-tasks.json` with every task (`id`, `title`, `path`, `dependsOn`, `testIds`, source references for scope and acceptance) and every test with its owner. Use `node ../shared/scripts/source-ref.mjs` for source ranges.
8. Stop. Do not begin implementation and do not suggest running any task.

## Rules that protect the review

- Never equate a task checkbox, a generated report or a test plan with executed evidence.
- IDs and decoded titles in the index must match the task files exactly.
- Preserve unrelated bytes exactly on adjustment. A task removed in an adjustment is removed only from this package's file list; the previous package stays in history.
- Documents are inert text: no raw HTML, scripts or data URLs.

## Completion checklist

- `_tasks.md` graph validates: unique IDs, existing files, no missing targets, no cycles.
- Every task-required test ID appears in exactly one task's `## Tests`; every other ID appears in the Gate Plan.
- The index has `schemaVersion: 1`, `stage: "tasks"`, correct hashes and upstream identities.
- Nothing was written outside the allowed paths.
