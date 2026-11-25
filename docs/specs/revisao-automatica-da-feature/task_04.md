---
status: completed
title: Início, leitura e pedidos do ciclo
type: backend
complexity: high
---

# Task 04: Início, leitura e pedidos do ciclo

## Visão geral
Entrega a fronteira HTTP do ciclo: `tasks.review.get`, `tasks.review.start` e `tasks.review.request`, com o controller, o serviço e o DAO de leitura e escrita da web. A web só cria ciclos e registra pedidos (`pending_action`); quem os aplica é o passo do ciclo (05, 06). O contrato `ReviewCycleView` produzido aqui é o que a tela (07) consome.

<critical>
- LEIA a spec (§6 REQ-001–011 e REQ-028–032, §7.4, §15, §16 item 1, §18) e as regras do projeto (AGENTS.md/CLAUDE.md, `.agents/rules/code-standards.md`) antes de começar. Use as skills `layered-backend` e `trpc-nextjs`.
- FAÇA UMA MINI-TAREFA POR VEZ, na ordem. Só marque `[x]` depois de rodar o "Pronto quando" dela e ver passar.
- NÃO saia dos arquivos listados sem registrar o motivo no Registro de execução. Nada fora do escopo da spec.
- TESTES JUNTO COM O CÓDIGO: cada mini-tarefa implementa os testes atribuídos a ela, seguindo a skill de testes do projeto (`.claude/skills/software-testing/SKILL.md`). Isso quer dizer: asserção sobre o efeito observável e específico, nada de `toBeTruthy` ou de só checar que não lança exceção; valor esperado tirado da spec, nunca recalculado a partir do código; dublês só em dependências lentas, variáveis ou externas; relógio e aleatoriedade controlados. Em bug, reproduza antes de corrigir.
- Ao começar, mude `status` para `in_progress` (aqui e em `_tasks.md`). Mude para `completed` só quando todas as mini-tarefas estiverem marcadas e os critérios de sucesso tiverem sido comprovados por comando. A revisão contra a spec acontece uma vez, depois de todas as tarefas: não a espere aqui, mas não marque nada que não tenha prova, porque ela vai conferir.
</critical>

## Requisitos
- REQ-003: os padrões de `get` DEVEM vir do ciclo mais recente do trabalho e, sem ciclo, ser Claude Code · Opus · Máximo nos dois campos (DEC-07).
- REQ-004: `start` com todas as tarefas concluídas DEVE criar o ciclo em `reviewing`, rodada 1, tentativa 1, revisão 1, com as duas escolhas, `tasks_folder` do conjunto e o `host_id` desta máquina. A sessão de revisão é aberta pelo passo (05).
- REQ-005 / REQ-006: com tarefa não concluída e `partial: false`, DEVE recusar com `review_tasks_incomplete`; com `partial: true`, DEVE criar ciclo com `partial = true`.
- REQ-007: SE uma pré-condição de abertura falhar (escolha indisponível ou inválida, serviço parado, checkout inválido, skill ausente), ENTÃO DEVE recusar com o `TaskError` atual desse motivo, sem criar ciclo.
- REQ-008: com ciclo não final, DEVE recusar com `review_cycle_active` (CONFLICT), texto "Já existe uma revisão em andamento neste trabalho.".
- REQ-009: a mesma `(started_by, requestKey)` DEVE devolver o ciclo já criado.
- REQ-010: com sessões ativas do trabalho e `allowOpenSessions: false`, DEVE recusar com `review_sessions_open` e a contagem.
- REQ-011: as escolhas do ciclo NÃO DEVEM mudar enquanto ele não for final (nenhuma procedure as altera).
- REQ-030 / REQ-032: `request` DEVE aceitar só ações de `allowedActions(state)` (02) e só se `revision` bater; estado mudado → `review_cycle_changed` (CONFLICT), texto "A revisão mudou. Veja o estado atual.". Ação aceita grava `pending_action`, `pending_by`, `pending_at` e incrementa `revision`.
- REQ-031 / §18: `start` e `request` exigem `WorkAuthorization.requireOperate`; `get` exige `requireRead`. Não operadora → o erro de operação de hoje.
- REQ-019 (leitura): `get` DEVE devolver as rodadas da mais recente para a mais antiga, com `reportArtifactId` quando houver versão guardada.

