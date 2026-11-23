---
status: completed
title: Leitura da execução, contratos dos artefatos, REQ-014 e expurgo
type: backend
complexity: high
---

# Task 05: Leitura da execução, contratos dos artefatos, REQ-014 e expurgo

## Visão geral
Esta tarefa leva ao frontend e às features futuras o que as tarefas 03 e 04 gravam:
- `tasks.byId` ganha `execution`, com sessões, eventos, histórico, anexos e o resumo dos artefatos;
- `tasks.artifacts.list/get` vira o contrato de leitura próprio da REQ-050;
- o `open` da Spec A passa a pedir confirmação quando já existe uma sessão ativa (REQ-014);
- a exclusão da Issue apaga eventos, artefatos e versões (REQ-049).

<critical>
- LEIA a spec (`spec.md`: REQ-014, REQ-016, REQ-021 a REQ-024, REQ-034, REQ-045, REQ-049, REQ-050, §7.4, §7.5, B-05, §15, §17 DEC-07, §18 "Autorização") e as regras do projeto (AGENTS.md/CLAUDE.md, `.agents/rules/code-standards.md`). Leia as skills `layered-backend` e `trpc-nextjs`.
- FAÇA UMA MINI-TAREFA POR VEZ, na ordem. Só marque `[x]` depois de rodar o "Pronto quando" dela e ver passar.
- NÃO saia dos arquivos listados sem registrar o motivo no Registro de execução. Nada fora do escopo da spec.
- TESTES JUNTO COM O CÓDIGO: cada mini-tarefa implementa os testes atribuídos a ela.
- Ao começar, mude `status` para `in_progress` (aqui e em `_tasks.md`). Mude para `completed` só quando todas as mini-tarefas estiverem marcadas e os critérios de sucesso tiverem sido comprovados por comando. A revisão contra a spec acontece uma vez, depois de todas as tarefas: não a espere aqui, mas não marque nada que não tenha prova, porque ela vai conferir.
</critical>

## Requisitos
- REQ-014 (servidor): SE a pessoa já tiver uma sessão ativa na mesma tarefa e não mandar `allowAdditional: true`, ENTÃO o `open` DEVE recusar com `session_already_active`, sem abrir nada.
- REQ-021 (gravação): na leitura, uma sessão `opening` há mais de 60 s passa para `unconfirmed` (DEC-07). Sessões da Spec A sem token também.
- REQ-022: sessão ativa há 30 min sem eventos → `silentSince = last_signal_at`, sem mudar o estado (B-05).
- REQ-023 (servidor): a lista de sessões da tarefa traz pessoa, rota, início, fim e eventos.
- REQ-024 (servidor): quem pode ver a tarefa recebe `execution` e os artefatos em modo leitura.
- REQ-034 (servidor): os anexos de cada sessão saem com nome, tipo, tamanho, `availableUntil` e `removed`.
- REQ-045 (servidor): o resumo de cada artefato traz caminho, skill da última versão, número de versões, horário da última e `lastFailure`.
- REQ-049: excluir a Issue DEVE apagar os eventos, os artefatos e as versões da tarefa.
- REQ-050: `tasks.artifacts.list` e `tasks.artifacts.get` são o contrato de leitura, separado da tela.
- §7.4: ver a etapa, os eventos e os artefatos é permitido a quem lê a tarefa; ninguém edita nem apaga artefato pelo Flow Dev.
- §7.5: no máximo os 200 eventos mais recentes por sessão, com `hiddenEvents` dizendo quantos ficaram de fora.

## Interfaces
- **Consome:**
  - da task_02: tabelas e `TerminalSessionStatus`, `isActiveSession`;
  - da task_03: `expireUnconfirmed`, `silentSince`, `UNCONFIRMED_AFTER_MS`;
  - da Spec A:
    - `TaskDao.snapshot` (transação `repeatable read`, só de leitura);
    - `TaskDao.terminalLastOpened`;
    - `workspaceDto` em `packages/api/src/controllers/mappers/taskWorkspaceDtoMapper.ts`;
    - `TasksController.byId` em `packages/api/src/controllers/tasksController.ts`;
    - `SESSION_RETENTION_MS` em `packages/api/src/application/services/terminal/terminalCleanup.ts`;
    - `CLEANUP_STEPS` em `packages/api/src/infra/database/dao/issue-deletion/deletionPurge.ts`;
    - `terminalOpenInputSchema` em `packages/api/src/schemas/terminal.ts`;
    - `TERMINAL_REASONS` em `packages/api/src/application/services/terminal/terminalErrorCatalog.ts`.
