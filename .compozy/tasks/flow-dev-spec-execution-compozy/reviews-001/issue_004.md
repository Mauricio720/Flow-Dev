---
provider: manual
pr:
round: 1
round_created_at: 2026-10-06T10:34:24Z
status: resolved
file: packages/api/src/infra/database/dao/spec/drizzleTaskSpecApprovalDao.ts
line: 33
severity: high
author: claude-code
provider_ref:
---

# Issue 004: Aprovação é aplicada sem revalidar o estado do estágio

## Review Comment

`spec.approve` é aceito de forma síncrona e aplicado depois pelo worker. Em `apply`, a única revalidação é `stage.currentPackageId === claim.packageId`; em seguida, `if (stage.state !== "approved") await this.approve(...)`. Não há verificação de que o estágio ainda está em `review` nem de que não existe tentativa ativa.

Entre o aceite e a aplicação nada impede outro comando concorrente:

1. A autora aprova o pacote A. O comando fica `accepted` e a versão sobe.
2. Em outra aba (ou via API), ela envia `spec.adjust` com a nova versão. `acceptAdjust` (`specAdjust.ts:19-24`) só exige `stage.state === "review"`, `currentPackageId === A` e ausência de tentativa ativa, e tudo isso ainda é verdade. Uma tentativa de ajuste entra na fila.
3. O worker aplica a aprovação: `currentPackageId` ainda é A, o estado é `queued`, então o estágio vira `approved` com uma tentativa ativa pendurada.
4. A tentativa termina e `markReviewReady` (`specFinalizationStore.ts:48`) recoloca o estágio em `review` com o pacote B, apesar do registro imutável de aprovação de A. Uma nova aprovação viola `task_spec_approvals_stage_unique` e o `UPDATE` do estágio viola `task_spec_stages_approved_check`.

A janela não é pequena: o worker processa aprovações só no início de cada tick, e um tick pode ficar minutos em um dispatch. O mesmo vale para `spec.cancel`/`spec.retry` aceitos enquanto a aprovação está pendente.

O TechSpec pede que `approving` seja um comando pendente exibido sobre `review` "with competing mutations disabled" e que o servidor aplique todos os gates duráveis; a aprovação deve ocorrer "in a short fenced transaction" sobre o estado exato.

Correção sugerida:

- Em `apply`, exigir `stage.state === "review"` e ausência de tentativa ativa no workflow; caso contrário rejeitar o comando com `spec_conflict`.
- Nos aceites de `adjust`, `retry`, `returnToReview` e `start`, rejeitar com `spec_conflict` quando houver comando `spec.approve`/`spec.returnToReview` em `accepted` para o workflow.
- Teste de integração com a sequência approve → adjust → tick.

## Triage

- Decision: `VALID`
- Notes: Approval application accepted non-review stages. The fenced transaction now requires the reviewed package and the review stage before approval.
