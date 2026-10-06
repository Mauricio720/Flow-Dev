---
provider: manual
pr:
round: 1
round_created_at: 2026-10-02T18:02:34Z
status: resolved
file: packages/api/src/infra/database/dao/tasks/taskPublicationState.ts
line: 30
severity: high
author: claude-code
provider_ref:
---

# Issue 003: Persista resultados definitivos após entrar em incerteza

## Review Comment

`allowedOutcome` rejeita silenciosamente qualquer resultado quando a tentativa já está `uncertain`. Contudo, `reconcileTaskPublication` pode transformar `dispatching` em `uncertain` enquanto o POST original ainda está em andamento; a expiração do lease faz a mesma transição. Se a resposta 201 válida ou a rejeição definitiva chegar depois, `settleTaskPublication` retorna sem registrá-la. A reconciliação apenas relê/muda estados e não resolve essa perda.

Reproduzi no PostgreSQL: aprovar, marcar dispatch, reconciliar e então entregar um recibo `created` válido da mesma tentativa. O resultado permaneceu `publication_uncertain`, com `issue_id = null`. Além disso, se a primeira gravação do recibo falha, o catch do worker substitui o resultado conhecido por `uncertain`, sem as tentativas limitadas de persistência previstas na TechSpec.

Aceite resultados definitivos atribuíveis ao dispatch original também a partir de `uncertain`, de forma idempotente e com validação da tentativa/repositório/publicador. Retente somente a gravação do recibo já recebido, nunca o POST. Teste reconciliação concorrente com resposta tardia e falha temporária de armazenamento. Requisitos: US-012.AC-3/4, EC-8, UT-031 e ADR-008.

## Triage

- Decision: `VALID`
- Root cause: `allowedOutcome` excludes `uncertain`, discarding a late receipt for the already-fenced dispatch.
- Fix approach: permit idempotent definitive outcomes from the original attempt while retaining receipt identity validation and no additional POST.
