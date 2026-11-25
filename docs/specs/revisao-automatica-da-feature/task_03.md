---
status: completed
title: Abertura e mensagem sem requisição HTTP
type: backend
complexity: critical
---

# Task 03: Abertura e mensagem sem requisição HTTP

## Visão geral
O passo do ciclo roda no serviço de sessões, sem requisição HTTP, e precisa abrir sessões `review` e `review_execute` e mandar mensagens a elas pelo caminho que a operadora já usa. Esta tarefa extrai de `TerminalSessionController.start` a criação da sessão, a preparação do contexto e a gravação do prompt; cria o envio de mensagem do sistema por `insertUserMessage`; registra as finalidades novas e a captura da pasta pela execução; e estende o runtime roteirizado para um roteiro por sessão com várias vezes. É a parte de maior regressão: a rota, a geração de tarefas e o plano precisam abrir como hoje.

<critical>
- LEIA a spec (§12, §13, §16 item 2.3, §22) e as regras do projeto (AGENTS.md/CLAUDE.md, `.agents/rules/code-standards.md`) antes de começar. Use a skill `layered-backend`.
- FAÇA UMA MINI-TAREFA POR VEZ, na ordem. Só marque `[x]` depois de rodar o "Pronto quando" dela e ver passar.
- NÃO saia dos arquivos listados sem registrar o motivo no Registro de execução. Nada fora do escopo da spec.
- TESTES JUNTO COM O CÓDIGO: cada mini-tarefa implementa os testes atribuídos a ela, seguindo a skill de testes do projeto (`.claude/skills/software-testing/SKILL.md`). Isso quer dizer: asserção sobre o efeito observável e específico, nada de `toBeTruthy` ou de só checar que não lança exceção; valor esperado tirado da spec, nunca recalculado a partir do código; dublês só em dependências lentas, variáveis ou externas; relógio e aleatoriedade controlados. Em bug, reproduza antes de corrigir.
- Ao começar, mude `status` para `in_progress` (aqui e em `_tasks.md`). Mude para `completed` só quando todas as mini-tarefas estiverem marcadas e os critérios de sucesso tiverem sido comprovados por comando. A revisão contra a spec acontece uma vez, depois de todas as tarefas: não a espere aqui, mas não marque nada que não tenha prova, porque ela vai conferir.
</critical>

## Requisitos
- REQ-017: as sessões do ciclo DEVEM abrir no checkout da operadora, em nome dela e no modo de permissão padrão das sessões, com o prompt dado pelo chamador.
- REQ-018: a sessão `review_execute` DEVE ter as edições de `.md` da pasta do conjunto capturadas como as sessões `plan_item`.
- REQ-020 (base): abrir com a mesma `requestKey` DEVE devolver a sessão existente; a unicidade `(user_id, request_key)` já existe.
- REQ-007 (base): as pré-condições de abertura (agente indisponível, modelo inválido, serviço parado, checkout inválido, skill ausente) DEVEM falhar com o mesmo `TaskError` de hoje.
- §9: QUANDO a operadora abrir sessões pela rota, pela geração de tarefas ou pelo plano, o sistema DEVE CONTINUAR A abri-las como hoje.

## Interfaces
- **Consome:** `task_terminal_sessions.review_cycle_id` e os checks novos (01); `TerminalControllerDeps` de `controllers/terminalControllerTypes.ts`; `SessionPrepareStep` de `terminalOpenSteps.ts`; `SessionMessageDao.insertUserMessage({ sessionId, content, requestKey })` de `application/terminal/sessionInteractionPorts.ts`; `isPlanTaskFile` de `planCaptureRule.ts`.
- **Produz:**
  - `SESSION_PURPOSES = ["route", "generate_tasks", "plan_item", "review", "review_execute"]` em `application/terminal/sessionPurposeKind.ts`.
  - `SessionLauncher` em `application/services/terminal/sessionLauncher.ts`: `launch(input: LaunchInput): Promise<{ session: TerminalSessionRecord; created: boolean }>`, com `LaunchInput = { actorId; taskId; projectId; requestKey; purpose: "review" | "review_execute"; reviewCycleId; choice: AgentChoice; prompt: string }`. Faz as checagens de pré-condição (serviço, checkout, ferramentas, skills), cria a sessão `flow_dev` com `hostId`, `permissionMode` padrão e `review_cycle_id`, e roda `SessionPrepareStep`. Lança o `TaskError` de hoje em cada pré-condição.
  - `TerminalSessionController.start` passa a usar o mesmo trecho extraído (sem mudar `open`/`preflight` para quem chama).
  - `SystemMessageSender` em `application/services/terminal/systemMessageSender.ts`: `send({ sessionId, content, requestKey }): Promise<{ created: boolean }>`, sobre `insertUserMessage`, idempotente pela `requestKey`.
  - Runtime roteirizado: `ScriptContext` ganha `purpose`; `scriptFromEnvironment` procura primeiro o roteiro da sessão por finalidade (`scriptFileFor(directory, cwd, purpose)`) e cai no roteiro por `cwd` de hoje; `wait_message` entre vezes continua o mesmo roteiro.