- **Produz:**
  - `tasks.byId`, com o campo novo:
    ```ts
    execution: {
      sessions: Array<{ id; status: TerminalSessionStatus; route; userName; openedAt: string; endedAt: string | null; lastEventAt: string | null;
        silentSince: string | null; droppedEvents: number; hiddenEvents: number;
        events: Array<{ kind: TerminalEventKind; summary: string; occurredAt: string }>;
        attachments: Array<{ name; contentType; byteSize; availableUntil: string | null; removed: boolean }> }>;
      artifacts: Array<{ id; path; skill: string | null; versions: number; updatedAt: string; lastFailure: string | null }>;
    }
    ```
    - as sessões vêm da mais recente para a mais antiga, e os eventos do mais antigo para o mais recente;
    - `skill` é nula quando o artefato ainda não tem versão.

    O campo `terminal.lastOpened` da Spec A continua.
  - `tasks.artifacts.list({ projectId, taskId })` → `Array<{ id; path; versions: Array<{ version; skill; sessionId: string | null; capturedAt: string; byteSize }> }>`;
  - `tasks.artifacts.get({ projectId, taskId, artifactId, version? })` → `{ path; version; skill; sessionId: string | null; capturedAt: string; content: string }`. Sem `version`, devolve a mais recente; artefato ou versão inexistente → `NOT_FOUND`;
  - `tasks.terminal.open` com `allowAdditional: boolean`, obrigatório no schema, e o erro novo `session_already_active` (CONFLICT). A mensagem é "Já existe uma sessão aberta para esta tarefa. Abrir outra?";
  - `packages/api/src/application/database/dao/terminalExecutionDao.ts`: `TerminalExecutionDao` com `sessionsOf(taskId)`, `recentEvents(sessionIds, limit)`, `eventCounts(sessionIds)`, `attachmentsOf(sessionIds)`, `artifactSummaries(taskId)` e `expireUnconfirmed(taskId, before: Date)`;
  - `packages/api/src/application/database/dao/artifactReadDao.ts`: `ArtifactReadDao` com `list(taskId)` e `get(input: { taskId; artifactId; version?: number })`.

## Mini-tarefas

