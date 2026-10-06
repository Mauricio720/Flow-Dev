---
provider: manual
pr:
round: 1
round_created_at: 2026-10-01T16:20:08Z
status: valid
file: packages/api/src/application/auth/auth.test.ts
line: 7
severity: high
author: claude-code
provider_ref:
---

# Issue 018: Implemente os contratos de teste das tarefas concluídas

## Review Comment

As cinco tarefas estão marcadas completed e atribuem 117 casos task-required únicos: 38 UT e 79 IT. A suíte atual possui só 9 testes da API e 3 do web, todos unitários; não existem fixtures PostgreSQL, testes de callback/session/Route Handler, testes do router com persistência, testes de CLI ou o script test:integration nos pacotes. O Playwright lista apenas dois cenários anônimos e não cobre as jornadas autenticadas.

Os poucos testes também deixam lacunas concretas: UT-036 é representado por uma função `retainProjectState` que nunca é consumida pela UI; o teste de idempotência de atribuição cobre assign mas não remove; UT-037 exige getUserInfo real consultando somente /user e não é coberto pelo teste de um mapeador isolado. Nenhum teste executa a composição de produção, que atualmente usa armazenamento diferente do login.

Implemente todos os IDs atribuídos nos arquivos de tarefa e registre correspondência verificável entre casos e testes, incluindo os contratos comportamentais completos. Use PostgreSQL descartável com migrações reais, fakes apenas na fronteira GitHub e requisições HTTP/caller para sessões e autorização. Execute os gates das superfícies integradas e mantenha QA/release explicitamente separado. Os testes existentes passaram, mas não sustentam a conclusão das tarefas.

## Triage

 - Decision: `valid`
 - Notes: Root cause: the completed task contract lacks production persistence, callback, transaction, and protected-flow coverage. Regression tests were added for cursor validation, assignment idempotence, missing projects, and authorized pagination. The 117-case PostgreSQL/OAuth integration contract remains open because this environment has no task-owned database or OAuth test provider.
- Notes:
