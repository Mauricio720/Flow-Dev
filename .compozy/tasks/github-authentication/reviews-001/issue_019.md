---
provider: manual
pr:
round: 1
round_created_at: 2026-10-01T16:20:08Z
status: resolved
file: apps/web/src/lib/auth/session.ts
line: 7
severity: medium
author: claude-code
provider_ref:
---

# Issue 019: Diferencie falha de validação de sessão ausente

## Review Comment

`getAuthSession` converte qualquer exceção em null. Uma indisponibilidade do banco, falha de renovação ou configuração inválida passa a ser apresentada como sessão ausente/expirada. `ProjectPage` e `AccessPage` também capturam qualquer erro e navegam para o seletor, tornando falhas operacionais indistinguíveis de projeto revogado ou papel negado.

Isso viola os estados recuperáveis de US-002.EC-6 e US-007.EC-6: o usuário é orientado a autenticar ou escolher projeto quando a autorização nem sequer pôde ser verificada. Pode provocar novas tentativas OAuth durante uma falha de banco e esconde a causa para suporte.

Preserve null apenas para ausência/invalidez confirmada; diferencie erros conhecidos de autorização de falhas operacionais. Mostre um estado temporário com retry e registre contexto seguro sem tokens/cookies. Teste indisponibilidade de banco na ponte e nas páginas, assegurando que ela não vire sessão expirada nem vazio definitivo.

## Triage

 - Decision: `valid`
 - Notes: Root cause: all session exceptions become null, hiding database failures as expiration. Fix: preserve null only for confirmed absence and let operational errors reach retryable boundaries.
- Notes:
