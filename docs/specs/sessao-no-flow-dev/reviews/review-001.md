# Revisão de conformidade 001: A sessão do Claude dentro do Flow Dev (parcial)

> **Data:** 2026-11-23 · **Escopo:** feature inteira, **parcial**: a tarefa 07 continua `in_progress` (07.3 aberta), e a revisão foi pedida mesmo assim · **Intervalo:** mudanças não commitadas (`git diff HEAD` mais arquivos novos; nada foi commitado)
> **Spec:** `docs/specs/sessao-no-flow-dev/spec.md`, `_tasks.md`, `task_01.md` a `task_07.md`, `v20-spike.md`
> **Regras lidas:** `AGENTS.md` (raiz) e `apps/web/AGENTS.md`, `.agents/rules/code-standards.md`, `.agents/rules/e2e-testing.md`, `DESIGN.md` (trechos de componentes), skills `layered-backend`, `trpc-nextjs`, `nextjs-folder-structure` e `software-testing`

## Veredito: REPROVADO

Uma parada normal do serviço (SIGINT ou SIGTERM) encerra as sessões ativas em vez de deixá-las "Interrompida" e retomáveis, o que contradiz a REQ-076 e o cenário US-10.1. Há ainda um requisito parcial (REQ-063), um teste atribuído ausente (V-28e), um defeito de desenho nos e2e e violações do code-standards.

| Bloqueante | Importante | Menor | Spec a discutir |
|---|---|---|---|
| 1 | 5 | 5 | 4 |

## Verificação executada

| Comando | Saída | Resultado |
|---|---|---|
| `pnpm typecheck` | exit 0 | ✅ |
| `pnpm --dir packages/api test` | exit 0 · 99 arquivos, 654 testes | ✅ |
| `pnpm --dir packages/api test:integration` | exit 0 · 109 arquivos passam, 2 ignorados · 616 testes passam, 4 ignorados (o smoke com o Claude real é opt-in) | ✅ |
| `pnpm --dir apps/web test` | exit 0 · 83 arquivos, 416 testes | ✅ |
| `pnpm lint` | exit 0 (só o `apps/web` tem lint) | ✅ |
| `pnpm build` | exit 0 · "Compiled successfully" | ✅ |
| `scan_diff.py --worktree --max-lines 100` | 245 arquivos; dica de arquivos longos: spike (`lib.ts` 195, `lifecycle.ts` 106) e `schema.ts` 130 (este já passava de 100 antes, só ganhou uma linha); sem `comment-added`; 2 `hollow-assertion` (ambas acompanhadas de asserção forte, descartadas); 11 `placeholder` (todas `test.fixme` ou texto de doc); 1 `mock-in-source` (só o nome da variável de ambiente); 1 `secret-like` (fixture de teste `sk-teste`) | — |
| Medição própria do code-standards (AST sobre os 215 arquivos `.ts`/`.tsx` alterados) | funções acima de 30 linhas, mais de 3 parâmetros, `if` em sequência, linhas em branco | veja I-5 |
| e2e (`playwright test` dos 3 specs, rodado antes desta revisão, banco descartável) | 2 passaram (E2E-010 e E2E-011), 4 `test.fixme` | **não** prova a jornada |
| Smoke com o Claude real (4 testes, opt-in), rodado antes desta revisão | 4 passaram em 105 s | ✅ pelas procedures, ❌ pela UI |

Não executei de novo o smoke com o Claude real nem o e2e: confio nos registros de execução, que conferem com os arquivos de teste.

## Conformidade com a spec

