---
status: completed
title: "Autenticação GitHub e sessões Better Auth"
type: infra
complexity: critical
---

# Task 02: Autenticação GitHub e sessões Better Auth

## Overview

Entregar a autenticação real por GitHub e a sessão revogável de Flow Dev sobre PostgreSQL. A tarefa substitui a simulação de login, expõe a rota Better Auth e fecha as superfícies de OAuth que não pertencem ao produto.

<critical>
- ALWAYS READ the PRD, the TechSpec, and their catalogs (`_user_stories.md`, `_tests.md`) before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — implement every task-required test case assigned in ## Tests
</critical>

<requirements>
- MUST integrar Better Auth com o adaptador Drizzle, GitHub como único provedor e tabelas/migração incrementais para identidade, contas, sessões, verificação e rate limit.
- MUST solicitar somente `read:user`, identificar contas pelo ID numérico GitHub e aceitar perfil sem email ou avatar.
- MUST expirar a sessão após sete dias sem uso, renová-la em cada atividade válida e manter a fonte de verdade no banco, sem cache de sessão em cookie.
- MUST rejeitar escopos e parâmetros OAuth enviados pelo cliente, bloquear rotas de senha, token e vínculo social e criptografar tokens OAuth persistidos.
- MUST validar ambiente e origem, manter segredos somente no servidor e preservar mensagens de login em português.
</requirements>

## Subtasks

- [x] 2.1 Adicionar Better Auth, adaptador Drizzle e configurações/variáveis de ambiente necessárias.
- [x] 2.2 Criar a migração incremental e os mapeamentos Drizzle para os modelos Better Auth.
- [x] 2.3 Criar a instância server-only, cliente React e Route Handler catch-all de autenticação.
- [x] 2.4 Configurar GitHub com perfil mínimo, identificador técnico e associação de conta segura.
- [x] 2.5 Configurar sessão, renovação, cookies, rate limit e propagação de `Set-Cookie`.
- [x] 2.6 Bloquear fluxos e endpoints fora do escopo, incluindo escalada de escopo por chamada direta.
- [x] 2.7 Substituir a ação simulada de login por `signIn.social` e mapear erros permitidos para PT-BR.
- [x] 2.8 Implementar os testes unitários e de integração atribuídos.

## Implementation Details

Aplicar “Componentes e fluxo”, “Integrações” e ADR-004 da TechSpec. A ponte criada aqui devolve apenas o ID de usuário verificado para a task_03; ela não concede papel administrativo, projeto ou permissão. A configuração usa `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` e `DATABASE_URL` somente no servidor, com OAuth App e segredos próprios por ambiente.

### Relevant Files

- `apps/web/package.json` — dependências runtime de Better Auth e comandos de teste.
- `apps/web/src/app/login/page.tsx` — entrada existente para erros de autenticação em português.
- `apps/web/src/features/auth/login/index.tsx` — composição da tela de login.
- `apps/web/src/features/auth/login/components/GitHubSignIn.tsx` — ação simulada a trocar pelo cliente Better Auth.
- `apps/web/src/app/api/trpc/[trpc]/route.ts` — superfície que preserva `Set-Cookie` de renovação ao integrar a ponte.
- `apps/web/src/lib/trpc/server.ts` — caller server-side que consumirá a sessão verificada.
- `packages/api/src/server.ts` — exportação server-only da conexão e schema vindos da task_01.
- `packages/api/package.json` — migração incremental e comandos de teste compartilhados.

### Dependent Files

- `packages/api/src/context.ts` e `packages/api/src/trpc.ts` — task_03 usa a ponte para construir `protectedProcedure`.
- `apps/web/src/app/api/auth/[...all]/route.ts` — nova rota consumida pelo login, logout e renovação de sessão.
- `apps/web/src/lib/auth/` — novos módulos server-only e cliente consumidos pelas tarefas 03 e 05.
- `apps/web/src/app/page.tsx` e rotas privadas — task_05 aplica redirecionamento e experiência autenticada.

### Related ADRs

- [ADR-001: GitHub identity and application session](adrs/adr-001.md) — identidade GitHub sem acesso a repositórios.
- [ADR-004: PostgreSQL, Better Auth e sessões revogáveis](adrs/adr-004.md) — mecanismo, sessões, escopos e configuração OAuth.

## Deliverables

- Better Auth configurado com GitHub, Drizzle, sessão em banco, logout e renovação de cookie.
- Login real em português e rota `/api/auth/[...all]` funcional.
- Proteções de escopo, token, associação de conta, origem e rate limit.
- Migração incremental e testes de identidade, sessão e hardening OAuth.
- Every task-required test case assigned in `## Tests` implemented and passing **(REQUIRED)**

## Tests

Task-required cases assigned from `_tests.md`, the test contract — read each ID's full definition there before writing tests.

- [ ] UT-001, UT-002, UT-003, UT-006, UT-007, UT-008, UT-034, UT-037, UT-038 — mapeamento GitHub, rate limit, ponte de sessão, erros OAuth e bloqueio de escopos.
- [ ] IT-001, IT-002, IT-003, IT-004, IT-007 — callback, perfil opcional, repetição de código e limite de início OAuth.
- [ ] IT-021, IT-022, IT-024, IT-027 — logout seguro, origem inválida e isolamento entre sessões.
- [ ] IT-140, IT-141, IT-142 — escopo `repo` bloqueado, endpoints fora do escopo e token criptografado sem exposição.
- [ ] IT-144, IT-145 — renovação após atividade e configuração OAuth distinta por ambiente.

### Deferred Gates

- [ ] IT-005, IT-006, IT-009, IT-010, IT-016, IT-017, IT-019, IT-020, IT-023, IT-025, IT-026, IT-029, IT-030, IT-129 (`feature-gate`) — regressão e concorrência OAuth/sessão.
- [ ] E2E-012, E2E-013, E2E-015 (`qa-release`) — OAuth real, negação e isolamento de OAuth Apps em staging/ambientes.

## Success Criteria

- Every task-required test case implemented and passing.
- O login cria apenas sessões persistidas e verificadas no servidor.
- Nenhuma chamada direta consegue aumentar escopo, obter token OAuth ou vincular outra conta.
