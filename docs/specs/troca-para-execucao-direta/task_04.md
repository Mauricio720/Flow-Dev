---
status: completed
title: "Decisão: decideRouteSwitch, autorização e mensagem à sessão"
type: backend
complexity: high
---

# Task 04: Decisão: decideRouteSwitch, autorização e mensagem à sessão

## Visão geral
Expõe a mutation `tasks.session.decideRouteSwitch`. A dona da sessão confirma ou recusa. A decisão grava o estado e enfileira a mensagem de confirmação ou de recusa numa única transação, e devolve o `RouteSwitchView`. É o fluxo 2 da spec §16.

<critical>
- LEIA a spec e as regras do projeto (AGENTS.md/CLAUDE.md) antes de começar.
- FAÇA UMA MINI-TAREFA POR VEZ, na ordem. Só marque `[x]` depois de rodar o "Pronto quando" dela e ver passar.
- NÃO saia dos arquivos listados sem registrar o motivo no Registro de execução. Nada fora do escopo da spec.
- TESTES JUNTO COM O CÓDIGO: cada mini-tarefa implementa os testes atribuídos a ela, seguindo a skill de testes do projeto (`software-testing`). Isso quer dizer: asserção sobre o efeito observável e específico, nada de `toBeTruthy` ou de só checar que não lança exceção; valor esperado tirado da spec, nunca recalculado a partir do código; dublês só em dependências lentas, variáveis ou externas; relógio e aleatoriedade controlados. Em bug, reproduza antes de corrigir.
- Ao começar, mude `status` para `in_progress` (aqui e em `_tasks.md`). Mude para `completed` só quando todas as mini-tarefas estiverem marcadas e os critérios de sucesso tiverem sido comprovados por comando. A revisão contra a spec acontece uma vez, depois de todas as tarefas: não a espere aqui, mas não marque nada que não tenha prova, porque ela vai conferir.
</critical>

## Requisitos
- REQ-004: confirmar grava `confirmed`, a rota de origem, a nova, quem decidiu, quando, o resumo e os motivos.
- REQ-005: na confirmação, a mesma sessão recebe `ROUTE_SWITCH_CONFIRMED_MESSAGE`, com o texto literal da §15, que começa com `/flow-dev:direct-executor`.
- REQ-006: recusar grava `declined`, com quem decidiu e quando, e manda `ROUTE_SWITCH_DECLINED_MESSAGE`.
- B-01: uma sessão `interrupted` aceita a decisão, e a mensagem entra na fila para o `SessionResumeStep`.
- REQ-011 e RN-06: quem não é dona ou não tem permissão de operar recebe `session_control_denied`, por `SessionControlAuthorization.requireOwnActive`.
- REQ-013: com a sessão encerrada ou com falha ao abrir, o erro é `session_not_active` e a proposta não muda.
- REQ-012 (parte do transporte): `route_switch_decided` vira o erro com a mensagem "Essa proposta já foi decidida."; uma proposta que não pertence à sessão, à tarefa ou ao projeto vira `route_switch_not_found`.
- §19: log `route_switch_decided` (`proposalId`, `decision`, `actorId`).

## Interfaces
- **Consome:**
  - da task 01: `RouteSwitchView`, `RouteSwitchDecision`, `routeSwitchState`, `ROUTE_SWITCH_CONFIRMED_MESSAGE`, `ROUTE_SWITCH_DECLINED_MESSAGE`;
  - da task 02: `RouteSwitchDao.decide`, `findById`, `DecideOutcome` e `toRouteSwitchView` (`application/services/terminal/routeSwitchView.ts`);
  - `SessionControlAuthorization`, `TaskError` (`taskErrors.ts`), `mapTerminalError` (`controllers/terminalErrorMapper.ts`).
- **Produz:**
  - `RouteSwitchService.decide(input: { record: RouteSwitchRecord; decision; actorId; requestKey }): Promise<RouteSwitchView>`, no mesmo `routeSwitchService.ts` da task 03; se o arquivo passar de 100 linhas, crie `routeSwitchDecisionService.ts`;
  - `RouteSwitchController.decide(actor: SessionPrincipal, input: DecideRouteSwitchInput): Promise<{ proposal: RouteSwitchView }>` em `packages/api/src/controllers/routeSwitchController.ts`;
  - `sessionDecideRouteSwitchInputSchema` em `schemas/session.ts`, igual à §15;
  - a procedure `tasks.session.decideRouteSwitch`;
  - os novos códigos `route_switch_decided` e `route_switch_not_found` em `TaskError`.

## Mini-tarefas

