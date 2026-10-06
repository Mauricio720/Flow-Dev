---
provider: manual
pr:
round: 1
round_created_at: 2026-10-06T10:34:24Z
status: resolved
file: apps/web/src/features/issues/issue-composer/spec/specCommandResponders.ts
line: 29
severity: medium
author: claude-code
provider_ref:
---

# Issue 011: Recibo rejeitado de aprovação é tratado como aplicado na UI

## Review Comment

Em `observe`, recibos `applied` e `rejected` seguem o mesmo caminho:

```ts
if (result.receipt.status === "applied" || result.receipt.status === "rejected") return settle();
```

`settle` limpa o comando pendente, despacha `applied` (o estado volta a `idle`) e recarrega o snapshot. O `reason` do recibo é descartado.

`spec.approve` e `spec.returnToReview` são aplicados de forma assíncrona pelo worker, que pode rejeitá-los com `artifact_conflict`, `access_revoked`, `spec_conflict`, `capture_failed`, entre outros (`specApprovals.ts:11-17,32`). Nesses casos a autora clica em aprovar, vê "aguardando" e a tela simplesmente volta para revisão, sem nenhuma explicação. Para `artifact_conflict` isso esconde justamente a condição que exige ação de operador.

O TechSpec diz que uma falha assíncrona após o aceite "is represented in the saved receipt/attempt with a safe reason" e que o próximo passo protegido "shows conflict" (E2E-013).

Correção sugerida:

- Separar os ramos: para `rejected`, limpar o pendente, despachar `{ type: "rejected", failure }` construído a partir de `receipt.reason` e chamar `onFailure`, além de recarregar o snapshot.
- Adicionar cópia pt-BR para os motivos assíncronos (`artifact_conflict`, `access_revoked`, `capture_failed`) em `specReasons.ts`.
- Teste em `useSpecCommand.test.tsx`: submissão devolve `rejected/artifact_conflict` e o aviso correspondente fica visível.

## Triage

- Decision: `VALID`
- Notes: Rejected asynchronous receipts shared the applied path and discarded the reason. They now clear the pending record, report the saved reason, enter the rejected state, and reload the snapshot.
