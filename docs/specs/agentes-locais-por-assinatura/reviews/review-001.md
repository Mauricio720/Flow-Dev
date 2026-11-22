# Revisão de conformidade 001: Issue Author e Planejamento com a assinatura da máquina

> **Data:** 2026-11-22 · **Escopo:** feature inteira (revisão final, tarefas 01–07) · **Intervalo:** mudanças não commitadas sobre `c78d44d` (`git diff HEAD` + arquivos novos)
> **Spec:** `spec.md`, `v00-spike.md`, `_tasks.md`, `task_01.md`–`task_07.md`
> **Regras lidas:** `CLAUDE.md` → `AGENTS.md`, `apps/web/AGENTS.md`, `.agents/rules/code-standards.md`, `.agents/rules/e2e-testing.md`, skills `layered-backend`, `trpc-nextjs` e `nextjs-folder-structure` (regras centrais)
> **Prontidão:** as 27 mini-tarefas estão marcadas e as 7 tarefas continuam `in_progress`. O fluxo do `_tasks.md` (passo 4) só fecha uma tarefa depois de uma revisão APROVADO, por isso esta revisão foi feita como gate final, a pedido do usuário.

## Veredito: REPROVADO

Nenhum requisito ausente, nenhuma suíte falhando e nenhum risco de segurança encontrado. A entrega reprova por 3 achados **importantes**, que pela regra da revisão impedem APROVADO e APROVADO COM RESSALVAS:
1. o smoke real (V-11, "Pronto quando" da 06.5) foi feito com contexto de repositório falso, sem `pnpm dev`;
2. quatro arquivos `.ts` passam de 100 linhas por causa desta entrega;
3. dois controllers passaram a importar um módulo de `infra/`.

As correções de código são pequenas. O item 1 depende de uma passada manual do usuário ou de ele aceitar o risco.

| Bloqueante | Importante | Menor | Spec a discutir |
|---|---|---|---|
| 0 | 3 | 4 | 4 |

## Verificação executada

| Comando | Saída | Resultado |
|---|---|---|
| `pnpm typecheck` | exit 0 | ✅ |
| `pnpm lint` | exit 0 | ✅ |
| `pnpm --dir packages/api test` | exit 0 · 78 arquivos, 483 testes | ✅ |
| `pnpm --dir packages/api test:integration` (sem `TEST_DATABASE_URL`) | exit 0 · 61 arquivos, 384 testes | ✅ |
| `pnpm --dir apps/web test` | exit 0 · 58 arquivos, 281 testes | ✅ |
| `playwright test e2e/project-admin.spec.ts` (banco descartável `flow_dev_e2e_review`, migrado 0000→0045, `next dev` na porta 3107; banco apagado no fim) | exit 0 · 5 passed, 2 skipped (`fixme` já existentes) | ✅ |
| `pgrep -af fakeCli.mjs` depois das suítes | nenhum processo | ✅ |
| grep de V-10d (`DevControl\|ISSUE_AUTHOR_BASE_URL\|PLANNING_BASE_URL\|FLOW_DEV_INTERNAL_API_KEY` em `packages apps`, `.ts/.tsx/.md/.example`) | vazio | ✅ |
| `scan_diff.py --worktree --max-lines 100` | 180 arquivos; dica de assertiva oca descartada (`agentProcess.test.ts:87` vem seguida de `expect(alive(child!)).toBe(false)`); `timeout-raised` são `setTimeout` da CLI falsa | — |
| Varredura de funções > 30 linhas nos 86 `.ts/.tsx` de código alterados | nenhuma | ✅ |

Não executado: V-11 com as CLIs reais. Ele consome a assinatura e exige o login do GitHub no navegador; fica com o usuário (ver I-1).

## Conformidade com a spec