- [x] **04.1 — Serviço e controller de decisão, com mensagem e log**
  - **Arquivos:** `packages/api/src/application/services/terminal/routeSwitchService.ts` (alterar) ou `routeSwitchDecisionService.ts` (criar), `packages/api/src/controllers/routeSwitchController.ts` (criar), `packages/api/src/application/services/tasks/taskErrors.ts` (alterar), `packages/api/test/route-switch-decide.test.ts` (criar)
  - **Testes:** V-05a, V-05b, V-05c
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/route-switch-decide.test.ts` passa
  - **Nota:** o controller chama `requireOwnActive` **antes** de ler a proposta. Depois, confere se `record.sessionId`, `taskId` e o projeto da sessão batem com a entrada; se não baterem, `route_switch_not_found`. `already_decided` vira `TaskError("route_switch_decided")`. `decidedAt` vem do `now` injetado.
- [x] **04.2 — Procedure, schema, composição e mapeamento de erros**
  - **Arquivos:** `packages/api/src/schemas/session.ts` (alterar), `packages/api/src/routers/session.ts` (alterar), `packages/api/src/infra/sessionInteractionComposition.ts` (alterar: `SessionControllers` ganha `routeSwitches`), `packages/api/src/controllers/terminalErrorMapper.ts` (alterar), `packages/api/test/route-switch-decide-errors.test.ts` (criar)
  - **Testes:** V-06a, V-06d, V-06e, V-06f
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/route-switch-decide-errors.test.ts test/route-switch-decide.test.ts` passa; `pnpm --dir packages/api typecheck` sem erros
  - **Nota:** mapeie `route_switch_decided` → `CONFLICT`, com a mensagem "Essa proposta já foi decidida.", e `route_switch_not_found` → `NOT_FOUND`, seguindo o padrão de `request_answered` e `request_closed` em `terminalErrorMapper.ts`.

## Detalhes de implementação
- O padrão a espelhar é `SessionRequestController.answerQuestion`, com autorização, decisão idempotente e erro de "já respondida". Ele está em `controllers/sessionRequestController.ts`, com testes em `test/session-answer.test.ts` e `test/session-request-final.test.ts`.
- A composição segue `createSessionControllers`. Passe `overrides.now` adiante.

### Arquivos relevantes
- `packages/api/src/application/services/terminal/sessionControlAuthorization.ts`: `requireOwnActive` e `session_control_denied`.
- `packages/api/src/controllers/sessionInteractionController.ts`: `toMessageView` e o padrão de controller.
- `packages/api/src/routers/session.ts` e `schemas/session.ts`: onde a procedure entra.

### Arquivos afetados
- Os arquivos listados nas mini-tarefas.

### Decisões relacionadas
- DEC-04: a mensagem vai na mesma transação; a entrega e a retomada não mudam.

## Premissas
Nenhuma.

## Testes atribuídos
- [ ] V-05a: Ana, dona da sessão `waiting`, confirma a pendente → status `confirmed`, `decided_by_user_id` = Ana, `decided_at` = relógio injetado; a mensagem `user` da sessão tem o texto literal de `ROUTE_SWITCH_CONFIRMED_MESSAGE` e começa com "`/flow-dev:direct-executor`"; a resposta traz `proposal.state = "confirmed"` e `decidedBy = "Ana"`; log `route_switch_decided` com `decision: "confirm"` · controller + DAO + Postgres
- [ ] V-05b: Ana recusa → `declined`; mensagem igual a "A troca para execução direta foi recusada. Continue com a spec. Só proponha de novo depois de uma nova pergunta respondida."; `state = "declined"` · controller + DAO + Postgres
- [ ] V-05c: sessão `interrupted` com pendente; Ana confirma → `confirmed`; a mensagem fica enfileirada (`delivered_at` nulo, `queued` true na view) · controller + DAO + Postgres
- [ ] V-06a: Bruno, que só lê (sem permissão de operar, ou não é o dono da sessão), decide → `TRPCError` vindo de `session_control_denied`; a proposta continua `pending` e não há mensagem nova · router + Postgres
- [ ] V-06d: sessão `ended` com pendente; Ana decide → `session_not_active`; a proposta continua `pending` · router + Postgres
- [ ] V-06e: proposta já `confirmed` com a chave K1; Ana decide `decline` com a chave K2 → erro `CONFLICT` com a mensagem "Essa proposta já foi decidida."; o status continua `confirmed` · router + Postgres
- [ ] V-06f: `proposalId` de outra sessão da mesma tarefa → `NOT_FOUND` (`route_switch_not_found`); nenhuma linha muda · router + Postgres

## Critérios de sucesso
- Todas as mini-tarefas marcadas, cada uma com o "Pronto quando" executado.
- Todos os testes atribuídos implementados e passando.
- `pnpm --dir packages/api test` e `test:integration` passam no fim da tarefa; `typecheck` sem erros.

## Registro de execução
- 04.1 — `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/route-switch-decide.test.ts` → passou (3 testes).
- 04.2 — `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/route-switch-decide-errors.test.ts test/route-switch-decide.test.ts` → passou (2 arquivos, 7 testes); `pnpm --dir packages/api typecheck` → passou. `terminalErrorMapper.ts` permaneceu inalterado porque já delega para `mapTaskError`; os novos códigos foram registrados no catálogo de erros de sessão, que esse mapper consulta.
- Fechamento da tarefa 04 — `pnpm --dir packages/api test` → passou (140 arquivos, 887 testes); `pnpm --dir packages/api test:integration` → passou (187 arquivos, 872 testes; 2 arquivos e 5 testes ignorados).
