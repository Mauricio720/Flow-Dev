---
status: completed
title: "Persistência PostgreSQL e catálogo durável"
type: infra
complexity: high
---

# Task 01: Persistência PostgreSQL e catálogo durável

## Overview

Substituir o catálogo global e efêmero por persistência PostgreSQL com Drizzle. Esta tarefa estabelece a conexão, as migrações, o projeto demonstrativo estável e a importação operacional idempotente que sustentam autenticação e autorização nas tarefas posteriores.

<critical>
- ALWAYS READ the PRD, the TechSpec, and their catalogs (`_user_stories.md`, `_tests.md`) before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — implement every task-required test case assigned in ## Tests
</critical>

<requirements>
- MUST criar a fundação PostgreSQL/Drizzle e migrações versionadas sem versionar URL, manifesto operacional ou segredos.
- MUST persistir `projects` com UUID estável, `external_key` único, `is_demo`, timestamps e a entrada fixa `flow-dev-demo`.
- MUST validar o manifesto inteiro antes de gravar, fazer upsert atômico e preservar projetos omitidos em importações posteriores.
- MUST remover a composição de produção baseada em `InMemoryProjectDao`, sem antecipar autorização, sessões, atribuições ou administradores das tarefas dependentes.
- MUST adicionar scripts de banco, importação e a infraestrutura mínima de testes PostgreSQL/Vitest usada pelas tarefas seguintes.
</requirements>

## Subtasks

- [x] 1.1 Adicionar dependências, configuração Drizzle e scripts de banco ao pacote API.
- [x] 1.2 Criar conexão server-only, schema inicial de projetos e migração versionada.
- [x] 1.3 Criar o DAO Drizzle do catálogo e retirar o armazenamento em `globalThis` da composição de produção.
- [x] 1.4 Criar contrato, validação e serviço de importação de manifesto operacional.
- [x] 1.5 Criar a CLI `catalog:import`, incluindo saída operacional e falha transacional segura.
- [x] 1.6 Preparar fixtures, configuração e comandos Vitest/PostgreSQL reutilizáveis.
- [x] 1.7 Implementar os testes unitários e de integração atribuídos.

## Implementation Details

Seguir as seções “Modelos de dados”, “Endpoints e comandos” e “Integrações” da TechSpec. A primeira migração cria apenas a fundação do catálogo necessária para esta tarefa; tabelas de Better Auth, atribuições e designações entram nas tarefas que as utilizam por meio de migrações incrementais. O manifesto usa `externalKey`, `name` e `description?`, sem remover registros ausentes.

### Relevant Files

- `packages/api/package.json` — recebe dependências e scripts de Drizzle, banco, CLI e testes.
- `packages/api/src/application/database/dao/projectDao.ts` — contrato atual do catálogo a evoluir sem expor tipos Drizzle.
- `packages/api/src/application/services/projects/projectCatalogService.ts` — caminho atual de criação pública a substituir pelo caso de importação.
- `packages/api/src/infra/database/dao/projects/inMemoryProjectDao.ts` — armazenamento temporário a retirar da composição de produção.
- `packages/api/src/controllers/projectsController.ts` — composição atual do DAO em memória a preparar para infraestrutura persistente.
- `packages/api/src/server.ts` — superfície server-only para exportar infraestrutura sem alcançar o cliente.
- `pnpm-workspace.yaml` e `pnpm-lock.yaml` — resolução de dependências do monorepo.

### Dependent Files

- `packages/api/src/routers/projects.ts` — a task_03 troca seus procedimentos públicos pelo catálogo autorizado.
- `apps/web/src/app/dev/page.tsx` e `apps/web/src/features/projects/project-catalog/` — ainda consomem o catálogo público e serão migrados na task_05.
- `apps/web/src/lib/auth/auth.ts` — task_02 consome a conexão e as tabelas server-only criadas aqui.

### Related ADRs

- [ADR-004: PostgreSQL, Better Auth e sessões revogáveis](adrs/adr-004.md) — PostgreSQL e migrações duráveis.
- [ADR-005: Catálogo durável e escopo explícito por projeto](adrs/adr-005.md) — catálogo estável e importação idempotente.

## Deliverables

- Conexão PostgreSQL/Drizzle, configuração e migrações iniciais do catálogo.
- DAO persistente e remoção da composição de produção baseada em catálogo global.
- CLI `catalog:import` e manifesto validado, atômico e idempotente.
- Base de testes de unidade e integração com PostgreSQL isolado.
- Every task-required test case assigned in `## Tests` implemented and passing **(REQUIRED)**

## Tests

Task-required cases assigned from `_tests.md`, the test contract — read each ID's full definition there before writing tests.

- [x] UT-025, UT-026, UT-027 — UUID estável do demo, manifesto duplicado e manifesto inválido sem escrita parcial.
- [x] IT-114, IT-115, IT-132, IT-133 — importação idempotente, rollback, preservação de entrada omitida e persistência após reinício.

### Deferred Gates

- [ ] IT-118 (`feature-gate`) — a remoção da criação pública é validada na task_03, que substitui o router.

## Success Criteria

- Every task-required test case implemented and passing.
- O catálogo sobrevive a reinícios e a reimportação mantém os mesmos IDs.
- Nenhum manifesto inválido deixa dados parcialmente gravados.