| Item | Status | Evidência |
|---|---|---|
| REQ-001 / REQ-002 | ✅ | `agentExecution.ts:49-57` resolve a escolha do projeto e chama o runner; `localIssueAuthorGateway.test.ts › V-01a`, `localPlanningGateway.test.ts › V-01c` |
| REQ-003 / US-03 cen. 4 | ✅ | `resolve` uma vez por `generate`/`analyze` (`agentExecution.ts:51`); `› V-07c` |
| REQ-004 / B-06 | ✅ | `issueAuthorPrompt.ts` (conversa, rascunho, revisão base), `planningPrompt.ts` (snapshot); `composition.test.ts › V-10a` processa a operação no formato antigo |
| REQ-005 / B-07 / B-08 | ✅ | `contextMcpTools.ts` (4 ferramentas), `contextMcpServer.ts:27` delega ao `IssueContextController`; `context-mcp.test.ts › V-06a–d, V-06f, V-06i` |
| REQ-006 / REQ-013 / DEC-04 | ✅ | `claudeArguments.ts:9-22` e `codexArguments.ts:9-28` iguais ao `v00-spike.md`; `claudeCodeRunner.test.ts › V-05a`, `codexRunner.test.ts › V-05e`; prova adversarial no `v00-spike.md` |
| REQ-007 | ✅ | `providerRunner.ts:29` (`isolation_unavailable` antes do spawn); `› V-03i` |
| REQ-008 / US-02 cen. 2 / B-02 | ✅ | `issueAuthorOutputSchema.ts:56-62`, `planningOutputSchema.ts:28-30` (DIRECT sem bloqueante), `planningCitations.ts`; `› V-02a, V-02b, V-02d, V-02e` |
| REQ-009 / US-01 cen. 4 | ✅ | `agentFailure.ts:41-46`, `codexRunner.ts:28-33`; mensagem "O Codex não está disponível nesta máquina: rode `codex login`." (`agentFailureCopy.ts:15-19`); `› V-03a, V-03b`, `TaskProgress.test.tsx › V-09g` |
| REQ-010 / US-01 cen. 3 / B-01 | ✅ | frase exata em `agentFailureCopy.ts:12`; sem troca de provedor; `› V-03c, V-03h, V-03e`, `TaskProgress.test.tsx › V-03f` |
| REQ-011 / US-02 cen. 3 / B-03 | ✅ | `agentProcess.ts:34, 55-61`, `processGroup.ts` (SIGTERM → SIGKILL em 2 s); `› V-04a, V-04c, V-04d` |
| REQ-012 | 🟡 | Planejamento: `signal` do worker chega ao runner (`localPlanningGateway.ts:33`), `› V-04b`. Geração: o gateway passa um `AbortController` que nunca dispara (`localIssueAuthorGateway.ts:26`); ver "Spec a discutir" |
| REQ-014 / REQ-015 / US-03 cen. 1–2 / B-09 | ✅ | `AgentSettingsEditor.tsx`, `AgentSettingsReadOnly.tsx`; `agentSettingsService.ts:26` (`requireAdmin` no servidor); `agent-settings.test.ts › V-08a, V-08b, B-09`; e2e `E2E-006` |
| REQ-016 | ✅ | `agentSettingsService.ts:28`, mensagem exata em `agentSettingsController.ts:9`; `› V-08g`, `› V-08h` |
| REQ-017 | ✅ | `agentCatalog.ts:9`, `agentSettingsView.ts:10`; `› V-07a, V-07f` |
| REQ-018 / US-03 cen. 3 | ✅ | `drizzleAgentSettingsDao.ts:31-42`; mensagem exata em `agentSettingsCopy.ts:7`; `› V-08d, V-08i, V-08k`, `AgentSettings.test.tsx › V-09c` |
| REQ-019 | ✅ | `agentSettingsView.ts:12`, "Modelo indisponível, escolha outro" na UI; execução falha sem chamar o runner (`agentExecution.ts:52`); `› V-07b, V-07d, V-07e`, `› V-09d` |
| REQ-020 / REQ-022 / US-04 cen. 1 | ✅ | gateways DevControl, `patientFetch`, `planningInputGuard`, `planningConfiguration` apagados; `taskPlanningController.test.ts › V-10b` |
| REQ-021 / US-04 cen. 2 | 🟡 | rota apagada e sem rota catch-all em `app/api`; o teste confere só a ausência do arquivo (M-3) |
| REQ-023 | ✅ | V-00 aprovou o Codex (`v00-spike.md`); catálogo com `codex: ["gpt-6.1-sol"]` |
| NFR-01 | ✅ | `agentEnvironment.ts:1`; capability fora do `ps` (arquivo 0600 / variável de ambiente); `› V-05b`, `claudeCodeRunner.test.ts › "never shows the capability…"` |
| NFR-02 | 🟡 | V-11 registrado com contexto falso (I-1) |
| NFR-03 / B-05 | ✅ | `tasksWorker.ts:8-17`, `providerRunner.ts:38-43`; `› V-04e` (corrida pequena em M-4) |
| §19 observabilidade | 🟡 | linha `[agents] run` com todos os campos (`agentExecution.ts:34-37`); falta o tamanho e o motivo na falha `invalid_output` (M-1) |
| DEC-01 / DEC-03 | ✅ | `child_process.spawn`; `@modelcontextprotocol/sdk` 1.32.2 é a única dependência nova, prevista na DEC-03 |
| DEC-02 | ✅ | `packages/api/resources/agents/` + `agentInstructions.ts` (teste do arquivo ausente faltando: M-2) |
| DEC-05 / §14 | ✅ | `0045_project_agent_settings.sql` + rollback; registrada no journal e em `test/databaseMigrations.ts`; `› V-08f` (cascade) |
| Não muda: estados e transições | ✅ | liquidação intocada (`taskOperationSettlementHelpers.ts`); suítes de integração verdes |
| Não muda: limites do broker | ✅ | `IssueContextController` reaproveitado; `› V-06d, V-06e, V-06h` |
| Não muda: `invalid_agent_source` e 40.000 caracteres | ✅ | `sourceRules.ts:9`, `generationEvidenceBindings.ts:29`, `draftRules.ts:9` sem mudança |
| Não muda: 3 tentativas em 900 s | ✅ | `planningWorkerOutcome.ts` mantém `TRANSIENT_REASONS`; IT-090 cobre timeout e limite |
| Não muda: atividade visível | ✅ | `activity = listCalls` (`localIssueAuthorGateway.ts:31`); `› V-06g` |
| Não muda: mensagens de falha | ✅ | só o texto de limite mudou; as menções a "Dev Control" foram trocadas por "agente de planejamento" (necessário com a retirada) |
| Não muda: nome, descrição, repositório, quadro | ✅ | e2e E2E-005 verde |
| Fora de escopo (OpenCode, troca automática, config global, imagens, descoberta de modelos) | ✅ | nada disso aparece |

