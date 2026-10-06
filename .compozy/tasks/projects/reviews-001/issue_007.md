---
provider: manual
pr:
round: 1
round_created_at: 2026-10-01T19:19:57Z
status: resolved
file: packages/api/src/infra/github/githubRepositoryGateway.ts
line: 51
severity: high
author: claude-code
provider_ref:
---

# Issue 007: Distinguir token revogado e rate limit de falhas temporárias

## Review Comment

`classify` converte todo 401 em `RepositoryUnavailableError` e todo 403 em `RepositoryForbiddenError`, sem inspecionar os headers. Tokens revogados sem expiração conhecida continuam sendo reutilizados e mostrados como indisponibilidade temporária, sem o caminho de reconexão. Um 403 com `Retry-After:60` e `x-ratelimit-remaining:0` é tratado como permissão negada; no picker a resposta FORBIDDEN ainda é exibida como perda do papel de administrador Flow Dev. As sondagens reproduziram as duas classificações incorretas.

Classifique 401 como necessidade de renovação/reautorização; reconheça 403 de rate limit por headers/resposta, conserve o tempo de espera e devolva TOO_MANY_REQUESTS/estado temporário. Preserve a distinção entre falta de permissão GitHub e papel Flow Dev na mensagem. O [GitHub documenta rate limits com 403 ou 429](https://docs.github.com/en/rest/using-the-rest-api/troubleshooting-the-rest-api#rate-limit-errors). Isso atende à TechSpec de classificação e a US-003.EC-4/7 e US-006.EC-3/4.

## Triage

- Decision: `VALID`
- Notes: 401 e 403 são classificados incorretamente e a UI assume que todo FORBIDDEN é perda de administração. Classificar autorização/rate limit com espera preservada e distinguir a origem da recusa no DTO/mensagem. Extensão mínima: formatador tRPC e cópia do picker.
- Escopo: rodada projects/reviews-001 completa; sem commit automático. Testes e dependências diretas das correções estão incluídos.
- Resolução: 401 pede reautorização; 403 com sinais de limite vira rate limit e mantém retryAfterSeconds. A cópia diferencia acesso do GitHub e administração Flow Dev. Unitários cobrem 401, 403 e 429.

