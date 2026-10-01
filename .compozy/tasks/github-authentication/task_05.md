---
status: completed
title: "Interface privada e gestão de acesso"
type: frontend
complexity: high
---

# Task 05: Interface privada e gestão de acesso

## Overview

Transformar a interface demonstrativa em jornadas privadas e contextualizadas por projeto. A tarefa entrega login real, seletor, workspace por projeto, tratamento de revogação e a tela administrativa acessível somente a designações atuais.

<critical>
- ALWAYS READ the PRD, the TechSpec, and their catalogs (`_user_stories.md`, `_tests.md`) before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — implement every task-required test case assigned in ## Tests
</critical>

<requirements>
- MUST usar Server Components para resolver sessão e autorização inicial e manter componentes client somente para interação, busca, paginação e mutações.
- MUST exibir apenas projetos retornados pelos procedimentos autorizados e sempre navegar/manter o `projectId` explícito na rota.
- MUST redirecionar sessão ausente ou expirada sem renderizar dados privados e tratar `NOT_FOUND` de revogação sem preservar conteúdo do projeto anterior.
- MUST retirar a criação pública demonstrativa e proteger `/dev`, mostrando somente catálogo filtrado e saúde pública.
- MUST manter cópia em português, estados acessíveis por teclado e o workspace claramente identificado como demonstração.
</requirements>

## Subtasks

- [x] 5.1 Ler PRODUCT.md, DESIGN.md, as regras E2E e a documentação local do Next.js antes de alterar rotas ou interface.
- [x] 5.2 Atualizar login e topbar para usar login/logout reais e estados de autorização em português.
- [x] 5.3 Criar rotas finas privadas para raiz, seletor, projeto e administração, com resolução server-side.
- [x] 5.4 Criar o seletor paginado, estado sem projeto e troca de projeto pelo contrato tRPC autorizado.
- [x] 5.5 Contextualizar o demonstrador pelo `projectId`, rotulá-lo como demo e reiniciar estado local ao trocar ou perder acesso.
- [x] 5.6 Criar a gestão de acesso para diretório, busca, paginação, atribuição e remoção conforme `access.*`.
- [x] 5.7 Remover o formulário legado de criação, ajustar `/dev` e tratar deep links, expiração e revogação.
- [x] 5.8 Criar a infraestrutura Playwright e implementar os testes unitários/integração atribuídos.

## Implementation Details

Aplicar “Rotas e experiência”, “Abordagem de testes” e “Análise de impacto” da TechSpec. Seguir `nextjs-folder-structure`: entradas `app/` ficam finas e fluxos com estado vão para `src/features/`. Esta tarefa consome `authClient` da task_02 e os procedimentos tipados das tasks_03 e 04; não reimplementa OAuth, contexto de sessão, autorização de projeto ou administração no cliente.

### Relevant Files

- `apps/web/src/app/page.tsx` — raiz hoje renderiza demo público; passa a resolver última seleção válida ou seletor.
- `apps/web/src/app/login/page.tsx` e `apps/web/src/features/auth/login/` — tela pública e mensagens de login.
- `apps/web/src/features/auth/login/components/GitHubSignIn.tsx` — botão simulado a ligar ao cliente Better Auth.
- `apps/web/src/features/issues/issue-composer/` — demonstrador local a receber contexto explícito de projeto e reinicialização.
- `apps/web/src/features/issues/issue-composer/components/TopBar.tsx` — identidade, projeto e logout atuais precisam de dados reais.
- `apps/web/src/app/dev/page.tsx` e `apps/web/src/features/projects/project-catalog/` — catálogo/formulário legado a proteger e simplificar.
- `apps/web/src/lib/trpc/client.ts` e `apps/web/src/lib/trpc/server.ts` — clientes tipados a consumir contratos protegidos.
- `apps/web/src/app/layout.tsx`, `apps/web/src/app/globals.css` e `apps/web/src/components/icons.tsx` — casca, tokens e ícones compartilhados.

### Dependent Files

- `apps/web/src/app/projects/page.tsx` e `apps/web/src/app/projects/[projectId]/page.tsx` — novas rotas finas para seletor e workspace.
- `apps/web/src/app/admin/access/page.tsx` — nova rota fina para gestão administrativa.
- `apps/web/src/features/projects/project-selector/` e `apps/web/src/features/access/access-management/` — novos fluxos de produto com componentes interativos locais.
- `apps/web/playwright.config.ts` e `apps/web/e2e/` — testes de jornada e configuração Playwright.
- `packages/api/src/routers/projects.ts` e `packages/api/src/routers/access.ts` — contratos consumidos, entregues nas tarefas anteriores.

### Related ADRs

- [ADR-001: GitHub identity and application session](adrs/adr-001.md) — login e sessão de aplicação.
- [ADR-002: Project-scoped access with administrator assignments](adrs/adr-002.md) — estados privados, seleção e gestão de acesso.
- [ADR-004: PostgreSQL, Better Auth e sessões revogáveis](adrs/adr-004.md) — sessão, logout e mensagens de erro.
- [ADR-005: Catálogo durável e escopo explícito por projeto](adrs/adr-005.md) — rotas por projeto e isolamento entre abas.

## Deliverables

- Rotas privadas, login/logout reais e redirecionamentos seguros.
- Seletor, workspace contextualizado, estado sem projeto e tratamento de revogação.
- Gestão administrativa de atribuições e `/dev` protegido sem criação pública.
- Configuração Playwright e testes de interface/integração atribuídos.
- Every task-required test case assigned in `## Tests` implemented and passing **(REQUIRED)**

## Tests

Task-required cases assigned from `_tests.md`, the test contract — read each ID's full definition there before writing tests.

- [x] UT-004, UT-005 — sanitização e preservação de destino interno após login.
- [x] UT-035, UT-036 — resolução da raiz com preferência revogada e limpeza visual após perda de acesso.
- [x] IT-012, IT-031, IT-042 — redirecionamento sem sessão, deep link sem acesso e seletor vazio sem ação de criação.
- [x] IT-072, IT-082 — estados de interface indisponíveis para atribuir/remover sem alvo válido.

### Deferred Gates

- [ ] IT-008, IT-018, IT-028, IT-033, IT-035, IT-037, IT-038, IT-039, IT-045, IT-048, IT-095 (`feature-gate`) — deep links, abas, revogação e recuperação de estados.
- [ ] E2E-001, E2E-002, E2E-003, E2E-004, E2E-005, E2E-006, E2E-007, E2E-008, E2E-009, E2E-010, E2E-011 (`feature-gate`) — jornadas completas de login, projetos e administração.
- [ ] E2E-014 (`qa-release`) — acessibilidade por teclado em desktop e móvel.

## Success Criteria

- Every task-required test case implemented and passing.
- Nenhuma rota privada apresenta dados de projeto sem sessão e acesso atuais.
- O demonstrador reinicia seu estado local ao trocar ou perder o projeto e continua identificado como demo.