## Regras do projeto

| Regra (fonte) | Status | Evidência |
|---|---|---|
| `.ts` ≤ 100 linhas (`code-standards.md`, "File Size") | ❌ | I-2 |
| Funções ≤ 30 linhas | ✅ | varredura sem ocorrência |
| Sem comentários | ✅ | nenhum comentário novo no código |
| ≤ 3 parâmetros | ✅ | objetos de parâmetro (`ProcessSpec`, `AgentExecution`, `ClaudeArgumentInput`) |
| Constantes nomeadas | ✅ | prazos, limites e textos em constantes |
| Sem segredos no código | ✅ | capability só em arquivo temporário 0600 ou variável de ambiente |
| Camadas: contratos em `application/`, implementações em `infra/` (`layered-backend`) | ❌ | I-3 |
| Autorização no servidor (`layered-backend`; spec §18) | ✅ | `agentSettingsService.ts:26` |
| tRPC: entrada Zod, erro mapeado no router (`trpc-nextjs`) | ✅ | `schemas/agentSettings.ts`, `mapAgentSettingsError` |
| Placement do frontend (`nextjs-folder-structure`) | ✅ | rota fina em `settings/page.tsx`; componentes e hook em `features/projects/project-settings/` |
| E2E com locators acessíveis e independente (`e2e-testing.md`) | ✅ | `getByRole("form", …)`, `getByLabel`; usuários e projeto semeados no próprio teste |
| Migration registrada no journal e em `databaseMigrations.ts` (`_tasks.md`) | ✅ | |
| Verificação proporcional (`AGENTS.md`) | ✅ | registros de execução por mini-tarefa; suítes completas uma vez na 07.4 |

