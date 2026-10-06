---
provider: manual
pr:
round: 1
round_created_at: 2026-10-02T18:02:34Z
status: resolved
file: ../Dev_Control/src/mastra/server/issue-author-v1-route.ts
line: 13
severity: medium
author: claude-code
provider_ref:
---

# Issue 011: Alinhe os limites da rota v1 ao orçamento da conversa

## Review Comment

A rota v1 impõe 10.000 caracteres a toda mensagem, inclusive assistant, e no máximo 100 mensagens. O contrato do Flow Dev limita mensagens do usuário individualmente e usa orçamento agregado de 100.000 bytes para mensagens, draft e evidências. Drafts canônicos são salvos no histórico como JSON integral; um draft válido com context e objective de 6.000 caracteres cada já produz uma mensagem assistant maior que 10.000, mesmo com o request completo abaixo do orçamento.

O próximo refinamento é aceito e enfileirado pelo Flow Dev, mas a rota retorna 400 antes de executar o agente. O adapter converte esse 400 em provider_unavailable e repete uma entrada que continuará inválida. Mais de 100 turnos curtos apresentam o mesmo desalinhamento.

Compartilhe/aplique o orçamento v1 conforme especificado e mantenha a validação individual apropriada para mensagens user, sem aplicar o antigo teto à serialização de drafts assistant. Se houver limite adicional necessário, valide antes da aceitação no Flow Dev e exponha input_capacity. Cubra uma conversa com draft JSON maior que 10.000 caracteres e total abaixo de 100.000 bytes. Requisitos: ADR-006 e TechSpec Generation integration.

## Triage

- Decision: `VALID`
- Root cause: Dev_Control applies legacy per-message and count caps to persisted assistant draft JSON instead of the Flow Dev aggregate input budget.
- Fix approach: validate user-message limits separately and enforce the shared aggregate byte budget across messages, draft, and retained evidence.
