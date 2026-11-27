---
status: completed
title: Escolha por trabalho e abertura de sessão
type: backend
complexity: critical
---

# Task 04: Escolha por trabalho e abertura de sessão

## Visão geral
Entrega o `WorkAccountService`, com a escolha de uma conta por provedor no trabalho, e o liga à abertura de toda sessão do trabalho: rota, Gerar tarefas, item do plano e revisão automática. A sessão nasce com `agent_account_id`, e o histórico passa a mostrar a conta conforme quem lê. É o núcleo da US-02 e a base do worker (task 05).

<critical>
- LEIA a spec (`spec.md`) e as regras do projeto (AGENTS.md/CLAUDE.md, `.agents/rules/code-standards.md`) antes de começar.
- FAÇA UMA MINI-TAREFA POR VEZ, na ordem. Só marque `[x]` depois de rodar o "Pronto quando" dela e ver passar.
- NÃO saia dos arquivos listados sem registrar o motivo no Registro de execução. Nada fora do escopo da spec.
- TESTES JUNTO COM O CÓDIGO: cada mini-tarefa implementa os testes atribuídos a ela, seguindo a skill de testes do projeto (`software-testing`). Isso quer dizer: asserção sobre o efeito observável e específico, nada de `toBeTruthy` ou de só checar que não lança exceção; valor esperado tirado da spec, nunca recalculado a partir do código; dublês só em dependências lentas, variáveis ou externas; relógio e aleatoriedade controlados. Em bug, reproduza antes de corrigir.
- Ao começar, mude `status` para `in_progress` (aqui e em `_tasks.md`). Mude para `completed` só quando todas as mini-tarefas estiverem marcadas e os critérios de sucesso tiverem sido comprovados por comando. A revisão contra a spec acontece uma vez, depois de todas as tarefas: não a espere aqui, mas não marque nada que não tenha prova, porque ela vai conferir.
</critical>

## Requisitos
- REQ-012: só a pessoa operadora escolhe, por provedor, uma das próprias contas não removidas ou o login padrão (`accountId: null` apaga a linha, DEC-04).
- REQ-013: sem escolha → a sessão abre com `agent_account_id = null`.
- REQ-014 (atualizado em 2026-11-25): rota, `generate_tasks`, `plan_item`, `review` e `review_execute` gravam na sessão a conta escolhida para o **agente da sessão** (Claude → escolha `claude`; Codex → escolha `codex`).
- REQ-016 / B-08: a troca só afeta sessões abertas depois; o item do plano usa a conta vigente na hora em que é iniciado (o plano não guarda conta).
- REQ-019: conta escolhida de outra pessoa (a operadora mudou) → recusa com "A conta escolhida para o Claude Code neste trabalho não é sua. Escolha uma conta sua ou o login padrão." (ou "… para o Codex …").
- REQ-020: conta escolhida removida → recusa com "A conta <nome> foi removida. Escolha outra conta para o <provedor>."
- REQ-018 / Q-02: a visão de cada sessão no histórico ganha `account: { kind: "default" | "own" | "other"; label: string | null; removed: boolean }`. `label` só para a dona (com o nome atual, REQ-008); `removed` faz a tela mostrar "(removida)".
- B-01: `options` vazio quando a pessoa não tem contas.
- B-03: gravação com `version`; versão velha → `CONFLICT stale` com "A escolha mudou; recarregue".
- NFR-02: dona e operação conferidas no serviço.
- Invariante §7: a conta da sessão é sempre do mesmo provedor que o agente.
- Os erros de abertura entram no catálogo atual (`terminalErrorCatalog.ts`), com código `PRECONDITION_FAILED`.

## Interfaces
- **Consome:** `AgentAccountDao`, `AgentAccountRecord` (task 01); `AgentAccountService.requireOwned` e `AgentAccountView` (task 03); `SessionPurposeResolver` (`application/services/terminal/sessionPurpose.ts`); `SessionLauncher.startManual`/`launch` (`sessionLauncher.ts`); `TerminalSessionController.open` (`controllers/terminalSessionController.ts`); `authorization.requireOperate`; `TerminalExecutionReader` (`terminalExecutionReader.ts`).
- **Produz:**
  - Porta `TaskAgentAccountDao` em `packages/api/src/application/agent-accounts/taskAgentAccountDao.ts`: `choicesOf(taskId)`, `set({ taskId, provider, accountId, chosenBy, version })` → nova versão ou `null` se velha, `clear({ taskId, provider, version })`; implementação `DrizzleTaskAgentAccountDao`.
  - `WorkAccountService` em `packages/api/src/application/services/agent-accounts/workAccountService.ts`: `get(actorId, taskId)` → `{ choices: WorkAccountChoice[]; options: Record<"claude"|"codex", AgentAccountView[]>; version: number }`; `set(actorId, { taskId, provider, accountId, version })` → `WorkAccountChoice`; `resolve({ taskId, agent, actorId })` → `string | null` (o id da conta), lançando os erros de REQ-019/020.
  - `WorkAccountChoice` (spec §15): `{ provider; accountId: string | null; label: string; status: AgentAccountStatus | "default" }`; o login padrão vem com `label: "Login padrão desta máquina"`.
  - Procedures `tasks.workAccounts.get` (query) e `tasks.workAccounts.set` (mutation) em `packages/api/src/routers/workAccounts.ts`, montadas em `tasks`.
  - Razões novas em `TaskErrorReason`/`TERMINAL_REASONS`: `account_not_owned`, `account_removed`, com as mensagens acima.
  - `ExecutionSessionView.account` (visão de `TerminalExecutionReader.read`).

