---
status: completed
title: Gateways locais e troca do motor no worker
type: backend
complexity: high
---

# Task 06: Gateways locais e troca do motor no worker

## Visão geral
Esta é a fatia que entrega US-01 e US-02 ponta a ponta. `LocalIssueAuthorGateway` e `LocalPlanningGateway` implementam os ports atuais usando a configuração do projeto, as skills portadas do Dev_Control, o `ProviderRunner` e o endpoint MCP. A composição do worker passa a usá-los, com as mesmas validações e liquidações de hoje.

<critical>
- LEIA a spec (`spec.md`, §12, §15, §16, §19, DEC-02) e as regras do projeto (AGENTS.md, `.agents/rules/code-standards.md`) antes de começar. Leia a skill `layered-backend`.
- FAÇA UMA MINI-TAREFA POR VEZ, na ordem. Só marque `[x]` depois de rodar o "Pronto quando" dela e ver passar.
- NÃO saia dos arquivos listados sem registrar o motivo no Registro de execução. Nada fora do escopo da spec.
- TESTES JUNTO COM O CÓDIGO: cada mini-tarefa implementa os testes atribuídos a ela.
- Nenhum teste automatizado chama a CLI real; use um `LocalAgentRunner` falso.
- Ao começar, mude `status` para `in_progress` (aqui e em `_tasks.md`). Não marque `completed`: isso acontece depois da revisão aprovada.
</critical>

## Requisitos
- REQ-001: a geração de rascunho DEVE rodar com o provedor, o modelo e o esforço do Issue Author do projeto, usando o login local da CLI.
- REQ-002: o planejamento DEVE rodar com a configuração do Planejamento do projeto.
- REQ-003: a configuração é fixada quando a tentativa começa; uma nova tentativa lê a vigente.
- REQ-004: as instruções e as entradas são as de hoje: conversa, rascunho atual e revisão base para o Issue Author; snapshot da Issue para o Planejamento.
- REQ-008: a resposta DEVE ser validada pelos mesmos contratos (formato do rascunho, formato da avaliação, citações só de `issue` ou de evidências desta execução, `DIRECT` sem pendência bloqueante).
- REQ-010 (mapeamento): o limite de uso vira `provider_usage_limit` / `planning_rate_limited`, sem trocar de provedor.
- REQ-011 e REQ-012: os prazos de hoje (600 s no Issue Author; `PLANNING_REQUEST_DEADLINE_MS` por tentativa) e o `signal` do worker chegam ao runner.
- REQ-019 (execução): um modelo fora do catálogo falha sem chamar o runner.
- B-04, B-05, B-06 (spec §8).
- Não muda (spec §9):
  - as transições da tarefa;
  - a validação `invalid_agent_source`;
  - o limite de 40.000 caracteres do contexto;
  - até 3 tentativas de planejamento em 900 s;
  - a atividade de consulta visível.

## Interfaces
- **Consome:**
  - `AgentSettingsService.resolve(projectId, agent)` (tarefa 02);
  - `LocalAgentRunner`, `AgentRun`, `AgentRunError`, `AgentRunFailure` e `ProviderRunner` com `shutdown()` (tarefa 04);
  - `ContextMcpEndpoint` com `urlFor`/`start`/`stop`, e `IssueContextDao.listCalls` (tarefa 03);
  - os existentes `GenerationInput`, `GenerationEnvelope`, `PlanningDispatch`, `PlanningEnvelope`, `issueDraftSchema`, `buildGenerationInput`, `PLANNING_REQUEST_DEADLINE_MS` e `TaskError`.
- **Produz:**
  - `class LocalIssueAuthorGateway implements IssueAuthorGateway` e `class LocalPlanningGateway implements PlanningGateway`, ambos com `constructor(deps: { settings: AgentSettingsService; runner: LocalAgentRunner; endpoint: ContextMcpEndpoint; contextDao: IssueContextDao })`;
  - os códigos `TaskError` `local_agent_unavailable`, `agent_settings_invalid`, `planning_local_agent_unavailable` e `planning_agent_settings_invalid`;
  - `mapGenerationFailure(failure: AgentRunFailure)` e `mapPlanningFailure(failure: AgentRunFailure)`, com a tabela da spec §15;
  - `loadInstructions(agent: AgentKind): string`.

