---
name: spec-to-tasks
description: Breaks an approved spec into one document per task plus a manifest, in the Compozy-compatible layout (_tasks.md with the dependency graph and a status table, then task_01.md, task_02.md…). Each task file has a status in its frontmatter, mini-tasks as checkboxes (each a diff reviewable in about 10 minutes, with its files, tests and a "pronto quando" command), the context a fresh agent session needs, and an execution and review log, so the user controls the work step by step. Every requirement and test case gets exactly one owner. Works from a spec-writer spec.md, a PRD plus tech spec, Compozy _prd.md/_techspec.md/_tests.md, a one-shot doc or a design doc. Use whenever the user asks to "quebrar em tarefas", "gerar as tasks", "dividir em mini tarefas", "criar os arquivos de tarefa", "planejar a implementação", "montar o plano de execução", or wants to hand a spec to agents while keeping control of each step. Use only after a spec exists (spec-writer writes it).
---

# Spec to Tasks

Turn a spec into a set of task documents the user can drive one step at a time. Each task is its own file with its own status; the mini-tasks inside it are checkboxes, each with its own proof. Nothing in the spec may be left without an owner.

The layout follows Compozy's (`_tasks.md` plus `task_NN.md`, schema `compozy.tasks/v2`), so the same folder also works with Compozy's executor and its `compozy tasks validate` command. The mini-task, proof and log rules are added on top of it.

## Why this shape

Implementation is often delegated to agents, cheaper ones included, and the user wants to stay in control. That needs three things:
- **Small steps.** A mini-task is a diff you can review in about 10 minutes and that is proven by its own test. A large step drifts without anyone noticing.
- **Self-contained documents.** Each `task_NN.md` holds everything a fresh session needs, so a task can be handed to any agent, at any time, without the conversation that created it.
- **Visible state.**
  - `status` in each file, and the status table in `_tasks.md`, show where the work stands.
  - Ticked mini-tasks show progress inside a task.
  - The log records what was run and with what result.
- **One review at the end.** Each step proves itself with its own command while the work is running. The review against the spec, which is **spec-conformance**, runs once, after every task is completed. It looks at the whole feature, and checks the logs and ticked boxes against real evidence.

## Output layout

Save the files next to the spec (for a spec-writer spec, in `docs/specs/<slug>/`; for Compozy, in `.compozy/tasks/<slug>/`) unless the repository uses another convention:

```
<spec-dir>/
├── spec.md             (or _prd.md + _techspec.md + _tests.md)
├── _tasks.md           manifest: dependency graph, status table, how to execute, final review log, coverage
├── task_01.md          one document per task
├── task_02.md
└── reviews/            final review reports, written by spec-conformance after all tasks
```

Read `references/manifest-template.md` and `references/task-template.md` before writing. They define the exact frontmatter and sections.

## Sizing

**Tasks** (`task_NN.md`) are vertical slices, such as "configuration API" or "settings screen". They set the order and the parallelism:
- contracts come before their consumers;
- a P1 slice should work end to end early;
- tasks with no dependency between them can run in parallel.

Split into tasks only at real boundaries:
- a contract that others depend on;
- disjoint files that can run in parallel;
- a different domain or toolchain;
- an isolated risky step, such as a data migration.

A feature usually has 3–7 tasks.

**Mini-tasks** (the checkboxes inside a task) are the unit of execution and proof. A task usually has 2–6. A mini-task is right-sized when:
1. **It is one reviewable change.** A few files, a diff that reads in about 10 minutes, roughly 200–300 changed lines at most.
2. **It ends in proof.** "Pronto quando" names the exact command (its test, the package typecheck) or the visible behavior that shows it worked.
3. **It leaves the system working.** After it, the build, the typecheck and the existing tests still pass.
4. **Its tests come with it, and they are written per the project's testing skill.** The mini-task that builds a behavior includes the test that proves it; there is never a "write the tests for the above" step. If the user wants strict TDD, split it into a red step (failing test) and a green step (make it pass).

Typical order inside a task: contract or schema → core logic with its unit tests → wiring or integration with its integration test → UI → end-to-end check. Merge a mini-task that has nothing to verify into its neighbor, and put setup in the step that first needs it.

**Complexity** (frontmatter) rates risk, not size: regression surface, concurrency, coordination. It is never a reason to split a task.

If the user asks for big tasks only (one agent run per task, no mini-task control), keep the same files, but write the mini-tasks as one-line subtasks without individual proofs, and say so in `_tasks.md`.

## Workflow

### 1. Read the spec and check readiness

- Read the spec fully, plus everything it links: appendices, ADRs, `_user_stories.md`, `_tests.md`.
- Look for unresolved items that block work: `[PRECISA ESCLARECER]` markers, open questions, missing contracts. List them, and ask whether to resolve them first or to proceed. If proceeding, record the assumption in the affected task file under "Premissas".
- If the input is a context document rather than a spec, say so and recommend writing the spec first with **spec-writer**. Do not silently settle product decisions while planning.

### 2. Load project facts

- **Task types:** if `.compozy/config.toml` has `[tasks].types`, use those. Otherwise use `frontend`, `backend`, `docs`, `test`, `infra`, `refactor`, `chore`, `bugfix`.
- **Read the codebase** for:
  - real file paths;
  - the most similar existing feature, which shows the pattern to mirror;
  - where tests live;
  - the exact commands to run a single test file, the typecheck and the lint.

  Delegate wide exploration to a subagent.