## Mini-tarefas

- [x] **04.1 — `WorkAccountService.get/set` e DAO da escolha**
  - **Arquivos:** `packages/api/src/application/agent-accounts/taskAgentAccountDao.ts` (criar), `packages/api/src/infra/database/dao/agent-accounts/drizzleTaskAgentAccountDao.ts` (criar), `packages/api/src/application/services/agent-accounts/workAccountService.ts` (criar), `workAccountChoiceView.ts` (criar), `packages/api/test/work-account-service.test.ts` (criar)
  - **Testes:** V-05a, V-05b, V-05c, V-05d, V-05e, V-05h
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/work-account-service.test.ts` passa
- [x] **04.2 — `resolve` na abertura e cópia para a sessão (todas as finalidades)**
  - **Arquivos:** `packages/api/src/application/services/agent-accounts/workAccountResolution.ts` (criar), `packages/api/src/controllers/terminalSessionController.ts`, `packages/api/src/application/services/terminal/sessionLauncher.ts`, `packages/api/src/application/services/terminal/terminalErrorCatalog.ts`, `packages/api/src/application/services/tasks/taskErrors.ts`, composições em `packages/api/src/infra/terminalComposition.ts` e `infra/reviewComposition.ts`, `packages/api/test/work-account-open.test.ts` (criar)
  - **Testes:** V-05f, V-05g, V-06a, V-06e
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/work-account-open.test.ts` passa; as suítes de abertura atuais (`test/codex-open-purpose.test.ts`, `test/codex-open-availability.test.ts` e os testes de `review-cycle*`) continuam passando
  - **Nota:** `resolve` roda depois de `requireOperator` e antes de `sessions.create`, e o id entra em `CreateTerminalSessionInput.agentAccountId`. Em `SessionLauncher.launch` (revisão), o agente é `input.choice.agent`.
