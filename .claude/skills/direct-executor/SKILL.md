---
name: direct-executor
description: >-
  Execute implementation work already classified as DIRECT: the requested behavior is clear and the repository provides enough established patterns to implement it without inventing product, domain, security, contract, lifecycle, or persistent-data semantics. Use this skill whenever a DIRECT task is authorized for execution, whether authorization comes explicitly from the user (for example "executa direto", "implementa essa task", "roda o executor direto", "/direct-executor") or from an active orchestration flow handing off a DIRECT task artifact. Also use for DIRECT tasks from .task-agent/tasks/. Implement, verify, update execution state, and report a structured outcome. Stop with ROUTING_MISMATCH if implementation reveals specification-level uncertainty; return BLOCKED instead when the route remains DIRECT but an environment, credential, dependency, tooling, or external-service constraint prevents safe completion. Do not use this skill to choose the route, create a PRD/TechSpec, or redefine requirements.
---

# Direct Executor

Execute tasks whose route is `DIRECT`.

`DIRECT` describes **decision uncertainty, not implementation size**. A task can be large and still be DIRECT when WHAT to build is settled and HOW to build it is sufficiently established by repository patterns and low-risk local choices.

## Execution contract

Start only when all of these are true:

1. Execution is authorized by the user **or by the active orchestration flow**.
2. A concrete task exists: a `.task-agent/tasks/` artifact, issue, or task description in context.
3. The known task does not require you to define product behavior, domain rules, permission/security semantics, lifecycle, consequential architecture, public contract semantics, rollout policy, or a new persistent data model.

If `task-orchestrator` produced a routing record, read it before implementation.

If the recorded route is `TECHSPEC` or `SPEC_DRIVEN`, do not silently treat it as DIRECT. When the user explicitly overrides that route, state the recommended route and unresolved risk once, record the override, and proceed only while no missing specification decision must be invented.

## Outcome model

Every run ends in exactly one execution outcome:

- `COMPLETED` — requested implementation is complete and the reported verification actually ran.
- `PARTIAL` — useful in-scope work was completed, but one or more non-specification items remain incomplete; describe them precisely.
- `BLOCKED` — DIRECT remains the correct route, but execution cannot safely continue because of environment, credentials, dependencies, tooling, external services, or another operational constraint.
- `ROUTING_MISMATCH` — new evidence shows DIRECT is no longer safe because a specification-level decision is required.

Do not use `ROUTING_MISMATCH` for ordinary operational failures. Do not use `BLOCKED` to conceal missing requirements.

## Guardrails

- Keep scope to the task; avoid opportunistic refactors.
- Do not run a synthetic PRD/TechSpec interview inside this skill.
- Do not invent product, domain, security, contract, lifecycle, or persistent-data semantics.
- Ask only questions that clarify an already-defined requirement or select a low-risk local implementation option.
- Stop instead of hiding a routing problem behind a chain of clarification questions.
- Never claim a check passed unless it actually ran and passed.
- Do not commit, push, open a PR, or perform another irreversible/external action unless that action is separately authorized.

## Phase 1 — Load task context

Read the best available task source and preserve its authority:

- normalized task description, discussion, acceptance criteria, and attachments;
- routing record, including route, confidence, rationale, and reconnaissance findings;
- previous execution history and override markers.

Identify the affected repository areas. Do not broaden scope merely because adjacent cleanup is visible.

## Phase 2 — Load applicable project guidance

Always read `CLAUDE.md` and `.claude/rules/code-standards.md` when present.

Activate the skills that match the affected surface and follow them:

| Affected area | Skill to follow |
|---|---|
| `packages/api`, routers, controllers, DAOs, `@polvilho/api` contract | `$polvilho-backend` |
| `apps/web` file placement, features, pages, hooks, providers | `$polvilho-frontend-structure` |
| React/Next.js implementation decisions | `$vercel-react-best-practices` |
| Meaningful user-facing UI | `$impeccable` |
| Supabase, Auth, Edge Functions | `$supabase` |
| Postgres schema, migrations, RLS, indexes, queries | `$supabase-postgres-best-practices` |
| Stripe integration | `$stripe-best-practices` |
| User-visible flow needing E2E coverage | `.claude/rules/e2e-testing.md` |

A small diff can still depend on important local rules, so do not skip an applicable area skill based only on change size.

## Phase 3 — Prepare and reconnoiter

Before implementation, choose the lightest verification that provides trustworthy evidence, following the `Verificação` section of `AGENTS.md`, and design the tests with `$software-testing`:

- ordinary DIRECT work: the affected test files (`pnpm --dir <pacote> exec vitest run <arquivo>`) and the typecheck of the changed package;
- database schema, migrations or persistence: also `pnpm --dir packages/api test:integration`, which starts a disposable PostgreSQL by itself (it needs `pg_config`, `initdb` and `pg_ctl`; do not set `TEST_DATABASE_URL` locally);
- a user-visible flow covered by a Playwright spec: only the affected spec (`.agents/rules/e2e-testing.md`).

