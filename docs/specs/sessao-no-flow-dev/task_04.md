---
status: completed
title: Runtime do SDK e início da sessão no serviço
type: backend
complexity: critical
---

# Task 04: Runtime do SDK e início da sessão no serviço

## Visão geral
Esta tarefa cria o serviço de sessões e o runtime que envolve o Claude Agent SDK. O serviço mantém o heartbeat da máquina, assume as sessões `opening` dela, inicia o Claude e grava o que sai: o texto do assistente vira mensagens, e os hooks viram os eventos da Spec B, em processo. Os pedidos, os controles e o reinício ficam para a task_05.

<critical>
- LEIA a spec (`docs/specs/sessao-no-flow-dev/spec.md`, §12–§17) e `v20-spike.md` (resultado da task_01) e as regras do projeto (AGENTS.md/CLAUDE.md, `.agents/rules/code-standards.md`) antes de começar. Use a skill `layered-backend`.
- FAÇA UMA MINI-TAREFA POR VEZ, na ordem. Só marque `[x]` depois de rodar o "Pronto quando" dela e ver passar.
- NÃO saia dos arquivos listados sem registrar o motivo no Registro de execução. Nada fora do escopo da spec.
- TESTES JUNTO COM O CÓDIGO: cada mini-tarefa implementa os testes atribuídos a ela, seguindo a skill de testes do projeto (`software-testing`). Isso quer dizer: asserção sobre o efeito observável e específico, nada de `toBeTruthy` ou de só checar que não lança exceção; valor esperado tirado da spec, nunca recalculado a partir do código; dublês só em dependências lentas, variáveis ou externas; relógio e aleatoriedade controlados. Em bug, reproduza antes de corrigir.
- Ao começar, mude `status` para `in_progress` (aqui e em `_tasks.md`). Mude para `completed` só quando todas as mini-tarefas estiverem marcadas e os critérios de sucesso tiverem sido comprovados por comando. A revisão contra a spec acontece uma vez, depois de todas as tarefas: não a espere aqui, mas não marque nada que não tenha prova, porque ela vai conferir.
</critical>

## Requisitos
- REQ-051: o serviço inicia o Claude na pasta vinculada, com o prompt, os anexos e o plugin `contexto/` da Spec A.
- REQ-054: uma falha ao iniciar (spawn, login) leva a sessão a `launch_failed` com o motivo informado pelo Claude Code.
- REQ-056: só o texto do assistente principal é gravado; raciocínio, saída de ferramenta e subagentes (`parent_tool_use_id` preenchido) não.
- REQ-071 (mapeamento): "Permitir sempre" vira `updatedPermissions` da sugestão com destino `localSettings`.
- 7.5, B-29: texto do assistente guardado até 50.000 caracteres, terminando em "[mensagem cortada]".
- NFR-11: falha ao gravar uma mensagem ou um evento não interrompe o runtime.
- NFR-12: o serviço só assume sessões com o próprio `host_id`; executa só o `claude` achado pelo `ToolLocator`, sem shell, e não abre porta.
- DEC-16: processo próprio, sem watch. DEC-18: hooks do SDK → `TerminalEventController` em processo. DEC-19: `pathToClaudeCodeExecutable` aponta para o `claude` do PATH.
- B-24: pergunta feita dentro de um subagente aparece como as outras; só o texto do subagente fica de fora.
- B-31: duas sessões ativas da mesma pessoa em tarefas diferentes, cada uma com o próprio runtime e as próprias mensagens.

## Interfaces
- **Consome:** os DAOs da task_02 (`SessionMessageDao`, `SessionHostDao`, `SessionControlDao.claimOpening`); `machineIdentity()` da task_03; `TerminalEventController` e `HookEventSummarizer` da Spec B (`packages/api/src/controllers/terminalEventController.ts`, `application/services/terminal/terminalEventIngestion.ts`); `PathToolLocator`; as opções do `query()` registradas em `v20-spike.md`.
- **Produz:**
  - a porta `ClaudeSessionRuntime`, `RuntimeHandle` e `RuntimeHandlers` em `packages/api/src/application/terminal/claudeSessionRuntime.ts`, exatamente como na spec §15;
  - `mapAnswerToPermissionResult(request, answer) → PermissionResult`, usado pela task_05;
  - `SessionSupervisor` com `tick(): Promise<void>` e `beat(): Promise<void>`, chamados pelo CLI e pelos testes;
  - `ScriptedSessionRuntime`, com um roteiro (`ScriptStep[]`: `text`, `ask`, `permission`, `hook`, `wait_message`, `end_turn`, `fail`), usado pelos testes de integração das tasks 04 e 05 e pelo e2e da task_07;
  - os scripts `sessions:worker` e `dev` (com o serviço) em `packages/api/package.json`.