- **Read the project instructions** (AGENTS.md, CLAUDE.md, rules files) for constraints every task must respect, and for verification proportionality.
- **Find the project's testing skill:** look in `.claude/skills/` and `.agents/skills/` for a skill about testing (in this user's projects, `software-testing`). Read its SKILL.md. Every test case you write into the tasks follows it, and every task file points the implementer to it.

### 3. Inventory the spec

List every item that requires work, by its ID:
- REQ, NFR, stories and their scenarios;
- edge cases and "não muda" items;
- decisions that imply work;
- migrations and rollout steps;
- test cases.

A spec-writer verification matrix is compact (each V-xx row names several cases in a few words): expand each row into concrete cases (V-01a, V-01b…), each with its scenario and expected result. A Compozy `_tests.md` already has concrete IDs (UT/IT/E2E); use them as they are.

Never turn anything into a manual-test step. The user runs their own manual test after every task is done. If an older spec still has a manual smoke, a manual spike or an opt-in run against real accounts in its matrix or Definição de pronto, leave it out of the tasks and say so in the plan you present.

Write each concrete case the way the testing skill asks: scenario (input and initial state) → observable expected result, taken from the spec (the oracle) → the boundary that must be real. "Retorna 403 quando o usuário não é membro" is a case; "testar permissões" is not.

### 4. Plan, and present the plan before writing files

Draw the tasks (graph and waves) and the mini-tasks inside each one. Then show the user a compact plan:
- each task with its type, complexity, one-line scope and dependencies;
- its mini-tasks, one line each;
- the number of test IDs per task.

Wait for approval or adjustments before generating the files. The user approving the breakdown is part of the control. Skip this wait only when the user explicitly asked you to generate without confirmation, or when there is nobody to answer; in that case, note it in `_tasks.md`.

### 5. Write the files

- **`_tasks.md`**, from `references/manifest-template.md`:
  - frontmatter with `schema_version: "compozy.tasks/v2"`, `workflow` set to the spec folder name, `graph.nodes` listing every task, and `graph.edges` listing the dependencies (use `[]` when there are none; the graph has no cycles);
  - the status table;
  - the execution protocol;
  - the coverage matrix;
  - the review focus.
- **`task_NN.md`**, one per task, from `references/task-template.md`:
  - **Frontmatter:** `status: pending`, `title`, `type`, `complexity`. Dependencies live only in `_tasks.md`.
  - **Body:**
    - overview and the standard execution rules block;
    - requirements, using the spec's IDs and MUST/SHOULD language;
    - interfaces (consumes/produces, with exact names);
    - the mini-tasks, each with **Arquivos**, **Testes** and **Pronto quando**;
    - relevant and dependent files, and related decisions;
    - the assigned tests;
    - success criteria;
    - an empty "Registro de execução".
  - The manifest carries an empty "Revisão final" section; there are no per-task reviews.
- **Numbering:** sequential (`task_01`, `task_02`…), with mini-tasks numbered `01.1`, `01.2`… The `title` must match the file's H1.

### 6. Self-review

Fix problems inline.

1. **Coverage:** every inventoried ID appears in exactly one task's "Testes atribuídos" or "Requisitos", and every test ID is assigned exactly once. A test case that fits no task means a slice is missing: fix the breakdown, do not drop the case.
2. **Graph:** every task file is a node, every node has a file, the edges have no cycles, and no task consumes something produced by a task that is not upstream of it.
3. **Mini-task size:**
   - a mini-task you could not review in about 10 minutes gets split;
   - one with nothing to verify gets merged.
4. **Self-containment:** a fresh agent could execute each task with only its file, the spec and the repo.
5. **Interface consistency:** names and types match across tasks.
6. **No empty steps:** no "tratar erros", "TBD", "ajustes finais" or "escrever os testes".
7. **Format and graph validation:** run the bundled checker and fix every ERRO it prints:
   ```bash
   python3 -I <skill-dir>/scripts/tasks_status.py <spec-dir>
   ```
   It is read-only, and it checks the Compozy `compozy.tasks/v2` rules:
   - `workflow` matches the folder name;
   - nodes match the files;
   - the graph has no cycles;
   - the frontmatter keys and values are valid;
   - each title matches its H1;
   - no test ID is assigned twice.

   If a Compozy 0.2.x CLI with `compozy tasks validate` is installed, run that as well. The installed CompozyOS 0.7.x has a different `task` command and does not validate these folders.

### 7. Hand off

Report to the user:
- the folder;
- the counts (tasks, mini-tasks, waves);
- which tasks can run in parallel;
- the first mini-task to run;
- any blockers or assumptions.

Remind them of the loop from `_tasks.md`: implement one mini-task or task at a time in fresh sessions, each proven by its "Pronto quando". When every task is `completed`, run **spec-conformance** once on the whole feature; if it fails, apply its correction prompt and review again. Progress can be seen at any time with `python3 -I <skill-dir>/scripts/tasks_status.py <spec-dir>`, which prints the status table, the mini-task counts, what is blocked and the next mini-task to run.

## Reference files

| File | Read when |
|---|---|
| `references/manifest-template.md` | Writing `_tasks.md`: frontmatter graph, status table, execution protocol, coverage |
| `references/task-template.md` | Writing each `task_NN.md`: frontmatter, sections, the mini-task format, the logs |
| `scripts/tasks_status.py` | Validating the folder (step 6), and showing progress and the next step at any time |