## Achados

### task_06 · 06.5 e task_07 · 07.4

#### I-1 (Importante): smoke real feito com contexto falso; "Pronto quando" da 06.5 não cumprido
- **Onde:** `task_06.md`, 06.5 marcada `[x]` com "Pronto quando: … com `pnpm dev` e o Dev_Control desligado, uma mensagem real gera um rascunho pela assinatura"; `task_07.md`, V-11a–c marcados `[x]`; `spec.md` §"Resultado do V-11": "o contexto do repositório veio de um controller de contexto falso".
- **Contra:** spec §24 ("V-11 executado com o `.env.local` sem as variáveis do Dev_Control"); US-01 e US-04, "Teste independente"; V-11 ("1 rascunho real com consultas").
- **Problema:** o caminho ponta a ponta real nunca rodou: interface → worker → CLI → endpoint MCP → `IssueContextController` → GitHub. O implementador declarou a limitação; mesmo assim, as caixas estão marcadas.
- **Correção esperada:** uma passada manual com `pnpm dev`, o worker, o `.env.local` sem as variáveis do Dev_Control e um projeto real: um rascunho com `searchProject` na atividade e um planejamento, com os tempos anotados na spec. Se o usuário aceitar o substituto, ele registra isso em `spec.md` e desmarca ou reescreve o "Pronto quando" da 06.5.

### task_03 · 03.3, task_04 · 04.1, task_05 · 05.4, task_06 · 06.2

#### I-2 (Importante): arquivos `.ts` acima de 100 linhas
- **Onde:**
  - `packages/api/src/controllers/tasksController.ts`: 100 → 101 linhas (import de `splitFailureCode`, 06.2);
  - `apps/web/e2e/project-admin.spec.ts`: 97 → 125 (E2E-006, 05.4);
  - `packages/api/src/infra/agents/agentProcess.test.ts`: 104, novo (04.1);
  - `packages/api/test/context-mcp.test.ts`: 112, novo (03.3).
  - Já existentes e só tocados: `infra/database/schema.ts` (124 → 125), `planning-reads.test.ts` (178), `planning-commands.test.ts` (145 → 144) e `planning-worker.test.ts` (195 → 174).
- **Contra:** `.agents/rules/code-standards.md`, "File Size": "Never create classes or `.ts` files with more than 100 lines"; `_tasks.md`, "Restrições globais".
- **Correção esperada:** os quatro primeiros com ≤ 100 linhas. Por exemplo: extrair a montagem do DTO de detalhe de `tasksController.ts`; mover o E2E-006 para `e2e/project-agents.spec.ts`; dividir os dois testes por tema (supervisor × saída; ferramentas × autenticação). Nenhum teste perdido.

### task_06 · 06.2

#### I-3 (Importante): controllers importam um módulo de `infra/`
- **Onde:** `packages/api/src/controllers/taskWorkerController.ts:7` e `packages/api/src/controllers/planningWorkerOutcome.ts:7`: `import { agentFailureDetail } from "../infra/agents/agentFailureMapping";`
- **Contra:** skill `layered-backend` (§ camadas: contratos em `application/`, implementações em `infra/`; controllers dependem dos contratos, não das implementações). Antes desta entrega, só `transcriptionController.ts` fazia isso.
- **Problema:** a função só lê `TaskError.cause instanceof AgentRunError` e devolve `detail`, e os dois tipos já vivem em `application/`. O controller passa a depender do módulo concreto dos gateways locais.
- **Correção esperada:** mover `agentFailureDetail` para `application/` (por exemplo, `application/services/tasks/failureCode.ts`) e importar de lá. `infra/agents/agentFailureMapping.ts` mantém só o mapeamento.

