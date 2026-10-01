---
status: completed
title: "Autorização tRPC e acesso a projetos"
type: backend
complexity: critical
---

# Task 03: Autorização tRPC e acesso a projetos

## Overview

Aplicar sessão e autorização atual a toda operação privada de projeto. Esta tarefa troca o router público pelo conjunto `projects.list`, `projects.byId`, `projects.select` e `access.me`, com o mesmo resultado seguro para projeto inexistente ou não autorizado.

<critical>
- ALWAYS READ the PRD, the TechSpec, and their catalogs (`_user_stories.md`, `_tests.md`) before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — implement every task-required test case assigned in ## Tests
</critical>

<requirements>
- MUST manter somente `health.check` como procedimento público e usar `protectedProcedure` em toda operação privada.
- MUST derivar `SessionPrincipal.userId` da sessão Better Auth validada no servidor, nunca do input, de cookie não validado ou de dado vindo do cliente.
- MUST usar `projectId` UUID explícito em cada operação de projeto e fazer a leitura com a condição de acesso atual na mesma consulta/transação.
- MUST devolver `NOT_FOUND` indistinguível para projeto inexistente e projeto não autorizado, sem DTO ou descrição privada.
- MUST remover `projects.create` público e manter a preferência de último projeto como conveniência, nunca como autorização ou alvo implícito.
</requirements>

## Subtasks

- [x] 3.1 Evoluir contexto e builders tRPC para sessão verificada e `protectedProcedure`.
- [x] 3.2 Criar a migração incremental, contratos e DAOs para usuários, atribuições e preferência de projeto.
- [x] 3.3 Implementar `ProjectAccessService`, erros de domínio e regras de paginação/cursor.
- [x] 3.4 Substituir o controller e router públicos pelos procedimentos protegidos de projeto e `access.me`.
- [x] 3.5 Preservar paridade de autorização entre HTTP direto, server caller, Server Actions e páginas.
- [x] 3.6 Remover a criação pública de projeto e atualizar exports/contratos tRPC tipados.
- [x] 3.7 Implementar os testes unitários e de integração atribuídos, incluindo expiração, revogação e concorrência relevante.

## Implementation Details

Seguir “Interfaces centrais”, “Endpoints e comandos” e “Rotas e experiência” da TechSpec, aplicando `layered-backend` e `trpc-nextjs`. Routers devem conter validação de input e uma chamada ao controller; serviços/DAOs mantêm regras e predicados de acesso. A designação de administrador será preenchida na task_04, mas o acesso global deve consumir a consulta de designação atual sem criar um bypass de sessão ou de projeto.

### Relevant Files

- `packages/api/src/context.ts` — hoje contém apenas `requestId`; recebe o principal derivado da ponte da task_02.
- `packages/api/src/trpc.ts` — ponto único para `protectedProcedure` e erro `UNAUTHORIZED`.
- `packages/api/src/routers/projects.ts` — router público atual a substituir por consultas/mutação protegidas.
- `packages/api/src/routers/index.ts` — registro do contrato de router e manutenção de `health` público.
- `packages/api/src/controllers/projectsController.ts` — composição e tradução de erros a tornar injetável.
- `packages/api/src/application/database/dao/projectDao.ts` — contrato atual a evoluir para acesso/paginação persistentes.
- `packages/api/src/application/services/projects/projectCatalogService.ts` — caminho de criação pública que deixa de servir o transporte.
- `apps/web/src/app/api/trpc/[trpc]/route.ts` e `apps/web/src/lib/trpc/server.ts` — entradas HTTP e server caller cuja paridade deve ser mantida.

### Dependent Files

- `packages/api/src/routers/access.ts` — task_04 registra as operações administrativas na mesma fronteira protegida.
- `apps/web/src/lib/trpc/client.ts` — tipos e procedimentos públicos mudam.
- `apps/web/src/features/projects/project-catalog/` e `apps/web/src/app/dev/page.tsx` — task_05 remove o consumo de `projects.create` e adapta o catálogo filtrado.
- `apps/web/src/app/projects/` — task_05 consome a seleção e a leitura autorizada.

### Related ADRs

- [ADR-002: Project-scoped access with administrator assignments](adrs/adr-002.md) — isolamento e regra de visibilidade.
- [ADR-004: PostgreSQL, Better Auth e sessões revogáveis](adrs/adr-004.md) — ponte de sessão e validação no servidor.
- [ADR-005: Catálogo durável e escopo explícito por projeto](adrs/adr-005.md) — `projectId` explícito e cache seguro.

## Deliverables

- Contexto tRPC autenticado e builder de procedimento protegido.
- Migração incremental e DAOs/serviços para visibilidade, leitura e seleção de projetos.
- Routers protegidos `projects.*` e `access.me`; `projects.create` removido.
- Erros seguros, cursor estável e paridade entre entrada HTTP e caller server-side.
- Every task-required test case assigned in `## Tests` implemented and passing **(REQUIRED)**

## Tests

Task-required cases assigned from `_tests.md`, the test contract — read each ID's full definition there before writing tests.

- [ ] UT-009, UT-010, UT-011, UT-012, UT-013 — visibilidade, acesso, paginação e seleção autorizada.
- [ ] UT-022, UT-023, UT-024 — predicados de DAO e preferência sem bypass.
- [ ] UT-031, UT-033 — tradução segura de erro e cursor validado.
- [ ] IT-011, IT-013, IT-014 — cookie adulterado/expirado e isolamento de identidades.
- [ ] IT-032, IT-034, IT-041, IT-044, IT-047 — vazio, não revelação, validação e seleção idempotente.
- [ ] IT-051, IT-052, IT-054, IT-057, IT-058 — UUID/projeto explícito, negação segura e chamada tRPC direta.
- [ ] IT-091, IT-092, IT-094, IT-097 — acesso global de administrador sem autoatribuição.
- [ ] IT-111, IT-112, IT-113, IT-116, IT-119, IT-120, IT-123, IT-127, IT-134, IT-135, IT-143 — saúde pública, contexto privado, falhas de banco e paridade HTTP/caller.

### Deferred Gates

- [ ] IT-015, IT-036, IT-040, IT-043, IT-046, IT-049, IT-050, IT-053, IT-055, IT-056, IT-059, IT-060, IT-088, IT-093, IT-096, IT-098, IT-099, IT-100, IT-118, IT-124 (`feature-gate`) — concorrência, escala, revogação e remoção do endpoint legado.

## Success Criteria

- Every task-required test case implemented and passing.
- Nenhuma operação privada retorna dados sem sessão validada e autorização de projeto atual.
- Chamadas diretas e server-side recebem os mesmos limites de sessão e acesso.
