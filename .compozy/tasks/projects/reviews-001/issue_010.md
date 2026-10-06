---
provider: manual
pr:
round: 1
round_created_at: 2026-10-01T19:19:57Z
status: resolved
file: packages/api/src/infra/github/githubRepositoryGateway.ts
line: 38
severity: medium
author: claude-code
provider_ref:
---

# Issue 010: Aplicar prazo e cancelamento às requisições GitHub

## Review Comment

As chamadas REST e GraphQL do gateway não passam AbortSignal nem estabelecem prazo; o cliente OAuth em `infra/github/githubRepositoryOAuthClient.ts` faz o mesmo. O ramo que reconhece AbortError nunca inicia um cancelamento próprio. Uma consulta externa pendente mantém o picker, a criação ou o lote de conexão aguardando até limites do transporte/infraestrutura, sem entregar oportunamente o estado recuperável definido. A sondagem confirmou ausência de `signal` no fetch REST.

Defina prazo explícito e compartilhado para REST/GraphQL e OAuth, cubra também a leitura do corpo da resposta, e converta abort/timeouts e erros de rede nas classes esperadas. GraphQL atualmente chama fetch diretamente e também precisa desse tratamento. Use fetch controlado que só conclui ao ser abortado para verificar que o fluxo termina com erro seguro. A TechSpec atribui timeout ao gateway e exige estados recuperáveis para falhas externas.

## Triage

- Decision: `VALID`
- Notes: Não existe prazo nem signal em REST, GraphQL ou OAuth. Compartilhar transporte com prazo que inclui JSON/body e conversão de falhas externas; testar fetch/body pendentes até abortar. Extensão mínima: helper de transporte e cliente OAuth.
- Escopo: rodada projects/reviews-001 completa; sem commit automático. Testes e dependências diretas das correções estão incluídos.
- Resolução: Transporte compartilhado aplica AbortSignal e prazo que inclui leitura do corpo a REST, GraphQL e OAuth; 401, rate limit, timeout e rede mantêm classificação recuperável. Testes cobrem fetch e corpo pendentes.