## Interfaces
- **Consome:** tabelas de 01; `allowedActions`, `isFinalReviewState`, tipos de `reviewCycleTypes.ts` (02); `step_role` (01); `WorkAuthorization` e `ReadAccessGate`; o leitor do conjunto de tarefas (`taskSetLoader`/`taskSetReader` de `application/services/tasks-set/`) para total e concluídas; `TerminalOpenGuard` (`assertServiceRunning`, `requireCheckout`, `assertTools`, `assertSkills`) e o catálogo de agentes (`sessionAgentCatalog.ts`); `sessions.hasActiveSession`/contagem de sessões ativas; `mapTaskError`.
- **Produz:**
  - `ReviewCycleDao` em `packages/api/src/application/database/dao/reviewCycleDao.ts`: `findOpen(taskId)`, `findLatest(taskId)`, `findByRequestKey(userId, requestKey)`, `create(input: NewReviewCycle)`, `requestAction(input: { cycleId; revision; action; by; at }): Promise<ReviewCycleRecord | null>` (nulo quando a `revision` não bate), `view(cycleId): Promise<ReviewCycleView | null>`; implementação Drizzle em `packages/api/src/infra/database/dao/review/`.
  - `ReviewCycleView`, `ReviewRoundView`, `ReviewStep` exatamente como §15, em `packages/api/src/application/services/review/reviewCycleView.ts`.
  - `ReviewCycleService` (`application/services/review/reviewCycleService.ts`) e `ReviewCycleController` (`controllers/reviewCycleController.ts`) com `get`, `start`, `request`.
  - Schemas Zod em `packages/api/src/schemas/review.ts`; router `createReviewRouter` em `packages/api/src/routers/review.ts`, montado como `tasks.review` em `routers/tasks.ts`; composição `createProductionReviewController` em `packages/api/src/infra/reviewComposition.ts`.
  - Códigos novos em `TaskError`/`taskErrorMapper`: `review_cycle_active` e `review_cycle_changed` (CONFLICT), `review_tasks_incomplete`, `review_sessions_open` (com a contagem), `review_action_invalid`.

## Mini-tarefas

- [x] **04.1 — DAO do ciclo e visão**
  - **Arquivos:** `packages/api/src/application/database/dao/reviewCycleDao.ts` (criar), `packages/api/src/infra/database/dao/review/drizzleReviewCycleDao.ts` (criar), `drizzleReviewCycleView.ts` (criar), `packages/api/src/application/services/review/reviewCycleView.ts` (criar), `packages/api/test/review-cycle-dao.test.ts` (criar)
  - **Testes:** V-08a
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/review-cycle-dao.test.ts` passa
- [x] **04.2 — `get`: padrões, tarefas e sessões abertas**
  - **Arquivos:** `packages/api/src/application/services/review/reviewCycleService.ts` (criar), `reviewDefaults.ts` (criar), `packages/api/src/controllers/reviewCycleController.ts` (criar), `packages/api/test/review-cycle-start.test.ts` (criar), `packages/api/test/review-cycle-support.ts` (criar)
  - **Testes:** V-04a, V-04b
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/review-cycle-start.test.ts` passa
- [x] **04.3 — `start`: validações, ciclo parcial e idempotência**
  - **Arquivos:** `reviewCycleService.ts` (alterar), `reviewStartChecks.ts` (criar), `packages/api/src/application/services/tasks/taskErrors.ts` e `packages/api/src/controllers/taskErrorMapper.ts` (alterar), `packages/api/test/review-cycle-start.test.ts` (alterar)
  - **Testes:** V-04c, V-04d, V-04e, V-04f
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/review-cycle-start.test.ts` passa
- [x] **04.4 — `request`, procedures e autorização**
  - **Arquivos:** `reviewCycleService.ts` e `reviewCycleController.ts` (alterar), `packages/api/src/schemas/review.ts` (criar), `packages/api/src/routers/review.ts` (criar), `packages/api/src/routers/tasks.ts` (alterar), `packages/api/src/infra/reviewComposition.ts` (criar), `packages/api/test/review-cycle-request.test.ts` (criar)
  - **Testes:** V-04g, V-04h, V-08b
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/review-cycle-request.test.ts test/review-cycle-start.test.ts` passa; `pnpm --dir packages/api typecheck` sem erros

