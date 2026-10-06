---
provider: manual
pr:
round: 1
round_created_at: 2026-10-01T19:19:57Z
status: resolved
file: packages/api/src/infra/database/dao/projects/projectPage.ts
line: 11
severity: high
author: claude-code
provider_ref:
---

# Issue 008: Buscar a identidade completa owner/repositório no catálogo

## Review Comment

O campo da interface sugere `owner/repositório`, mas o SQL aplica o termo separadamente ao nome do projeto, owner e nome do repositório. Para projeto Alpha com owner `acme` e repo `private`, buscar `acme/private` não corresponde a nenhuma coluna e oculta o projeto esperado. A sondagem da query gerada confirmou três parâmetros `%acme/private%`, sem expressão que combine owner e repo. O E2E-001 já pesquisa `assigned.repository`, mas essa jornada não é exercitada pelos testes unitários verdes.

Inclua na busca SQL a identidade concatenada owner + '/' + repository_name, mantendo parâmetros, filtro de atribuição e paginação estável. Acrescente um teste do DAO real com a identidade completa e uma jornada de catálogo. PRD US-001.AC-5 e o placeholder atual prometem descoberta por identidade do repositório.

## Triage

- Decision: `VALID`
- Notes: A busca SQL não concatena owner e nome. Acrescentar expressão parametrizada e testar DAO real e jornada existente do catálogo.
- Escopo: rodada projects/reviews-001 completa; sem commit automático. Testes e dependências diretas das correções estão incluídos.
- Resolução: Busca parametrizada inclui owner || '/' || repository_name. DAO PostgreSQL encontrou owner/repo completo; jornada E2E-001 foi executada no Chromium e encontrou o projeto pela busca owner/repositório completo.

