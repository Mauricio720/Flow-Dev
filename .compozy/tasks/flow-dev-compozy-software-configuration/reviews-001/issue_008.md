---
provider: manual
pr:
round: 1
round_created_at: 2026-10-06T18:24:24Z
status: resolved
file: apps/web/src/features/issues/issue-composer/spec/unified/UnifiedSpecStage.tsx
line: 39
severity: medium
author: claude-code
provider_ref:
---

# Issue 008: Load-more refreshes the first run-history page

## Review Comment

The Load More handler calls the same `refresh()` used for polling. `useFlowData.read()` always invokes `taskFlow.runs.query(target)` without `nextCursor`, then replaces the snapshot. As a result, the button repeatedly reloads page one and older attempts are never shown, despite the server returning a cursor. This violates the long-history navigation cases IT-056 and IT-070; their backend test verifies DAO pagination but does not exercise this UI behavior.

Add a cursor-aware load-more path that requests `runs.query({ ...target, cursor: runs.nextCursor })`, appends and deduplicates items, and preserves the accumulated pages during polling. Add a component test with two pages that verifies the older run becomes visible after the button is activated.

Affected code also includes `apps/web/src/features/issues/issue-composer/spec/unified/useFlowData.ts:13` and `apps/web/src/features/issues/issue-composer/spec/unified/RunList.tsx:35`.

## Triage

- Decision: `VALID`
- Notes: Carregar mais reutiliza a consulta da primeira página e substitui o snapshot acumulado. Vou adicionar leitura por cursor que concatena e deduplica páginas e manter o histórico acumulado durante polling, cobrindo a interação do botão com duas páginas.
- Escopo: rodada flow-dev-compozy-software-configuration/reviews-001 completa; sem commit automático. Testes e dependências diretas das correções estão incluídos.

## Resolution

O hook carrega páginas usando o cursor retornado, acumula e deduplica execuções anteriores, preserva o histórico durante polling e indica carregamento.

Verificação: `UnifiedLoops.test.tsx` passou (6 testes), incluindo paginação e append.

Nota da suíte ampla: a execução integral de testes web teve 7 falhas em `ProjectCreation`, `dictationCapture` e `TechSpecReview`, arquivos fora desta rodada; a build, lint, typecheck e o teste focado deste fluxo passaram.