Before editing:

1. read each likely change site with enough surrounding context;
2. find and reuse the closest established pattern;
3. identify consumers and side effects of changed symbols/contracts;
4. inspect existing tests covering the behavior;
5. establish a verification plan proportional to the change risk.

This is implementation reconnaissance, not a second routing pass. However, if reconnaissance reveals specification uncertainty, return `ROUTING_MISMATCH` immediately.

## Phase 4 — Classify unknowns before asking

Classify every blocking unknown:

- **implementation** — clarifies an already-defined requirement or selects among low-risk local options consistent with existing behavior. You may ask it.
- **specification** — would define/change product behavior, scope, user flow, domain rule, permission/security semantics, lifecycle, consequential architecture, persistent data model, public contract semantics, or rollout policy. Do not ask it here; return `ROUTING_MISMATCH`.

After an implementation question is answered, reassess the answer. A seemingly local question can expose specification-level scope.

## Phase 5 — Implement

Make the smallest coherent change that satisfies the task and local project rules.

Preserve existing contracts unless the task explicitly changes them. Update affected consumers when an authorized contract change requires it.

Add or update tests proportionally to risk:

- bug fix → reproduce and cover the regression when viable;
- backend behavior → cover the affected controller/service/DAO/contract;
- UI behavior → cover the critical interaction/state when practical;
- schema/contract change → update compatibility-defining consumers and tests.

If execution becomes operationally impossible while DIRECT is still valid, stop with `BLOCKED`. Preserve already-safe changes and identify what is needed to resume.

## Phase 6 — Verify

Discover verification commands from package scripts, CI config, `CLAUDE.md`, and applicable project rules. Run the narrowest useful checks plus required project gates.

Typical checks include:

- `pnpm --filter @polvilho/api check` after API changes;
- `pnpm --filter @polvilho/db check` after schema, migration, or seed changes;
- `pnpm --filter @polvilho/web typecheck` when contracts or web consumption change;
- targeted tests, lint, and build when relevant;
- targeted Playwright in one browser for a changed visible flow when practical;
- multi-browser/full E2E only for browser-compatibility work, explicit release/QA gates, or risk that specifically requires it.

Task completion is not release certification. Do not inflate narrow verification into a release-level claim.

If a check fails:

- fix it when the cause is inside the authorized task scope;
- return `PARTIAL` or `BLOCKED` when the remaining cause is outside scope or cannot be resolved safely;
- never omit or relabel the failure.

## Phase 7 — Structured outcomes

### ROUTING_MISMATCH

Use when new evidence makes DIRECT unsafe:

```yaml
status: ROUTING_MISMATCH
route: DIRECT
trigger:
  type: user_answer | repository_evidence | integration_constraint | other
  question: null | string
  answer: null | string
new_evidence:
  - string
discovered_uncertainty:
  category: product | domain | technical | security | contract | data
  description: string
recommended_route: TECHSPEC | SPEC_DRIVEN
recommended_skill: $cy-create-techspec | $cy-create-prd
changes_already_made:
  - path: string
    summary: string
working_tree_safe_to_leave: true | false
reason: string
```

Do not re-route yourself. The user or orchestrator owns the next routing decision.

### BLOCKED

Use when DIRECT remains valid but execution cannot continue operationally:

```yaml
status: BLOCKED
route: DIRECT
blocker:
  type: environment | credentials | dependency | tooling | external_service | permissions | other
  description: string
completed_changes:
  - path: string
    summary: string
remaining_work:
  - string
verification_completed:
  - command: string
    result: pass | fail
safe_to_resume: true | false
resume_when: string
```

### COMPLETED / PARTIAL

Expose a machine-readable summary before the human report:

```yaml
status: COMPLETED | PARTIAL
route: DIRECT
override_from: null | TECHSPEC | SPEC_DRIVEN
task:
  id: null | string
  title: string
changes:
  - path: string
    summary: string
verification:
  - command: string
    result: pass | fail
residual_risks:
  - string
remaining_work:
  - string
recommended_next: null | $executar-qa | $quick-commit | string
```

For `COMPLETED`, `remaining_work` should normally be empty and completion-critical verification must have passed.

## Phase 8 — Human report and task history

After the structured outcome, provide a concise human-readable report:

```markdown
## Executed

**Task**: {title}
**Route**: DIRECT{ (user override of TECHSPEC|SPEC_DRIVEN) }
**Status**: {COMPLETED|PARTIAL|BLOCKED|ROUTING_MISMATCH}

### Changes
- `path` — summary

### Clarifications
{implementation questions asked and answers, or "None."}

### Verification
- `{command}` → pass/fail

### Residual risks
{none identified, or concise list}

### Next
{single most useful next action, as a suggestion only}
```

If the task came from `.task-agent/tasks/`, append the execution event to `## Execution History` and update its `Execution:` state to match the outcome. Preserve the routing record unchanged.

Suggest `$quick-commit` rather than committing unless commit authorization was part of the task.
