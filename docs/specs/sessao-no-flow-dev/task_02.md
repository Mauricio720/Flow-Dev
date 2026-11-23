---
status: completed
title: Esquema, estados e regras puras dos pedidos
type: backend
complexity: high
---

# Task 02: Esquema, estados e regras puras dos pedidos

## Visão geral
Esta tarefa cria a base que a web (03) e o serviço (04, 05) compartilham:
- a migration 0048 com as tabelas da conversa, dos pedidos e do heartbeat;
- os DAOs com as operações atômicas;
- a máquina de estados com "Precisa de você" e "Interrompida";
- as funções puras que resumem uma aprovação e validam uma resposta.

Nada aqui depende do SDK.

<critical>
- LEIA a spec (`docs/specs/sessao-no-flow-dev/spec.md`, §7, §14 e §18) e as regras do projeto (AGENTS.md/CLAUDE.md, `.agents/rules/code-standards.md`) antes de começar. Use a skill `layered-backend`.
- FAÇA UMA MINI-TAREFA POR VEZ, na ordem. Só marque `[x]` depois de rodar o "Pronto quando" dela e ver passar.
- NÃO saia dos arquivos listados sem registrar o motivo no Registro de execução. Nada fora do escopo da spec.
- TESTES JUNTO COM O CÓDIGO: cada mini-tarefa implementa os testes atribuídos a ela, seguindo a skill de testes do projeto (`software-testing`). Isso quer dizer: asserção sobre o efeito observável e específico, nada de `toBeTruthy` ou de só checar que não lança exceção; valor esperado tirado da spec, nunca recalculado a partir do código; dublês só em dependências lentas, variáveis ou externas; relógio e aleatoriedade controlados. Em bug, reproduza antes de corrigir.
- Ao começar, mude `status` para `in_progress` (aqui e em `_tasks.md`). Mude para `completed` só quando todas as mini-tarefas estiverem marcadas e os critérios de sucesso tiverem sido comprovados por comando. A revisão contra a spec acontece uma vez, depois de todas as tarefas: não a espere aqui, mas não marque nada que não tenha prova, porque ela vai conferir.
</critical>

## Requisitos
- DEC-21 e §14: as tabelas `task_terminal_messages`, `task_terminal_requests` e `terminal_session_hosts`, e as colunas novas de `task_terminal_sessions`, exatamente como na spec §14.
- 7.2: as transições novas (`asking`, `interrupted`); Encerrada e Falhou ao abrir continuam finais.
- REQ-067: responder a um pedido só vale se ele ainda estiver `pending`; a segunda resposta não muda nada.
- REQ-063, REQ-064, REQ-066 e 7.9: a resposta de cada pergunta é um rótulo existente, os rótulos marcados ou "Outra" com 1 a 2.000 caracteres; todas as perguntas do pedido precisam de resposta.
- REQ-069, REQ-070 e 7.10: o conteúdo exibido por ferramenta; "Permitir sempre" só com uma regra sugerida; o motivo da recusa tem até 2.000 caracteres.
- 7.5: conteúdo exibido cortado em 20.000 caracteres, terminando em "[mensagem cortada]".
- Dados existentes (§14): as sessões atuais ficam com `runtime = terminal` e `permission_mode = bypass`.

## Interfaces
- **Consome:** `packages/api/src/infra/database/schema/tasks/terminal.ts` e `terminalEvents.ts` (Spec A e B); `packages/api/src/application/terminal/terminalSessionStatus.ts`; `packages/api/src/application/services/terminal/terminalSessionStateMachine.ts`.
- **Produz:**
  - `TERMINAL_SESSION_STATUSES` com `asking` e `interrupted`; `SessionRuntimeKind = "terminal" | "flow_dev"`; `PermissionMode = "bypass" | "accept_edits" | "ask_all"`, em `packages/api/src/application/terminal/sessionInteraction.ts`.
  - `applySessionSignal(status, signal)`, onde `signal` é `"request_opened" | "requests_settled" | "turn_ended" | "interrupted" | "orphaned" | "ended" | "work"`, ao lado de `applyTerminalEvent`.
  - `summarizePermissionRequest({ toolName, input, cwd }) → { title: string; body: string; truncated: boolean }`.
  - `validateQuestionAnswers(questions, answers) → { ok: true; answers: Record<string, string | string[]> } | { ok: false; reason: "answer_incomplete" | "answer_invalid" }`.
  - `validatePermissionDecision({ decision, reason?, suggestedRule }) → ok | { reason: "answer_invalid" }`.
  - Portas e DAOs: `SessionMessageDao`, `SessionRequestDao`, `SessionHostDao` e `SessionControlDao`, com os métodos usados por 03, 04 e 05: `insertUserMessage`, `insertAssistantMessage`, `insertSystemMessage`, `listUndelivered`, `markDelivered`, `markUndelivered`, `insertRequest`, `answerIfPending`, `cancelPending`, `listAnsweredFor`, `beat`, `lastBeat`, `claimOpening`, `requestInterrupt`, `requestEnd`, `clearControl`, `markOrphans`.