## Mini-tarefas

- [x] **04.1 — Dependência do SDK, porta, mapeamento e runtime roteirizado**
  - **Arquivos:** `packages/api/package.json` (`@anthropic-ai/claude-agent-sdk` na versão de `v20-spike.md`, sem `^`), `packages/api/src/application/terminal/claudeSessionRuntime.ts` (criar), `packages/api/src/infra/terminal/answerMapper.ts` e `answerMapper.test.ts` (criar), `packages/api/src/infra/terminal/scriptedSessionRuntime.ts` e `scriptedSessionSteps.ts` (criar)
  - **Testes:** V-22g
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run src/infra/terminal/answerMapper.test.ts` passa; `pnpm --dir packages/api typecheck` sem erros
- [x] **04.2 — `AgentSdkSessionRuntime` e as opções do `query()`**
  - **Arquivos:** `packages/api/src/infra/terminal/agentSdkSessionRuntime.ts`, `agentSdkQueryOptions.ts`, `agentSdkMessageStream.ts` (fila de entrada por streaming) e `agentSdkQueryOptions.test.ts` (criar)
  - **Testes:** V-24h
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run src/infra/terminal/agentSdkQueryOptions.test.ts` passa; `pnpm --dir packages/api typecheck` sem erros
  - **Nota:** o ambiente passado ao `claude` é o mesmo ambiente permitido que o lançador da Spec A usava (sem variáveis `CLAUDE*`); reaproveite `terminalEnvironment.ts`.
