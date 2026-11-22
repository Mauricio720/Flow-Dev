---
status: completed
title: Abertura da sessão no servidor
type: backend
complexity: critical
---

# Task 03: Abertura da sessão no servidor

## Visão geral
Entrega o lado servidor de "Abrir no terminal", ainda sem anexos:
- o montador do prompt da §7.3;
- a linha de comando e o disparo desanexado do GNOME Terminal, sem shell;
- a pasta da sessão com as quatro skills copiadas;
- as procedures `tasks.terminal.preflight` e `tasks.terminal.open`, com idempotência por `requestKey`;
- o campo `terminal.lastOpened` em `tasks.byId`.

A complexidade é crítica porque o endpoint dispara, na máquina, um processo com todas as permissões (NFR-01, §18).

<critical>
- LEIA a spec (`spec.md`, US-02, REQ-005 a REQ-013, REQ-015, REQ-036 a REQ-040, §7.3, §7.4, §7.7, §9, §12, §15, §16 "Abrir", §17 DEC-01, DEC-05 e DEC-11, §18, §19) e as regras do projeto (AGENTS.md/CLAUDE.md, `.agents/rules/code-standards.md`) antes de começar. Leia as skills `layered-backend` e `trpc-nextjs`.
- LEIA `docs/specs/execucao-no-terminal/v00-spike.md` (resultado da task_01). A linha de comando e o nome das skills copiadas seguem o que ele registrou, não a §15 original.
- FAÇA UMA MINI-TAREFA POR VEZ, na ordem. Só marque `[x]` depois de rodar o "Pronto quando" dela e ver passar.
- NÃO saia dos arquivos listados sem registrar o motivo no Registro de execução. Nada fora do escopo da spec: anexos são da task_04, UI das tasks 05 e 06.
- TESTES JUNTO COM O CÓDIGO: cada mini-tarefa implementa os testes atribuídos a ela.
- NUNCA dispare o GNOME Terminal real nos testes automatizados: use o lançador falso e o `ToolLocator` falso.
- Ao começar, mude `status` para `in_progress` (aqui e em `_tasks.md`). Mude para `completed` só quando todas as mini-tarefas estiverem marcadas e os critérios de sucesso tiverem sido comprovados por comando. A revisão contra a spec acontece uma vez, depois de todas as tarefas: não a espere aqui, mas não marque nada que não tenha prova, porque ela vai conferir.
</critical>

