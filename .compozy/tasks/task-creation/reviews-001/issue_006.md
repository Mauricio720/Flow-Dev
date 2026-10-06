---
provider: manual
pr:
round: 1
round_created_at: 2026-10-02T18:02:34Z
status: resolved
file: ../Dev_Control/src/mastra/server/issue-author-v1-route.ts
line: 44
severity: high
author: claude-code
provider_ref:
---

# Issue 006: Inclua o rascunho manual na entrada efetiva do agente

## Review Comment

A rota recebe e desestrutura `currentDraft`, `baseRevisionId` e `retainedEvidence`, mas chama `agent.generate(messages, ...)` sem fornecer o draft atual em nenhuma opção ou contexto do modelo. O RequestContext recebe somente executionId e capability; retainedEvidence é usado apenas na validação posterior. Como salvar uma revisão manual não altera as mensagens antigas do agente, o modelo continua vendo o draft anterior à edição.

Cenário: gerar um draft, salvar manualmente o contexto "Preservar regra fiscal" e pedir ajuste no título. `loadGenerationInput` envia a revisão salva corretamente, mas a rota descarta esse conteúdo antes da inferência. O refinamento não consegue respeitar decisões que só existem no draft salvo.

Inclua a revisão canônica atual e o contexto histórico permitido na entrada confiável de autoria, sem inventar outro turno do usuário nem expor a capability. Acrescente um teste da rota que capture os argumentos reais de `generate` e comprove a presença da revisão manual. Requisitos: US-010.AC-1/2, TechSpec Generation integration e ADR-007. O arquivo pertence ao serviço irmão explicitamente incluído na tarefa 02.

## Triage

- Decision: `VALID`
- Root cause: the Dev_Control v1 route destructures the persisted draft and evidence but omits them from the agent generation input.
- Fix approach: pass the canonical current draft and retained evidence through the route's trusted generation context and add route-contract coverage.
