---
provider: manual
pr:
round: 1
round_created_at: 2026-10-06T18:24:24Z
status: resolved
file: packages/api/src/application/services/task-flow/taskFlowDispatcher.ts
line: 78
severity: high
author: claude-code
provider_ref:
---

# Issue 005: Task creation bypasses artifact review and approval

## Review Comment

The worker captures artifacts only for `create_spec`. A successful `create_tasks` action is marked succeeded without storing `_tasks.md` or `task_*.md`, and `UnifiedPackageGate.approvedTasks()` treats that execution success itself as approval. Loops requiring `tasks_approved` can therefore start immediately after task generation, without an author ever seeing or approving the generated task package. This contradicts the explicit approval gate in US-015 and makes the task artifacts unavailable through the review UI.

Add a distinct task-package format and validator, capture it when `create_tasks` completes, expose the exact version for review, and make `approvedTasks()` depend on an immutable author approval for the latest task package. Keep execution success and approval as separate states so completion never auto-enables an implementation Loop.

Affected code also includes `packages/api/src/application/services/task-flow/artifactValidator.ts:9`, `packages/api/src/application/services/task-flow/unifiedPackageGate.ts:17`, and `apps/web/src/features/issues/issue-composer/spec/unified/PackageReview.tsx`.

## Triage

- Decision: `VALID`
- Notes: Captura roda apenas para `create_spec`, não há formato de pacote de tasks e a aprovação atual é inferida do sucesso da ação. Vou capturar `_tasks.md` e `task_*.md` como versão imutável revisável e fazer a elegibilidade depender de aprovação explícita dessa versão.
- Escopo: rodada flow-dev-compozy-software-configuration/reviews-001 completa; sem commit automático. Testes e dependências diretas das correções estão incluídos.

## Resolution

Sucesso de `create_tasks` captura um pacote `os_tasks_v1`; a aprovação exige a versão atual desse formato e não decorre do sucesso da ação.

Verificação: suítes de pacotes e Loops passaram (10 testes), além dos testes do validador.