## Requisitos
- REQ-005: ENQUANTO o planejamento estiver aprovado, o sistema DEVE oferecer a abertura à pessoa operadora, e a ninguém mais (aqui, a autorização no servidor).
- REQ-006 (servidor): o `preflight` DEVE devolver a pasta vinculada, a branch atual (ou o SHA do HEAD destacado), a sujeira e o prompt pré-preenchido.
- REQ-007: O sistema DEVE montar o prompt pré-preenchido conforme a §7.3, a partir do snapshot da Issue referenciado pela decisão aprovada (P-05).
- REQ-009 (servidor): sem vínculo, o `preflight` devolve `checkout: null` e o `open` recusa com `checkout_missing`.
- REQ-010: QUANDO a pessoa confirmar, o sistema DEVE abrir uma janela de terminal na pasta vinculada, com o Claude Code interativo, todas as permissões liberadas e o texto editado como primeira mensagem.
- REQ-011: SE, ao confirmar, a pasta não passar mais nas validações da §7.1, ENTÃO o sistema DEVE recusar com "A pasta vinculada não é mais um clone válido de <owner/repo>. Atualize o vínculo nas Configurações." e não abrir nada.
- REQ-012: SE o Claude Code ou o terminal não estiverem disponíveis, ENTÃO o sistema DEVE recusar com "Claude Code não encontrado no PATH." ou "GNOME Terminal não encontrado.".
- REQ-013: SE o prompt estiver vazio ou passar de 20.000 caracteres, ENTÃO o sistema DEVE recusar (`prompt_invalid`).
- REQ-015: SE a mesma confirmação for enviada duas vezes, ENTÃO o sistema DEVE abrir uma única janela e devolver a mesma sessão.
- REQ-036: O sistema DEVE disponibilizar à sessão as skills da §7.7, mesmo que o repositório do projeto não as tenha.
- REQ-037: O prompt pré-preenchido DEVE começar pelo comando da skill da rota aprovada.
- REQ-038: SE uma skill da §7.7 não existir no Flow Dev ao abrir, ENTÃO o sistema DEVE recusar com "Skill <nome> não encontrada no Flow Dev." e não abrir nada.
- REQ-039: cada sessão recebe uma cópia fixa das skills; mudanças posteriores não alteram sessões abertas.
- REQ-040 (servidor): `tasks.byId` DEVE expor `terminal.lastOpened: { userName, openedAt } | null`.
- NFR-01: só o Claude Code, com argumentos fixos, mais o prompt como um único argumento literal, sem shell. A pasta vem do vínculo salvo e validado.
- B-04: a pessoa deixa de ser operadora com o diálogo aberto → o `open` é recusado com a mensagem de permissão atual.
- B-09: aspas, `$(...)`, crases e quebras de linha chegam ao Claude exatamente como digitados.
- B-16: o prompt sem o comando da skill é aceito; a sessão abre sem acionar skill, com as skills disponíveis.
- Q-01 (decidida): sem `FLOW_DEV_TERMINAL_ENABLED=true`, o `open` recusa com `terminal_disabled` e a mensagem "A abertura no terminal está desligada. Defina FLOW_DEV_TERMINAL_ENABLED=true no .env.local e reinicie o Flow Dev.".
- Não muda (§9):
  - NM-01: aprovar não inicia nada;
  - NM-02: abrir não altera o status do planejamento, da tarefa, da fila e do quadro;
  - NM-03: nada é escrito no GitHub;
  - NM-04: o Issue Author e o Planejamento continuam com a configuração isolada, sem `--add-dir`;
  - NM-08: `~/.claude` e o repositório do projeto não são alterados.
- §19:
  - OBS-01: log `[terminal]` de abertura (sessão, tarefa, rota, sem o prompt);
  - OBS-02: falha de disparo, com o motivo;
  - OBS-03: skill ausente.

## Interfaces
- **Consome (task_02):**
  - `LocalCheckoutDao.find(userId, projectId)`;
  - `LocalCheckoutService.verify(path, repository): Promise<VerifiedCheckout>`;
  - `CheckoutValidationError`;
  - schema `taskTerminalSessions` (`packages/api/src/infra/database/schema/tasks/terminal.ts`).
- **Consome (existente):**
  - `WorkAuthorization.requireOperate({ projectId, taskId, actorId })` (`packages/api/src/application/services/assigned-issues/workAuthorization.ts`);
  - `PlanningRoute` e `PlanningComplexity` (`packages/api/src/application/services/tasks/planningContracts.ts`);
  - as tabelas `task_planning_decisions` (`selected_route`, `complexity`, `reasons`, `uncertainties`, `status`, `source_snapshot_id`), `task_issue_snapshots` (`title`, `body_markdown`) e `task_issue_sources` (número e URL da Issue);
  - `TaskError` e `mapTaskError` (`packages/api/src/application/services/tasks/taskErrors.ts`, `packages/api/src/controllers/taskErrorMapper.ts`).
