---
status: completed
title: Abertura com propósito e modelo no runtime
type: backend
complexity: critical
---

# Task 05: Abertura com propósito e modelo no runtime

## Visão geral
"Gerar tarefas" e "Iniciar" reaproveitam o `tasks.terminal.open` e o `preflight` da Spec C, com um `purpose` (DEC-26). A sessão passa a gravar `purpose`, `plan_item_id`, `agent`, `model` e `effort`. O serviço escolhe o runtime pelo agente, num registro atrás da porta `AgentSessionRuntime` (DEC-28), e repassa modelo e esforço no início e na retomada (DEC-24). Esta é a tarefa de maior risco: ela muda o caminho de abertura e o runtime que as Specs A–C já usam.

<critical>
- **BLOQUEIO:** só comece depois de aplicada a correção da `review-001` da Spec C (`docs/specs/sessao-no-flow-dev/reviews/review-001.md`). Ela muda os mesmos arquivos (`sessionStarter.ts`, `sessionResume.ts`, `sessionWorkerParts.ts`). Confira no `_tasks.md` da Spec C que há uma revisão final posterior, ou peça a confirmação do usuário.
- LEIA a spec (`docs/specs/tarefas-e-plano-de-execucao/spec.md`, §6 REQ-084, REQ-085, REQ-101–105, REQ-109, REQ-110, §7.1, §7.6, §8 B-35, B-39, B-41, B-42, §9, §15, §16 "Iniciar", DEC-24, DEC-26, DEC-28, NFR-16, §19), o `v33-spike.md` e as regras do projeto (AGENTS.md/CLAUDE.md, `.agents/rules/code-standards.md`) antes de começar. Use as skills `layered-backend` e `trpc-nextjs`.
- FAÇA UMA MINI-TAREFA POR VEZ, na ordem. Só marque `[x]` depois de rodar o "Pronto quando" dela e ver passar.
- NÃO saia dos arquivos listados sem registrar o motivo no Registro de execução. Nada fora do escopo da spec.
- TESTES JUNTO COM O CÓDIGO: cada mini-tarefa implementa os testes atribuídos a ela, seguindo a skill de testes do projeto (`software-testing`). Isso quer dizer: asserção sobre o efeito observável e específico, nada de `toBeTruthy` ou de só checar que não lança exceção; valor esperado tirado da spec, nunca recalculado a partir do código; dublês só em dependências lentas, variáveis ou externas; relógio e aleatoriedade controlados. Em bug, reproduza antes de corrigir.
- Ao começar, mude `status` para `in_progress` (aqui e em `_tasks.md`). Mude para `completed` só quando todas as mini-tarefas estiverem marcadas e os critérios de sucesso tiverem sido comprovados por comando. A revisão contra a spec acontece uma vez, depois de todas as tarefas: não a espere aqui, mas não marque nada que não tenha prova, porque ela vai conferir.
</critical>

## Requisitos
- DEC-28: a porta `ClaudeSessionRuntime` passa a se chamar `AgentSessionRuntime`. O serviço recebe um registro `Partial<Record<SessionAgent, AgentSessionRuntime>>`, que nesta spec só tem `claude`. Uma sessão é iniciada e retomada no runtime do `agent` dela.
- DEC-24 / REQ-101: `model?: string` e `effort?: string` em `start` e `resume`. O `buildQueryOptions` só os inclui quando vierem preenchidos. A retomada (REQ-077) repassa os valores gravados na sessão.
- §9: uma sessão `route` continua sem modelo nem esforço forçados.
- REQ-104: o histórico de sessões (REQ-023) mostra agente, modelo e esforço de cada sessão que os tiver, e por isso o leitor de execução passa a devolvê-los.
- 7.6, os prompts:
  - **geração:** `/flow-dev:spec-to-tasks Quebre em tarefas a spec <caminho>. Salve os arquivos na pasta dela e pare para minha revisão. Não implemente.`;
  - **execução:** `Implemente, nesta ordem, as tarefas <caminhos> de <pasta>. Siga o "Como executar" do _tasks.md: uma mini-tarefa por vez; marque [x] e atualize o status no arquivo da tarefa e no _tasks.md só depois de rodar o "Pronto quando". Pare ao terminar essas tarefas e não comece outras. Não faça commit, push nem PR sem eu pedir.`

  Os dois continuam editáveis no `open`. O plano não muda se o prompt for editado (B-35).
