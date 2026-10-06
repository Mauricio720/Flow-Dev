---
provider: manual
pr:
round: 1
round_created_at: 2026-10-02T18:02:34Z
status: resolved
file: packages/api/src/infra/database/dao/tasks/taskOperationSettlementHelpers.ts
line: 48
severity: high
author: claude-code
provider_ref:
---

# Issue 004: Grave propostas no formato aceito pela resolução

## Review Comment

O caminho real de geração conclui a operação com um `GenerationEnvelope` e preenche `tasks.pendingProposalOperationId`, mas nunca define `task_operations.proposalResolution = "pending"`. `DrizzleTaskDraftDao.resolveRefinement` exige esse valor e retorna `stale_proposal` tanto para aplicar quanto para descartar. A tarefa fica bloqueada para novas mensagens, salvamento e publicação.

Há também divergência de formato: `pendingProposal()` lê `operation.result.result.draft`, mas `applyProposal()` chama `parseIssueDraft(operation.result)` como se o envelope fosse o draft. Os testes que semeiam diretamente um draft simples com estado pending não percorrem o caminho produzido pelo worker.

Reprodução com PostgreSQL e `completeTaskGeneration` reais: proposta criada com `proposal_resolution = null`; aplicação retorna `stale_proposal`. Corrigindo apenas o estado na fixture, a aplicação retorna `invalid_draft`.

Defina um contrato único de proposta entre settlement, leitura e resolução, persistindo o estado pending atomicamente e extraindo o draft/evidências do mesmo formato. Valide geração → leitura → aplicar/descartar sem semear formatos artificiais. Requisitos: US-010, tarefa 03 e ADR-007.

## Triage

- Decision: `VALID`
- Root cause: generated proposals persist the full generation envelope but do not set `proposalResolution`, while resolution parses that envelope as a draft.
- Fix approach: mark proposal operations pending atomically and extract the canonical draft from the stored generation envelope before merging.