- **Produz** (usado pelas tasks 04, 05 e 07):
  - `packages/api/src/application/services/terminal/terminalPromptBuilder.ts`:
    - `MAX_PROMPT_LENGTH = 20_000`;
    - `type PromptSource = { route: PlanningRoute; issueNumber: number; title: string; url: string; body: string; complexity: PlanningComplexity; reasons: string[]; uncertainties: string[] }`;
    - `buildDefaultPrompt(source: PromptSource): string`;
    - `type PromptAttachment = { name: string; contentType: string; path: string }`;
    - `appendAttachmentsSection(prompt: string, attachments: PromptAttachment[]): string`;
    - `promptProblem(prompt: string): "prompt_empty" | "prompt_too_long" | null`.
  - `packages/api/src/application/terminal/terminalLauncher.ts`:
    - `type TerminalCommand = { file: string; args: string[] }`;
    - `interface TerminalLauncher { launch(command: TerminalCommand): Promise<void> }`;
    - `interface ToolLocator { has(binary: string): Promise<boolean> }`.
  - `packages/api/src/infra/terminal/terminalCommand.ts`: `buildTerminalCommand(input: { checkoutPath: string; contextDir: string; prompt: string }): TerminalCommand`.
  - `packages/api/src/application/terminal/sessionContext.ts`:
    - `FLOW_DEV_SKILLS = ["spec-writer", "spec-to-tasks", "direct-executor", "spec-conformance"] as const`;
    - `type SessionContextPaths = { sessionDir: string; contextDir: string; attachmentsDir: string }`;
    - `interface SessionContextBuilder { missingSkills(): Promise<string[]>; prepare(sessionId: string): Promise<SessionContextPaths>; discard(sessionId: string): Promise<void> }`.
  - `packages/api/src/infra/terminal/terminalStateRoot.ts`: `terminalSessionsRoot(env: NodeJS.ProcessEnv): string`, que devolve `${XDG_STATE_HOME ?? ~/.local/state}/flow-dev/terminal-sessions`.
  - `packages/api/src/application/database/dao/terminalSessionDao.ts`, interface `TerminalSessionDao`:
    - `findByRequestKey(userId, requestKey)`;
    - `create(input)`;
    - `markLaunchFailed(sessionId, reason)`;
    - `lastOpened(taskId)`.
  - `packages/api/src/controllers/terminalSessionController.ts`, `class TerminalSessionController`:
    - `preflight(actor, { projectId, taskId })`;
    - `open(actor, { projectId, taskId, prompt, requestKey, attachmentIds, issueImageIds })`.

    Nesta tarefa, `attachmentIds` e `issueImageIds` são aceitos no schema e precisam vir vazios; a task_04 os implementa.
  - tRPC:
    - `tasks.terminal.preflight` devolve `{ checkout: { path; branch; detachedSha; dirty } | null; defaultPrompt; maxPromptLength: 20000; issueImages: [] }`; a task_04 preenche `issueImages`;
    - `tasks.terminal.open` devolve `{ sessionId; unavailableIssueImages: 0 }`;
    - `tasks.byId` passa a incluir `terminal: { lastOpened: { userName: string; openedAt: string } | null }`.
  - Motivos novos em `TaskError["reason"]`, com a mensagem em `taskErrorMessage`:
    - `planning_not_approved`, `checkout_missing`, `checkout_invalid`, `skill_missing`;
    - `claude_unavailable`, `terminal_unavailable`, `terminal_disabled`, `prompt_invalid`;
    - `attachment_missing` e `attachment_limit`, que a task_04 usa.

## Mini-tarefas