## Mini-tarefas

- [x] **03.1 — Finalidades novas e runtime roteirizado por sessão**
  - **Arquivos:** `packages/api/src/application/terminal/sessionPurposeKind.ts` (alterar), pontos que fazem `switch`/`Record` sobre `SessionPurposeKind` e o typecheck apontar (alterar), `packages/api/src/infra/terminal/scriptedSessionSteps.ts` (alterar), `scriptedSessionSteps.test.ts` (alterar), `packages/api/test/session-worker-support.ts` (alterar, para gravar um roteiro por finalidade)
  - **Testes:** V-05i
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run src/infra/terminal/scriptedSessionSteps.test.ts` passa; `pnpm --dir packages/api typecheck` sem erros
  - **Nota:** se o roteiro por finalidade não for suficiente para testes com duas sessões do mesmo papel (substituta, 06.2), use a ordem de abertura como chave extra e registre a escolha aqui.
- [x] **03.2 — Extrair o `SessionLauncher` do controller**
  - **Arquivos:** `packages/api/src/application/services/terminal/sessionLauncher.ts` (criar), `packages/api/src/controllers/terminalSessionController.ts` (alterar), `packages/api/src/infra/terminalComposition.ts` (alterar), `packages/api/test/review-session-launcher.test.ts` (criar)
  - **Testes:** V-13c, V-05j
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/review-session-launcher.test.ts test/terminal-open-purpose.test.ts test/terminal-open-plan-item.test.ts test/terminal-open-plan-item-again.test.ts test/codex-open-purpose.test.ts` passa
- [x] **03.3 — Captura da pasta pela sessão de execução**
  - **Arquivos:** `packages/api/src/application/services/terminal/terminalEventIngestion.ts` (alterar), `purposePlanItem.ts` ou o resolvedor da pasta capturada (alterar), `packages/api/test/review-execute-capture.test.ts` (criar)
  - **Testes:** V-05f
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/review-execute-capture.test.ts test/plan-capture.test.ts` passa
- [x] **03.4 — Mensagem do sistema por `insertUserMessage`**
  - **Arquivos:** `packages/api/src/application/services/terminal/systemMessageSender.ts` (criar), `packages/api/test/review-system-message.test.ts` (criar)
  - **Testes:** V-05k
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/review-system-message.test.ts` passa; `pnpm --dir packages/api typecheck` sem erros

## Detalhes de implementação
- A extração preserva a ordem de checagens de `TerminalSessionController.open` (serviço, prompt, checkout, ferramentas, skills) para os chamadores atuais. O `SessionLauncher` não chama `requireOperate` nem `requireApproved`: quem chama (o passo do ciclo, 05) confere posse e planejamento antes (§16 item 2.1).
- A sessão do ciclo não passa por `purposes.resolve/confirm` do plano: `purpose`, `agent`, `model`, `effort` e `review_cycle_id` vêm do `LaunchInput`.
- `review_execute` captura `.md` dentro de `tasks_folder` do ciclo; a pasta vem de `task_review_cycles.tasks_folder` pelo `review_cycle_id` da sessão. `review` também precisa capturar o relatório (`stop` forçado em 05.2): confira que a captura existente das sessões `flow_dev` já grava `reviews/review-NNN.md` como artefato; se não, inclua `review` na mesma regra de pasta e registre.
- `insertUserMessage` hoje é chamado por `sessionInteractionController.ts`; o `SystemMessageSender` usa o mesmo DAO, sem a checagem HTTP de operadora. A entrega continua pelo `MessageDeliveryStep` (sessão viva) e pelo `SessionResumeStep` (sessão interrompida).

