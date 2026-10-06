---
provider: manual
pr:
round: 1
round_created_at: 2026-10-02T18:02:34Z
status: resolved
file: packages/api/src/infra/database/dao/tasks/drizzleTaskPublicationWorkerDao.ts
line: 17
severity: critical
author: claude-code
provider_ref:
---

# Issue 002: Impeça um worker vencido de liberar outra publicação

## Review Comment

`settle(claim, outcome)` descarta a identidade do worker e encaminha somente taskId/attemptId. `settleTaskPublication` aceita qualquer `rejected` enquanto a tentativa está `dispatching`. Assim, depois de expirar o lease de A, B pode assumir e enviar o POST, enquanto A termina sua validação/heartbeat com erro. Como o `fenced` local de A ainda é false, o catch em `TaskPublicationWorkerController` registra `rejected`, libera o bloqueio e permite outro POST, embora o de B ainda possa criar a Issue.

Reprodução com PostgreSQL real: claim A; avançar 61 segundos; claim B; B executa `fenceDispatch`; A executa `settle(... rejected/stale_execution)`. A tarefa volta para `draft_ready`, apesar de `dispatch_started_at` preenchido. Um novo `approve` foi aceito com status `publishing`.

Separe falhas locais antes do envio de respostas definitivas do GitHub. Exija o lease/execução atual para uma rejeição anterior ao dispatch e impeça que ela encerre uma tentativa já despachada por outro worker. Preserve a possibilidade de receber o resultado autenticado do dispatch original. Cubra essa corrida com dois workers e POST controlado. Viola a garantia de não duplicação do PRD e ADR-008.

## Triage

- Decision: `VALID`
- Root cause: worker settlement receives a claim but discards its worker identity, so a pre-dispatch rejection is not fenced against a newer lease holder.
- Fix approach: bind pre-dispatch settlement to the current lease owner and operation state; preserve only authenticated dispatch results once dispatch has started.