- [x] **04.3 — Procedures `tasks.workAccounts` e a conta no histórico**
  - **Arquivos:** `packages/api/src/routers/workAccounts.ts` (criar), `packages/api/src/routers/tasks.ts`, `packages/api/src/schemas/workAccounts.ts` (criar), `packages/api/src/controllers/agentAccountErrorMapper.ts`, `packages/api/src/application/services/terminal/terminalExecutionReader.ts` (+ `sessionAccountView.ts`, criar), a consulta de `sessionsOf` em `packages/api/src/infra/database/dao/terminal/terminalExecutionQueries.ts`, `packages/api/test/work-accounts-router.test.ts` (criar)
  - **Testes:** V-06f
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/work-accounts-router.test.ts` passa; `pnpm --dir packages/api typecheck` sem erros

## Detalhes de implementação
O serviço confere a operação com o mesmo `authorization.requireOperate` que o `TerminalSessionController` usa. A conta escolhida é carregada pelo DAO da task 01; "de outra pessoa" é `ownerUserId !== actorId`, e "removida" é `removedAt !== null`. A `version` do `get` é a maior versão entre as linhas do trabalho (0 sem linhas). O `set` grava a linha nova ou incrementa a versão; o login padrão apaga a linha. A visão da conta no histórico junta `agent_accounts` por `agent_account_id` na consulta de sessões e decide `kind` comparando a dona com quem lê.

### Arquivos relevantes
- `packages/api/src/controllers/terminalSessionController.ts`: `open` e `requireOperator`.
- `packages/api/src/application/services/terminal/sessionLauncher.ts`: `startManual` (rota, Gerar tarefas, plano) e `launch` (revisão).
- `packages/api/src/application/services/terminal/sessionPurpose.ts`: `resolve` devolve `columns.agent`.
- `packages/api/src/application/services/terminal/terminalExecutionReader.ts`: `sessionView`.

### Arquivos afetados
- `terminalSessionController.ts`, `sessionLauncher.ts`: gravam `agentAccountId`.
- `terminalErrorCatalog.ts`, `taskErrors.ts`: razões novas.
- `terminalExecutionReader.ts`: `account` na visão.

### Decisões relacionadas
- DEC-02: escolha por trabalho e provedor, copiada para a sessão.
- DEC-04: login padrão implícito.

## Premissas
- `session.get`, citado na spec §15, não existe. O histórico vem de `TerminalExecutionReader.read`, e é nele que `account` entra.
- Revisão automática segue a conta do trabalho (decisão do usuário em 2026-11-25).

## Testes atribuídos
- [ ] V-05a: Ana, operadora do #42, escolhe "Trabalho" no Claude → `get` devolve a escolha `{ provider: "claude", label: "Trabalho", status: <estado da conta> }` e a versão incrementada · serviço + Postgres real.
- [ ] V-05b: Bruno, que só lê o #42, chama `set` → `FORBIDDEN not_operator` e a escolha não muda (US-02 cen. 4) · Postgres real.
- [ ] V-05c: Ana tenta escolher uma conta de Bruno → `NOT_FOUND`; uma conta removida dela → `NOT_FOUND` · Postgres real.
- [ ] V-05d: duas gravações com a mesma versão → a primeira vale, a segunda recebe `CONFLICT stale` com "A escolha mudou; recarregue" (B-03) · Postgres real.
- [ ] V-05e: trabalho sem escolha → `get` devolve as duas escolhas com `accountId: null`, `label: "Login padrão desta máquina"`, `status: "default"`; escolher "Trabalho" e depois `null` → a linha some e volta ao padrão (REQ-013, DEC-04) · Postgres real.
- [ ] V-05f: o #42 tem "Codex A" escolhida e Ana a removeu → abrir sessão Codex → recusa com "A conta Codex A foi removida. Escolha outra conta para o Codex." e nenhuma sessão criada (US-05 cen. 3) · controller + Postgres real.
- [ ] V-05g: o #42 tem uma conta de Ana escolhida e Bruno virou operador → Bruno abre sessão Claude → recusa com "A conta escolhida para o Claude Code neste trabalho não é sua. Escolha uma conta sua ou o login padrão." · Postgres real.
- [ ] V-05h: Ana com "Pessoal" (Claude), "Codex B" (Codex) e "Antiga" removida → `options.claude = [Pessoal]`, `options.codex = [Codex B]`; Ana sem contas → as duas listas vazias (B-01) · Postgres real.
- [ ] V-06a: #42 com "Trabalho" (Claude) e "Codex B" (Codex): abrir rota com Claude → sessão com o id de "Trabalho"; Gerar tarefas com Claude → "Trabalho"; item do plano com Codex → "Codex B"; trocar o Claude para "Pessoal" e iniciar um item salvo antes da troca → "Pessoal" (B-08); sem escolha → `null` · controller + Postgres real, sem worker.
- [ ] V-06e: #42 com "Codex B" escolhida → `SessionLauncher.launch` de uma revisão com agente Codex grava "Codex B"; com agente Claude e sem escolha do Claude → `null` · Postgres real.
- [ ] V-06f: sessão em "Codex A" de Ana: Ana lê o histórico → `{ kind: "own", label: "Codex A", removed: false }`; Bruno lê → `{ kind: "other", label: null, removed: false }`; depois de renomear para "Codex Principal" → Ana vê o nome novo; depois de remover → `removed: true`; sessão sem conta → `{ kind: "default", label: null, removed: false }` para os dois · caller tRPC + Postgres real.

## Critérios de sucesso
- Todas as mini-tarefas marcadas, cada uma com o "Pronto quando" executado.
- Todos os testes atribuídos implementados e passando.
- Abrir qualquer finalidade de sessão num trabalho sem escolha continua igual ao de hoje (suítes atuais verdes).
- `pnpm --dir packages/api test` e `test:integration` completos passam ao fechar a tarefa; typecheck e lint sem erros.

## Registro de execução
- 04.1 — `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/work-account-service.test.ts` — passou (5 testes: defaults, set/clear, autorização, ownership, estado removido, concorrência otimista e opções ativas). Typecheck também passou.
- 04.2 — `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/work-account-open.test.ts test/codex-open-purpose.test.ts test/codex-open-availability.test.ts` e as 16 suítes `review-cycle*.test.ts` — passaram (19 arquivos, 62 testes); `pnpm --dir packages/api typecheck` passou. A primeira execução das suítes de revisão detectou autorização duplicada na composição do worker e erro de descriptografia; `resolve` agora confia na autorização feita ao criar/abrir o trabalho e verifica a propriedade/remoção da conta. Reexecução completa passou.
- 04.3 — `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/work-accounts-router.test.ts` — passou (1 teste de integração V-06f); `pnpm --dir packages/api typecheck` — passou. O teste cobre get/set via caller tRPC, autorização de operadora, visão own/other/default e renomeação/remoção refletidas no histórico.
- Fechamento — `pnpm --dir packages/api test` passou (145 arquivos, 904 testes); `pnpm --dir packages/api test:integration` passou (206 arquivos, 927 testes, 2 arquivos/5 testes ignorados); `pnpm --dir packages/api typecheck` e `pnpm lint` passaram. A primeira integração completa revelou 7 falhas por chamadas diretas antigas ao reader; corrigida compatibilidade da assinatura e as três suítes afetadas passaram antes da confirmação completa.

### Correções da review-001 (2026-11-26)
- M-3: `TerminalExecutionReader.read(taskId, viewerUserId, now)` com assinatura única; os testes antigos (`terminal-execution-read`, `session-runtime-read`, `terminal-session-choice`) passam quem lê.