| Item | Status | Evidência |
|---|---|---|
| REQ-051 (sem janela de terminal) | ✅ | `terminalSessionController.ts` só grava a sessão; `terminal-open.test.ts` confere linha, `prompt.md` e ausência de `privado/` |
| REQ-052 / 7.11 (modos) | ✅ | `PermissionModeField.tsx`; `TerminalLaunchMode.test.tsx` (V-29a); `agentSdkQueryOptions.test.ts` (V-24h) |
| REQ-053 (serviço fora do ar) | ✅ | `terminal-open-service.test.ts` (V-29c, limites de 14,999 s e 15 s); `TerminalLaunchMode.test.tsx` (V-29d) |
| REQ-054 (falha ao abrir) | ✅ | `agentSdkSession.ts` (erro de autenticação antes de texto vira `failed`); `session-supervisor-start.test.ts` (V-24g) |
| REQ-055 / REQ-061 (conversa em ordem, histórico) | ✅ | `sessionTimelineMerge.ts`; `ExecutionStageSessions.test.tsx` |
| REQ-056 (sem raciocínio, saída, subagentes) | ✅ | `assistantTextFilter.ts`; `session-recorder.test.ts` V-27a, com mutação conferida |
| REQ-057 / NFR-10 (latência) | 🟡 | Desenho coerente (poll de 1,5 s e ciclo de 1 s); nenhum teste mede os 3 s e os 2 s |
| REQ-058, REQ-059, REQ-060 (mensagem) | ✅ | `session-send.test.ts` (V-23d, V-23g); `SessionComposer.test.tsx` |
| REQ-062 (exclusão) | ✅ | `deletionPurge.ts`; `issue-deletion-terminal.test.ts` V-27d |
| REQ-063 (perguntas) | 🟡 | `QuestionField.tsx:13` só mostra o texto da pergunta; o título curto (`header`) nunca é exibido (nenhum uso de `.header` em `apps/web`); ver I-1 |
| REQ-064, REQ-065, REQ-066 | ✅ | `QuestionRequestCard.test.tsx` (V-28a, V-28b); `questionAnswerValidation.test.ts` |
| REQ-067, REQ-068 | ✅ | `session-answer.test.ts` (V-23f); `session-requests.test.ts` (V-24f, ver M-3) |
| REQ-069, REQ-070 | ✅ | `permissionRequestSummarizer.test.ts`; `PermissionRequestCard.test.tsx` (V-28d) |
| REQ-071 (Permitir sempre) | 🟡 | Funciona com o arquivo não versionado (smoke V-31b); com `settings.local.json` versionado o Claude Code não grava (S-1) |
| REQ-072 (Tudo liberado sem aprovação) | ✅ | `sessionRequestBroker.ts:23`; `session-requests.test.ts` V-24e |
| REQ-073, REQ-074, REQ-075 | ✅ | `sessionControls.ts`; `session-controls.test.ts` (V-25a, V-25b, V-25c); `SessionControls.test.tsx` |
| **REQ-076 (serviço para → Interrompida)** | ❌ | Só vale para queda abrupta. Na parada normal o `closeAll()` encerra as sessões (B-1) |
| REQ-077, REQ-078, REQ-079, B-23 | ✅ | `session-resume.test.ts` (V-26c, V-26d x3); `session-recovery.test.ts` (V-26e); mutação conferida |
| REQ-080, B-22 | ✅ | `sessionControlAuthorization.ts`; `session-send.test.ts` (V-23a a V-23c); `SessionConversation.test.tsx` (V-28g) |
| REQ-081 (Não confirmada) | ✅ | `session-runtime-read.test.ts` (V-21e); `ExecutionStageSessions.test.tsx` |
| REQ-082 (sem "Sem sinal desde") | ✅ | `terminalExecutionReader.ts`; `session-runtime-read.test.ts` (V-21d) |
| NFR-11 (falha de gravação; órfãs em 30 s) | ✅ | `session-recorder.test.ts` (V-27f); `OrphanRecoveryStep` roda no primeiro ciclo |
| NFR-12 (só a máquina, sem shell, sem porta) | ✅ | `host_id` com usuário; `agentSdkQueryOptions.ts` (env filtrado); nenhum `listen` novo |
| NFR-13, NFR-14 | ✅ | `SessionConversation.test.tsx` (região `aria-live`); `SessionComposer.test.tsx` (Ctrl+Enter) |
| US-06 a US-09 (cenários de aceite) | ✅ | Cobertos pelos testes acima e pelo smoke V-31a, V-31b, V-31c |
| **US-10.1 (reinício → "Interrompida")** | 🟡 | Certo para queda abrupta (V-31c com `SIGKILL`); errado para a parada normal (B-1) |
| US-10.2, US-10.3 | ✅ | `session-resume.test.ts` |
| B-24, B-25, B-27 a B-31 | ✅ | `session-recorder.test.ts`; `v20-spike.md` (V-20j); `session-controls.test.ts` (B-30); `session-timeline-access.test.ts` (B-28) |
| B-26 | 🔀 | A spec diz que a regra é gravada mesmo com o arquivo versionado; o Claude Code não grava (S-1) |
| Não muda §9 (prompt, anexos, skills) | ✅ | `terminal-open-attachments.test.ts`, `terminal-execution-flow.test.ts`; `git status` sem mudança em `src/infra/agents/` nem no route handler de eventos |
| Não muda §9 (eventos, captura, REQ-014, trava) | ✅ | `artifact-capture*` e `terminal-event-route*` passam; `terminal-open-guards.test.ts`, `terminal-open-additional.test.ts` |
| DEC-15, DEC-16, DEC-17, DEC-19, DEC-21 | ✅ | `agentSdkSession.ts`; `package.json` (`dev` sem `watch`); tabelas em `0048_session_interaction.sql` |
| DEC-18 (hooks por callback) | 🔀 | Três dos seis hooks chegam; `SessionStart` e `SessionEnd` são sintetizados (V-20h), e a spec foi atualizada |
| DEC-20 (modos) | ✅ | Plano A confirmado no spike |
| §14 modelo de dados | ✅ | `0048_session_interaction.sql`, com dois índices parciais a mais (justificados no registro da 02.1) |
| §15 contrato | 🔀 | `timeline` devolve também as entradas que mudaram depois do cursor; a §15 não descreve isso (S-3) |
| Fora de escopo / sugestões | ✅ | Nenhuma sugestão da seção "Sugestões fora do escopo" foi implementada |
| §24 definição de pronto | ❌ | O e2e `session-conversation.spec.ts` está `test.fixme` (não passa) e o smoke V-31 não foi feito pela UI |
| V-30a, V-30b, V-32g (e2e) | ❌ | `test.fixme` (`session-conversation.spec.ts:37,62`, `terminal-execution.spec.ts:75`); declarado honestamente no registro da 07 |
| V-31a, V-31b, V-31c | 🟡 | Provados pelas procedures com o Claude real; a UI não foi vista |
| V-28e ("Não entregue") | 🟡 | `SessionEntry.tsx:24` mostra o rótulo, mas nenhum teste do `apps/web` o afirma |
| Demais V-20 a V-29 e V-32a a V-32f | ✅ | Testes de mesmo nome conferidos no repositório |