- [x] **03.1 — Montador do prompt (§7.3)**
  - **Arquivos:** criar `packages/api/src/application/services/terminal/terminalPromptBuilder.ts`, `packages/api/src/application/services/terminal/terminalPromptCopy.ts` e `packages/api/src/application/services/terminal/terminalPromptBuilder.test.ts`
  - **Testes:** V-02a, V-02b, V-02c, V-02d, V-02e, V-02f, V-02g
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run src/application/services/terminal/terminalPromptBuilder.test.ts` passa.
  - **Nota:** os textos de comando da §7.3 ficam em `terminalPromptCopy.ts`. Se o spike decidiu o prefixo `flow-` (Q-03), os comandos são `/flow-direct-executor` e `/flow-spec-writer`. Os rótulos de rota no texto `Rota aprovada:` são "Execução direta", "Tech Spec" e "PRD"; os de complexidade são "Baixa", "Média" e "Alta", como em `apps/web/src/features/issues/assigned-work/planningCopy.ts`.
- [x] **03.2 — Linha de comando, lançador e localização das ferramentas**
  - **Arquivos:**
    - criar `packages/api/src/application/terminal/terminalLauncher.ts`;
    - criar `packages/api/src/infra/terminal/terminalCommand.ts` e `packages/api/src/infra/terminal/terminalCommand.test.ts`;
    - criar `packages/api/src/infra/terminal/gnomeTerminalLauncher.ts` e `packages/api/src/infra/terminal/gnomeTerminalLauncher.test.ts`;
    - criar `packages/api/src/infra/terminal/pathToolLocator.ts`;
    - alterar `packages/api/src/infra/agents/claudeCodeRunner.test.ts` (asserção da NM-04).
  - **Testes:** V-04a, V-04b, V-04c, V-04g, V-11e
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run src/infra/terminal/terminalCommand.test.ts src/infra/terminal/gnomeTerminalLauncher.test.ts src/infra/agents/claudeCodeRunner.test.ts` passa.
  - **Nota:** o `GnomeTerminalLauncher` recebe a função de spawn por injeção, e o teste passa uma fake. Ele chama `spawn(file, args, { detached: true, stdio: "ignore", shell: false })` e `unref()`, e rejeita se o evento `error` chegar (ex.: `ENOENT`). O `PathToolLocator.has(binary)` percorre `process.env.PATH` com `access(X_OK)`, sem shell e sem `which`.
- [x] **03.3 — Pasta da sessão com as skills copiadas**
  - **Arquivos:**
    - criar `packages/api/src/application/terminal/sessionContext.ts`;
    - criar `packages/api/src/infra/terminal/terminalStateRoot.ts` e `packages/api/src/infra/terminal/flowDevSkillsDir.ts`;
    - criar `packages/api/src/infra/terminal/fileSessionContextBuilder.ts`;
    - criar `packages/api/test/session-context-builder.test.ts`.
  - **Testes:** V-04d, V-04e, V-04f
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/session-context-builder.test.ts` passa. O teste usa `mkdtemp` como `XDG_STATE_HOME`, `HOME` e `FLOW_DEV_SKILLS_DIR`.
  - **Nota:**
    - `prepare(sessionId)` cria `<root>/<sessionId>/` com `0700`, `contexto/.claude/skills/<skill>/` (cópia recursiva de cada pasta de `FLOW_DEV_SKILLS`) e `contexto/anexos/`.
    - `flowDevSkillsDir()` usa `FLOW_DEV_SKILLS_DIR` ou sobe a partir de `process.cwd()` até achar `pnpm-workspace.yaml` e devolve `<raiz>/.claude/skills`.
    - Se o spike decidiu o prefixo `flow-`, a cópia vai para `flow-<skill>/` e o campo `name:` do frontmatter do `SKILL.md` copiado recebe o mesmo prefixo.
    - `missingSkills()` lista as que não têm `SKILL.md` na origem.
- [x] **03.4 — `preflight` e `tasks.terminal.preflight`**
  - **Arquivos:**
    - criar `packages/api/src/application/database/dao/terminalSessionDao.ts`;
    - criar `packages/api/src/infra/database/dao/terminal/drizzleTerminalSessionDao.ts` e `packages/api/src/infra/database/dao/terminal/terminalPromptSource.ts` (leitura da decisão aprovada, do snapshot e da fonte);
    - criar `packages/api/src/controllers/terminalSessionController.ts`;
    - criar `packages/api/src/schemas/terminal.ts` e `packages/api/src/routers/terminal.ts`;
    - criar `packages/api/src/infra/terminalComposition.ts`;
    - alterar `packages/api/src/routers/tasks.ts` (`terminal: createTerminalRouter(...)`), `packages/api/src/application/services/tasks/taskErrors.ts` e `packages/api/src/controllers/taskErrorMapper.ts`;
    - criar `packages/api/test/terminal-support.ts` e `packages/api/test/terminal-preflight.test.ts`.
  - **Testes:** V-03a, V-03b, V-03c
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/terminal-preflight.test.ts` passa; `pnpm --dir packages/api typecheck` sem erros.
  - **Nota:**
    - `terminal-support.ts` monta, no banco de teste, uma tarefa com Issue publicada, a operadora e a decisão `approved`; reaproveite `test/planning-support.ts` e `test/operator-support.ts`.
    - Monte o controller com um `GitCheckoutInspector` real sobre um `mkdtemp` com `git init` e remote do projeto.
    - Se o arquivo do controller passar de 100 linhas, separe os passos em `packages/api/src/application/services/terminal/terminalOpenSteps.ts`.
