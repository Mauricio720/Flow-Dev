---
provider: manual
pr:
round: 1
round_created_at: 2026-10-06T10:34:24Z
status: resolved
file: packages/api/src/controllers/specApprovals.ts
line: 18
severity: medium
author: claude-code
provider_ref:
---

# Issue 013: Comandos de aprovação/restauração repetem para sempre em erro

## Review Comment

`applyNextApproval` relança qualquer erro que não seja `artifact_conflict`, `spec_conflict` ou `stale_execution`; `applyNextRestore` não tem `try/catch` e `SpecFinalizationService.restore` relança tudo que não seja `artifact_conflict` ou errno de filesystem. O comando fica `accepted` com lease; quando o lease expira ele é reclamado e falha de novo, a cada 30 s, sem nunca ser rejeitado.

Erros determinísticos que caem nesse caminho:

- `restore` lança `TaskError("workspace_unavailable")` antes de criar a finalização (`specFinalizationService.ts:34`).
- `beginRestore` insere uma finalização `prepared`. Se a promoção falhar com erro não mapeado, a linha permanece pendente e a próxima tentativa viola `task_spec_finalizations_pending_idx` (uma finalização pendente por workspace). O mesmo acontece se já houver uma finalização pendente deixada por tentativa presa (issue 003).
- `approve` pode violar `task_spec_approvals_stage_unique` ou o gatilho `guard_task_spec_approval_insert`.
- `workspaces.verify` pode lançar `EACCES`/`ENOTDIR`.

Efeitos:

- Cada falha aborta o tick inteiro antes de `dao.claim`, atrasando a supervisão das tentativas.
- A UI fica em "aguardando" indefinidamente e bloqueia todos os comandos daquela autora na tarefa. O pendente é restaurado do `sessionStorage` a cada recarga.
- O log só registra `errorName`, sem `commandId` nem motivo.

Outros pontos do mesmo trecho:

- `markApplied`, `reject` e `release` filtram por fence mas não verificam linhas afetadas. `completeRestore` não é protegido por fence.
- `{ ... } as unknown as SpecClaim` (linhas 8 e 26) contorna o contrato de `SpecAccessProbe.check`, que só precisa de `projectId` e `authorUserId`.

Correção sugerida:

- Envolver as duas aplicações em `try/catch`, mapear o erro com `attemptFailureReason` e rejeitar o comando com motivo seguro; marcar a finalização como `failed` em qualquer erro de `restore`.
- Registrar `commandId`, `workflowId` e motivo no log.
- Estreitar o tipo aceito por `SpecAccessProbe.check` para `Pick<SpecClaim, "projectId" | "authorUserId">` e remover os casts.

## Triage

- Decision: `VALID`
- Notes: Approval and restore exceptions could leave accepted commands indefinitely retried. Both flows now reject failures with a safe mapped reason.