- NFR-16: os caminhos no prompt vêm dos artefatos capturados, são relativos ao clone e não têm `..`. Agente, modelo e esforço são validados no servidor e passados como opções do runtime, nunca como texto de comando.
- REQ-084, REQ-085 e REQ-109: o `preflight` com `generate_tasks` devolve o prompt da spec escolhida (a mais recente, se nenhuma for indicada) e a escolha padrão. O `open` com `generate_tasks` exige um `specArtifactId` que seja uma spec da tarefa (7.1); senão, `spec_not_found`. A escolha vem validada (`choice_invalid`, `agent_unavailable`).
- REQ-110 / B-42: o `preflight` devolve `agents` com a disponibilidade. O `open` recusa o agente indisponível com `agent_unavailable`.
- REQ-100–102 e REQ-105:
  - o `open` com `plan_item` reavalia a prontidão no servidor:
    - item bloqueado sem `force` → `plan_item_blocked`;
    - com `force`, grava `forced_by` e `forced_at`;
    - item `running` ou `done` → `plan_item_not_ready`;
  - o prompt lista só as tarefas não concluídas do item;
  - a escolha é a do item, e uma escolha enviada pela tela é ignorada.
- REQ-107: só a operadora abre, com qualquer `purpose`. B-41: a confirmação da REQ-014 continua valendo (`session_already_active` sem `allowAdditional`).
- §19: o log `[session] started` inclui agente, modelo e esforço. O log `[plan] item_started` traz item, agente, modelo, esforço e `force`.

## Interfaces
- **Consome:**
  - da task_02: `TaskSetController`, ou `TaskSetReadDao` + `readTaskSet`, e `SpecRef`;
  - da task_03: as colunas novas, `SessionAgent`, `AgentChoice`, `DEFAULT_SESSION_CHOICE`, `agentAvailability` e `choiceProblem`;
  - da task_04: `ExecutionPlanDao.find` e `markForced`, `itemReadiness` e `remainingTasks`;
  - existente: `TerminalSessionController` (`src/controllers/terminalSessionController.ts`), `SessionStarter`, `SessionResumeStep`, `buildWorkerParts` (`src/infra/sessionWorkerParts.ts`), `ScriptedSessionRuntime` e `scriptedSessionSteps.ts`, `terminalExecutionQueries.ts` e `terminalExecutionReader.ts`.
- **Produz** (usado pelas tasks 06, 08 e 09 e pela Spec E):
  - `src/application/terminal/agentSessionRuntime.ts` (renomeado de `claudeSessionRuntime.ts`) com `AgentSessionRuntime`, e `RuntimeStartInput` e `RuntimeResumeInput` com `model?: string; effort?: string`;
  - `TerminalSessionRecord` com `purpose: "route" | "generate_tasks" | "plan_item"`, `planItemId: string | null`, `agent: SessionAgent`, `model: string | null` e `effort: string | null`;
  - `ExecutionSessionRow` e a saída de `tasks.byId` (`terminal.sessions`) com `agent`, `model` e `effort`;
  - o passo `{ kind: "write_file"; path: string; content: string }` do runtime roteirizado, que grava o arquivo no `cwd` e emite o hook `PostToolUse` de `Write` (usado pelas tasks 06 e 09);
  - a entrada `purpose` de `tasks.terminal.open` e `tasks.terminal.preflight`:
    ```ts
    | { kind: "route" }
    | { kind: "generate_tasks"; specArtifactId: string; choice: AgentChoice }
    | { kind: "plan_item"; planItemId: string; force?: boolean }
    ```
    No `preflight`, o `generate_tasks` aceita `specArtifactId` opcional e não tem `choice`. A saída do `preflight` ganha `prompt`, `choice: AgentChoice | null` e `agents: AgentAvailability[]`;
  - os erros novos `plan_item_blocked`, `plan_item_not_ready`, `spec_not_found`, `agent_unavailable` e `choice_invalid` no catálogo de erros do terminal.

## Mini-tarefas