## Regras do projeto

| Regra (fonte) | Status | Evidência |
|---|---|---|
| Sem comentários (`code-standards.md` › Comments) | ✅ | Scanner sem `comment-added` |
| `.ts` com até 100 linhas (`code-standards.md:37`) | ❌ | `spike/lib.ts` 195 linhas, `spike/lifecycle.ts` 106. Os arquivos do produto e os testes estão dentro do limite (`schema.ts`, 130, é anterior) |
| Funções até 30 linhas (`code-standards.md:80`) | ❌ | `useSessionTimeline.ts:8` (36 linhas) |
| Até 3 parâmetros (`code-standards.md:152`) | ❌ | `sessionTimelineQueries.ts:37,43,49` (`changedMessages`, `changedRequests`, `changedEvents`, 4 parâmetros) |
| Até 3 `if` encadeados (`code-standards.md:119`) | ❌ | `scriptedSessionRunner.ts:65-74` (7 `if` em sequência) |
| Sem linhas em branco dentro de funções | ✅ | A medição só achou casos em `describe` de testes, que não são funções no sentido da regra |
| Números e strings mágicos | ✅ | Limites e textos em constantes; o que sobrou são discriminantes de união, como no código já existente |
| Sem dados sensíveis no código | ✅ | `secret-like` era fixture |
| Camadas (`layered-backend`) | ✅ | Procedures só com auth, entrada e uma chamada; composição fora; erros mapeados no controller |
| tRPC (`trpc-nextjs`) | ✅ | Identidade vem do `ctx`; erros mapeados em `taskErrorMapper`; entrada em `schemas/session.ts` |
| Estrutura do frontend (`nextjs-folder-structure`) | ✅ | Tudo em `features/issues/assigned-work`; sem importação entre features irmãs |
| Skills mandatórias de teste (`software-testing`) | 🟡 | Boa parte com fronteira real; ver I-3, I-4 e M-3 |
| e2e independentes (`e2e-testing.md:43`) | ❌ | I-2 |
| Verificação proporcional (`AGENTS.md`) | ✅ | Suítes completas só no fim; sem aumento de `testTimeout` (os testes reais têm prazo próprio, opt-in) |
| Interface em português do Brasil | ✅ | Textos conferidos com a spec |
| Processo (sem commit, sem PR) | ✅ | `git status`: nada commitado |

## Achados