## Detalhes de implementação
- Espelhe a Spec D: `ExecutionPlanController` + `planSaveService.ts` + `routers/plan.ts` + `infra/planComposition.ts`, e os testes `test/plan-save*.test.ts` com `test/plan-support.ts`.
- A ordem de `start` é §16 item 1.1: `requireOperate` → `findByRequestKey` (REQ-009 devolve antes de validar o resto) → conjunto legível → tarefas ou `partial` → ciclo não final → sessões abertas ou `allowOpenSessions` → escolhas no catálogo → serviço → checkout → skill → `create`. A corrida entre dois `start` com chaves diferentes é resolvida pelo índice parcial de 01: traduza a violação para `review_cycle_active`.
- `request` não aplica nada: grava o pedido com `UPDATE ... WHERE id = ? AND revision = ? AND pending_action IS NULL` e incrementa `revision`. A tela mostra "Aplicando…" enquanto `pendingAction` não for nulo.
- `get.step` vem do estado: `reviewing` → `review`; `executing` → `execute`; `caveats` → `execute` (a vez que pode vir); em `failed`, o papel da vez é a coluna `step_role`. `get.step.role` lê `step_role` diretamente.

### Arquivos relevantes
- `packages/api/src/controllers/executionPlanController.ts`, `routers/plan.ts`, `schemas/plan.ts`, `infra/planComposition.ts`: padrão completo.
- `packages/api/src/application/services/tasks-set/planAuthorization.ts`: uso de `WorkAuthorization`.
- `packages/api/src/controllers/terminalSessionController.ts`: as checagens de pré-condição a reaproveitar.
- `packages/api/test/plan-support.ts`, `task-api-support.ts`, `task-set-support.ts`: fixtures.

### Arquivos afetados
- `packages/api/src/routers/tasks.ts`: `review: createReviewRouter(getReviewController)` e `TasksRouterExtras.review`.
- `taskErrors.ts`, `taskErrorMapper.ts`: códigos novos.

### Decisões relacionadas
- DEC-01 (spec §17): a web só grava ciclos e pedidos.
- DEC-07: padrões pelo último ciclo.

## Premissas
Nenhuma. O papel da vez é a coluna `step_role` (decisão da operadora em 2026-11-25, já na §14 e na 01).

## Testes atribuídos
- [x] V-04a (US-01 cen. 1): trabalho com 7 de 7 tarefas concluídas e nenhum ciclo → `get` devolve `cycle: null`, `defaults.reviewer` e `defaults.executor` = Claude · Opus · Máximo, `tasks: { total: 7, completed: 7 }`; com um ciclo, `view` devolve as rodadas da mais recente para a mais antiga · serviço + Postgres de teste.
- [x] V-04b (US-01 cen. 2): ciclo anterior `approved` com revisão Claude · Sonnet · Alto e execução Codex · gpt-5 · Médio → `defaults` com essas duas escolhas · serviço + Postgres de teste.
- [x] V-04c (US-01 cen. 3): 5 de 7 concluídas, `partial: false` → `review_tasks_incomplete` e nenhuma linha; `partial: true` → ciclo `reviewing`, rodada 1, `partial = true` · serviço + Postgres de teste.
- [x] V-04d (US-01 cen. 4, REQ-007): Codex sem login na execução → o erro atual de agente indisponível e nenhuma linha em `task_review_cycles`; o mesmo para serviço de sessões parado, checkout ausente e skill ausente · serviço + Postgres de teste, catálogo de agentes falso.
- [x] V-04e (REQ-009): duas chamadas `start` com a mesma `requestKey` → o mesmo `id`, uma linha só · serviço + Postgres de teste.
- [x] V-04f (REQ-008, REQ-010): ciclo em `executing` → novo `start` com outra chave recebe `review_cycle_active` (CONFLICT); 2 sessões ativas do trabalho e `allowOpenSessions: false` → `review_sessions_open` com `count: 2` e nenhuma linha; com `allowOpenSessions: true` → ciclo criado · serviço + Postgres de teste.
- [x] V-04g (REQ-031, §18): membro com leitura chama `start` e `request` → o erro de operação de hoje (FORBIDDEN); o mesmo membro chama `get` → recebe a visão; não membro chama `get` → FORBIDDEN · router tRPC + Postgres de teste.
- [x] V-04h (REQ-011, REQ-030): `request` com `stop` em `reviewing` → `pendingAction: "stop"`, `revision` + 1, escolhas iguais às do início; `accept` em `reviewing` → `review_action_invalid` · serviço + Postgres de teste.
- [x] V-08a: `requestAction` com `revision` velha → nulo e linha intacta; com `pending_action` já gravado → nulo · DAO + Postgres de teste.
- [x] V-08b (US-05 cen. 3, B-05): ciclo em `caveats`, `accept` e `fix` concorrentes com a mesma `revision` (`Promise.all`) → exatamente uma vale; a outra recebe `review_cycle_changed` com "A revisão mudou. Veja o estado atual." · serviço + Postgres de teste, duas chamadas concorrentes.