- [x] **05.1 — Porta por agente, registro de runtimes e modelo no `start`/`resume`**
  - **Arquivos:**
    - `packages/api/src/application/terminal/claudeSessionRuntime.ts` → `agentSessionRuntime.ts` (renomear, e atualizar os imports em `sessionStarter.ts`, `sessionResume.ts`, `sessionWorkerParts.ts`, `agentSdkSessionRuntime.ts` e `scriptedSessionRuntime.ts`);
    - `packages/api/src/application/services/terminal/sessionStarter.ts` e `sessionResume.ts` (runtime pelo `session.agent`, `model`/`effort` da sessão, runtime ausente → "Falhou ao abrir" com `AGENT_UNAVAILABLE_REASON`, log com a escolha);
    - `packages/api/src/infra/sessionWorkerParts.ts` (`runtimes` no lugar de `runtime`; `WorkerOverrides.runtimes`);
    - `packages/api/src/infra/terminal/agentSdkQueryOptions.ts`, `agentSdkSessionRuntime.ts`, `agentSdkQueryOptions.test.ts`;
    - `packages/api/src/infra/terminal/scriptedSessionRuntime.ts`, `scriptedSessionSteps.ts`, `scriptedStepContent.ts` ou `scriptedSessionRunner.ts` (o passo `write_file`; `starts` e `resumes` guardam `model` e `effort`), `scriptedSessionSteps.test.ts`;
    - `packages/api/test/session-worker-support.ts` (registro com um ou dois roteiros), `packages/api/test/session-agent-runtime.test.ts` (criar).
  - **Testes:** V-38a, V-38b, V-38c, V-38d, V-38e, V-38f
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run src/infra/terminal/agentSdkQueryOptions.test.ts src/infra/terminal/scriptedSessionSteps.test.ts` e `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/session-agent-runtime.test.ts test/session-supervisor-start.test.ts test/session-resume.test.ts` passam; `pnpm --dir packages/api typecheck` sem erros
  - **Nota:** o `TerminalSessionRecord` precisa de `agent`, `model` e `effort` já nesta mini-tarefa. Faça o mapeamento de leitura em `drizzleTerminalSessionDao.ts` aqui; a gravação no `create` fica na 05.2.
- [x] **05.2 — A sessão grava o propósito e a escolha; o histórico mostra a escolha**
  - **Arquivos:** `packages/api/src/application/database/dao/terminalSessionDao.ts` (`TerminalSessionRecord` e entrada do `create` com `purpose`, `planItemId`, `agent`, `model` e `effort`), `packages/api/src/infra/database/dao/terminal/drizzleTerminalSessionDao.ts` e `terminalSessionWrites.ts`, `packages/api/src/application/database/dao/terminalExecutionDao.ts`, `packages/api/src/infra/database/dao/terminal/terminalExecutionQueries.ts`, `packages/api/src/application/services/terminal/terminalExecutionReader.ts`, `packages/api/test/terminal-execution-read.test.ts` (casos novos)
  - **Testes:** V-37a, V-37b
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/terminal-execution-read.test.ts test/terminal-open.test.ts` passa; `pnpm --dir packages/api typecheck` sem erros
- [x] **05.3 — Prompts da 7.6 e o `preflight` com `purpose`**
  - **Arquivos:** `packages/api/src/application/services/terminal/terminalPromptCopy.ts` (as duas instruções da 7.6), `packages/api/src/application/services/terminal/taskPlanPrompts.ts` e `taskPlanPrompts.test.ts` (criar: `buildGenerationPrompt(specPath)` e `buildExecutionPrompt({ folder, taskPaths })`, que recusa caminho absoluto ou com `..`), `packages/api/src/application/services/terminal/sessionPurpose.ts` (criar: resolve spec, item, prompt e escolha a partir do `purpose`), `packages/api/src/controllers/terminalSessionController.ts` (`preflight`), `packages/api/src/schemas/terminal.ts` (`purpose`), `packages/api/src/infra/terminalComposition.ts` (dependências novas), `packages/api/test/terminal-preflight-purpose.test.ts` (criar)
  - **Testes:** V-37c, V-37d, V-37e, V-37f, V-37g
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run src/application/services/terminal/taskPlanPrompts.test.ts` e `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/terminal-preflight-purpose.test.ts test/terminal-preflight.test.ts` passam; `pnpm --dir packages/api typecheck` sem erros
  - **Nota:** `terminalSessionController.ts` tem 95 linhas. Leve a resolução do `purpose` para `sessionPurpose.ts`, e o controller só delega.
- [x] **05.4 — `open` com `generate_tasks`**
  - **Arquivos:** `packages/api/src/controllers/terminalSessionController.ts` (`open` e `start` com `purpose` e escolha), `packages/api/src/application/services/terminal/sessionPurpose.ts`, `packages/api/src/application/services/terminal/terminalErrorCatalog.ts` e `packages/api/src/application/services/tasks/taskErrors.ts` (erros novos), `packages/api/test/terminal-open-purpose.test.ts` (criar)
  - **Testes:** V-37h, V-37i, V-37j, V-44e, V-44f
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/terminal-open-purpose.test.ts test/terminal-open.test.ts test/terminal-open-guards.test.ts` passa; `pnpm --dir packages/api typecheck` sem erros
- [x] **05.5 — `open` com `plan_item`: bloqueio, `force` e "de novo"**
  - **Arquivos:** `packages/api/src/application/services/terminal/sessionPurpose.ts` (prontidão no servidor, `markForced`, só as não concluídas), `packages/api/src/application/services/tasks-set/planSaveLog.ts` (`[plan] item_started`), `packages/api/test/terminal-open-plan-item.test.ts` (criar)
  - **Testes:** V-37k, V-37l, V-37m, V-37n, V-44g
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/terminal-open-plan-item.test.ts` passa; `pnpm --dir packages/api typecheck` sem erros

## Detalhes de implementação
- Ordem das checagens no `open`:
  1. as da Spec C, como hoje (habilitado, operadora, planejamento aprovado, `requestKey`, sessão ativa);
  2. `purpose`: spec ou item, escolha, `choiceProblem` com os agentes do registro, prontidão;
  3. as demais da Spec C (prompt, checkout, ferramentas, serviço, skills).

  O `requestKey` repetido continua devolvendo a sessão já criada.
- Os agentes registrados vêm do mesmo lugar no web e no serviço: uma constante `REGISTERED_SESSION_AGENTS` (só `claude`) na composição. A Spec E acrescenta o Codex. Troque o `new Set(["claude"])` provisório da task_04 por ela.
- O `markForced` grava no item, na mesma transação lógica do `create` da sessão, quando possível. Se o `create` falhar, o `forced_*` não deve ficar gravado. Registre a escolha no log.
- A pasta e os caminhos do prompt de execução vêm de `TaskSet.folder` e `TaskSetTask.path`, nunca do texto enviado pela tela. Os caminhos são separados por ", ".
- Runtime ausente para o agente da sessão (configuração mudou depois do `open`): `markLaunchFailed` com "O Codex ainda não conduz sessões no Flow Dev.". O supervisor segue com as outras sessões.
- O passo `write_file` grava com `mkdir -p` relativo ao `cwd` e recusa caminho fora do `cwd`. Ele emite o mesmo payload de `PostToolUse`/`Write` que `test/terminal-hook-payloads.ts` usa, para que a ingestão da Spec B registre o `file_edit`.

### Arquivos relevantes
- `packages/api/src/controllers/terminalSessionController.ts`: `preflight` e `open` atuais.
- `packages/api/src/application/services/terminal/terminalPromptBuilder.ts` e `terminalPromptCopy.ts`: prompts da rota e `SKILLS_PLUGIN_NAME`.
- `packages/api/test/terminal-open-support.ts`, `terminal-open.test.ts`, `terminal-preflight.test.ts` e `terminal-open-guards.test.ts`: o mundo e as checagens da abertura.
- `packages/api/test/session-worker-support.ts` (`workerWorld`) e `session-supervisor-start.test.ts`: o supervisor com o runtime roteirizado.
- `packages/api/test/plan-support.ts` (task_04): plano semeado.

### Arquivos afetados
- Os listados nas mini-tarefas.

### Decisões relacionadas
- DEC-24, DEC-26 e DEC-28 (spec §17).

## Premissas
- Os caminhos do prompt de execução são separados por ", " (a 7.6 não fixa o separador).
- "Iniciar de novo" com dependência externa aberta exige `force` (`_tasks.md`, "Premissas e bloqueios").
- Se o V-33 mostrou que o `resume` herda o modelo sem precisar repassar, o repasse continua (é o que a REQ-101 pede), e o V-38d prova que ele acontece.

## Testes atribuídos
- [x] V-38a: `buildQueryOptions` com `model: "opus"` e `effort: "max"` → opções com `model: "opus"` e `effort: "max"`; sem os dois → nenhuma das chaves `model` e `effort` no objeto · função pura
- [x] V-38b: registro com um roteiro em `claude` e outro em `codex`; uma sessão `opening` com `agent = 'codex'` e outra com `claude` → cada uma é iniciada só no roteiro do próprio agente, com o `model` e o `effort` gravados · supervisor + Postgres + dois roteiros
- [x] V-38c: sessão `route` sem modelo → o `start` do roteiro recebe `model` e `effort` indefinidos (§9) · supervisor + Postgres + roteiro
- [x] V-38d: sessão do plano `sonnet`/`high` interrompida, com uma mensagem na fila → o `resume` do roteiro recebe `model: "sonnet"` e `effort: "high"` (REQ-101) · supervisor + Postgres + roteiro
- [x] V-38e: sessão `opening` com `agent = 'codex'` e só o Claude no registro → `launch_failed` com "O Codex ainda não conduz sessões no Flow Dev.", e a sessão Claude do mesmo `tick()` é iniciada · supervisor + Postgres + roteiro
- [x] V-38f: roteiro com `write_file` de `docs/specs/login/task_01.md` → o arquivo existe no clone temporário com o conteúdo, e o handler recebe um `PostToolUse` de `Write` com o caminho; `write_file` com `../fora.md` → recusado sem gravar · runtime roteirizado + disco
- [x] V-37a: `open` de rota → `purpose = 'route'`, `agent = 'claude'`, `model` e `effort` nulos (§9); `create` com `purpose = 'plan_item'` e `planItemId` → os cinco campos gravados e lidos de volta no `TerminalSessionRecord` · DAO + Postgres
- [x] V-37b: uma sessão de rota e uma do plano `sonnet`/`high` → `tasks.byId` devolve a do plano com `agent: "claude"`, `model: "sonnet"`, `effort: "high"`, e a de rota com `model: null` (REQ-104) · leitor + Postgres
- [x] V-37c: `buildGenerationPrompt("docs/specs/login/spec.md")` → exatamente "/flow-dev:spec-to-tasks Quebre em tarefas a spec docs/specs/login/spec.md. Salve os arquivos na pasta dela e pare para minha revisão. Não implemente." · função pura
- [x] V-37d: `buildExecutionPrompt` com a pasta `docs/specs/login` e `[task_01.md, task_02.md]` → o texto da 7.6, com "as tarefas docs/specs/login/task_01.md, docs/specs/login/task_02.md de docs/specs/login" · função pura
- [x] V-37e: caminho `docs/specs/../../etc/x.md` ou `/home/x/task_01.md` → recusado (erro, sem prompt montado) (NFR-16) · função pura
- [x] V-37f: duas specs (`a` às 10:00, `b` às 11:00); `preflight` com `generate_tasks` sem `specArtifactId` → prompt com `docs/specs/b/spec.md`, `choice` igual a `{ claude, opus, max }`, e `agents` com o Codex indisponível e o motivo; com o `specArtifactId` de `a` → prompt com `a` · controller + Postgres
- [x] V-37g: item `[task_01, task_02]` com o plano em `haiku`/`medium`; `preflight` com `plan_item` → prompt de execução com as duas tarefas e `choice` `{ claude, haiku, medium }`; depois de uma sessão `ended` com 01 `completed` → prompt só com `task_02.md` (REQ-105) · controller + Postgres
- [x] V-37h: `open` com `generate_tasks` e a escolha padrão → sessão com `purpose = 'generate_tasks'`, `opus`/`max`; com `sonnet`/`high` → a sessão grava `sonnet`/`high`, e o roteiro recebe esses valores no `start` (REQ-109) · controller + Postgres
- [x] V-37i: `specArtifactId` de um artefato de outra tarefa, ou de um `spec.md` sem versão `spec-writer` → `spec_not_found`, nenhuma sessão criada · controller + Postgres
- [x] V-37j: membro com acesso que não opera → recusado como no `open` da rota (REQ-107); sessão ativa na tarefa sem `allowAdditional` → `session_already_active`, e com `allowAdditional` → abre (B-41) · controller + Postgres
- [x] V-44e: `open` com `generate_tasks` e `{ codex, gpt-6.1-sol, high }`, só o Claude registrado → `agent_unavailable` · controller + Postgres
- [x] V-44f: `open` com `generate_tasks` e `{ claude, gpt-6.1-sol, high }` → `choice_invalid` · controller + Postgres
- [x] V-37k: item com `task_02`, cuja dependência 01 está `in_progress`; `open` sem `force` → `plan_item_blocked`, nenhuma sessão criada · controller + Postgres
- [x] V-37l: o mesmo item com `force: true` → sessão criada, `forced_by` igual à operadora, `forced_at` igual ao relógio controlado, e log `[plan] item_started` com `force: true` (REQ-102) · controller + Postgres
- [x] V-37m: item com a sessão mais recente `running`, ou com todas as tarefas `completed` → `plan_item_not_ready` · controller + Postgres
- [x] V-37n: `open` de um item `sonnet`/`high` → sessão com `purpose = 'plan_item'`, `plan_item_id` do item, `agent = 'claude'`, `sonnet`/`high`; um campo `choice` enviado no `purpose` é rejeitado pelo schema (`strict`) · controller + Postgres
- [x] V-44g: item salvo com `codex` (inserido direto no banco) e só o Claude registrado → `open` recusa com `agent_unavailable`; o item continua não iniciado, e `plan.save` troca o agente para `claude` (B-42) · controller + Postgres

## Critérios de sucesso
- Todas as mini-tarefas marcadas, cada uma com o "Pronto quando" executado.
- Todos os testes atribuídos implementados e passando.
- `pnpm --dir packages/api test` e `pnpm --dir packages/api test:integration` passando ao fim da tarefa, incluindo os testes da Spec C (`session-*`, `terminal-open*`).
- `pnpm --dir packages/api typecheck` sem erros; nenhuma referência restante a `ClaudeSessionRuntime` (`grep -rn ClaudeSessionRuntime packages/api/src packages/api/test` vazio); o SDK só é importado em `packages/api/src/infra/terminal/`.

## Registro de execução
<!-- Uma entrada por mini-tarefa: data, o que foi feito, comandos e resultado, desvios. -->
- **2026-11-23 · 05.1** — A porta passou a `AgentSessionRuntime` (`application/terminal/agentSessionRuntime.ts`, renomeado de `claudeSessionRuntime.ts`; nenhuma referência a `ClaudeSessionRuntime` sobrou), com `model?` e `effort?` em `start` e `resume` e o tipo `SessionRuntimes`. `SessionStarter` e `SessionResumeStep` recebem `runtimes` e usam o do `session.agent`; sem runtime, a sessão vai a "Falhou ao abrir" com `AGENT_UNAVAILABLE_REASON` e o `tick` segue com as outras (no resume, a sessão encerra pela via de `resume_failed`). `buildQueryOptions`, `AgentSdkSession` e `AgentSdkSessionRuntime` repassam `model` e `effort`, só quando preenchidos. O log `[session] started` e `resumed` traz agente, modelo e esforço. O runtime roteirizado ganhou o passo `write_file` (`scriptedFileStep.ts`: grava no clone com `mkdir -p`, recusa caminho fora do clone e emite o `PostToolUse` de `Write` com o caminho absoluto); uma exceção de passo agora termina a sessão roteirizada como `failed`. Testes: `agentSdkQueryOptions.test.ts` (V-38a), `scriptedFileStep.test.ts` (V-38f, 3 testes), `test/session-agent-runtime.test.ts` (V-38b a V-38e). Os testes de Spec C que montavam o worker com `runtime` foram trocados por `runtimes: { claude: … }`. **Desvio:** `worker.runtime` virou `worker.runtimes`.
- **2026-11-23 · 05.2** — `TerminalSessionRecord`, `CreateTerminalSessionInput`, `toSessionRecord` e o relançamento (`relaunch`, para a sessão que falhou ao abrir e reaproveita o `requestKey`) passaram a ter `purpose`, `planItemId`, `agent`, `model` e `effort`; `ExecutionSessionRow` e a visão de `tasks.byId` também (mais `purpose` e `planItemId`, além do pedido). `test/terminal-session-choice.test.ts`: 4 testes (V-37a, três; V-37b).
- **2026-11-23 · 05.3** — `taskPlanPrompts.ts` (`buildGenerationPrompt`, `buildExecutionPrompt`; recusam caminho absoluto, com `..`, com `\`, vazio ou fora da pasta, com `invalid_path`), as constantes em `terminalPromptCopy.ts`, `sessionPurpose.ts` (`SessionPurposeResolver.preview/resolve/confirm`) com `purposeSpecs.ts` e `purposePlanItem.ts`, `application/terminal/sessionPurposeInput.ts`, `controllers/terminalControllerTypes.ts` (tipos tirados do controller, que ficou com 80 linhas), `schemas/terminal.ts` (`purpose` com padrão `route`, `strict`), `terminalComposition.ts`. O `preflight` devolve `prompt`, `choice` e `agents` (e mantém `defaultPrompt`). Os caminhos do prompt de execução são os de `TaskSetTask.path`; a pasta vem de `TaskSet.folder`. `taskPlanPrompts.test.ts`: 9 testes (V-37c a V-37e) e `test/terminal-preflight-purpose.test.ts`: 4 testes (V-37f, V-37g). **Decisão:** a raiz do repositório vira "na raiz do repositório" no prompt de execução (a 7.6 não prevê pasta vazia). `terminal-preflight.test.ts` e `terminal-open*.test.ts` seguem passando.
- **2026-11-23 · 05.4** — `open` com `generate_tasks`: valida a spec da tarefa (`spec_not_found`) e a escolha (`choice_invalid`, `agent_unavailable`), grava a escolha na sessão e o runtime a recebe no `start`; ordem das checagens como na tarefa (as da Spec C, depois o propósito, depois prompt, checkout, ferramentas, serviço e skills). Razões novas `plan_item_blocked`, `plan_item_not_ready` e `spec_not_found` em `taskErrors.ts` e em `planErrorCatalog.ts` (o `terminalErrorCatalog.ts` não precisou mudar). `test/terminal-open-purpose.test.ts`: 7 testes (V-37h, V-37i, V-37j, V-44e, V-44f).
- **2026-11-23 · 05.5** — `open` com `plan_item`: reavalia a prontidão no servidor (`plan_item_not_ready` se está em execução ou concluído, `plan_item_blocked` sem `force` quando há dependência externa aberta, inclusive em "Iniciar de novo"), usa a escolha do item (o schema recusa `choice` ali), grava `forced_by` e `forced_at` com o relógio injetado só quando o `force` foi necessário, e limpa a marca anterior quando o início não precisou dela (`markForced` aceita `null`); registra `[plan] item_started` com item, sessão, agente, modelo, esforço e `force`. A marca é gravada depois do `create` da sessão, então uma falha na criação não deixa `forced_*`. `test/terminal-open-plan-item.test.ts` e `terminal-open-plan-item-again.test.ts`: 8 testes (V-37k a V-37n, V-44g, mais "de novo" e a marca limpa). **Desvio:** o log `[plan] item_started` ficou em `planLog.ts` (não existe `planSaveLog.ts`).
- **2026-11-23 · fecho** — `pnpm --dir packages/api test`: 110 arquivos, 746 testes passando. `pnpm --dir packages/api test:integration` (sem `TEST_DATABASE_URL`): 126 arquivos passando e 2 ignorados, 685 testes passando e 5 ignorados, 84 s. `pnpm --dir packages/api typecheck` sem erros; `grep -rn ClaudeSessionRuntime packages/api/src packages/api/test` vazio; o SDK só é importado em `packages/api/src/infra/terminal/`.
- **2026-11-23 · correção da review-001 (B-1)** — `loadItem` em `purposePlanItem.ts` recusa o item de um plano salvo para outra pasta com `plan_item_not_ready`; detalhes e testes no registro da task_04.