- [x] **03.5 — Validações do `open`**
  - **Arquivos:**
    - alterar `packages/api/src/controllers/terminalSessionController.ts`;
    - criar `packages/api/src/application/services/terminal/terminalOpenGuard.ts` (habilitação, ferramentas, skills, prompt, vínculo);
    - criar `packages/api/test/terminal-open-guards.test.ts`.
  - **Testes:** V-03d, V-03e, V-03f, V-03g, V-03h, V-03k, V-03l
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/terminal-open-guards.test.ts` passa. Em todos os casos de recusa, o lançador falso não é chamado e nenhuma linha de sessão é criada.
  - **Nota:** a ordem das checagens é:
    1. `terminal_disabled`;
    2. operadora (`operator_required`);
    3. decisão `approved` (`planning_not_approved`);
    4. `prompt_invalid`;
    5. vínculo (`checkout_missing`, depois `verify` → `checkout_invalid`);
    6. `claude_unavailable` e `terminal_unavailable`;
    7. `skill_missing`.

    A mensagem de `skill_missing` nomeia a skill.
- [x] **03.6 — Idempotência, transação, disparo, `launch_failed` e `lastOpened`**
  - **Arquivos:**
    - alterar `packages/api/src/controllers/terminalSessionController.ts` e `packages/api/src/infra/database/dao/terminal/drizzleTerminalSessionDao.ts`;
    - criar `packages/api/src/application/services/terminal/terminalLaunchLog.ts` (logs `[terminal]`);
    - alterar `packages/api/src/controllers/tasksController.ts` e `packages/api/src/controllers/mappers/taskWorkspaceDtoMapper.ts` (`terminal.lastOpened`);
    - criar `packages/api/test/terminal-open.test.ts`.
  - **Testes:** V-03i, V-03j, V-11c, V-11d, V-11f
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/terminal-open.test.ts test/terminal-open-guards.test.ts test/terminal-preflight.test.ts` passa; `pnpm --dir packages/api typecheck` sem erros.
  - **Nota:** a sequência (§16, passos 2 a 6) é:
    1. Se já houver sessão com (`user_id`, `request_key`), devolve-a sem chamar o lançador.
    2. Senão, insere a sessão com `opened_at = last_signal_at = now()`, `branch`, `dirty`, `checkout_path` e `planning_decision_id`. Uma violação do unique, vinda de outra requisição simultânea, relê e devolve a sessão existente.
    3. Fora da transação, `prepare`, depois `appendAttachmentsSection` (vazia nesta tarefa) e então `launch`.
    4. Se o disparo falhar: `discard`, `markLaunchFailed`, log `[terminal] launch_failed` e `terminal_unavailable`.

## Detalhes de implementação
- **Padrão a espelhar:**
  - `TaskPlanningController`, para operadora (`requireOperate`) e erros;
  - `createTaskPlanningRouter`, para o sub-router recebendo um getter do controller;
  - a composição lazy em `routers/tasks.ts`.