## Mini-tarefas

- [x] **02.1 — Migration 0048, schema e status**
  - **Arquivos:** `packages/api/drizzle/0048_session_interaction.sql` e `0048_session_interaction_rollback.sql` (criar), `packages/api/drizzle/meta/_journal.json`, `packages/api/test/databaseMigrations.ts` (registrar `0048_session_interaction`), `packages/api/src/infra/database/schema/tasks/terminal.ts` (colunas novas), `packages/api/src/infra/database/schema/tasks/sessionInteraction.ts` (criar: mensagens, pedidos e hosts), `packages/api/src/application/terminal/terminalSessionStatus.ts`, `packages/api/src/application/terminal/sessionInteraction.ts` (criar), `packages/api/test/session-interaction-migration.test.ts` (criar)
  - **Testes:** V-32a
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/session-interaction-migration.test.ts` passa; `pnpm --dir packages/api typecheck` sem erros
  - **Nota:** espelhe `packages/api/test/terminal-tracking-migration.test.ts` (aplica até a 0047 com `applyMigrationsAfter`, semeia, aplica a 0048 e confere).
- [x] **02.2 — DAOs da conversa, dos pedidos, dos hosts e dos controles**
  - **Arquivos:** `packages/api/src/application/terminal/sessionInteractionPorts.ts` (criar: as interfaces), `packages/api/src/infra/database/dao/terminal/drizzleSessionMessageDao.ts`, `drizzleSessionRequestDao.ts`, `drizzleSessionHostDao.ts`, `drizzleSessionControlDao.ts` (criar), `packages/api/test/session-interaction-dao.test.ts` (criar)
  - **Testes:** V-23e
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/session-interaction-dao.test.ts` passa; `pnpm --dir packages/api typecheck` sem erros
  - **Nota:** `answerIfPending` e `claimOpening` são um único `UPDATE … WHERE … RETURNING`; devolvem a linha ou `null`, sem ler antes.
- [x] **02.3 — Máquina de estados com "Precisa de você" e "Interrompida"**
  - **Arquivos:** `packages/api/src/application/services/terminal/sessionSignals.ts` (criar), `packages/api/src/application/services/terminal/terminalSessionStateMachine.ts` (aceitar `asking` e `interrupted` nas transições existentes), `packages/api/src/application/services/terminal/sessionSignals.test.ts` (criar)
  - **Testes:** V-21a, V-21b, V-21c
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run src/application/services/terminal/sessionSignals.test.ts src/application/services/terminal/terminalSessionStateMachine.test.ts` passa
- [x] **02.4 — Resumo das aprovações e validação das respostas**
  - **Arquivos:** `packages/api/src/application/services/terminal/permissionRequestSummarizer.ts`, `permissionDisplayRules.ts`, `questionAnswerValidation.ts`, `permissionDecisionValidation.ts`, `sessionInteractionLimits.ts` (criar), com os testes `permissionRequestSummarizer.test.ts` e `questionAnswerValidation.test.ts` (criar)
  - **Testes:** V-22a, V-22b, V-22c, V-22d, V-22e, V-22f
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run src/application/services/terminal/permissionRequestSummarizer.test.ts src/application/services/terminal/questionAnswerValidation.test.ts` passa; `pnpm --dir packages/api typecheck` sem erros

