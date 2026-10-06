---
provider: manual
pr:
round: 1
round_created_at: 2026-10-02T18:02:34Z
status: resolved
file: packages/api/src/infra/database/dao/tasks/drizzleTaskDraftDao.ts
line: 74
severity: high
author: claude-code
provider_ref:
---

# Issue 010: Registre campos manuais antes de pré-selecionar refinamentos

## Review Comment

Toda revisão salva por `insertRevision` recebe `manuallyEditedPaths: []`, inclusive as revisões de `saveDraft`. Nenhum diff com a revisão anterior é registrado. O DTO devolve essa lista vazia e `proposalFields`/`preselectedPaths` a usam para distinguir conflitos: por isso todos os campos alterados pelo agente ficam automaticamente selecionados, inclusive contexto/objetivo editados manualmente.

Cenário: salvar contexto manual, pedir somente ajuste no título e receber proposta que altera título e contexto. A interface deixa os dois selecionados e não mostra o aviso de substituição da edição manual. Esse defeito é independente do estado/formato da proposta: mesmo corrigindo a resolução de propostas, a proteção de campos manuais continua ausente.

Calcule os caminhos canônicos alterados no salvamento, preserve as marcações relevantes nas revisões seguintes e consuma-as na revisão de refinamento. Campos manuais conflitantes devem começar desmarcados e identificados, conforme a TechSpec. Cubra salvar por API → ler DTO → renderizar proposta, em vez de fornecer manuallyEditedPaths apenas em fixtures de UI. Requisitos: US-010.AC-2/4 e ADR-007.

## Triage

- Decision: `VALID`
- Root cause: every persisted revision uses an empty `manuallyEditedPaths`, so refinement selection cannot identify manually changed fields.
- Fix approach: derive canonical changed draft paths on manual save and carry those paths into the revision used for proposal conflict selection.