### B-1 (Bloqueante) · task_04 (04.3, 04.4) e task_05 (05.3) — parar o serviço normalmente encerra as sessões ativas
- **Onde:** `packages/api/src/infra/sessionWorkerComposition.ts:49` — "`input.registry.closeAll()`" no `finally` do `runWorker`; `agentSdkSession.ts:38-43` (`close()` põe `closing = true`) e `:97` (`if (outcome.kind === "ended" …) onHook(sessionEndHook(…))`); `scriptedSessionRunner.ts:38-44` (o mesmo); `cli/terminalSessionsWorker.ts:11` — `process.exit(0)` logo depois.
- **Contra:** REQ-076, US-10.1, 7.2 (qualquer estado não final → Interrompida quando o serviço cai), §21.
- **Problema:**
  - No SIGINT ou SIGTERM (o fim normal de `pnpm dev`, o caminho mais comum de reinício), o serviço fecha cada handle com o mesmo `close()` que serve ao botão "Encerrar".
  - Isso sintetiza o `SessionEnd`, que chega ao ingestor e leva a sessão a "Encerrada", com captura de artefatos.
  - A pessoa perde a retomada da conversa, que era o objetivo da US-10.
  - Como o CLI sai logo depois, a gravação pode ser cortada no meio, e o resultado vira uma corrida: às vezes "Encerrada", às vezes "Em andamento" que só vira "Interrompida" no próximo ciclo.
  - O registro da 04.2 até relata que o `close()` "terminou com `ended`" no teste ao vivo, o que é exatamente esse comportamento.
  - Nenhum teste cobre o caso: o V-26 simula o reinício com um segundo worker sem parar o primeiro, e o V-31c mata o processo com `SIGKILL`.
  - **Evidência:** lida do código; no smoke, `closeAll()` produziu `[session] exited … kind=ended` e uma captura de artefatos (a chamada à captura aparece no log). Não rodei um teste dedicado da parada normal.
- **Correção esperada:** parar o serviço (SIGINT ou SIGTERM) deve deixar as sessões ativas como estão no banco: os processos do Claude são encerrados sem sintetizar `SessionEnd` nem marcar `ended`, e o próximo serviço as leva a "Interrompida" (REQ-076). O botão "Encerrar" continua usando o `close()` atual. O desligamento deve esperar as gravações pendentes ou ser insensível a elas.

### I-1 (Importante) · task_06 (06.3) — REQ-063: o título curto e o tipo de escolha não aparecem
- **Onde:** `apps/web/src/features/issues/assigned-work/components/QuestionField.tsx:13` — `<legend …>{question.question}</legend>`; nenhum uso de `question.header` no `apps/web`; o tipo de escolha só aparece pelo controle (botão de opção ou caixa).
- **Contra:** REQ-063 ("cada uma com o título curto, o texto, as opções … e o tipo de escolha (única ou múltipla)"), 7.9, `task_06.md` (Requisitos).
- **Problema:** o cartão omite um dos campos exigidos e não diz em palavras se a escolha é única ou múltipla. Os testes V-28a e V-28b passam porque só conferem texto, opções e envio.
- **Correção esperada:** o cartão mostra o `header` de cada pergunta e indica "uma opção" ou "várias opções"; teste que afirme os dois.

### I-2 (Importante) · task_07 (07.1) — e2e compartilham um arquivo de roteiro global e rodam em paralelo
- **Onde:** `apps/web/playwright.config.ts:15` (`fullyParallel: true`); `writeSessionScript` em `session-conversation.spec.ts:43,69`, `terminal-execution.spec.ts:81` e `terminal-tracking.spec.ts:41`; só `session-conversation.spec.ts:10` declara `serial`, e isso vale apenas dentro do arquivo.
- **Contra:** `.agents/rules/e2e-testing.md` §2 (cada teste independente, sem depender de estado de outro).
- **Problema:** o runtime lê o mesmo `session-script.json` a cada sessão. Dois specs em paralelo (V-30a e V-19, por exemplo) sobrescrevem o roteiro um do outro, e o resultado depende da ordem. Hoje isso fica escondido pelos `test.fixme`; ao reativar, os testes ficam instáveis.
- **Correção esperada:** o roteiro de cada teste é isolado (escolhido por sessão ou por tarefa), sem um arquivo global compartilhado entre workers.

