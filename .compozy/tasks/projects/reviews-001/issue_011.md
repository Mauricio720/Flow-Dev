---
provider: manual
pr:
round: 1
round_created_at: 2026-10-01T19:19:57Z
status: resolved
file: packages/api/src/routers/projects.test.ts
line: 8
severity: medium
author: claude-code
provider_ref:
---

# Issue 011: Substituir casos contratuais vazios por verificações reais

## Review Comment

Todas as tarefas estão `completed`, mas vários IDs task-required não verificam o comportamento de `_tests.md`. Neste arquivo, IT-046–055 usam um controller inteiramente simulado: IT-046 não testa admin versus membro; IT-049 não grava `last_project_id`; IT-052 não cria uma linha PostgreSQL. `controllers/repositoryOAuthController.test.ts` atribui IT-056/057/058/070 a chamadas diretas em memória, sem verificar os status/redirects HTTP ou persistência cifrada dos handlers.

Também há lacunas nos unitários: em `application/services/projects/projectServices.test.ts`, UT-017 apenas espera um erro bruto do serviço, sem testar SERVICE_UNAVAILABLE/mensagem/cause; UT-049/050 não exercitam paginação do DAO nem tradução de violação única; o caso agrupado UT-028–031 não executa UT-029 (atribuição negada antes do GitHub) ou UT-030 (identity mismatch no serviço), e UT-032–034 não cobre público/privado sem token, node nulo ou lote válido de 50. `application/github/repositoryAuthorization.test.ts` usa store em claro para UT-021 e não verifica uma linha cifrada.

Implemente cada comportamento obrigatório no nível contratado, usando PostgreSQL descartável, controllers/services reais e handlers HTTP com GitHub controlado para integração. Mantenha testes de transporte com mocks como unitários adicionais. Dê a cada ID asserts verificáveis de seu resultado/efeito/ausência de chamada. A execução atual de 48 testes verdes da API não comprova esses contratos; os gates feature/QA ainda pendentes não substituem os IDs task-required marcados concluídos.

## Triage

- Decision: `VALID`
- Notes: Os IDs apontados estão ligados a mocks de controller e não demonstram seus contratos. Substituir os rótulos enganosos por testes reais de serviços, PostgreSQL descartável e handlers HTTP com GitHub controlado; acrescentar harness reutilizável e scripts de execução. Manter testes de transporte como unitários adicionais.
- Escopo: rodada projects/reviews-001 completa; sem commit automático. Testes e dependências diretas das correções estão incluídos.
- Resolução: Contratos agora exercitam DAO, controller/router, PostgreSQL e Route Handlers com GitHub controlado. IDs cobertos verificam efeito, retorno, persistência cifrada, status/redirect e ausência de chamada; suites API: 54 unitários e 21 integrações; web: 41 unitários; E2E-001 Chromium passou.