- **Prompt (§7.3):**
  - as seções vêm na ordem da spec, separadas por uma linha em branco;
  - reasons e uncertainties viram listas com `- `, e uncertainties vazio vira `Nenhuma`;
  - se o total passar de 20.000 caracteres, o corpo é cortado para caber e termina em `[corpo cortado — leia a Issue completa no link]`;
  - `appendAttachmentsSection` acrescenta `\n\nAnexos (leia antes de começar):\n` e uma linha por anexo (`- <nome> (<tipo>): <caminho>`), sem contar no limite;
  - com lista vazia, devolve o prompt intacto.
- **Comando:** use a linha que o spike registrou em `v00-spike.md`. A referência inicial é `gnome-terminal --working-directory=<checkout> -- claude --dangerously-skip-permissions --add-dir <sessão>/contexto -- <prompt>`. Não acrescente `--setting-sources`, `--model` nem outro isolamento (DEC-05).
- **Status inalterados (NM-01 e NM-02):** o teste compara as linhas de `tasks`, `task_planning_decisions` e `task_issue_claims` antes e depois do `open`.
- **Sem GitHub (NM-03):** o controller não recebe gateway do GitHub; o teste monta a composição com um gateway que falha se chamado.

### Arquivos relevantes
- `packages/api/src/controllers/taskPlanningController.ts`: `requireOperator` e o padrão de controller.
- `packages/api/src/routers/taskPlanning.ts`: sub-router de `tasks`.
- `packages/api/src/infra/agents/agentProcess.ts` e `packages/api/src/infra/agents/agentProcessTestSupport.ts`: spawn injetável e testes de processo.
- `packages/api/src/infra/agents/claudeArguments.ts`: argumentos do Claude para o planejamento (NM-04: não podem ganhar `--add-dir`).
- `packages/api/src/infra/database/dao/tasks/planningDecisionCurrent.ts`: como achar a decisão atual da tarefa.
- `packages/api/src/infra/database/schema/tasks/planning.ts` e `packages/api/src/infra/database/schema/tasks/sources.ts`: colunas da decisão, do snapshot e da fonte.
- `packages/api/test/planning-support.ts` e `packages/api/test/operator-support.ts`: montagem de tarefa e operadora em teste.

### Arquivos afetados
- Os listados nas mini-tarefas.

### Decisões relacionadas
- DEC-01 (§17): disparo de `gnome-terminal` por `execFile`/`spawn` no servidor local.
- DEC-05 (§17): a sessão não é isolada; usa o login e a configuração pessoal, com `--dangerously-skip-permissions`.
- DEC-11 (§17): skills copiadas para `<sessão>/contexto/.claude/skills/` e passadas com `--add-dir`.

## Premissas
- Q-03: o nome das cópias (original ou `flow-`) vem de `v00-spike.md`; sem registro, use o nome original.
- `launch_failed_at` e `launch_error` existem em `task_terminal_sessions` (task_02).