### I-3 (Importante) · task_06 (06.5) — teste atribuído ausente: "Não entregue"
- **Onde:** `SessionEntry.tsx:24` exibe `UNDELIVERED_LABEL`; nenhum teste do `apps/web` afirma "Não entregue" (só "Na fila", em `SessionConversation.test.tsx`).
- **Contra:** V-28e em `task_06.md` ("com `undelivered: true` → 'Não entregue'"), REQ-078, US-10.3.
- **Problema:** o caso que mostra à pessoa que a mensagem não foi entregue após a retomada falha só no servidor.
- **Correção esperada:** teste de componente com uma mensagem `undelivered: true` que mostra o rótulo e não mostra "Na fila".

### I-4 (Importante) · task_01, task_04 e task_05 — pendências abertas da definição de pronto
- **Onde:** `task_07.md` (07.3 aberta); `session-conversation.spec.ts` e demais e2e em `test.fixme`.
- **Contra:** `spec.md` §24 (e2e `session-conversation.spec.ts` passando; "Smoke V-31 feito uma vez pela UI").
- **Problema:** a feature declara "Implementada" na spec, mas a jornada e2e nunca rodou, e a UI nunca foi vista com o Claude real. As causas são externas e foram declaradas no registro (GitHub controlado; `workSeed.approvedWork` quebrado no esquema atual), e a tarefa 07 não foi marcada concluída.
- **Correção esperada:** corrigir o `workSeed` e fornecer GitHub e quadro controlados, ou o usuário aceitar explicitamente a mesma exceção que a Spec B registrou (P-G). Fazer a passada manual do V-31 pela UI.

### I-5 (Importante) · task_01, task_04 e task_06 — violações do code-standards
- **Onde:**
  - `docs/specs/sessao-no-flow-dev/spike/lib.ts` (195 linhas) e `lifecycle.ts` (106);
  - `apps/web/…/hooks/useSessionTimeline.ts:8` (36 linhas);
  - `packages/api/…/sessionTimelineQueries.ts:37,43,49` (4 parâmetros);
  - `packages/api/…/scriptedSessionRunner.ts:65-74` (7 `if` em sequência).
- **Contra:** `code-standards.md` (File Size, Function and Method Size, Parameters, Conditionals).
- **Problema:** a regra vale para todo código novo; o spike não está isento no `AGENTS.md`, e os registros afirmam "nenhum arquivo novo passa de 100 linhas".
- **Correção esperada:** dividir o spike em arquivos de até 100 linhas; extrair o `useEffect` do hook para um helper; passar `{ sessionId, since, limit }` como objeto; trocar a sequência de `if` do runner por uma tabela de passos.

### M-1 (Menor) — peças de teste dentro do código de produção
`InflightTracker` e `worker.idle()` (`sessionWorkerParts.ts`, `sessionWorkerComposition.ts`) e `WorkerOverrides.messages` existem só para os testes; a §13 da spec não os prevê.

### M-2 (Menor) — mapa de leituras sem limite
`SessionTimelineController.readChecks` (`sessionTimelineController.ts:24`) guarda uma entrada por pessoa e projeto e nunca remove nenhuma.

### M-3 (Menor) · task_05 (05.1) — o V-24f não consegue provar "sem prazo"
`session-requests.test.ts:72` avança um relógio injetado que o broker nunca lê. Um prazo real implementado com `setTimeout` passaria no teste. A prova real do "sem prazo" é o V-20i (30 minutos reais, no spike). Usar timers falsos no teste daria a prova também no produto.

### M-4 (Menor) — testes alheios à feature alterados
`AgentSettings.test.tsx`, `ProjectSettings.test.tsx` (esperavam só "Salvar pasta") e `localCheckoutPicker.test.ts` (cast de tipo) já falhavam antes e foram ajustados. A mudança é justificada e registrada, mas está fora do escopo da spec.

### M-5 (Menor) — DESIGN.md sem os novos blocos
Os cartões de pergunta e de aprovação (borda âmbar de 2 px, `rounded-xl`) não estão descritos no `DESIGN.md`, que diz que "na thread, só o draft e o composer têm caixa".

