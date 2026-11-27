# Revisão de conformidade 001: Várias contas de assinatura de IA, escolhidas por trabalho

> **Data:** 2026-11-26 · **Escopo:** feature inteira (task_01 a task_08, todas `completed`, 27/27 mini-tarefas) · **Intervalo:** mudanças não commitadas sobre `fd7ea94` (árvore compartilhada com a Issue #7, worktree; os arquivos dela ficaram fora da revisão)
> **Spec:** `docs/specs/contas-de-assinatura-por-trabalho/spec.md`, `_tasks.md`, `task_01.md` a `task_08.md`
> **Regras lidas:** `CLAUDE.md` → `AGENTS.md`, `apps/web/AGENTS.md`, `.agents/rules/code-standards.md`, `.agents/rules/e2e-testing.md`, skills obrigatórias `layered-backend`, `trpc-nextjs`, `nextjs-folder-structure`, `e2e-environment` e `software-testing` (regras centrais)

## Veredito: REPROVADO

A detecção do limite de uso do Codex (REQ-024, US-03 cen. 2) depende de uma notificação `turn/failed` que não existe no protocolo do app-server do Codex 0.159.3. O teste V-07d passa porque o roteiro falso emite justamente essa notificação inventada. Também há duas lacunas importantes no Codex por conta: o catálogo fica indisponível logo depois do login, e o ambiente da sessão muda. Fora do Codex, a feature está bem construída e testada.

| Bloqueante | Importante | Menor | Spec a discutir |
|---|---|---|---|
| 1 | 3 | 4 | 5 |

## Verificação executada

| Comando | Saída | Resultado |
|---|---|---|
| `pnpm --dir packages/api typecheck` | exit 0 | ✅ |
| `pnpm --dir apps/web typecheck` | exit 0 | ✅ |
| `pnpm --dir packages/api test` | exit 0 · 146 arquivos, 908 testes | ✅ |
| `pnpm --dir apps/web test` | exit 0 · 123 arquivos, 675 testes | ✅ |
| `pnpm --dir packages/api test:integration` (sem `TEST_DATABASE_URL`) | exit 1 · 210 arquivos passaram, 1 falhou, 2 pulados; 939 testes passaram, 1 falhou, 5 pulados. Falha: `test/session-latency.test.ts:86`, `expected 2028 to be less than or equal to 2000` (`inputP95Ms`) | ⚠️ |
| `vitest run --config vitest.integration.config.ts test/session-latency.test.ts`, rodado 2× sozinho | exit 0 · 1 passed nas duas | ✅ (instável sob carga; ver nota) |
| `vitest run … test/agent-login-inspector.test.ts --reporter=verbose` | 6 passed; V-03a e V-03e rodaram contra o `claude` e o `codex` reais, sem pular | ✅ |
| `rtk proxy pnpm lint` | exit 0 | ✅ |
| `pnpm --dir apps/web e2e:prepare` | exit 0 · banco `flow_dev_e2e` recriado e migrado | ✅ |
| `pnpm --dir apps/web test:e2e e2e/ai-accounts.spec.ts e2e/work-accounts.spec.ts` | exit 0 · 2 passed, 0 skipped; o log do worker mostra `started … account=<id>` | ✅ |
| `rtk proxy pnpm build` | exit 0 · rota `ƒ /settings/ai-accounts` | ✅ |
| `codex app-server generate-ts --out /tmp/…` (Codex 0.159.3, só leitura) | `ServerNotification` tem `error`, `turn/started`, `turn/completed`…; **não tem `turn/failed`** | evidência de B-1 |
| `scan_diff.py --worktree --max-lines 100` | 6 arquivos longos, 1 dica `mock-in-source` (o dublê restrito, aceitável), 2 `debug-leftover` em `packages/api/.preflight.tmp.ts` (de 2026-11-24, anterior à feature) | ver I-3 |

**Nota sobre a latência:** o teste `session-latency` mede o p95 da entrada com limite de 2000 ms. Na suíte completa deu 2028 ms; sozinho passou duas vezes. Ele não toca o código desta feature: sem conta, o gate devolve na hora, sem consultar o banco. Fica registrado como instabilidade já existente, e não como defeito da feature. O registro da task 08, que diz "integração completa passou", não se repetiu nesta execução.

## Conformidade com a spec

| Item | Status | Evidência |
|---|---|---|
| REQ-001 | ✅ | `agentAccountService.ts:41` `create` → `insert` + `home.ensure`; V-02a em `test/agent-account-service.test.ts` |
| REQ-002 | ✅ | `agentAccountView.ts:12` `loginCommand`; `AgentAccountRow.tsx` mostra `LoginCommandField` em Aguardando/Deslogada; V-11b, V-12a |
| REQ-003 | ✅ | sem limite no serviço nem no índice; V-02b (6 contas) |
| REQ-004 | ✅ | `agentAccountLabel.ts:6-15`; índice parcial `agent_accounts_active_label_unique` em `0057_agent_accounts.sql`; V-02c, V-02d, V-14b |
| REQ-005 | ✅ | `agentAccountVerification.ts:18-26`; V-02j |
| REQ-006 | ✅ | `claudeLoginStatus.ts` só aceita `authMethod === "claude.ai"`; V-03b, V-03c, V-02j |
| REQ-007 | ✅ | `agentAccountService.ts:27` `void this.verification.refresh(records)`; limite de 4 em `agentAccountVerification.ts:7`; `useAgentAccounts.ts` relê em 4 s; V-15a, V-15b |
| REQ-008 | ✅ | `renameAgentAccount` com versão; histórico lê o nome atual por join; V-02e, V-06f |
| REQ-009 | ✅ | `agentAccountRemoval.ts:9-16` (marca, logout + apagar, log `removed logout=`); V-02f, V-02h, V-04e |
| REQ-010 | ✅ | `markAgentAccountRemovedIfIdle` com `for update` e contagem na mesma transação (`agentAccountWrites.ts:45-55`); V-02g |
| REQ-011 | ✅ | `agentAccountService.ts:57-60` `requireOwned` (dona, host, não removida → `not_found`); V-09a, V-09b |
| REQ-012 / REQ-013 | ✅ | `workAccountService.ts:19-33`; `DrizzleTaskAgentAccountDao.set`; V-05a, V-05b, V-05e |
| REQ-014 | ✅ | `sessionLauncher.ts` `resolveAccount` em `launch` (revisão) e `startManual` (rota, Gerar tarefas, plano); V-06a, V-06e |
| REQ-015 | ✅ | `SessionAccountLabel.tsx` em `LaunchChoiceSection` e `PlanSessionCard`, com "Trocar conta"; V-11e, V-12b |
| REQ-016 / B-08 | ✅ | a conta é resolvida na abertura, e o plano não guarda conta; V-06a, V-06d |
| REQ-017 / REQ-025 | ✅ | `sessionResume.ts` usa `claimed.agentAccountId` via gate; V-06b, V-06d, V-07e |
| REQ-018 | ✅ | `sessionAccountView.ts`, `workAccountsCopy.ts historyAccountText`; V-06f, V-11f |
| REQ-019 / REQ-020 | ✅ | `workAccountService.ts:37-43`, catálogo `terminalErrorCatalog.ts` (`PRECONDITION_FAILED`); V-05f, V-05g |
| REQ-021 | 🟡 | `sessionServiceStatus.ts:29-36` usa o `codex_catalog` da conta; logo depois do login esse campo é `null` e o Codex aparece indisponível por até 10 min (I-1) |
| REQ-022 / REQ-023 | ✅ | `sessionAccountGate.ts` (deslogada → mensagem com o comando; limite de 10 s injetável); V-07a, V-07b, V-07e |
| REQ-024 (Claude) | ✅ | `agentSdkExit.ts:10`, `sessionExit.ts:30-31`; V-07c e `agentSdkExit.test.ts` |
| REQ-024 (Codex) | ❌ | `codexSessionEvents.ts:18` trata só `turn/failed`, que o Codex real não emite (B-1) |
| REQ-026 / DEC-03 | 🟡 | links corretos (`accountConfigLinks.ts`, V-04b, V-04c); no Codex com conta, o ambiente da sessão é reduzido à lista curta de `buildAgentEnvironment`, diferente do login padrão (I-2) |
| NFR-01 | ✅ | diretório `0700` derivado do id com UUID validado (`fileAgentAccountHome.ts:17-20`); nenhum código lê credenciais; V-04a, V-04c, V-04f |
| NFR-02 / DEC-05 | ✅ | serviço (`requireOwned`, `requireOperate`) e worker (`sessionAccountGate.ts:28` dona, host, provedor); V-09c |
| NFR-03 | ✅ | V-15a, V-15b, V-07b |
| NFR-04 | ✅ | `accountLogField` em `started`, `resumed`, `launch_failed` e `exited`; V-10c (sem e-mail) |
| NFR-05 | ✅ | `<select>` nativo com `<label>`, estado em texto; V-11c, e a seta testada no V-12b |
| B-01 a B-09 | ✅ | B-01 V-11c/V-05h; B-02 V-06d; B-03 V-05d/V-11d; B-04 V-03d; B-05 V-02i; B-06 V-04d; B-07 V-02h/V-04e; B-08 V-06a; B-09 V-07c (só o Claude, ver B-1) |
| Não muda #1 (Issue Author/Planejamento) | ✅ | runners não recebem `extra`; V-10a e as suítes de `infra/agents` verdes |
| Não muda #2 e #3 (sem conta, sessões antigas) | ✅ | `credentialHome` ausente mantém o ambiente; V-10b e "keeps the server CODEX_HOME" em `codex-runtime-start.test.ts` |
| Não muda #4 e #5 (escolha de agente, disponibilidade do Codex) | ✅ | suítes `codex-open-*` e `TerminalLaunchChoice` verdes |
| Não muda #6 (limite: mesma transição) | ✅ | `sessionExit.ts` mantém `markLaunchFailed`/`interrupt`; só o texto muda |
| DEC-01, DEC-02, DEC-04, DEC-06, DEC-07 | ✅ | diretório por conta; `task_agent_accounts (task_id, provider)`; `null` = padrão; `claude auth status --json`/`codex login status`; `/settings/ai-accounts` |
| Migração §20 / V-14a | ✅ | `0057_agent_accounts.sql` + rollback, journal e `FEATURE_MIGRATIONS`; `agent-accounts-migration.test.ts` verde |
| Fora de escopo | ✅ | nada de troca automática, login por API key, conta no Issue Author ou uso restante |
| Definição de pronto: "spec atualizada com o que mudou" | 🟡 | nenhuma entrada no Histórico depois de 2026-11-25; ver M-4 e "Atualizações de spec" |

## Regras do projeto

| Regra (fonte) | Status | Evidência |
|---|---|---|
| Sem comentários (`code-standards.md` "Comments") | ✅ | o scanner não achou comentários novos |
| Arquivo `.ts` com até 100 linhas (`code-standards.md` "File Size") | ❌ | `sessionWorkerParts.ts` 95 → 102; `test/agent-account-service.test.ts` 101 (novo); `test/codex-runtime-start.test.ts` 87 → 104; `ExecutionHistory.test.tsx` e `PlanSessionCard.test.tsx` 113 (I-3) |
| Funções com até 30 linhas, até 3 parâmetros, sem linhas em branco | ✅ | nos arquivos lidos da feature |
| Números e strings mágicos em constantes (`code-standards.md` "Magic Numbers") | 🟡 | `agentSdkExit.ts:10` `429`; `agentFailure.ts:58` `/model usage limit/i`; `sessionExit.ts:42` `"login padrão"`; "Conta de IA não encontrada." repetida em 4 arquivos (M-2) |
| Sem segredos no código | ✅ | os JSONs de `fixtures/claude-auth-status` são fictícios |
| Camadas (`layered-backend`): procedure fina → controller → serviço → DAO | ✅ | `routers/agentAccounts.ts` → `AgentAccountController` → `AgentAccountService` → `DrizzleAgentAccountDao` |
| tRPC (`trpc-nextjs`): Zod na entrada, erros mapeados | ✅ | `schemas/agentAccounts.ts`, `schemas/workAccounts.ts`, `agentAccountErrorMapper.ts` |
| Pastas (`nextjs-folder-structure`): rota fina, feature-first, sem import entre features | ✅ | `app/settings/ai-accounts/page.tsx` de 9 linhas; rótulos promovidos a `src/lib/agentAccounts/` |
| E2E: locators acessíveis, sem credenciais no teste, sem produção (`e2e-testing.md`) | ✅ | `getByRole`/`getByLabel`; o dublê é recusado com `NODE_ENV=production` |
| Verificação proporcional (`AGENTS.md` "Verificação") | ✅ | os registros de execução seguem a regra; sem timeout aumentado |

## Achados

### task_05 · 05.3 (e task_06, ajuste em `codexSession.ts`)

#### B-1 (Bloqueante): o limite de uso do Codex só é detectado numa notificação que o Codex não emite
- **Onde:** `packages/api/src/infra/terminal/codex/codexSessionEvents.ts:18`: `if (method === "turn/failed") { onFailure?.(params.error?.message ?? …` e `packages/api/test/codex-runtime-start.test.ts:86`, onde o roteiro emite `method: "turn/failed"`.
- **Contra:** REQ-024, US-03 cen. 2, V-07d, B-09.
- **Problema:** `codex app-server generate-ts` do Codex 0.159.3 instalado não tem `turn/failed` em `ServerNotification`. A falha de um turno chega como `error` (`ErrorNotification { error: TurnError, willRetry, threadId, turnId }`) e como `turn/completed` com `turn.status: "failed"` e `turn.error.codexErrorInfo` (o próprio repositório já tem esses tipos: `protocol/generated/v2/TurnStatus.ts`, `TurnError.ts` e `CodexErrorInfo.ts`, com `"usageLimitExceeded"`). Com o Codex real, um limite de uso não chama `onFailure`. A sessão não termina com "Limite de uso da conta Codex B atingido" e, como `turn/completed` só avança a fila, ela fica parada sem motivo. O V-07d prova o dublê, não o comportamento. O registro da 05.3 ("notificação `turn/failed` do Codex classificam limite") e o da 06 (corrida "comprovada pelo teste V-07d") afirmam algo que a evidência não sustenta.
- **Correção esperada:** classificar o limite a partir das mensagens reais. Use `error` com `error.codexErrorInfo === "usageLimitExceeded"` (e `willRetry: false`) e/ou `turn/completed` com `turn.status === "failed"`, preferindo `codexErrorInfo` à regex de texto. Remova o caminho `turn/failed`. Reescreva o V-07d com as formas geradas (`ErrorNotification` e `TurnCompletedNotification`) e acrescente um caso no worker que confira o motivo "Limite de uso da conta Codex B atingido" numa sessão Codex com conta.

### task_06 · 06.2

#### I-1 (Importante): uma conta do Codex recém-logada fica sem catálogo, e o Codex aparece indisponível
- **Onde:** `packages/api/src/application/services/terminal/sessionServiceStatus.ts:36`: `return account.codexCatalog;` e `agentAccountVerification.ts:22`, onde `saveCheck` não grava `codexCatalog`.
- **Contra:** REQ-021 e US-03 cen. 3 (trocar para "Codex C" e iniciar de novo).
- **Problema:** só o publicador do worker preenche o `codex_catalog`, a cada `CODEX_CATALOG_REFRESH_MS` (600 000 ms), e só para contas já `logged_in`. Depois de "Verificar login" de uma conta nova, a conta fica `logged_in` com `codexCatalog: null`, então `codexStatus(taskId)` devolve `null`. `publishedAgentAvailability` mostra "O catálogo do Codex ainda não foi publicado." e `validateChoice` recusa a abertura por até 10 minutos. O próprio registro da task 06 mostra o sintoma: o fixture de `work-account-journey.test.ts` "agora grava catálogos logados", ou seja, o teste foi ajustado em vez do código. O V-08b semeia o catálogo direto e não cobre esse caminho.
- **Correção esperada:** a verificação de uma conta do Codex (`verify` e a reverificação) também lê o catálogo com o `codexHome` da conta e o grava, ou `codexStatus` consulta o catálogo sob demanda quando a conta está logada sem catálogo. Teste: conta Codex verificada `logged_in` sem catálogo prévio → prévia com Codex disponível e os modelos da conta.

### task_05 · 05.2

#### I-2 (Importante): a sessão do Codex numa conta perde o ambiente que o login padrão recebe
- **Onde:** `packages/api/src/infra/terminal/codex/codexProcess.ts:15` e `:33-34`: com `credentialHome`, `accountEnvironment` usa `buildAgentEnvironment(env, …)`; sem conta, usa `this.env` inteiro.
- **Contra:** REQ-026 ("as mesmas … configurações … que o login padrão carrega") e a intenção da seção 9 de que só o diretório de credenciais mude.
- **Problema:** `buildAgentEnvironment` deixa só `PATH`, `HOME`, `LANG`, `LC_ALL`, `LC_CTYPE`, `USER`, `LOGNAME`, `TMPDIR`, `CLAUDE_CONFIG_DIR` e `CODEX_HOME`. Uma sessão do Codex numa conta perde `SSH_AUTH_SOCK`, proxies, `XDG_*`, `TERM`, `DISPLAY` e o resto, enquanto a mesma sessão no login padrão recebe tudo. Um `git push` por SSH ou uma rede com proxy falha só quando há conta. O Claude não tem o problema, porque `agentSdkQueryOptions.ts` usa `terminalEnvironment` mais a sobrescrita. O catálogo (`codexCatalogTransport.ts` `accountEnvironment`) também usa o ambiente inteiro, o que reforça a inconsistência.
- **Correção esperada:** com conta, use o mesmo ambiente de hoje e sobrescreva só `CODEX_HOME` (`{ ...this.env, CODEX_HOME: home }`), mantendo o caso do roteiro falso. Teste: o app-server falso registra também uma variável fora da lista curta (por exemplo `SSH_AUTH_SOCK`) e ela chega igual com e sem conta.

### Várias tarefas (05, 06, 08)

#### I-3 (Importante): arquivos acima de 100 linhas
- **Onde:** `packages/api/src/infra/sessionWorkerParts.ts` (95 → 102, task 05.1); `packages/api/test/agent-account-service.test.ts` (101, novo, task 03); `packages/api/test/codex-runtime-start.test.ts` (87 → 104, tasks 05 e 06); `apps/web/.../ExecutionHistory.test.tsx` e `PlanSessionCard.test.tsx` (113, task 08).
- **Contra:** `.agents/rules/code-standards.md`, "Never create classes or `.ts` files with more than 100 lines" (repetido em `_tasks.md`, Restrições globais).
- **Problema:** a feature passou do limite em 3 arquivos `.ts` e, no espírito da regra, em 2 `.tsx` de teste. `schema.ts` já tinha 128 linhas antes; a feature só acrescentou 1, e isso fica registrado, mas não é cobrado aqui.
- **Correção esperada:** extrair a montagem das contas de `sessionWorkerParts.ts` (por exemplo `accountWorkerParts.ts`) e dividir os testes por assunto (por exemplo `agent-account-rename.test.ts`, `codex-runtime-account.test.ts`, `ExecutionHistoryAccount.test.tsx`, `PlanSessionCardAccount.test.tsx`).

#### M-1 (Menor): o log `launch_failed` deixou de registrar o motivo
- **Onde:** `packages/api/src/application/services/terminal/sessionStarter.ts:45`: `{ sessionId: session.id, ...accountLogField(session) }`. Antes era `{ sessionId: session.id, reason }`.
- **Contra:** NFR-04 pede o campo `account`, não a remoção do motivo; é uma mudança de comportamento fora da spec.
- **Correção esperada:** manter `reason` nos motivos que não são de conta, ou um código do motivo, sem o caminho do diretório nem o e-mail, e acrescentar `account`.

#### M-2 (Menor): strings e números mágicos
- **Onde:** `agentSdkExit.ts:10` `statusOf(error) === 429`, já existe `CLAUDE_LIMIT_STATUS` em `agentFailure.ts:10`; `agentFailure.ts:58` `/model usage limit/i`; `sessionExit.ts:42` `"login padrão"`; "Conta de IA não encontrada." em `agentAccountRemoval.ts:12`, `agentAccountVerification.ts:23`, `workAccountService.ts:52` e `agentAccountService.ts:59`.
- **Contra:** `code-standards.md`, "Magic Numbers and Strings".
- **Correção esperada:** constantes nomeadas, uma só fonte para a mensagem de conta não encontrada, e reuso de `CLAUDE_LIMIT_STATUS`.

#### M-3 (Menor): assinatura sobrecarregada em `TerminalExecutionReader.read` para acomodar testes antigos
- **Onde:** `terminalExecutionReader.ts:18-20`: `read(taskId, viewerUserIdOrNow: string | Date, requestedNow?: Date)` com `viewerUserId = ""` e `requestedNow!`.
- **Problema:** quem chama só com a data vê toda conta como `other`. Hoje só testes fazem isso, mas é um atalho de compatibilidade no código de produção.
- **Correção esperada:** assinatura única `read(taskId, viewerUserId, now)` e os testes antigos atualizados.

#### M-4 (Menor): a Definição de pronto pede a spec atualizada com o que mudou
- **Onde:** `spec.md` §24 ("A spec foi atualizada com o que mudou na implementação") e o Histórico parado em 2026-11-25.
- **Problema:** decisões da implementação não estão na spec: o dublê `FLOW_DEV_AGENT_LOGIN_FAKE` recusado só em produção (decisão do usuário, task 07.3); `account` em `TerminalExecutionReader.read` (não existe `session.get`); `AI_ACCOUNTS_PATH` em `src/lib/navigation/accountRoutes.ts`; a linha "Conta: …" na etapa de execução; as mensagens de nome de REQ-004; a mensagem "A conta desta sessão não está disponível nesta máquina." Ver também "Atualizações de spec a discutir".
- **Correção esperada:** registrar essas decisões na spec (seções 15, 16 e Histórico), sem mudar comportamento.

## Atualizações de spec a discutir
- **S-1 (REQ-022 × NFR-01 e Q-02):** REQ-022 manda a falha de abertura trazer o nome da conta e o comando de login, com o caminho do diretório. Essa mensagem vira o `launchError` da sessão, que os leitores do trabalho veem, e isso contraria "o caminho só é mostrado à dona" (NFR-01) e "os demais veem só Conta pessoal" (Q-02). O código seguiu REQ-022. É preciso decidir qual regra vale para quem não é dono. O mesmo vale para a prévia do Codex em `sessionServiceStatus.ts:34`, que mostra o comando com o caminho da conta escolhida mesmo quando quem abre não é a dona.
- **S-2 (REQ-024 no login padrão):** sem conta, o motivo vira "Limite de uso da conta login padrão atingido" (`sessionExit.ts:42`). A spec não define o texto para o login padrão. Sugestão: "Limite de uso do login padrão atingido" ou manter o texto anterior.
- **S-3 (REQ-024 com a sessão já iniciada):** quando o limite chega depois do início (`crashed`), a sessão vai para `interrupted` e o motivo entra como mensagem de sistema, não como motivo de término. Isso respeita a seção 9 (mesma transição), mas REQ-024 fala em "motivo de término". Vale explicitar na spec.
- **S-4 (NFR-02 no worker):** a recusa por conta de outra máquina ou de outra dona usa "A conta desta sessão não está disponível nesta máquina." (`sessionAccountMessages.ts:13`), texto que não está na spec.
- **S-5 (dublê do inspetor):** `FLOW_DEV_AGENT_LOGIN_FAKE` passou a ser aceito fora de `NODE_ENV=test` (recusado só em produção), por decisão do usuário em 2026-11-26. A task 02 (Interfaces) ainda descreve a regra antiga.

## Divergências entre o relatório do implementador e a evidência
- task_05 05.3: "notificação `turn/failed` do Codex classificam limite" → o Codex 0.159.3 não tem `turn/failed` (B-1).
- task_06, regressões ao fechar: "corrigir a corrida comprovada pelo teste V-07d" → a corrida existe só com o roteiro falso; o ajuste em `codexSession.ts:70` atende a um evento inexistente.
- task_06: "o fixture de `work-account-journey.test.ts` agora grava catálogos logados" → o teste foi adaptado a uma lacuna do código (I-1).
- task_08, fechamento, e tasks 01 a 06: integração completa verde → nesta execução, 1 falha instável em `session-latency.test.ts` (passa isolado). Não é da feature, mas o "verde" não se repetiu.
- Checkboxes de "Testes atribuídos" nas tasks 01 a 06 ficaram `[ ]`, enquanto as mini-tarefas estão `[x]`. Todos os IDs foram achados em testes reais, então não há falta de teste, só de marcação.

## Prompt de correção

> Corrija, nesta ordem, sem alterar nada fora do listado:
> 1. **B-1**: `packages/api/src/infra/terminal/codex/codexSessionEvents.ts`, `codexSession.ts`, `codexSessionExit.ts`, `protocol/codexMethods.ts`: remova o tratamento de `turn/failed` e detecte a falha de turno pelas notificações reais do app-server (Codex 0.159.3): `error` (`{ error: TurnError, willRetry, threadId, turnId }`) com `willRetry: false`, e `turn/completed` com `turn.status === "failed"`. Classifique o limite por `turn.error.codexErrorInfo === "usageLimitExceeded"` (ou `error.codexErrorInfo`), com a regex de texto só como reserva, e marque `limit: true` (REQ-024). Use os tipos de `protocol/generated/v2/` (`TurnError`, `CodexErrorInfo`, `TurnStatus`). Reescreva o V-07d em `test/codex-runtime-start.test.ts` com essas formas reais e acrescente um teste de worker (Postgres real, app-server falso) que termina uma sessão Codex na conta "Codex B" com o motivo "Limite de uso da conta Codex B atingido".
> 2. **I-1**: `agentAccountVerification.ts` e/ou `sessionServiceStatus.ts`: uma conta do Codex que fica `logged_in` precisa ter catálogo disponível sem esperar o ciclo de 10 min do publicador (consulte o catálogo com o `codexHome` da conta na verificação e grave em `codex_catalog`, ou consulte sob demanda quando estiver logada sem catálogo) (REQ-021). Teste: conta Codex verificada sem catálogo prévio → `SessionPurposeResolver.preview` com Codex disponível e os modelos da conta; abrir com um desses modelos passa na validação. Desfaça no `work-account-journey.test.ts` a semeadura de catálogo que só existia para contornar isso.
> 3. **I-2**: `packages/api/src/infra/terminal/codex/codexProcess.ts`: com `credentialHome`, passe o mesmo ambiente de hoje com só `CODEX_HOME` sobrescrito (mantendo `NODE_ENV` e `FLOW_DEV_CODEX_FAKE_SCRIPT` no caso falso) (REQ-026). Teste: o app-server falso registra `CODEX_HOME` e uma variável fora da lista curta (ex.: `SSH_AUTH_SOCK`); com e sem conta, a variável chega igual, e só `CODEX_HOME` muda.
> 4. **I-3**: deixe com até 100 linhas `packages/api/src/infra/sessionWorkerParts.ts`, `packages/api/test/agent-account-service.test.ts`, `packages/api/test/codex-runtime-start.test.ts`, `apps/web/src/features/issues/assigned-work/components/ExecutionHistory.test.tsx` e `PlanSessionCard.test.tsx`, dividindo por responsabilidade, sem mudar asserções.
> 5. **M-1**: `sessionStarter.ts`: o log `launch_failed` volta a trazer o motivo (sem caminho de diretório nem e-mail) junto com `account`.
> 6. **M-2**: constantes para `429` (reuse `CLAUDE_LIMIT_STATUS`), `/model usage limit/i`, `"login padrão"` e uma só constante para "Conta de IA não encontrada.".
> 7. **M-3**: `terminalExecutionReader.ts`: assinatura única `read(taskId, viewerUserId, now)`; atualize os testes que chamam `read(taskId, now)`.
> 8. **M-4**: registre em `spec.md` (seções 15, 16 e Histórico) as decisões listadas em M-4 e as que o usuário decidir em S-1 a S-5. Não mude comportamento por causa da spec sem a decisão do usuário.
>
> Restrições: arquivos `.ts` com até 100 linhas, funções com até 30 linhas, sem comentários, sem dependências novas, textos em pt-BR iguais aos da spec, nada fora dos arquivos citados sem registrar o motivo no Registro de execução da tarefa.
> Ao terminar, rode e mostre a saída de: `pnpm --dir packages/api typecheck`, `pnpm --dir packages/api test`, `pnpm --dir packages/api test:integration` (sem `TEST_DATABASE_URL`), `pnpm --dir apps/web test`, `pnpm --dir apps/web typecheck`, `rtk proxy pnpm lint`. Não marque como concluído sem essa saída.