- [x] **04.3 — Supervisor: heartbeat, assumir, iniciar e gravar**
  - **Arquivos:** `packages/api/src/application/services/terminal/sessionSupervisor.ts`, `sessionStarter.ts`, `sessionRecorder.ts` e `assistantTextFilter.ts` (criar), `packages/api/src/infra/sessionWorkerComposition.ts` (criar), `packages/api/test/session-supervisor-start.test.ts`, `session-recorder.test.ts` e `session-worker-support.ts` (criar)
  - **Testes:** V-24a, V-24b, V-24g, V-24i, V-27a, V-27b, V-27c, V-27f
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/session-supervisor-start.test.ts test/session-recorder.test.ts` passa; `pnpm --dir packages/api typecheck` sem erros
- [x] **04.4 — Processo do serviço e scripts**
  - **Arquivos:** `packages/api/src/cli/terminalSessionsWorker.ts` (criar), `packages/api/package.json` (`sessions:worker`: `tsx --env-file=../../apps/web/.env.local src/cli/terminalSessionsWorker.ts`; o `dev` ganha o mesmo comando sem `watch`)
  - **Testes:** nenhum novo; o processo só liga o `SessionSupervisor` já testado
  - **Pronto quando:** `pnpm --dir packages/api typecheck` sem erros; `timeout 8 pnpm --dir packages/api sessions:worker` sobe, grava uma linha em `terminal_session_hosts` com `heartbeat_at` recente (conferida com `psql`) e encerra no SIGTERM sem erro
  - **Nota:** espelhe `packages/api/src/cli/tasksWorker.ts` (SIGINT e SIGTERM com `AbortController`). No encerramento, chame `close()` em todos os handles abertos. Use `processGroup.ts` para matar o grupo do `claude` se o `close()` não terminar em 5 s.

## Detalhes de implementação
- O `tick()` do supervisor, nesta tarefa:
  1. `beat()` a cada 5 s;
  2. `claimOpening(hostId, workerId)` para cada sessão `opening` preparada do `host_id`; `prepared_at` só é marcado após contexto, anexos e prompt final estarem prontos;
  3. `runtime.start(...)`, guardando o handle num mapa por `sessionId`.

  A task_05 acrescenta mensagens, pedidos, controles e órfãs ao mesmo `tick()`.
- `onAssistantText` grava `insertAssistantMessage` com o corte de 7.5. O filtro descarta blocos `thinking`, `tool_use` e `tool_result`, e mensagens com `parent_tool_use_id`.
- `onHook` chama o mesmo ingestor que o route handler da Spec B usa (`TerminalEventController`), sem token: a sessão é resolvida pelo id. A primeira mensagem `system`/`init` do SDK grava `claude_session_id` e leva a sessão a `running`.
- Cada gravação fica num `try/catch` que registra `[session]` e segue, porque o runtime não pode parar por erro de banco (NFR-11).
- O prompt final, com a seção "Anexos", já está pronto desde o `open` (task_03). Guarde-o na sessão, ou leia-o da pasta da sessão, conforme o que a 03.1 decidir, e registre a escolha no log.

### Arquivos relevantes
- `packages/api/src/infra/agents/agentProcess.ts`, `processGroup.ts` e `claudeCodeRunner.ts`: como os agentes locais controlam processos.
- `packages/api/src/infra/terminalEventComposition.ts`: composição do ingestor da Spec B.
- `packages/api/test/terminal-hook-payloads.ts`: fixtures da Spec B (`terminal-hook-payloads.ts`) para o V-27c.
- `packages/api/src/cli/tasksWorker.ts`: modelo do CLI.

### Arquivos afetados
- Os listados nas mini-tarefas.

### Decisões relacionadas
- DEC-15, DEC-16, DEC-18, DEC-19 e DEC-20 (spec §17), no formato fixado pelo `v20-spike.md`.

## Premissas
- As opções e os formatos do SDK são os de `v20-spike.md`. Se o spike escolheu o plano B da DEC-20, o `permissionMode` "Tudo liberado" é `default`, e a task_05 libera as ferramentas no broker.

## Testes atribuídos
- [x] V-22g: resposta de pergunta → `{ behavior: "allow", updatedInput: { questions, answers } }` com as perguntas originais; "Permitir" → `allow` com a entrada original; "Permitir sempre" → `allow` com `updatedPermissions` igual à sugestão e `destination: "localSettings"`; "Recusar" com o motivo "Só rode o lint" → `deny` com essa mensagem; sem motivo → `deny` com "Recusado pela pessoa" · função pura
- [x] V-24h: sessão `accept_edits` no clone `/tmp/x` → opções com `cwd: "/tmp/x"`, `pathToClaudeCodeExecutable` igual ao caminho do `ToolLocator`, o plugin `contexto/`, `settingSources` de usuário, projeto e local, `permissionMode: "acceptEdits"` e `previewFormat: "markdown"`; `bypass` → `bypassPermissions` (ou o plano B do spike); `ask_all` → `default`; o ambiente sem `CLAUDECODE` · função pura
- [x] V-24a: duas sessões `opening`, uma com o `host_id` do serviço e outra com `outra-maquina:ana` → só a primeira é iniciada no runtime roteirizado · supervisor + Postgres + runtime roteirizado
- [x] V-24b: dois supervisores com o mesmo `host_id` e `worker_id` diferentes rodam `tick()` ao mesmo tempo → `runtime.start` é chamado uma vez só · supervisor + Postgres + runtime roteirizado
- [x] V-24g: roteiro com `fail("Not logged in")` no início → sessão `launch_failed` com esse motivo em `launch_error` · supervisor + Postgres + runtime roteirizado
- [x] V-24i: `beat()` → `terminal_session_hosts` com o `host_id` e `heartbeat_at` igual ao relógio controlado; mensagem `init` com o id `abc` → `claude_session_id = abc` e `status = running` · supervisor + Postgres
- [x] V-27a: roteiro com texto do assistente, um bloco de raciocínio, um `tool_result` e um texto com `parent_tool_use_id` → só o primeiro texto vira linha `assistant` em `task_terminal_messages`; uma pergunta do subagente continua chegando a `onPermission` (B-24) · recorder + Postgres
- [x] V-27b: texto de 60.000 caracteres → `content` com 50.000 caracteres terminando em "[mensagem cortada]" e `truncated = true` (B-29) · recorder + Postgres
- [x] V-27c: as fixtures da Spec B (`terminal-hook-payloads.ts`) entregues por `onHook` → as mesmas linhas em `task_terminal_events` (tipo, resumo, skill ativa) que o caminho HTTP grava com o mesmo payload · recorder + ingestor da Spec B + Postgres
- [x] V-27f: DAO de mensagens que lança na gravação → o runtime roteirizado continua até o fim do roteiro, e o log tem `[session]` com o erro (NFR-11); duas sessões ativas da mesma pessoa em tarefas diferentes gravam cada texto na sua sessão (B-31) · recorder + Postgres

## Critérios de sucesso
- Todas as mini-tarefas marcadas, cada uma com o "Pronto quando" executado.
- Todos os testes atribuídos implementados e passando.
- `pnpm --dir packages/api test` e `pnpm --dir packages/api test:integration` passando ao fim da tarefa.
- `pnpm --dir packages/api typecheck` e `pnpm --dir packages/api lint` sem erros; o SDK só é importado em `packages/api/src/infra/terminal/`.

## Registro de execução
<!-- Uma entrada por mini-tarefa: data, o que foi feito, comandos e resultado, desvios. -->

### 2026-11-23 — 04.1 Dependência do SDK, porta, mapeamento e runtime roteirizado
- `@anthropic-ai/claude-agent-sdk` 0.3.330, sem `^`, em `packages/api/package.json` (e `pnpm-lock.yaml`). Porta `ClaudeSessionRuntime`, `RuntimeHandle` e `RuntimeHandlers` em `application/terminal/claudeSessionRuntime.ts`, com tipos próprios para o resultado de permissão (a porta não importa o SDK).
- Desvio de caminho: `answerMapper.ts` e o teste ficaram em `application/services/terminal/` (a §13 da spec manda para lá, e o `SessionRequestBroker` da 05 é um serviço de aplicação e não pode importar de `infra/`). A assinatura ganhou um terceiro parâmetro, `mapAnswerToPermissionResult(request, answer, originalInput)`, porque o payload do pedido não guarda a entrada original e o "Permitir" devolve `updatedInput` com ela (o registro de pedidos pendentes da 05 a tem na memória). O comando é `pnpm --dir packages/api exec vitest run src/application/services/terminal/answerMapper.test.ts`: 4 testes passam (V-22g).
- `ScriptedSessionRuntime` (`scriptedSessionRuntime.ts`, `scriptedSessionRunner.ts`, `scriptedStepContent.ts`, `scriptedSessionSteps.ts`). Além dos passos da spec, ganhou `thinking`, `tool_result` e `subagent_text` (o V-27a precisa deles) e `crash` (V-26b). O runtime emite `SessionStart` e `UserPromptSubmit` sozinho, como o real, e guarda `starts`, `resumes`, `received`, `outcomes` e `interrupts` para os testes. O roteiro só vale com `NODE_ENV=test` e `FLOW_DEV_SESSION_FAKE_SCRIPT` (arquivo JSON).

### 2026-11-23 — 04.2 `AgentSdkSessionRuntime` e as opções do `query()`
- `agentSdkQueryOptions.ts` (modo, `allowDangerouslySkipPermissions` só em `bypass`, `env` filtrado pelo `terminalEnvironment`, plugin, `settingSources`, `previewFormat`, `resume`), `agentSdkHooks.ts` (os três hooks que o SDK entrega, com o matcher da Spec B), `agentSdkMessageStream.ts` (fila de entrada por streaming), `agentSdkMessages.ts`, `agentSdkSession.ts`, `agentSdkSessionRuntime.ts`. `PathToolLocator` ganhou `locate()` (caminho completo) para a DEC-19. `pnpm --dir packages/api exec vitest run src/infra/terminal/agentSdkQueryOptions.test.ts`: passa (V-24h), junto com o teste da fila.
- Verificação ao vivo, com o Claude real (`spike/runtime-smoke.ts`, saída em `spike/out/runtime-smoke.log`): o runtime iniciou a sessão, a pergunta chegou a `onPermission` e foi respondida, os hooks `SessionStart` (uma vez só), `UserPromptSubmit`, `Stop` e `SessionEnd` saíram, a segunda mensagem foi respondida, e o `close()` terminou com `ended`. Sem login (`CLAUDE_CONFIG_DIR` vazio), o Claude Code não falha o processo: ele devolve uma mensagem do assistente com `error: "authentication_failed"` e o texto "Not logged in · Please run /login". O runtime trata esse erro (e `oauth_org_not_allowed`, `account_on_hold`, `verification_required`, `billing_error`, `cloud_credential_error`) antes de qualquer texto como `failed`, com o texto do Claude Code como motivo, e não grava essa mensagem (REQ-054).
- Descoberta no ao vivo: no modo de streaming, a mensagem `system/init` chega a cada vez. O runtime só sintetiza `SessionStart` na primeira.
- Não usei `processGroup.ts`: o SDK não expõe o pid do `claude`. No encerramento do serviço, `killChildProcesses` (pgrep pelo pid do serviço e `SIGKILL`) entra se o `close()` passar de 5 s.

### 2026-11-23 — 04.3 Supervisor: heartbeat, assumir, iniciar e gravar
- O `SessionSupervisor` é uma lista de passos (`TickStep`): `HeartbeatStep` (a cada 5 s, com `beat()` público) e `OpeningStep` (chama `claimOpening` até receber `null` e inicia cada sessão com o `SessionStarter`). A 05 acrescenta passos sem mexer no supervisor. Cada passo roda num `try/catch` que registra `[session] step_failed`.
- `SessionRecorder` grava o texto (corte de 50.000 com o marcador, `truncated`) e passa cada hook ao `TerminalEventController.ingest` da Spec B, disparando a captura quando o ingestor pede; cada gravação tem o `try/catch` da NFR-11. `SessionHandlerFactory` mantém uma fila serial por sessão, para texto, hooks e saída irem ao banco na ordem em que o runtime os emitiu. `SessionExitHandling`: `failed` → `launch_failed` com o motivo do runtime; a queda do processo (`crashed`) é tratada na 05.
- O prompt final é lido de `<sessão>/prompt.md` (decisão da 03.1, registrada lá). `pathsOf()` entrou na porta `SessionContextBuilder`.
- Composição em `infra/sessionWorkerComposition.ts`; em produção, o runtime é o `AgentSdkSessionRuntime`, e com `NODE_ENV=test` mais `FLOW_DEV_SESSION_FAKE_SCRIPT`, o roteirizado. Os pedidos vão a um `REFUSING_PERMISSIONS` provisório (nega tudo) até a 05 ligar o broker.
- `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/session-supervisor-start.test.ts test/session-recorder.test.ts`: 14 testes passam (V-24a, V-24b, V-24g, V-24i, V-27a, V-27b, V-27c, V-27f, B-24, B-29, B-31). O V-27c compara as linhas de `task_terminal_events` do caminho do serviço com as do caminho HTTP, alimentadas pelos mesmos payloads. Conferi o V-27a com uma mutação (tirar a checagem do subagente): dois testes falham. Mais `sessionSupervisor.test.ts` (isolamento de falha por passo).

### 2026-11-23 — 04.4 Processo do serviço e scripts
- `cli/terminalSessionsWorker.ts`; scripts `sessions:worker` e `dev` (agora sobe o serviço sem `watch`).
- Verificado num banco descartável (`createdb`, migrações na ordem do journal, apagado depois), com `DATABASE_URL` no ambiente: `timeout 8 pnpm --dir packages/api sessions:worker` imprimiu `[session] service_started host=… worker=…`, gravou a linha em `terminal_session_hosts` (idade de 1,4 s na conferência com `psql`) e, no SIGTERM, imprimiu `service_stopped` e saiu sem erro (o 124 do `timeout` é do próprio `timeout`). Sem processo sobrando depois.
- Ainda não apliquei a migration 0048 no banco de desenvolvimento do Docker; faço isso quando for preciso rodar a aplicação (07.3).

### 2026-11-23 — Fechamento da tarefa
- `pnpm --dir packages/api typecheck`: sem erros. `pnpm --dir packages/api test`: 97 arquivos, 648 testes passam. `pnpm --dir packages/api test:integration`: 104 arquivos, 596 testes passam. O SDK só é importado em `packages/api/src/infra/terminal/` (conferido com `grep`). Nenhum arquivo novo passa de 100 linhas.

### 2026-11-23 — Correção da review-001 (B-1, I-5)
- **B-1:** parar o serviço (SIGINT ou SIGTERM) usava o mesmo `close()` do botão "Encerrar", sintetizava o `SessionEnd` e levava a sessão a "Encerrada". A porta `RuntimeHandle` ganhou `abandon()`: mata o processo do Claude sem sintetizar `SessionEnd` nem chamar `onExit`; o `SessionHandleRegistry.abandonAll()` o usa no desligamento, e o serviço espera as gravações pendentes antes de sair. O "Encerrar" continua com `close()`. Testes novos: `test/session-shutdown.test.ts` (REQ-076: as sessões "Em andamento" e "Precisa de você" continuam ativas e sem `ended_at`; US-10.1: o serviço seguinte as leva a "Interrompida" com a nota e cancela a pergunta; os dois falham se o desligamento voltar a usar `closeAll()`) e, com o Claude real, o caso "REQ-076" em `test/session-real-claude.test.ts`.
- **I-5:** `changedMessages/Requests/Events` recebem um objeto (`ChangeWindow`); `ScriptedSessionRunner.execute` virou um `switch` e o arquivo ficou em 99 linhas; `agentSdkSession.ts` em 100.
- **M-3:** `sessionRequestBroker.test.ts` prova com timers falsos que o pedido segue aberto depois de 30 minutos (o V-24f de integração continua, só como prova de estado no banco).
- Verificação: `pnpm --dir packages/api test` (100 arquivos, 656 testes), `test:integration` (110 arquivos passam, 2 ignorados; 618 testes, 4 ignorados) e `typecheck` passam.