## Critérios de sucesso
- Todas as mini-tarefas marcadas, cada uma com o "Pronto quando" executado.
- Todos os testes atribuídos implementados e passando.
- Ao fim da tarefa: `pnpm --dir packages/api test` e `pnpm --dir packages/api test:integration` completos passando uma vez.
- Typecheck e lint do pacote sem erros; nenhuma regra do AGENTS.md violada.

## Registro de execução
<!-- The implementer appends one entry per mini-task: date, what was done, commands run with their result, deviations. -->
- 2026-11-25 · **04.1 concluída.** Criados os contratos do DAO e da visão, a implementação Drizzle para localizar/criar ciclos e gravar ações por revisão, e a visão com etapa ativa, status de sessão, rodadas em ordem decrescente e `reportArtifactId`. V-08a valida revisão antiga, ação pendente e atualização única; testes adicionais cobrem leitura da visão e busca/idempotência. `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/review-cycle-dao.test.ts` → 1 arquivo e 3 testes passaram.
- 2026-11-25 · **04.2 concluída.** Implementados `get`, padrões do último ciclo (ou Claude · Opus · Máximo), contagem de tarefas concluídas e sessões ativas, e disponibilidade dos agentes. O controller valida acesso de leitura ao projeto e pertença da tarefa. V-04a e V-04b passaram. `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/review-cycle-start.test.ts` → 1 arquivo e 2 testes passaram.
- 2026-11-25 · **04.3 concluída.** `start` valida conjunto legível, tarefas incompletas, ciclo ativo, sessões abertas, escolhas de agente, serviço, checkout e skills; grava ciclos parciais e devolve ciclo existente pela mesma chave. Os erros e mensagens de ciclo ativo, tarefas incompletas e sessões abertas foram mapeados. V-04c–V-04f passaram. `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/review-cycle-start.test.ts` → 1 arquivo e 10 testes passaram.
- 2026-11-25 · **04.4 concluída.** Adicionados `request`, schemas Zod e router `tasks.review.*`; `get` exige leitura, `start` e `request` exigem operação. A gravação usa revisão otimista e só aceita ações permitidas no estado atual. V-04g, V-04h e V-08b passaram. `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/review-cycle-request.test.ts test/review-cycle-start.test.ts` → 2 arquivos e 13 testes passaram; `pnpm --dir packages/api typecheck` → sem erros. A leitura de projeto sem acesso é mapeada para FORBIDDEN, conforme V-04g.
- 2026-11-25 · **Verificação final da tarefa 04.** `pnpm --dir packages/api test` → 136 arquivos, 848 testes passaram. A primeira execução completa de integração, simultânea ao unitário e lint, teve 1 falha em `codex-secret-answer.test.ts`; isolado, esse arquivo passou (3 testes), e a repetição completa, sem concorrência, passou com 169 arquivos, 815 testes e 5 skips. `pnpm --dir packages/api typecheck` passou; `pnpm lint` passou em `apps/web`. `packages/api` não possui script `lint`; os arquivos novos respeitam o limite de 100 linhas. Incluído `review-cycle-support.ts` para montar o router e a autorização real nos testes; o controlador converte projeto sem acesso em FORBIDDEN para cumprir V-04g. Tarefa 04 concluída.
- 2026-11-25 · Correção da review-001 (B-1): `ReviewCycleService.get` passou a devolver a visão do ciclo mais recente, final ou não (`findLatest`), para a tela mostrar Aprovada, Ressalvas aceitas e Parada com as rodadas. Novo `test/review-cycle-finished-read.test.ts` (3 testes: parada pela operadora, aprovada e aceita com rodadas, ciclo novo depois de um final).
