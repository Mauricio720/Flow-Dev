---
status: completed
title: "Administração e provisionamento"
type: backend
complexity: high
---

# Task 04: Administração e provisionamento

## Overview

Entregar a gestão administrativa de acessos e o provisionamento explícito de administradores. Esta tarefa permite listar usuários autenticados, atribuir ou revogar projetos de forma idempotente e substituir o conjunto de administradores por uma CLI auditável.

<critical>
- ALWAYS READ the PRD, the TechSpec, and their catalogs (`_user_stories.md`, `_tests.md`) before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — implement every task-required test case assigned in ## Tests
</critical>

<requirements>
- MUST autorizar cada operação `access.*` pela designação administrativa atual no banco, nunca por `isAdmin` recebido do cliente ou gravado na sessão.
- MUST listar somente contas que concluíram login, sem email técnico, token ou sessão, usando paginação estável e busca limitada.
- MUST tornar assign/remove idempotentes, transacionais e seguros sob concorrência, alterando somente o par usuário-projeto solicitado.
- MUST manter provisionamento fora do tRPC, resolver todos os logins GitHub para IDs estáveis antes da transação e preservar o conjunto anterior em qualquer falha.
- MUST suportar `--dry-run` sem escrita e nunca imprimir ou embutir credenciais.
</requirements>

## Subtasks

- [x] 4.1 Criar a migração incremental, contratos e DAOs de usuários, atribuições e designações administrativas.
- [x] 4.2 Criar serviços de atribuição, regras de administrador e erros de domínio.
- [x] 4.3 Criar controller, schemas e router `access.*` protegido e registrá-lo no router raiz.
- [x] 4.4 Criar mapeadores de DTO que não exponham email técnico, tokens ou sessões.
- [x] 4.5 Criar fronteira GitHub para resolução de login e serviço de provisionamento transacional.
- [x] 4.6 Criar a CLI `admins:provision` com manifesto, `--dry-run`, diff e retry limitado.
- [x] 4.7 Implementar os testes unitários e de integração atribuídos.

## Implementation Details

Aplicar as interfaces de `AssignmentService`, os endpoints `access.*` e o comando de provisionamento definidos na TechSpec. Cada router chama um controller uma vez; controllers traduzem erros conhecidos; serviços e DAOs mantêm autorização, locks e transações. A tarefa consome `protectedProcedure` e `SessionPrincipal` da task_03 e não cria qualquer caminho de administração pelo frontend ou por endpoint de provisionamento.

### Relevant Files

- `packages/api/src/routers/index.ts` — registra o novo domínio `access`.
- `packages/api/src/routers/projects.ts` — referência de factory de router que será protegida pela task_03.
- `packages/api/src/context.ts` e `packages/api/src/trpc.ts` — contexto e procedure builder consumidos pelo router administrativo.
- `packages/api/src/controllers/projectsController.ts` — referência de controller e mapeamento de erro a separar por domínio.
- `packages/api/package.json` — script `admins:provision` e dependências de CLI/fronteira GitHub.
- `packages/api/src/application/database/dao/` — local dos contratos de usuário, atribuição e designação.
- `packages/api/src/infra/database/dao/` — implementações Drizzle e transações.

### Dependent Files

- `apps/web/src/app/admin/access/page.tsx` e `apps/web/src/features/access/access-management/` — task_05 consome `access.users`, `access.userAssignments`, `access.assign` e `access.remove`.
- `packages/api/src/application/services/access/ProjectAccessService` — usa a designação atual para acesso global a projetos.
- `apps/web/src/app/api/trpc/[trpc]/route.ts` — a entrada HTTP preserva os mesmos limites de acesso sem bypass.

### Related ADRs

- [ADR-002: Project-scoped access with administrator assignments](adrs/adr-002.md) — regras de administrador e atribuição.
- [ADR-003: Explicit initial administrator provisioning](adrs/adr-003.md) — provisionamento externo e estável.
- [ADR-004: PostgreSQL, Better Auth e sessões revogáveis](adrs/adr-004.md) — identidade GitHub e transações duráveis.

## Deliverables

- Migração incremental e DAOs de atribuições/designações com restrições e índices necessários.
- Serviços, controller, router e DTOs administrativos protegidos.
- CLI `admins:provision` com resolução GitHub, transação, diff e modo dry-run.
- Testes de diretório, atribuição, revogação, autorização e provisionamento.
- Every task-required test case assigned in `## Tests` implemented and passing **(REQUIRED)**

## Tests

Task-required cases assigned from `_tests.md`, the test contract — read each ID's full definition there before writing tests.

- [ ] UT-014, UT-015, UT-016, UT-017, UT-018, UT-019, UT-020, UT-021 — diretório, atribuições, idempotência e bloqueio de não-admin.
- [ ] UT-028, UT-029, UT-030, UT-032 — resolução estável do provisionamento, idempotência e erro interno seguro.
- [ ] IT-061, IT-062, IT-064, IT-068 — busca/diretório e isolamento de não-admin.
- [ ] IT-071, IT-074, IT-077, IT-078, IT-081, IT-084, IT-087 — assign/remove, inputs inválidos, idempotência e usuários não autenticados.
- [ ] IT-101, IT-102, IT-104, IT-107, IT-108, IT-109 — provisionamento, ausência de designação e remoção de papel.
- [ ] IT-117, IT-121, IT-122, IT-125, IT-126, IT-128, IT-130, IT-136, IT-137, IT-138, IT-139 — contrato dos endpoints administrativos e CLI dry-run.

### Deferred Gates

- [ ] IT-063, IT-065, IT-066, IT-067, IT-069, IT-070, IT-073, IT-075, IT-076, IT-079, IT-080, IT-083, IT-085, IT-086, IT-089, IT-090, IT-103, IT-105, IT-106, IT-110, IT-131 (`feature-gate`) — paginação, concorrência, rollback e limites externos.

## Success Criteria

- Every task-required test case implemented and passing.
- Apenas designações atuais permitem administrar atribuições.
- A CLI substitui o conjunto designado de forma atômica ou mantém o conjunto anterior.