- [x] **05.1 — Leitura das sessões, dos eventos e dos anexos**
  - **Arquivos:**
    - criar `packages/api/src/application/database/dao/terminalExecutionDao.ts`;
    - criar `packages/api/src/infra/database/dao/terminal/drizzleTerminalExecutionDao.ts` e `packages/api/src/infra/database/dao/terminal/terminalExecutionQueries.ts` (eventos recentes por sessão com `row_number()`, contagens e anexos);
    - criar `packages/api/src/application/services/terminal/terminalExecutionReader.ts` (monta o DTO: `silentSince`, `hiddenEvents`, `availableUntil`);
    - criar `packages/api/test/terminal-execution-read.test.ts`.
  - **Testes:** V-08a, V-08b, V-08c, V-08d, V-08e, V-08f, V-08g
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/terminal-execution-read.test.ts` passa; `pnpm --dir packages/api typecheck` sem erros.
  - **Nota:**
    - `expireUnconfirmed(taskId, before)` é um `UPDATE … SET status = 'unconfirmed' WHERE task_id = $1 AND status = 'opening' AND opened_at < $2` e roda fora do `snapshot` (P-K);
    - `availableUntil` é `last_signal_at + SESSION_RETENTION_MS` enquanto `files_removed_at` for nulo, porque é a regra de limpeza da Spec A em `staleSessions`; `removed` é `files_removed_at` não nulo;
    - `lastEventAt` é o `occurred_at` do evento mais recente, ou nulo.
- [x] **05.2 — `execution` em `tasks.byId`, em modo leitura para membros**
  - **Arquivos:**
    - alterar `packages/api/src/controllers/tasksController.ts` (chamar `expireUnconfirmed` antes do `snapshot` e ler a execução);
    - alterar `packages/api/src/controllers/mappers/taskWorkspaceDtoMapper.ts`, `packages/api/src/application/database/dao/taskDao.ts` e `packages/api/src/infra/database/dao/tasks/drizzleTaskDao.ts`, ou injetar o `TerminalExecutionDao` no controller, o que respeitar o limite de 100 linhas;
    - alterar `packages/api/src/infra/composition.ts`;
    - alterar `packages/api/src/controllers/tasksController.test.ts`;
    - criar `packages/api/test/terminal-execution-byid.test.ts`.
  - **Testes:** V-08h, V-08i
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run src/controllers/tasksController.test.ts` e `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/terminal-execution-byid.test.ts` passam; `pnpm --dir packages/api typecheck` e `pnpm --dir apps/web typecheck` sem erros.
- [x] **05.3 — Contrato `tasks.artifacts.list/get`**
  - **Arquivos:**
    - criar `packages/api/src/schemas/artifacts.ts`;
    - criar `packages/api/src/application/database/dao/artifactReadDao.ts`;
    - criar `packages/api/src/infra/database/dao/artifacts/drizzleArtifactReadDao.ts`;
    - criar `packages/api/src/controllers/taskArtifactController.ts`;
    - criar `packages/api/src/routers/artifacts.ts`;
    - alterar `packages/api/src/routers/tasks.ts` (`artifacts: createArtifactsRouter(...)`, com `TasksRouterExtras.artifacts`);
    - criar `packages/api/src/infra/artifactComposition.ts`;
    - criar `packages/api/test/task-artifacts-contract.test.ts`.
  - **Testes:** V-20b, V-20c, V-20d
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/task-artifacts-contract.test.ts` passa; `pnpm --dir packages/api typecheck` sem erros.
  - **Nota:**
    - a autorização é a mesma leitura do `byId` (`repositories.requireRead`), mais a checagem de que o artefato pertence a `taskId`;
    - não há procedure de escrita (§7.4).
- [x] **05.4 — `open` com `allowAdditional` e `session_already_active`**
  - **Arquivos:**
    - alterar `packages/api/src/schemas/terminal.ts`, `packages/api/src/controllers/terminalSessionController.ts` e `packages/api/src/application/database/dao/terminalSessionDao.ts` (`hasActiveSession(taskId, userId)`);
    - alterar `packages/api/src/infra/database/dao/terminal/drizzleTerminalSessionDao.ts`;
    - alterar `packages/api/src/application/services/tasks/taskErrors.ts`, `packages/api/src/application/services/terminal/terminalErrorCatalog.ts` e `packages/api/src/controllers/terminalErrorMapper.ts`;
    - alterar `apps/web/src/features/issues/assigned-work/terminalContract.ts` e `apps/web/src/features/issues/assigned-work/hooks/useTerminalLaunch.ts` (enviar `allowAdditional: false`, para manter o typecheck; a confirmação é da 06.4);
    - alterar `packages/api/test/terminal-open-guards.test.ts`.
  - **Testes:** V-08j
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/terminal-open-guards.test.ts test/terminal-open.test.ts` passa; `pnpm --dir packages/api typecheck` e `pnpm --dir apps/web typecheck` sem erros.
  - **Nota:** a checagem vem depois do retorno idempotente por `requestKey`, para que um reenvio da mesma abertura não seja recusado. Sessão ativa é `isActiveSession(status)`, depois do `expireUnconfirmed`.