## Atualizações de spec a discutir
- **S-1 (B-26 e REQ-071):** com `.claude/settings.local.json` versionado, o Claude Code 2.1.330 não grava "Permitir sempre", e a tela não avisa a pessoa de que a regra não foi salva. A spec já foi editada pelo implementador (linha B-26 e Histórico). Decidir se isso basta, se a tela deve avisar, ou se o serviço deve gravar a regra.
- **S-2 (§24 e e2e):** a definição de pronto exige o e2e passando, mas o GitHub controlado não existe. Decidir entre aceitar o `test.fixme` (como a Spec B fez no P-G) e investir em fixtures controladas.
- **S-3 (§15):** o contrato da `timeline` devolve entradas que mudaram depois do cursor, e quem não vê o projeto recebe `NOT_FOUND`, não `FORBIDDEN` (V-27e). Atualizar a §15 e o V-27e.
- **S-4 (cópia):** a mensagem de `terminal_disabled` ainda diz "abertura no terminal" (a Q-01 e o V-03l a fixam). Decidir se o texto muda.

## Divergências entre o relatório do implementador e a evidência
- O registro da 04.2 relata o teste ao vivo como bem-sucedido ("o `close()` terminou com `ended`"). Esse mesmo comportamento, na parada do serviço, é o defeito B-1; o relato não o tratou como risco.
- Os registros das tarefas 02 a 06 dizem "nenhum arquivo novo passa de 100 linhas". Vale para `packages/` e `apps/`; os arquivos do spike (tarefa 01) passam (I-5).
- Fora isso, nenhum registro afirma algo que a evidência contradiga; a 07 declara com clareza o que está `fixme` e o que falta.

## Prompt de correção

> Corrija, nesta ordem, sem alterar nada fora do listado. Não marque tarefa como `completed` nem mini-tarefa como `[x]` sem a saída dos comandos no final.
> 1. **B-1 — task_04 e task_05** — `packages/api/src/infra/sessionWorkerComposition.ts`, `agentSdkSession.ts`, `scriptedSessionRunner.ts`, `application/terminal/claudeSessionRuntime.ts`, `cli/terminalSessionsWorker.ts`. Parar o serviço (SIGINT e SIGTERM) não pode encerrar as sessões: os processos do Claude morrem sem `SessionEnd` sintetizado e sem `ended`, e o próximo serviço leva as sessões a "Interrompida" (REQ-076, US-10.1). O botão "Encerrar" continua como está. Testes: (a) integração que roda `worker.run` com sessões em "Em andamento" e em "Precisa de você", aborta e confere que continuam não finais e sem `ended_at`; (b) um segundo worker as marca "Interrompida" com a nota e cancela o pedido pendente. Aguarde as gravações pendentes antes de `process.exit`.
> 2. **I-1 — task_06 (06.3)** — `QuestionField.tsx`, `questionAnswerModel.ts` se preciso. Mostrar o `header` e o tipo de escolha ("uma opção" ou "várias opções") em cada pergunta (REQ-063). Teste em `QuestionRequestCard.test.tsx`.
> 3. **I-3 — task_06 (06.5)** — teste de componente em `SessionConversation.test.tsx` (ou arquivo novo) para uma mensagem `undelivered: true`: aparece "Não entregue", não aparece "Na fila" (V-28e).
> 4. **I-2 — task_07 (07.1)** — `apps/web/e2e/fixtures/sessionScript.ts`, `sessionWorkerSetup.ts`, `playwright.config.ts`, `terminal-execution.spec.ts`, `terminal-tracking.spec.ts`, `session-conversation.spec.ts`. O roteiro de cada teste deve ser isolado (por tarefa ou por sessão), sem arquivo global compartilhado entre workers (`e2e-testing.md` §2).
> 5. **I-5 — task_01, task_04 e task_06** — dividir `spike/lib.ts` e `spike/lifecycle.ts` em arquivos de até 100 linhas; encurtar `useSessionTimeline` para até 30 linhas; passar um objeto em `changedMessages`, `changedRequests` e `changedEvents`; substituir a sequência de `if` em `ScriptedSessionRunner.execute` por uma tabela de passos.
> 6. **M-3 — task_05 (05.1)** — o V-24f deve usar timers falsos (ou outro modo de provar a ausência de prazo real).
> 7. **I-4 — task_07 (07.3)** — com a pessoa: a passada manual do V-31 pela UI e a decisão sobre os e2e (S-2). Só depois marcar a 07.3.
>
> Restrições: arquivos `.ts` com até 100 linhas, funções com até 30 linhas, até 3 parâmetros, sem comentários, sem novas dependências, textos da spec em português.
> Ao terminar, rode e mostre a saída de: `pnpm typecheck`, `pnpm --dir packages/api test`, `pnpm --dir packages/api test:integration`, `pnpm --dir apps/web test`, `pnpm lint` e `pnpm build`.