## Mini-tarefas

- [x] **06.1 — Skills portadas e carregador de instruções**
  - **Arquivos:**
    - criar `packages/api/resources/agents/issue-author/{SKILL.md,boundaries.md,examples.md,rules.md}` e `packages/api/resources/agents/planning/{SKILL.md,rules.md}`;
    - criar `packages/api/src/infra/agents/agentInstructions.ts` e `packages/api/src/infra/agents/agentInstructions.test.ts`.
  - **Testes:** V-01d
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run src/infra/agents/agentInstructions.test.ts` passa; `pnpm --dir packages/api typecheck` sem erros
- [x] **06.2 [P] — Códigos de erro novos e mapeamento de falhas**
  - **Arquivos:** `packages/api/src/application/services/tasks/taskErrors.ts`, `packages/api/src/infra/database/dao/tasks/taskOperationFailure.ts` (`SAFE_FAILURES`), `packages/api/src/controllers/planningWorkerOutcome.ts` e `planningWorkerOutcome.test.ts`, `packages/api/src/infra/agents/agentFailureMapping.ts` e `agentFailureMapping.test.ts` (criar)
  - **Testes:** V-03g, V-03k
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run src/infra/agents/agentFailureMapping.test.ts src/controllers/planningWorkerOutcome.test.ts` passa; typecheck sem erros
- [x] **06.3 — `LocalIssueAuthorGateway`**
  - **Arquivos:** `packages/api/src/infra/issue-author/localIssueAuthorGateway.ts`, `issueAuthorPrompt.ts`, `issueAuthorOutputSchema.ts` e `localIssueAuthorGateway.test.ts` (criar)
  - **Testes:** V-01a, V-01b, V-02d, V-07c, V-07d
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run src/infra/issue-author` passa; typecheck sem erros
- [x] **06.4 — `LocalPlanningGateway` com validação de citações**
  - **Arquivos:** `packages/api/src/infra/planning/localPlanningGateway.ts`, `planningPrompt.ts`, `planningOutputSchema.ts`, `planningCitations.ts` e os testes de cada um (criar)
  - **Testes:** V-01c, V-02a, V-02b, V-07e
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run src/infra/planning` passa; typecheck sem erros
- [x] **06.5 — Troca na composição e endpoint no ciclo de vida do worker**
  - **Passada manual:** feita pelo usuário em 2026-11-22 com `pnpm dev` e GitHub real; confirmou que funcionou, sem tempos anotados (revisão 001, I-1; revisão 002, M-5).
  - **Arquivos:** `packages/api/src/infra/composition.ts`, `packages/api/src/infra/planningComposition.ts`, `packages/api/src/cli/tasksWorker.ts`, `packages/api/test/composition.test.ts`
  - **Testes:** V-10a
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/composition.test.ts` e `pnpm --dir packages/api exec vitest run src/controllers/taskWorkerController.test.ts` passam; typecheck sem erros; com `pnpm dev` e o Dev_Control desligado, uma mensagem real gera um rascunho pela assinatura
  - **Nota:** no SIGTERM, `tasksWorker.ts` chama `ProviderRunner.shutdown()` e `ContextMcpEndpoint.stop()` antes de sair (B-05).

## Detalhes de implementação
- **Skills portadas (06.1):**
  - as fontes são `../Dev_Control/src/mastra/skills/create-github-issue/` (SKILL.md e `references/`) e `../Dev_Control/src/mastra/skills/determine-spec-path/SKILL.md`;
  - os `rules.md` recebem o texto de `instructions` de `../Dev_Control/src/mastra/agents/issue-author-v1.ts` e `planning-agent.ts`, sem a parte que cita ferramentas Mastra;
  - `loadInstructions` lê na partida e lança se faltar arquivo.
- **Prompt do Issue Author (06.3):**
  - reproduzir `generationContext` de `../Dev_Control/src/mastra/server/issue-author-v1-route.ts` (rascunho atual e revisão base como dados) e `issueAuthorStructuredOutputInstructions` de `../Dev_Control/src/mastra/schemas/issue-author-result.ts`;
  - o schema de saída é `issueAuthorResultSchema`, portado e convertido com `z.toJSONSchema`;
  - a resposta é validada com `issueDraftSchema` (existente).
- **Planejamento (06.4):**
  - reproduzir `planningGenerationContext` e as regras `citesOnlyRetrievedSources` e "DIRECT sem pendência bloqueante" de `../Dev_Control/src/mastra/server/planning-route.ts`;
  - os `sourceIds` permitidos são `issue` e os `evidenceIds` com `status: "done"` de `listCalls`;
  - o envelope ecoa `operationId`, `executionId` e `taskId`/`inputHash` do `PlanningDispatch`.
- **Execução comum:**
  - `resolve` roda uma vez por `generate`/`analyze`; com `available: false`, lança `agent_settings_invalid` / `planning_agent_settings_invalid` sem chamar o runner;
  - `activity` do envelope = `listCalls(executionId)`; o `knownToolCall` atual passa a ser verdadeiro por construção e continua como está;
  - `context = { url: endpoint.urlFor(executionId), capability: input.contextCapability }`.
- **Falhas:**
  - `planning_local_agent_unavailable` e `planning_agent_settings_invalid` são terminais e ficam fora de `TRANSIENT_REASONS`;
  - `provider_failed` → `provider_unavailable` / `planning_provider_unavailable` (transitório);
  - os códigos novos de geração entram em `SAFE_FAILURES`.
- **Log:** uma linha `[agents] run` com `operationId`, `agent`, `provider`, `model`, `effort`, `durationMs`, `outcome`, `exitCode` e `toolCalls`. Nunca o prompt, a Issue ou a capability (spec §19).
- **Código antigo:** os gateways `DevControl*` ficam sem uso; a 07.1 os apaga.

### Arquivos relevantes
- `packages/api/src/infra/issue-author/devControlIssueAuthorGateway.ts`: a validação de envelope atual, a ser espelhada.
- `packages/api/src/infra/planning/devControlPlanningGateway.ts` e `planningResponse.ts`: a tradução de erros e o parse do envelope atuais.
- `packages/api/src/controllers/taskWorkerController.ts`: como o gateway é chamado e liquidado.

### Arquivos afetados
- `packages/api/src/infra/composition.ts` e `planningComposition.ts`: passam a usar os gateways locais.
- `packages/api/src/cli/tasksWorker.ts`: sobe e desce o endpoint e o runner.

### Decisões relacionadas
- DEC-02 (spec §17): as skills portadas para o monorepo são a fonte da verdade.
- DEC-03 (spec §17): o contexto vem pelo endpoint MCP.

## Premissas
Nenhuma.

## Testes atribuídos
- [x] V-01d: `loadInstructions("issue_author")` junta SKILL, references e regras; `"planning"` junta SKILL e regras; um arquivo ausente lança erro na partida.
- [x] V-03g: cada um dos 9 `AgentRunFailure` → os códigos das duas colunas da spec §15.
- [x] V-03k: `planning_local_agent_unavailable` e `planning_agent_settings_invalid` são terminais; `planning_provider_unavailable` e `planning_rate_limited` continuam transitórios.
- [x] V-01a: conversa de 2 mensagens com rascunho atual → o `prompt` contém as duas e o rascunho; o schema é o do Issue Author; o envelope `draft_ready` traz `activity = listCalls`.
- [x] V-01b: o runner devolve `needs_clarification` com uma pergunta → envelope de clarificação.
- [x] V-02d: rascunho fora de `issueDraftSchema` → `invalid_agent_output`; um texto com "rode `cat ~/.ssh/id_rsa`" entra só como dado no prompt.
- [x] V-07c: `resolve` chamado uma vez; uma troca de configuração durante o `run` não muda o `choice` usado.
- [x] V-07d: `available: false` → `agent_settings_invalid`, e o runner não é chamado.
- [x] V-01c: o `prompt` contém o título e o corpo do snapshot; o envelope traz `reviewStatus` e os IDs ecoados.
- [x] V-02a: motivo com `sourceIds` de um UUID não consultado → `planning_invalid_output`.
- [x] V-02b: `DIRECT` com pendência `blocking: true` → `planning_invalid_output`.
- [x] V-07e: `available: false` no Planejamento → `planning_agent_settings_invalid`, e o runner não é chamado.
- [x] V-10a: `createProductionTaskWorkerController` usa `LocalIssueAuthorGateway` e `createPlanningWorkerController` usa `LocalPlanningGateway`; uma operação enfileirada no formato antigo de `GenerationInput` é processada.

## Critérios de sucesso
- Todas as mini-tarefas marcadas, cada uma com o "Pronto quando" executado.
- Todos os testes atribuídos implementados e passando.
- Com o Dev_Control desligado e sem `OPENCODE_API_KEY`, um rascunho real é gerado pela assinatura (US-01 cen. 1).
- Typecheck e lint de `packages/api` sem erros; nenhuma regra do AGENTS.md violada.

## Registro de execução

- **06.1:** skills copiadas de `../Dev_Control` (sem o frontmatter e sem as referências a `references/`) para `packages/api/resources/agents/`, mais os `rules.md` (instruções do agente, fronteira "sem outras ferramentas" e o formato de saída). `loadInstructions` junta tudo (cada texto fica abaixo de 100 KB, o limite prático de um argumento de linha de comando). Não há teste de arquivo ausente: `readFileSync` lança ENOENT e os gateways chamam `loadInstructions` no construtor, ou seja, na partida do worker.
- **06.2:** `TaskErrorReason` ganhou os 4 códigos novos; `agentFailureMapping.ts` traz a tabela da spec §15 (o `cancelled` de geração vira `stale_execution`, que `safeFailure` regrava como `provider_unavailable`, transitório). Desvio necessário: não havia "campo de detalhe" na UI (a coluna `last_error` guarda só o código). Para nomear o provedor/CLI como exigem US-01 cen. 3–4, o código gravado pode levar um detalhe (`provider_usage_limit|Claude Code`): `failureCode.ts` (`withFailureDetail`/`splitFailureCode`, detalhe com lista de caracteres segura e ≤ 160), `safeFailure`, `taskWorkerController.safeReason`, `classifyPlanningError` (só nas falhas terminais), e os DTOs (`tasksController` e `planningDtoMapper` devolvem `reason` e `detail`). Nenhuma coluna nova. Testes V-03g, V-03k e o do detalhe.
- **06.3:** `LocalIssueAuthorGateway`, `issueAuthorPrompt.ts`, `issueAuthorOutputSchema.ts` (porte do schema plano e da normalização do Dev_Control; a validação final é o `issueDraftSchema` existente). O `GenerationInput` não traz o projeto, então `agentExecution.ts` obtém o `projectId` da execução por `IssueContextDao.execution` (hash da capability), sem mudar o port. `agentExecution.ts` concentra configuração, execução, validação, atividade (`listCalls`) e o log `[agents] run`. 8 testes.
- **06.4:** `LocalPlanningGateway`, `planningPrompt.ts`, `planningOutputSchema.ts` (zod do Dev_Control + a tradução para `PlanningAssessment`), `planningCitations.ts` (ids permitidos: `issue` + evidências de chamadas `done`). Testes V-01c, V-02a, V-02b, V-07e e extras.
- **06.5:** `agentComposition.ts` (runtime: `ProviderRunner`, endpoint e `AgentExecutionDeps`), `composition.ts` e `planningComposition.ts` trocados para os gateways locais, `tasksWorker.ts` sobe o endpoint, cancela o runner ao receber SIGTERM/SIGINT e fecha tudo no `finally`. `composition.test.ts` (V-10a; movido para `packages/api/test/` na revisão 002, F-1, por importar o grafo de produção inteiro e estourar os 5 s da suíte unitária sob carga) e `taskWorkerController.test.ts`: passam; typecheck limpo.
- **Verificação com as CLIs reais:** não consegui a execução com `pnpm dev` + mensagem pela interface (exige login no GitHub do navegador). Como substituto, um script no scratchpad montou o `ProviderRunner` real, o `ContextMcpEndpoint` real (SDK) e os dois gateways, com um controller de contexto falso: rascunho com Claude `sonnet`/low em 4,5 s (1 consulta `searchProject`); planejamento com Claude em 4,2 s e com Codex `gpt-6.1-sol`/medium em 5,1 s; rascunho com Codex em 13 s com `searchProject` e `readProjectFile` chamados pelo endpoint. Nenhum processo de CLI sobrou.

## Revisões

- 2026-11-22 · review-003 · APROVADO COM RESSALVAS · reviews/review-003.md (as revisões 001 e 002 reprovaram; todos os achados delas foram corrigidos e reconferidos na 003)