#### M-1 (Menor): log de `invalid_output` sem tamanho nem motivo
- **Onde:** `packages/api/src/infra/agents/agentExecution.ts:59-62`: o `writeLog` da falha grava `outcome`, `exitCode` e `toolCalls`, mas descarta o `detail` (`contract_violation`, `no_structured_output`, `output_too_large`) e não registra o tamanho da saída.
- **Contra:** spec §19: "Uma falha `invalid_output` registra o tamanho da saída e o motivo da validação, não o conteúdo."
- **Correção esperada:** a linha `[agents] run` de uma falha `invalid_output` traz o motivo (o `detail` da `AgentRunError`) e o tamanho em bytes da saída, sem o conteúdo. Um teste no `localIssueAuthorGateway.test.ts` cobre isso.

### task_06 · 06.1

#### M-2 (Menor): V-01d marcado sem o caso de arquivo ausente
- **Onde:** `task_06.md`, V-01d `[x]` ("um arquivo ausente lança erro na partida"); `agentInstructions.test.ts` não tem esse caso, e o registro da 06.1 admite isso.
- **Contra:** V-01d em `task_06.md`.
- **Correção esperada:** um teste que aponte `loadInstructions` para um diretório sem um dos arquivos e espere o erro. Para isso, `RESOURCES_ROOT` vira um parâmetro opcional ou fica injetável.

### task_07 · 07.2

#### M-3 (Menor): V-10c confere a ausência do arquivo, não o 404
- **Onde:** `packages/api/test/routes.test.ts:49-52`: `expect(existsSync(route)).toBe(false)`.
- **Contra:** US-04 cen. 2 ("recebe 404"); V-10c ("`POST /api/internal/issue-context` → 404").
- **Problema:** hoje o resultado é o mesmo, porque não há rota catch-all em `apps/web/src/app/api`. Mas o teste continuaria passando se a rota voltasse com outro nome de arquivo ou num catch-all.
- **Correção esperada:** um caso no Playwright (`request.post("/api/internal/issue-context")` → 404), ou aceitar o substituto e registrar isso no V-10c.

### task_04 · 04.5

#### M-4 (Menor): corrida entre `shutdown()` e a primeira execução de um provedor
- **Onde:** `packages/api/src/infra/agents/providerRunner.ts:30-34`: `closed` é lido antes de `await this.logVersionOnce(...)`, que pode levar até 5 s, e a execução só entra em `active` depois disso.
- **Problema:** um SIGTERM durante a sondagem `--version` da primeira execução deixa essa execução fora do `shutdown()`. A CLI sobe depois do encerramento, e o worker fica preso até ela terminar, o que fere a NFR-03 nessa janela.
- **Correção esperada:** conferir `closed` de novo depois da sondagem (ou registrar o `AbortController` antes dela), com um teste em que `shutdown()` acontece durante a sondagem.

## Atualizações de spec a discutir

1. **REQ-012 para a geração.** O REQ-012 está marcado só para US-02, mas a matriz do `_tasks.md` o atribui também à 06.3. O port `IssueAuthorGateway` não recebe `signal` e não pode mudar (restrição global), então o gateway passa um `AbortController` que nunca dispara (`localIssueAuthorGateway.ts:26`). Na prática, a geração só para pelo prazo de 600 s ou pelo SIGTERM. A spec deve dizer se a geração precisa ser cancelável. Se não precisar, o sinal morto deve sair do código.
2. **`.env.example`.** A §24 pede "`.env.example` atualizado", mas o arquivo não existe no repositório (registro da 07.3). Esse item deve sair da Definição de pronto.
3. **Planejamento com ferramentas.** A UI dizia que o planejamento "não consulta o repositório". O Dev_Control já dava ao planejamento as ferramentas de contexto (`Dev_Control/src/mastra/agents/planning-agent.ts:44`), então a troca do texto corrige a interface, não muda comportamento. O histórico da spec registra isso; vale deixar explícito também no REQ-005.
4. **Gate de prontidão.** O passo 4 do `_tasks.md` exige revisão APROVADO para fechar cada tarefa, e a spec-conformance exige tarefas `completed` antes da revisão final. Convém o manifesto dizer que a revisão final roda com as mini-tarefas marcadas e as tarefas em `in_progress`.