## Testes atribuídos
- [x] V-02a: `buildDefaultPrompt` → seções na ordem da §7.3 (comando, `Issue #<n> — <título>` e link, corpo, `Rota aprovada: … · Complexidade: …`, motivos, pendências).
- [x] V-02b: rota `direct_execution` → começa exatamente com o texto `/direct-executor …` da §7.3 (REQ-037).
- [x] V-02c: rotas `tech_spec` e `prd` → o mesmo texto `/spec-writer …`.
- [x] V-02d: uncertainties vazio → a seção de pendências mostra `Nenhuma`.
- [x] V-02e: corpo enorme → o total fica em 20.000 caracteres ou menos, e o corpo termina com `[corpo cortado — leia a Issue completa no link]`; as seções 4 a 6 continuam inteiras.
- [x] V-02f: `appendAttachmentsSection` com 2 anexos sobre um prompt de 20.000 caracteres → o resultado passa de 20.000, com `Anexos (leia antes de começar):` e uma linha por anexo com nome, tipo e caminho absoluto; lista vazia → prompt intacto.
- [x] V-02g: `promptProblem("")` e `"   "` → `prompt_empty`; 20.001 caracteres → `prompt_too_long`; texto sem comando de skill → `null` (B-16).
- [x] V-04a: `buildTerminalCommand` → `file` é `gnome-terminal` e o prompt é um único elemento de `args`; o lançador chama spawn com `shell: false`, `detached: true` e `unref()`.
- [x] V-04b: o prompt `--help` vem depois do separador `--` → continua literal na última posição.
- [x] V-04c: `args` contém `--working-directory=<checkout>`, `--dangerously-skip-permissions` e `--add-dir <sessão>/contexto`, na ordem registrada no spike.
- [x] V-04d: `prepare` → as 4 skills de `FLOW_DEV_SKILLS` estão em `contexto/.claude/skills/` com todos os arquivos, e a pasta da sessão tem modo `0700`.
- [x] V-04e: alterar o `SKILL.md` de origem depois do `prepare` → a cópia da sessão continua com o conteúdo antigo (REQ-039).
- [x] V-04f: depois do `prepare` e do `open`, os arquivos de `$HOME/.claude` e do clone de teste não mudaram (mesmas listagens e hashes) (NM-08).
- [x] V-04g: prompt com aspas, `$(whoami)`, crases e quebras de linha → aparece byte a byte igual no último argumento recebido pelo spawn falso (B-09).
- [x] V-11e: os argumentos do runner de planejamento (`claudeArguments`) não contêm `--add-dir` nem caminhos de `terminal-sessions` (NM-04).
- [x] V-03a: quem não é a operadora → `preflight` e `open` recusados com `operator_required`.
- [x] V-03b: planejamento em `review` (inclusive depois de refazer o planejamento, B-01) → `planning_not_approved`.
- [x] V-03c: sem vínculo → `preflight` devolve `checkout: null` com o prompt; com vínculo → `path`, `branch` (ou `detachedSha`) e `dirty` corretos.
- [x] V-03d: vínculo salvo, mas a pasta foi apagada ou o remote trocado → `open` recusa com a mensagem da REQ-011.
- [x] V-03e: `ToolLocator` sem `claude` → "Claude Code não encontrado no PATH.".
- [x] V-03f: `ToolLocator` sem `gnome-terminal` → "GNOME Terminal não encontrado.".
- [x] V-03g: `FLOW_DEV_SKILLS_DIR` sem `spec-conformance` → "Skill spec-conformance não encontrada no Flow Dev.".
- [x] V-03h: prompt vazio ou com 20.001 caracteres → `prompt_invalid`.
- [x] V-03k: a reivindicação passa para outra pessoa entre o `preflight` e o `open` → `operator_required` (B-04).
- [x] V-03l: sem `FLOW_DEV_TERMINAL_ENABLED=true` → `terminal_disabled`, com a mensagem da Q-01.
- [x] V-03i: dois `open` com o mesmo `requestKey`, em sequência e com `Promise.all` → a mesma `sessionId`, uma linha e uma chamada ao lançador (REQ-015).
- [x] V-03j: o lançador falso rejeita → `terminal_unavailable`, sessão com `launch_failed_at`, pasta da sessão removida.
- [x] V-11c: aprovar o planejamento não cria sessão nem chama o lançador (NM-01).
- [x] V-11d: depois do `open`, o status do planejamento, da tarefa, da reivindicação e do quadro não mudou (NM-02).
- [x] V-11f: o `open` não chama nenhum gateway do GitHub (NM-03).

## Critérios de sucesso
- Todas as mini-tarefas marcadas, cada uma com o "Pronto quando" executado.
- Todos os testes atribuídos implementados e passando.
- `tasks.terminal.open` com o lançador falso registra a sessão, cria `contexto/.claude/skills/` com as 4 skills e entrega ao lançador a linha do spike com o prompt literal.
- `tasks.byId` devolve `terminal.lastOpened` com o nome da pessoa e o horário depois da abertura, e `null` antes.
- No fim da tarefa, a suíte completa passa: `pnpm --dir packages/api test` e `pnpm --dir packages/api test:integration`.
- `pnpm --dir packages/api typecheck` e `pnpm lint` sem erros; nenhuma regra do AGENTS.md violada (inclusive arquivos com no máximo 100 linhas).

