---
provider: manual
pr:
round: 1
round_created_at: 2026-10-06T10:34:24Z
status: valid
file: apps/web/e2e/task-workspace.spec.ts
line: 10
severity: medium
author: claude-code
provider_ref:
---

# Issue 019: Casos de teste contratados ausentes: IT-099 e jornadas E2E da Spec

## Review Comment

A conferência entre `_tests.md`, as seções `## Tests` das tarefas concluídas e a suíte mostra lacunas, apesar de todos os itens estarem marcados com `[x]`.

**Casos atribuídos e não implementados** (o ID não aparece em nenhum arquivo de teste):

- `IT-099` (`task-required`, task_05): `SpecWorkspaceGateway.verify` com companheiro canônico alterado antes de o job de aprovação verificar o disco; esperado `artifact_conflict` rejeitando a aprovação pendente. O caminho existe em `specApprovals.ts:16`, mas não há teste.
- `IT-100`, `IT-130`, `IT-140` (`feature-gate`, listados na task_06): pacote com 200 tarefas em 50 revisões, paginação de `taskSpec.packages` isolada por item de trabalho, e vinte leitores concorrentes em `taskSpec.events`.

**Jornadas E2E da Spec inexistentes.** O plano de gates atribui `E2E-001` a `E2E-018` à task_06, e a subtarefa 6.8 ("end-to-end fixtures") está marcada como concluída. Nenhum arquivo em `apps/web/e2e/` exercita a Spec. Os IDs `E2E-001`…`E2E-019` que existem ali pertencem a outras features (projetos e criação de tarefa) e usam a mesma numeração; em `task-workspace.spec.ts` são títulos de jornadas de autoria de Issue. Uma busca por ID dá a falsa impressão de cobertura.

**Comportamentos sem teste encontrados nesta revisão**, todos com defeito confirmado:

- cancelamento com claim ativo (issue 002);
- retomada de tentativa em `finalizing` e freeze com arquivo fora do escopo (issue 003);
- stop com causa `completed` (issue 008);
- primeira carga de eventos com mais de uma página (issue 010).

Limitação desta revisão: os testes de integração (`pnpm --dir packages/api test:integration`) não foram executados, porque `TEST_DATABASE_URL` não estava configurado. Lint, typecheck e as suítes unitárias de `packages/api` (438) e `apps/web` (257) passaram.

Correção sugerida:

- Implementar `IT-099` em `packages/api/test/spec-approval.test.ts` e os três gates em suítes de integração próprias.
- Criar `apps/web/e2e/spec-workflow.spec.ts` com as jornadas `E2E-001`–`E2E-018`, usando prefixo que diferencie a feature (por exemplo `SPEC E2E-001`) para acabar com a colisão de IDs.
- Desmarcar no arquivo da tarefa os casos que continuarem pendentes.

## Triage

- Decision: `VALID`
- Notes: Contracted integration and Spec E2E coverage is absent. The test plan and fixtures remain open pending a provisioned integration environment.