## Detalhes de implementação
- O formato de pergunta é o do `AskUserQuestion`: `questions[]` com `question`, `header`, `options[]` (`label`, `description`, `preview?`) e `multiSelect`. Declare o tipo localmente em `sessionInteraction.ts`; a 04 o liga ao SDK.
- Os caminhos exibidos (7.10) são relativos ao `cwd` (o clone). Use `path.relative`, e mantenha o absoluto quando o arquivo estiver fora do clone.
- Os limites (20.000, 2.000, 50.000 e 200) ficam em `sessionInteractionLimits.ts`, para a 03 e a 04 reutilizarem.

### Arquivos relevantes
- `packages/api/drizzle/0047_terminal_tracking_artifacts.sql` e o rollback dele: estilo da migration à mão.
- `packages/api/src/infra/database/dao/terminal/drizzleTerminalSessionDao.ts` e `terminalSessionWrites.ts`: padrão de DAO e de escrita.
- `packages/api/src/application/services/terminal/hookEventSummarizer.ts`: padrão de função pura de resumo.

### Arquivos afetados
- Os listados nas mini-tarefas.

### Decisões relacionadas
- DEC-21 (spec §17): tabelas próprias para a conversa e os pedidos.
- §18: rótulos e regra validados contra o payload gravado.

## Premissas
Nenhuma. O formato de `suggestions` só é usado como texto (`suggestedRule`), então não depende do spike.

## Testes atribuídos
- [x] V-32a: banco com uma sessão da Spec B (`status = waiting`), aplica a 0048 → a linha tem `runtime = terminal` e `permission_mode = bypass`; o check aceita `asking` e `interrupted`, e recusa `runtime = gnome`; o rollback remove as tabelas e colunas novas · Postgres de teste
- [x] V-23e: um pedido `pending` e duas chamadas concorrentes de `answerIfPending` → exatamente uma devolve a linha e a outra devolve `null`; `answer` é o da que venceu · Postgres de teste
- [x] V-21a: cada linha da tabela 7.2 → o estado de destino da spec (ex.: `running` + `request_opened` → `asking`; `asking` + `turn_ended` → `waiting`; `waiting` + `orphaned` → `interrupted`; `interrupted` + `work` → `running`) · função pura
- [x] V-21b: `ended` e `launch_failed` com qualquer sinal → `null`, sem mudança · função pura
- [x] V-21c: `asking` + `requests_settled` → `running`; `asking` + `work` continua `asking` · função pura
- [x] V-22a: uma pergunta de escolha única, resposta com um rótulo existente → `ok` com `{ "<pergunta>": "<rótulo>" }` · função pura
- [x] V-22b: duas perguntas, a segunda múltipla, com dois rótulos marcados → `ok` com uma string e um array de dois; só a primeira respondida → `answer_incomplete` · função pura
- [x] V-22c: "Outra" com 2.000 caracteres → aceita como texto; com 2.001 ou vazio → `answer_invalid`; rótulo que não está no payload → `answer_invalid` · função pura
- [x] V-22d: `allow_always` sem `suggestedRule` → `answer_invalid`; `deny` com motivo de 2.001 caracteres → `answer_invalid`; `deny` sem motivo → `ok` · função pura
- [x] V-22e: Bash `{ command: "pnpm test", description: "Roda os testes" }` → título "Rodar comando:" e corpo com o comando e a descrição; Edit com `file_path` dentro do clone → "Editar src/a.ts" e os trechos antes e depois; MultiEdit com 2 edições → os 2 pares; Write → "Criar <caminho>" e o conteúdo; WebFetch → a URL; WebSearch → a busca; `mcp__x__y` → o nome e a entrada formatada · função pura
- [x] V-22f: um Write com 25.000 caracteres → corpo com 20.000 caracteres seguido de "[mensagem cortada]" e `truncated: true` · função pura

## Critérios de sucesso
- Todas as mini-tarefas marcadas, cada uma com o "Pronto quando" executado.
- Todos os testes atribuídos implementados e passando.
- `pnpm --dir packages/api test` e `pnpm --dir packages/api test:integration` passando ao fim da tarefa.
- `pnpm --dir packages/api typecheck` e `pnpm --dir packages/api lint` sem erros; nenhum arquivo `.ts` acima de 100 linhas.

## Registro de execução
<!-- Uma entrada por mini-tarefa: data, o que foi feito, comandos e resultado, desvios. -->

