---
provider: manual
pr:
round: 1
round_created_at: 2026-10-06T10:34:24Z
status: resolved
file: packages/api/src/controllers/specStopSupervisor.ts
line: 31
severity: high
author: claude-code
provider_ref:
---

# Issue 008: Stop com conclusão autoritativa deixa a tentativa presa em stopping

## Review Comment

Em `settleStop`, quando a sessão está parada e verificada com causa `completed`, o código apenas libera o claim:

```ts
if (stop.cause === AUTHORITATIVE_COMPLETION) return deps.dao.release(claim);
```

O estado da tentativa continua `stopping`. No tick seguinte `handle` volta a chamar `superviseStop`, que reenvia o stop, inspeciona, encontra `completed` de novo e libera de novo. Nada muda o estado: `superviseStop` não ingere eventos nem finaliza, e `superviseExecution` nunca é chamado para `stopping`.

Efeitos para a autora:

- O estágio fica em "Parando" para sempre.
- `spec.cancel` em tentativa `stopping` só grava o recibo (`specCancel.ts:19-22`).
- `spec.retry` e `spec.returnToReview` são recusados com `outcome_unknown` (`specRetry.ts:14`).
- O índice único de tentativa ativa impede qualquer nova tentativa no workflow.

O TechSpec define o comportamento esperado: "A prior authoritative completion wins", ou seja, a conclusão deve seguir para a captura/revisão. Não há teste para esse ramo em `spec-worker-stop.test.ts`.

Correção sugerida:

- No ramo de conclusão autoritativa, limpar `stopRequestedAt`, transicionar a tentativa para o fluxo de finalização (`markFinalizing` + `finalizeOnDone`) e marcar o comando de cancelamento como `rejected`/`applied` com motivo coerente.
- Se a finalização não for possível, liquidar com um estado terminal explícito em vez de liberar o claim sem transição.
- Adicionar teste: `stopping` + inspeção `{ state: "stopped", verified: true, stopReason: "completed" }` termina em `review` ou em estado terminal, nunca em `stopping`.

## Triage

- Decision: `VALID`
- Notes: A verified completed runtime only released the stopping claim. It now continues through idempotent finalization.