## Divergências entre o relatório do implementador e a evidência

- Os números declarados na 07.4 batem com esta revisão: 483 unitários, 384 de integração, 281 web, e2e com 5 passando e 2 `fixme`.
- 06.5 `[x]` e V-11a–c `[x]` → o "Pronto quando" com `pnpm dev` não foi cumprido. O substituto foi declarado no registro e na spec (I-1).
- V-01d `[x]` → o caso de arquivo ausente não existe. O registro declara isso (M-2).
- `project-admin.spec.ts` recebeu duas mudanças fora do E2E-006 que não estão nos registros: a assertiva de escopo OAuth passou a `"repo project offline_access"` e a contagem de `textbox` foi de 2 para 3. A primeira só corrige um teste que já estava defasado em `HEAD` (`repositoryOAuthController.ts:6` já usa esse escopo), e a suíte passa. Fica a nota de que os registros de execução não mencionam essas edições.

## Prompt de correção

> Corrija, nesta ordem, sem alterar nada fora do listado. Leia antes `.agents/rules/code-standards.md` e a skill `layered-backend`.
> 1. **I-3** — `packages/api/src/controllers/taskWorkerController.ts:7` e `packages/api/src/controllers/planningWorkerOutcome.ts:7`: mova `agentFailureDetail` de `infra/agents/agentFailureMapping.ts` para `packages/api/src/application/services/tasks/failureCode.ts` (ou um arquivo vizinho em `application/`) e importe de lá. Nenhum controller importa `../infra/agents/*`. Teste: `planningWorkerOutcome.test.ts` e `agentFailureMapping.test.ts` continuam verdes.
> 2. **I-2** — Deixe com ≤ 100 linhas: `packages/api/src/controllers/tasksController.ts` (extraia a montagem do DTO de detalhe), `apps/web/e2e/project-admin.spec.ts` (mova o E2E-006 para `apps/web/e2e/project-agents.spec.ts`), `packages/api/src/infra/agents/agentProcess.test.ts` e `packages/api/test/context-mcp.test.ts` (divida por tema). Nenhum caso de teste removido ou enfraquecido.
> 3. **M-1** — `packages/api/src/infra/agents/agentExecution.ts`: numa falha `invalid_output`, a linha `[agents] run` inclui o motivo (`detail` da `AgentRunError`) e o tamanho da saída em bytes, nunca o conteúdo (spec §19). Teste em `localIssueAuthorGateway.test.ts`.
> 4. **M-4** — `packages/api/src/infra/agents/providerRunner.ts`: uma execução iniciada antes de `shutdown()` e ainda na sondagem de versão é cancelada sem subir a CLI. Teste em `providerRunner.test.ts` com `shutdown()` durante a sondagem.
> 5. **M-2** — `packages/api/src/infra/agents/agentInstructions.ts`: torne o diretório de recursos injetável e acrescente o caso V-01d "arquivo ausente lança erro" em `agentInstructions.test.ts`.
> 6. **M-3** — acrescente um caso Playwright que faz `POST /api/internal/issue-context` e espera 404, num spec de até 100 linhas.
> 7. **I-1** (depende do usuário) — não marque nada. Deixe em `task_06.md` (06.5) e em `task_07.md` (V-11) a nota "aguardando a passada manual com `pnpm dev` e GitHub real, ou o aceite do usuário".
>
> Restrições: sem comentários, funções ≤ 30 linhas, ≤ 3 parâmetros, nenhuma dependência nova, ports `IssueAuthorGateway` e `PlanningGateway` intocados.
> Ao terminar, rode e mostre a saída de: `pnpm typecheck`, `pnpm lint`, `pnpm --dir packages/api test`, `pnpm --dir packages/api test:integration` (sem `TEST_DATABASE_URL`), `pnpm --dir apps/web test`, `pnpm --dir apps/web exec playwright test e2e/project-admin.spec.ts e2e/project-agents.spec.ts` e `wc -l` dos arquivos do item 2. Não marque como concluído sem essa saída.
