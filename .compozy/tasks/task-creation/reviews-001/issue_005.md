---
provider: manual
pr:
round: 1
round_created_at: 2026-10-02T18:02:34Z
status: resolved
file: packages/api/src/infra/database/dao/tasks/taskOperationSettlementHelpers.ts
line: 67
severity: high
author: claude-code
provider_ref:
---

# Issue 005: Mantenha a revisão explícita após clarificação ou retry

## Review Comment

`hasRefinementMessage` classifica uma geração como refinamento somente se houver mensagem `kind=refinement` vinculada à operação atual. Uma resposta a uma clarificação usa `kind=clarification`, mesmo quando já existe um draft manual. Um retry explícito também cria outra operação e reutiliza a mensagem aceita anteriormente. Nos dois casos a consulta retorna false e `storeDraft` troca diretamente `currentRevisionId`, sem proposta ou seleção de campos.

Reproduzi com PostgreSQL real: tarefa com revisão manual, geração cujo `baseRevisionId` aponta para ela e mensagem clarification. Após `completeTaskGeneration`, a revisão manual deixou de ser atual, o contexto foi substituído pelo agente e `pendingProposalOperationId` continuou null.

Determine a necessidade de revisão pelo contexto durável da operação e pela existência de uma revisão base, preservando essa informação ao responder clarificações e repetir gerações. Qualquer resultado que altere um draft existente deve passar pela resolução explícita dos campos. Cubra refinamento → clarificação → resposta e refinamento falho → retry. Requisitos: US-006.EC-9, US-010.AC-2/4 e ADR-007.

## Triage

- Decision: `VALID`
- Root cause: refinement detection relies on the current message kind instead of the operation's durable base revision.
- Fix approach: treat any successful draft generation based on an existing revision as a proposal, including clarification continuations and retries.