### Arquivos relevantes
- `packages/api/src/controllers/terminalSessionController.ts`: `open` e `start` (origem da extração).
- `packages/api/src/application/services/terminal/terminalOpenSteps.ts`: `SessionPrepareStep`.
- `packages/api/src/application/services/terminal/messageDelivery.ts` e `sessionResume.ts`: entrega e retomada.
- `packages/api/src/infra/terminal/scriptedSessionSteps.ts`, `scriptedSessionRunner.ts`, `terminalPorts.ts` (`FAKE_SCRIPT_VARIABLE`).
- `packages/api/test/session-worker-support.ts`, `terminal-support.ts`, `plan-support.ts`: mundo de teste com serviço de sessões e runtime roteirizado.
- `packages/api/test/task-plan-journey.test.ts`: exemplo de roteiro com `write_file` e `end_turn`.

### Arquivos afetados
- `terminalSessionController.ts`: `start` delega ao trecho extraído.
- `sessionPurposeKind.ts`: duas finalidades novas.
- `terminalEventIngestion.ts`: captura de `review_execute`.

### Decisões relacionadas
- DEC-08 (spec §17): as continuações usam o caminho das mensagens da operadora.

## Premissas
- O roteiro por finalidade (`ScriptContext.purpose`) é uma escolha desta tarefa para testar duas sessões no mesmo checkout; a spec só pede "um roteiro por sessão".

## Testes atribuídos
- [ ] V-05i: duas sessões no mesmo `cwd`, uma `review` com roteiro `[write_file, end_turn, wait_message, write_file, end_turn]` e outra `review_execute` com roteiro próprio → cada uma executa só o seu roteiro; sem roteiro por finalidade, cai no roteiro por `cwd` de hoje · runtime roteirizado.
- [ ] V-13c: abrir pela rota, pela geração de tarefas e por um item do plano depois da extração → mesmas linhas em `task_terminal_sessions` (finalidade, modelo, esforço, `request_key`), mesmo prompt gravado, mesmos erros para checkout ausente e serviço parado que antes; os testes atuais de abertura passam sem alteração · controller + Postgres de teste.
- [ ] V-05j: `SessionLauncher.launch` com `purpose: "review"`, `reviewCycleId`, Claude · Sonnet · Alto → sessão `flow_dev` com `review_cycle_id`, modelo e esforço gravados, `permissionMode` padrão, `hostId` da máquina e o prompt preparado; mesma `requestKey` duas vezes → a mesma sessão, `created: false`; Codex sem login → o `TaskError` de agente indisponível de hoje e nenhuma linha criada · Postgres de teste, catálogo de agentes falso.
- [ ] V-05f (REQ-018): sessão `review_execute` de um ciclo com `tasks_folder = docs/specs/x` grava `docs/specs/x/_tasks.md` e `docs/specs/x/task_02.md` e termina o turno → versões novas dos dois artefatos; a mesma sessão grava `src/a.md` → não vira artefato do conjunto · ingestão real + Postgres de teste.
- [ ] V-05k: `SystemMessageSender.send` duas vezes com a mesma `requestKey` → uma única mensagem não entregue; sessão viva registrada → o `MessageDeliveryStep` a entrega no tick seguinte; sessão `interrupted` → o `SessionResumeStep` a retoma com essa mensagem · serviço de sessões real com runtime roteirizado + Postgres de teste.

## Critérios de sucesso
- Todas as mini-tarefas marcadas, cada uma com o "Pronto quando" executado.
- Todos os testes atribuídos implementados e passando.
- Ao fim da tarefa: `pnpm --dir packages/api test` e `pnpm --dir packages/api test:integration` completos passando uma vez.
- Typecheck e lint do pacote sem erros; nenhuma regra do AGENTS.md violada.