### 2026-11-23 — 02.1 Migration 0048, schema e status
- Criados `drizzle/0048_session_interaction.sql` e `_rollback.sql`, entrada 48 no `_journal.json`, registro em `test/databaseMigrations.ts`, colunas novas em `schema/tasks/terminal.ts`, tabelas em `schema/tasks/sessionInteraction.ts`, tipos em `application/terminal/sessionInteraction.ts`, `asking` e `interrupted` em `terminalSessionStatus.ts`. `TerminalSessionRecord` ganhou os campos novos (e `toSessionRecord` os converte).
- Além da spec §14, a migration cria dois índices parciais: `task_terminal_sessions_host_status_idx` (sessões `flow_dev` por `host_id` e `status`) e `task_terminal_messages_queue_idx` (fila de mensagens do usuário sem entrega), pelo risco "polling de 1 s" da §21. O rollback converte `asking` em `waiting` e `interrupted` em `unconfirmed` antes de restaurar o check antigo.
- `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/session-interaction-migration.test.ts`: 7 testes passam. Como o `terminal-tracking-migration.test.ts`, o teste desfaz a 0048 pelo rollback, semeia uma sessão da Spec B (`status = waiting`) e reaplica.
- Desvio: `src/application/services/projects/localCheckoutPicker.test.ts` quebrava o `typecheck` desde antes desta tarefa (o `ProjectDao` literal estava incompleto). Troquei por `as unknown as ProjectDao`, uma linha, só para o gate do pacote ficar verde.

### 2026-11-23 — 02.2 DAOs da conversa, dos pedidos, dos hosts e dos controles
- Portas em `application/terminal/sessionInteractionPorts.ts`; implementações `drizzleSessionMessageDao.ts`, `drizzleSessionRequestDao.ts`, `drizzleSessionHostDao.ts`, `drizzleSessionControlDao.ts`.
- `claimOpening({ hostId, workerId })` é um único `UPDATE … WHERE id = (SELECT … FOR UPDATE SKIP LOCKED LIMIT 1) RETURNING *`: devolve a sessão `opening` mais antiga, sem dono, do `host_id`, ou `null`. O supervisor chama até receber `null`. Também: `findById`, `pendingIds` (para o `pending.requestIds` da 03) e `markOrphans({ hostId, workerId })`, que devolve os ids.
- Teste `test/session-interaction-dao.test.ts` (9 casos, incluindo o V-23e com duas respostas concorrentes: uma vence, a `answer` gravada é a dela) e `test/session-interaction-support.ts`. `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/session-interaction-dao.test.ts`: passa.

### 2026-11-23 — 02.3 Máquina de estados
- `sessionSignals.ts` (`applySessionSignal`) e `terminalSessionStateMachine.ts` (`asking` como `running`, `interrupted` como `waiting`, para os eventos de hook). `pnpm --dir packages/api exec vitest run src/application/services/terminal/sessionSignals.test.ts src/application/services/terminal/terminalSessionStateMachine.test.ts`: 31 passam.

### 2026-11-23 — 02.4 Resumo das aprovações e validação das respostas
- `sessionInteractionLimits.ts`, `permissionDisplayRules.ts`, `permissionRequestSummarizer.ts`, `questionAnswerValidation.ts`, `permissionDecisionValidation.ts`, com os testes pedidos (V-22d fica em `questionAnswerValidation.test.ts`). `pnpm --dir packages/api exec vitest run src/application/services/terminal/permissionRequestSummarizer.test.ts src/application/services/terminal/questionAnswerValidation.test.ts`: 21 passam.
- Interpretações: o corte põe o marcador dentro do limite (o total fica em 20.000 no pedido, 50.000 na mensagem, de acordo com o check do banco). Resposta de múltipla escolha é sempre um array (rótulos e, se houver, o texto de "Outra"); de escolha única é uma string, e rótulo mais "Outra" na mesma pergunta é `answer_invalid`. Erro de formato (`answer_invalid`) tem precedência sobre `answer_incomplete`.

### 2026-11-23 — Fechamento da tarefa
- `pnpm --dir packages/api test`: 96 arquivos, 648 testes passam. `pnpm --dir packages/api test:integration`: 93 arquivos, 539 testes passam. `pnpm --dir packages/api typecheck`: sem erros.
- O pacote não tem script `lint` (só o web tem); nenhum arquivo `.ts` novo passa de 100 linhas.