- [x] **05.5 — Expurgo de eventos, artefatos e versões com a Issue**
  - **Arquivos:**
    - alterar `packages/api/src/infra/database/dao/issue-deletion/deletionPurge.ts` (passos `task_terminal_events`, `task_artifact_versions` e `task_artifacts`, antes de `task_terminal_sessions` e de `tasks`);
    - alterar `packages/api/src/infra/database/dao/issue-deletion/deletionPurge.test.ts` e `packages/api/test/issue-deletion-terminal.test.ts`.
  - **Testes:** V-20a
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run src/infra/database/dao/issue-deletion/deletionPurge.test.ts` e `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/issue-deletion-terminal.test.ts test/issue-deletion-purge.test.ts` passam.

## Detalhes de implementação
- **Padrões a espelhar:**
  - routers: `packages/api/src/routers/terminal.ts` (`createTerminalRouter(controller)`, com o mapeador de erro);
  - leitura agregada: `terminalLastOpened.ts`, para o nome da pessoa (join com `users`);
  - teste do `byId`: `packages/api/test/terminal-preflight.test.ts` e os helpers de `terminal-support.ts`.
- **Carga:** a leitura roda a cada 3 s com sessão ativa (DEC-08). Use as consultas por índice da §14, e nunca carregue `content` das versões no `byId` nem no `list`.
- **Membro com acesso:** `TasksController.byId` já autoriza pela leitura do projeto. A execução sai igual para todos, e a UI decide as ações (06.3).

### Arquivos relevantes
- `packages/api/src/infra/database/dao/terminal/drizzleTerminalAttachmentDao.ts`: `staleSessions` usa `last_signal_at`, e é daí que sai o `availableUntil`.
- `packages/api/src/controllers/terminalSessionController.ts`: onde entra a REQ-014, depois de `findByRequestKey`.
- `packages/api/test/issue-deletion-terminal-support.ts`: semeia sessões e anexos para o expurgo.

### Arquivos afetados
- Os listados nas mini-tarefas.

### Decisões relacionadas
- DEC-07 (§17): "Não confirmada" é gravado por uma transição condicional na leitura, e "sem sinal" é só calculado.
- DEC-08 (§17): a tela usa o `byId` existente com polling.
- DEC-13 (§17): o contrato da REQ-050 expõe o conteúdo completo.

## Premissas
- P-I e P-K (`_tasks.md`): as inputs de `tasks.artifacts.*` levam o escopo `projectId` e `taskId`; o `expireUnconfirmed` roda fora do `snapshot` só de leitura.

## Testes atribuídos
- [x] V-08a: tarefa sem sessão → `execution.sessions = []` e `artifacts = []`.
- [x] V-08b: duas sessões, uma `ended` de Ana e uma `running` mais recente de Bruno → a de Bruno vem primeiro. Cada uma traz `userName`, `route`, `openedAt`, `endedAt` (preenchido só na encerrada) e `lastEventAt` (REQ-023).
- [x] V-08c: sessão com 205 eventos → `events` com os 200 mais recentes, do mais antigo para o mais recente, e `hiddenEvents = 5` (§7.5).
- [x] V-08d: sessão `opening` aberta há 61 s, e uma da Spec A sem token, aberta há 1 dia → as duas ficam gravadas como `unconfirmed` e saem assim; uma `opening` de 10 s continua `opening` (REQ-021).
- [x] V-08e: sessão `waiting` com `last_signal_at` há 31 min → `silentSince` igual a esse horário e `status` inalterado. Com 29 min → `null`. Uma `ended` há 2 h → `null` (REQ-022, B-05).
- [x] V-08f: sessão com dois anexos, ainda com arquivos, e outra com `files_removed_at` → os primeiros com `availableUntil = last_signal_at + 7 dias` e `removed: false`; os da segunda com `availableUntil: null` e `removed: true` (REQ-034).
- [x] V-08g: sessão com `dropped_events = 1` → `droppedEvents: 1`.
- [x] V-08h: membro do projeto que não é a operadora chama `tasks.byId` → recebe `execution` com sessões, eventos e artefatos; uma pessoa sem acesso ao projeto é recusada como hoje (REQ-024).
- [x] V-08i: artefato com 3 versões (a última da spec-to-tasks) e outro só com falha → `{ path, skill: "spec-to-tasks", versions: 3, updatedAt, lastFailure: null }` e `{ skill: null, versions: 0, lastFailure: "Maior que 1 MB" }`, nenhum com `content` (REQ-045).
- [x] V-08j: Ana tem uma sessão `running` na tarefa → `open` com `allowAdditional: false` recusa com `session_already_active`, sem criar sessão nem lançar; com `true`, abre. Uma sessão de Bruno, ativa na mesma tarefa, não bloqueia Ana. Uma sessão de Ana `ended` não bloqueia. O mesmo `requestKey` de uma abertura já feita devolve a mesma `sessionId` (REQ-014).
- [x] V-20b: `list` de uma tarefa com `spec.md` (3 versões) e `_tasks.md` (1 versão) → dois itens com as versões em ordem, cada uma com `skill`, `sessionId`, `capturedAt` e `byteSize`, e sem `content` (REQ-050).
- [x] V-20c: `get` sem `version` → v3 com o conteúdo completo; com `version: 1` → v1; com `version: 9` ou o `artifactId` de outra tarefa → `NOT_FOUND`.
- [x] V-20d: pessoa sem acesso de leitura ao projeto → `list` e `get` recusados, sem vazar existência.
- [x] V-20a: excluir a Issue de uma tarefa com sessão, eventos, artefatos e versões → nenhuma linha dessa tarefa em `task_terminal_events`, `task_artifacts` e `task_artifact_versions`; outra tarefa continua intacta; `CLEANUP_TABLE_ORDER` inclui as três tabelas antes de `tasks` (REQ-049).

## Critérios de sucesso
- Todas as mini-tarefas marcadas, cada uma com o "Pronto quando" executado.
- Todos os testes atribuídos implementados e passando.
- `tasks.byId` devolve `execution` no formato da §15, e `tasks.artifacts.*` responde a quem lê a tarefa.
- No fim da tarefa, `pnpm --dir packages/api test`, `pnpm --dir packages/api test:integration` e `pnpm --dir apps/web test` passam.
- `pnpm --dir packages/api typecheck`, `pnpm --dir apps/web typecheck` e `pnpm lint` sem erros; nenhuma regra do AGENTS.md violada.

## Registro de execução
<!-- The implementer appends one entry per mini-task: date, what was done, commands run with their result, deviations. Example:
- 2026-11-22 · 05.1 · leitura da execução · `vitest run --config vitest.integration.config.ts test/terminal-execution-read.test.ts` → 7 passed · sem desvios -->
- 2026-11-22 · 05.1 · `TerminalExecutionDao` + queries (`row_number`, contagens, anexos, artefatos) + `TerminalExecutionReader` · `vitest run --config vitest.integration.config.ts test/terminal-execution-read.test.ts` → 7 passed (V-08a a V-08g) · sem desvios
- 2026-11-22 · 05.2 · `execution` em `tasks.byId` por `TaskDao.terminalExecution` e `expireUnconfirmedTerminals` (antes do `snapshot`); leitura do workspace movida para `taskWorkspaceReader.ts` (o `tasksController.ts` estava em 100 linhas) · `vitest run src/controllers/tasksController.test.ts` → 7 passed; `vitest run --config vitest.integration.config.ts test/terminal-execution-byid.test.ts` → 2 passed (V-08h, V-08i); typecheck de api e web sem erros · desvio: fábrica `detailOf` da web ganhou `execution`
- 2026-11-22 · 05.3 · `tasks.artifacts.list/get`, schema, DAO de leitura, controller, router, composição; erro novo `artifact_unavailable` (NOT_FOUND) · `vitest run --config vitest.integration.config.ts test/task-artifacts-contract.test.ts` → 3 passed (V-20b, V-20c, V-20d) · desvio: o harness ganhou o router de artefatos
- 2026-11-22 · 05.4 · `allowAdditional` obrigatório, `session_already_active` (CONFLICT), `hasActiveSession`; a web envia `allowAdditional: false` · `vitest run --config vitest.integration.config.ts test/terminal-open-additional.test.ts test/terminal-open-guards.test.ts test/terminal-open.test.ts` → 20 passed (V-08j) · desvio: V-08j ficou em arquivo novo (`terminal-open-guards.test.ts` já tem 100 linhas); `openInput` passou a enviar `allowAdditional: true` por padrão
- 2026-11-22 · 05.5 · passos de expurgo `task_artifact_versions`, `task_artifacts`, `task_terminal_events` antes dos anexos e das sessões · `vitest run src/infra/database/dao/issue-deletion/deletionPurge.test.ts` → 3 passed; `vitest run --config vitest.integration.config.ts test/issue-deletion-terminal.test.ts test/issue-deletion-purge.test.ts` → 3 passed (V-20a)
- 2026-11-22 · fechamento · `pnpm --dir packages/api test` → 90 files, 593 passed; `test:integration` → 91 files, 520 passed; `pnpm --dir apps/web test` → 66 files, 323 passed (uma falha intermitente em ProjectCreation.test.tsx apareceu com a suíte de integração rodando em paralelo e sumiu ao rodar sozinha); typechecks e `pnpm lint` sem erros