## Registro de execução
<!-- The implementer appends one entry per mini-task: date, what was done, commands run with their result, deviations. -->
- 2026-11-25 · **03.1 concluída.** Adicionadas as finalidades `review` e `review_execute`; roteiros agora podem ser selecionados por finalidade e caem no arquivo antigo por `cwd` quando não há arquivo específico. O teste V-05i executa duas sessões no mesmo `cwd`, com roteiros distintos e continuação da revisão após `wait_message`. Alterei `agentSessionRuntime.ts`, `sessionStarter.ts` e `sessionResume.ts` para propagar `purpose` ao runtime, necessários além da lista inicial; alterei também `scriptedSessionRunner.ts` para consumir a mensagem inicial antes de esperar a próxima, pois `wait_message` antes aceitava o prompt inicial como continuação. `session-worker-support.ts` ganhou `writePurposeScript` para os testes de integração seguintes. `pnpm --dir packages/api exec vitest run src/infra/terminal/scriptedSessionSteps.test.ts` → 4 testes passaram. `pnpm --dir packages/api typecheck` → passou.
- 2026-11-25 · **03.2 concluída.** Extraído `SessionLauncher`; a rota manual delega criação e preparação mantendo os checks e a confirmação de propósito, e o launcher de revisão valida serviço, checkout, agente e skills, grava `review_cycle_id` e prepara o prompt com permissão padrão. O teste V-05j verifica Sonnet · Alto, host, checkout, prompt preparado, idempotência e Codex sem login; os testes V-13c de rota, geração e plano passaram sem alteração. Alterei também o contrato e o mapeamento DAO de sessões para transportar `reviewCycleId` até inserções e relançamentos, além dos arquivos listados. `pnpm --dir packages/api typecheck` → passou. `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/review-session-launcher.test.ts test/terminal-open-purpose.test.ts test/terminal-open-plan-item.test.ts test/terminal-open-plan-item-again.test.ts test/codex-open-purpose.test.ts` → 5 arquivos e 18 testes passaram.
- 2026-11-25 · **03.3 concluída.** A ingestão agora resolve a pasta de captura do ciclo pelo `review_cycle_id` para `review` e `review_execute`; ambas continuam usando a regra `.md` da pasta, preservando a captura de `plan_item`. O teste V-05f comprova `_tasks.md`, `task_02.md` e o relatório como artefatos e exclui `src/a.md`. Alterei também `LockedSession`, o DAO de eventos e seu teste unitário porque a pasta precisa atravessar o contrato e a consulta travada da sessão, além dos arquivos listados. `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/review-execute-capture.test.ts test/plan-capture.test.ts` → 2 arquivos e 6 testes passaram.
- 2026-11-25 · **03.4 concluída.** Criado `SystemMessageSender` em cima de `insertUserMessage`, retornando `created` para uso idempotente pela chave. V-05k executa a entrega pelo `MessageDeliveryStep` no tick seguinte e retoma a sessão interrompida pelo `SessionResumeStep`, com a mensagem enviada como `firstMessage`. `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/review-system-message.test.ts` → 1 arquivo e 1 teste passou.
- 2026-11-25 · **Task 03 concluída.** `pnpm --dir packages/api test` → 136 arquivos e 848 testes passaram. `pnpm --dir packages/api test:integration` inicialmente revelou que `session-latency.test.ts` ainda esperava que `wait_message` consumisse o prompt inicial; removi a espera obsoleta, e o teste isolado passou. A execução completa seguinte de `test:integration` → 166 arquivos passaram, 2 ignorados; 799 testes passaram, 5 ignorados. `pnpm --dir packages/api typecheck` → passou. `pnpm lint` → passou; `packages/api` não tem script/configuração de lint e o comando do monorepo executou ESLint em `apps/web`.
- 2026-11-25 · Correção da review-002 (flake no runtime roteirizado): `ScriptedSessionRunner.hold` marcava o runner como bloqueado durante qualquer passo, inclusive `write_file`, então `settled()` podia voltar com o arquivo ainda sendo gravado (V-38f falhava cerca de 1 em 7 execuções do unitário). Agora só os passos `ask` e `permission` marcam o runner como bloqueado. `pnpm --dir packages/api test` passou 12 vezes seguidas.
- 2026-11-25 · Correção da review-003: `scriptedSessionRunner.ts` ficou com 100 linhas (`RunnerConfig` movido para `scriptedRunnerConfig.ts`). `test/codex-secret-answer.test.ts` voltou ao prazo de confirmação de produção (1,5 s) no lugar dos 100 ms do original, depois de testado sob carga; ajuste ao teste fora da lista de arquivos, motivado pelo `secret_delivery_failed` intermitente.
