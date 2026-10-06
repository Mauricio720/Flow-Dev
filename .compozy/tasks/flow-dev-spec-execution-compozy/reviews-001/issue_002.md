---
provider: manual
pr:
round: 1
round_created_at: 2026-10-06T10:34:24Z
status: resolved
file: packages/api/src/infra/database/dao/spec/specCancel.ts
line: 24
severity: high
author: claude-code
provider_ref:
---

# Issue 002: Cancelamento é sobrescrito por transições do worker em andamento

## Review Comment

`acceptCancel` marca a tentativa como `stopping` com um `UPDATE ... WHERE id = ?`, sem incrementar `lease_fence`. Do outro lado, as transições do worker passam por `fencedAttemptUpdate` (`specWorkerFence.ts:11-19`), que filtra apenas por `id` + `leaseFence`; o estado atual não é verificado.

Se o worker estiver com o claim da tentativa no momento do cancelamento, o fence continua válido e a próxima escrita dele apaga o `stopping`:

- `markPromptAccepted` (`drizzleTaskSpecWorkerDao.ts:61-64`) grava `running`. A janela aqui é larga: o dispatch inclui clone (até 120 s), snapshot e subida do contêiner.
- `markWaiting`, `markRunning` e `markFinalizing` (`specWorkerInteractions.ts:18-26`) gravam `waiting`/`running`/`finalizing` e também reescrevem o estado do estágio e do workflow.

Resultado: o recibo de `spec.cancel` fica `accepted`, a tentativa continua executando, e ninguém volta a tratar o cancelamento. O TechSpec exige que tentativas despachadas entrem em `stopping` e aguardem a parada verificada.

Correção sugerida:

- Em `acceptCancel`, incrementar `leaseFence` (e limpar `leaseOwner`/`leaseExpiresAt`) junto com `state: "stopping"`, para que qualquer escrita posterior do worker antigo falhe com `stale_execution` e a tentativa seja recuperada por `superviseStop`.
- Além disso, dar a cada transição do worker o estado de origem esperado, usando o `requiredState` que `fencedAttemptUpdate` já aceita (hoje só `finalization.complete` usa).
- Cobrir com teste de integração: cancelar durante `dispatching` e durante `running` com o claim ativo e verificar que o estado final não volta a `running`.

## Triage

- Decision: `VALID`
- Notes: A cancel did not invalidate an active worker lease. Cancellation now increments the lease fence and clears the lease atomically with the stopping transition.