## Registro de execução
<!-- The implementer appends one entry per mini-task: date, what was done, commands run with their result, deviations. Example:
- 2026-11-22 · 03.1 · builder do prompt · `vitest run src/application/services/terminal/terminalPromptBuilder.test.ts` → 7 passed · sem desvios -->
- 2026-11-22 · 03.1 · montador do prompt · `vitest run src/application/services/terminal/terminalPromptBuilder.test.ts` → 9 passed · pelo spike, os comandos são `/flow-dev:direct-executor` e `/flow-dev:spec-writer` (plugin `flow-dev`), e não `/direct-executor`
- 2026-11-22 · 03.2 · comando, lançador e localizador · `vitest run src/infra/terminal src/infra/agents/claudeCodeRunner.test.ts` → 23 passed · linha do spike (`--plugin-dir <sessão>/contexto`); o lançador passa ao `spawn` só um ambiente da lista permitida (`terminalEnvironment.ts`, sem `CLAUDE*` nem segredos do servidor) e resolve na saída 0 do cliente do terminal, rejeita em `error` ou saída diferente de 0, e assume sucesso após 5 s; `pathToolLocator.test.ts` extra; V-11e entrou em `claudeCodeRunner.test.ts`; `GIT_OPTIONAL_LOCKS=0` no `runGit` para a inspeção não escrever no clone
- 2026-11-22 · 03.3 · pasta da sessão · `vitest run --config vitest.integration.config.ts test/session-context-builder.test.ts` → 6 passed · layout do plugin: `contexto/.claude-plugin/plugin.json`, `contexto/skills/<skill>/` e `contexto/anexos/`, sem renomear as skills; o id da sessão precisa ser uuid, então nunca sai da raiz
- 2026-11-22 · 03.4 · `preflight` e `tasks.terminal.preflight` · `vitest run --config vitest.integration.config.ts test/terminal-preflight.test.ts` → 6 passed; `pnpm --dir packages/api typecheck` sem erros · o controller ficou em 77 linhas, com os passos em `terminalOpenGuard.ts` e `terminalOpenSteps.ts`; um vínculo salvo que deixou de ser válido volta como `checkout: null` no preflight; a decisão aprovada lê o snapshot (formato 2) ou a publicação (formato 1); `terminalErrorCatalog.ts` e `terminalErrorMapper.ts` levam os motivos novos e a mensagem de `operator_required` para o terminal; `tasks.byId` já recebe `terminal.lastOpened` (03.6)
- 2026-11-22 · 03.5 · validações do `open` · `vitest run --config vitest.integration.config.ts test/terminal-open-guards.test.ts` → 10 passed · V-03k simula a troca de operadora apagando e recriando a linha da reivindicação, porque o operador é imutável por trigger; a checagem de idempotência fica depois de operadora e aprovação e antes das checagens voláteis
- 2026-11-22 · 03.6 · idempotência, disparo, `launch_failed` e `lastOpened` · `vitest run --config vitest.integration.config.ts test/terminal-open.test.ts test/terminal-open-guards.test.ts test/terminal-preflight.test.ts` → 23 passed · uma sessão com `launch_failed_at` é reaproveitada na nova tentativa com o mesmo `requestKey` (limpa a falha e dispara de novo); V-11f confere que o `setStatus` do GitHub nunca é chamado; helpers em `test/terminal-support.ts`, `terminal-harness.ts` e `terminal-open-support.ts`; `TaskDao` ganhou `terminalLastOpened` e os fakes de `tasksController.test.ts` e `src/test/tasks.ts` (web) foram ajustados
- 2026-11-22 · fechamento · `pnpm --dir packages/api test` → 523 passed; `pnpm --dir packages/api test:integration` → 433 passed; `pnpm --dir packages/api typecheck`, `pnpm --dir apps/web typecheck` e `pnpm lint` sem erros
