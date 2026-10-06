---
provider: manual
pr:
round: 1
round_created_at: 2026-10-01T19:19:57Z
status: resolved
file: packages/api/src/application/services/projects/connectionStateService.ts
line: 21
severity: medium
author: claude-code
provider_ref:
---

# Issue 009: Converter falhas de credencial em estados por projeto

## Review Comment

A obtenção do token ocorre fora do try que converte falhas em `ConnectionState`. Quando a autorização expira sem refresh válido ou o refresh foi revogado, `accessToken` lança `RepositoryAuthorizationNeededError` e o Promise.all inteiro rejeita. O frontend classifica a falha como `unverified` para todos os projetos do lote, em vez de oferecer autorização para os afetados; os demais resultados são perdidos. A sondagem confirmou a rejeição do lote por esse erro nomeado.

Inclua a obtenção/renovação da credencial no tratamento de falhas por projeto, devolvendo `authorization_needed` nesses casos. Mantenha erros de acesso Flow Dev e banco com a semântica do endpoint, e diferencie indisponibilidade temporária de renovação inválida. Teste uma lista com resultados mistos e credencial expirada, conforme US-006.EC-3 e o contrato de `connectionStates`.

## Triage

- Decision: `VALID`
- Notes: A credencial é obtida fora do tratamento por projeto. Capturar somente falhas conhecidas de GitHub/credencial por item, preservando erros Flow Dev/DB; testar resultados mistos e renovação inválida.
- Escopo: rodada projects/reviews-001 completa; sem commit automático. Testes e dependências diretas das correções estão incluídos.
- Resolução: Falhas de token/refresh conhecidas são convertidas por projeto e falhas de banco continuam propagando. Integração confirma lote com estados independentes e autorização expirada sem rejeitar o endpoint inteiro.

