---
status: completed
title: "Tela: etapa Revisão"
type: frontend
complexity: high
---

# Task 07: Tela: etapa Revisão

## Visão geral
Entrega a etapa "Revisão" na tela do trabalho: a aba depois de "Tarefas", o formulário com Revisão e Execução, o início (com as confirmações de parcial e de sessões abertas), o estado do ciclo com a rodada e a etapa, a lista de rodadas com o link para o relatório, a conversa da sessão da vez e as ações de cada estado. A tela relê `tasks.review.get` a cada 3 s enquanto o ciclo não termina. Só consome o contrato da 04; pode rodar em paralelo com 05 e 06.

<critical>
- LEIA a spec (§5 US-01, US-03, US-04, US-05; REQ-001–003, REQ-005, REQ-030, REQ-033–035, REQ-038–039; §7.1, §7.2, §7.4; NFR-01, NFR-05) e as regras do projeto (AGENTS.md/CLAUDE.md, `apps/web/AGENTS.md`, `apps/web/DESIGN.md`, `.agents/rules/code-standards.md`) antes de começar. Use as skills `nextjs-folder-structure` e `trpc-nextjs` (consumo no cliente). Leia o guia do Next em `apps/web/node_modules/next/dist/docs/` antes de escrever código.
- FAÇA UMA MINI-TAREFA POR VEZ, na ordem. Só marque `[x]` depois de rodar o "Pronto quando" dela e ver passar.
- NÃO saia dos arquivos listados sem registrar o motivo no Registro de execução. Nada fora do escopo da spec.
- TESTES JUNTO COM O CÓDIGO: cada mini-tarefa implementa os testes atribuídos a ela, seguindo a skill de testes do projeto (`.claude/skills/software-testing/SKILL.md`). Isso quer dizer: asserção sobre o efeito observável e específico, nada de `toBeTruthy` ou de só checar que não lança exceção; valor esperado tirado da spec, nunca recalculado a partir do código; dublês só em dependências lentas, variáveis ou externas; relógio e aleatoriedade controlados. Em bug, reproduza antes de corrigir.
- Ao começar, mude `status` para `in_progress` (aqui e em `_tasks.md`). Mude para `completed` só quando todas as mini-tarefas estiverem marcadas e os critérios de sucesso tiverem sido comprovados por comando. A revisão contra a spec acontece uma vez, depois de todas as tarefas: não a espere aqui, mas não marque nada que não tenha prova, porque ela vai conferir.
</critical>

## Requisitos
- REQ-001: ONDE o trabalho tiver conjunto legível, a aba "Revisão" DEVE aparecer depois de "Tarefas", para operadora e membros.
- REQ-002 / REQ-003: sem ciclo não final, a operadora DEVE ver "Revisão" e "Execução" (agente, modelo, esforço) preenchidos com `defaults` e "Iniciar revisão".
- REQ-005 / REQ-006 / REQ-010: com tarefas faltando, "Iniciar revisão" desabilitado com "Faltam {k} de {n} tarefas" e "Revisar mesmo assim" com a confirmação de parcial; com sessões abertas, a confirmação de §7.4 antes de criar.
- REQ-030: exatamente as ações de §7.1 por estado; "Parar revisão" com a confirmação de §7.4.
- REQ-031 / §2: membros veem a etapa sem controles; sem ciclo, "A revisão ainda não começou.".
- REQ-032: recusa `review_cycle_changed` mostra "A revisão mudou. Veja o estado atual." e relê; `review_cycle_active` mostra "Já existe uma revisão em andamento neste trabalho.".
- REQ-033: estado (§7.4), rodada e etapa atuais, as duas escolhas, a marca "Parcial" e as rodadas da mais recente para a mais antiga, com veredito e link que abre o relatório no visualizador de artefatos.
- REQ-034: com sessão da vez, a conversa dela na etapa, com as permissões da aba Execução.
- REQ-035 / NFR-01: relê a cada 3 s enquanto o ciclo não é final e logo depois de cada ação; com `pendingAction`, mostra "Aplicando…".
- REQ-038: com ciclo não final, a tela abre na aba Revisão (antes da regra de sessão ativa).
- REQ-039 / §7.2: estado da aba pela tabela de §7.2; para membros, "Aguardando a pessoa operadora".
- NFR-05: controles com rótulo e foco visível, por teclado; confirmações no padrão da tela; mudanças de etapa e veredito anunciadas com `aria-live="polite"`.
- §9: as sessões do ciclo continuam no histórico da aba Execução.

## Interfaces
- **Consome:** `trpc.tasks.review.get/start/request` e os tipos `ReviewCycleView`, `ReviewRoundView`, `ReviewStep` (04, §15); `AgentChoiceField`/`AgentSelect` e `agentChoiceCopy.ts`; `SessionConversation`; `ArtifactViewer`/`useArtifactViewer`; `StageTabs`, `stageTabs.ts`; `TerminalSessionConfirm`/`SessionEndConfirm` como padrão de confirmação; `TASK_SET_POLL_MS` só como padrão (o intervalo aqui é 3 s).
- **Produz** (em `apps/web/src/features/issues/assigned-work/`):
  - `reviewContract.ts` (tipos inferidos do router), `reviewClient.ts` (`fetchReview`, `startReview`, `requestReviewAction`), `reviewCopy.ts` (textos de §7.4), `reviewModel.ts` (`reviewTabState`, `reviewHeadline`, `reviewActions`, `reviewIsFinal`), `REVIEW_POLL_MS = 3_000`.
  - `hooks/useReviewStage.ts`: `{ view, failure, read, start, request }`.
  - `components/ReviewStage.tsx`, `ReviewStartForm.tsx`, `ReviewCycleStatus.tsx`, `ReviewRoundList.tsx`, `ReviewActions.tsx`, `ReviewConfirm.tsx`, `ReviewConversation.tsx`.
  - `REVIEW_TAB_ID = "review"`, `REVIEW_TAB_LABEL = "Revisão"` em `stageTabs.ts`; `hooks/useReviewTab.tsx` devolvendo `{ tab: StageTab | null; open: boolean }`.

## Mini-tarefas

- [x] **07.1 — Contrato, cliente, textos e modelo**
  - **Arquivos:** `reviewContract.ts`, `reviewClient.ts`, `reviewCopy.ts`, `reviewModel.ts`, `reviewModel.test.ts` (criar), `stageTabs.ts` (alterar)
  - **Testes:** V-12b, V-11f
  - **Pronto quando:** `pnpm --dir apps/web exec vitest run src/features/issues/assigned-work/reviewModel.test.ts` passa
- [x] **07.2 — Leitura periódica (`useReviewStage`)**
  - **Arquivos:** `hooks/useReviewStage.ts` (criar), `hooks/useReviewStage.test.tsx` (criar)
  - **Testes:** V-09a, V-09b, V-09c, V-09d
  - **Pronto quando:** `pnpm --dir apps/web exec vitest run src/features/issues/assigned-work/hooks/useReviewStage.test.tsx` passa
- [x] **07.3 — Formulário de início e confirmações**
  - **Arquivos:** `components/ReviewStartForm.tsx`, `components/ReviewConfirm.tsx` (criar), `components/ReviewStartForm.test.tsx` (criar)
  - **Testes:** V-11h, V-11b
  - **Pronto quando:** `pnpm --dir apps/web exec vitest run src/features/issues/assigned-work/components/ReviewStartForm.test.tsx` passa
- [x] **07.4 — Estado, rodadas, ações e conversa da sessão da vez**
  - **Arquivos:** `components/ReviewStage.tsx`, `ReviewCycleStatus.tsx`, `ReviewRoundList.tsx`, `ReviewActions.tsx`, `ReviewConversation.tsx` (criar), `components/ReviewStage.test.tsx` (criar)
  - **Testes:** V-11a, V-11c, V-11d, V-11e, V-11g
  - **Pronto quando:** `pnpm --dir apps/web exec vitest run src/features/issues/assigned-work/components/ReviewStage.test.tsx` passa
- [x] **07.5 — Aba nas etapas, aba inicial e histórico de Execução**
  - **Arquivos:** `hooks/useReviewTab.tsx` (criar), `components/OperatorStages.tsx` (alterar), `components/OperatorStages.test.tsx` (alterar), mapeamentos de finalidade da aba Execução que o typecheck apontar (alterar), `components/ExecutionHistory.test.tsx` (alterar)
  - **Testes:** V-12a, V-12c, V-13f
  - **Pronto quando:** `pnpm --dir apps/web exec vitest run src/features/issues/assigned-work/components/OperatorStages.test.tsx src/features/issues/assigned-work/components/ExecutionHistory.test.tsx` passa; `pnpm --dir apps/web typecheck` sem erros

## Detalhes de implementação
- Espelhe a etapa Tarefas: `useTasksTab.tsx` (aba como hook), `usePlanView.ts` (leitura com `setTimeout` encadeado e erro padrão), `planClient.ts`, `planCopy.ts`, `TasksStage.tsx`. Carregamento e erro de leitura seguem a etapa Tarefas (§7.4, última linha).
- O estado "Aguardando você" de §7.2 com ciclo `reviewing`/`executing` depende de a sessão da vez ter pergunta ou permissão pendente: use o `sessionStatus` de `view.step` e o mesmo critério de pendência que a aba Execução já usa (`executionModel.ts`).
- `reviewHeadline` devolve os textos de §7.4: "Rodada {n} · Revisando com {escolha}", "Rodada {n} · Executando com {escolha}", "Rodada {n} · Aguardando sua resposta na conversa" (membro: "Rodada {n} · Aguardando a pessoa operadora"), e os estados finais e de espera. `{escolha}` usa o formato de `agentChoiceCopy.ts` ("Claude Code · Opus · Máximo").
- O link da rodada abre o relatório (`reportArtifactId`) no visualizador de artefatos existente, sem navegar para outra página.
- A conversa da sessão da vez reusa `SessionConversation` com as permissões que a aba Execução passa (REQ-034).
- `start` gera a `requestKey` uma vez por tentativa de início (como `useTerminalLaunch`), envia `partial` e `allowOpenSessions` conforme as confirmações e, se receber `review_sessions_open`, abre a confirmação de sessões abertas com a contagem e reenvia com `allowOpenSessions: true`.
- REQ-038: em `OperatorStages.initialTabId`, a regra "ciclo não final → Revisão" vem antes de "sessão ativa → Execução".

### Arquivos relevantes
- `components/OperatorStages.tsx`, `stageTabs.ts`, `hooks/useTasksTab.tsx`, `components/StageTabs.tsx`: abas.
- `hooks/usePlanView.ts`, `planClient.ts`, `planCopy.ts`: leitura periódica e erro.
- `components/AgentChoiceField.tsx`, `agentChoiceCopy.ts`: escolha de agente, modelo e esforço.
- `components/SessionConversation.tsx`, `ExecutionStage.tsx`, `executionModel.ts`: conversa e pendências.
- `components/ArtifactViewer.tsx`, `hooks/useArtifactViewer.ts`: visualizador.
- `components/TerminalSessionConfirm.tsx`, `SessionEndConfirm.tsx`: padrão de confirmação.
- `apps/web/src/test/`: utilitários de teste de componentes.

### Arquivos afetados
- `OperatorStages.tsx`: aba Revisão e aba inicial.
- `stageTabs.ts`: id, rótulo e estado da aba.

### Decisões relacionadas
- DEC-03 (spec §17): sem WebSocket; leitura a cada 3 s.
- DEC-07: padrões do último ciclo vêm prontos de `get`.

## Premissas
Nenhuma.

## Testes atribuídos
- [x] V-12b (§7.2, REQ-039): `reviewTabState` → sem ciclo ou último em `stopped`: Pendente; `reviewing`/`executing`: Em andamento; `reviewing` com a sessão da vez aguardando resposta: Aguardando você; `caveats`: Aguardando você; `failed`: Falhou; `approved`/`accepted`: Concluída; rótulo de membro para "Aguardando você" = "Aguardando a pessoa operadora".
- [x] V-11f (§7.4): `reviewHeadline` para rodada 2 `reviewing` com Claude · Opus · Máximo → "Rodada 2 · Revisando com Claude Code · Opus · Máximo"; `executing` → "Rodada 2 · Executando com …"; `approved` → "Aprovada na rodada 2"; `caveats` → "Aprovada com ressalvas na rodada 2. Aceite as ressalvas ou peça mais uma correção."; `accepted` → "Ressalvas aceitas na rodada 2"; `stopped` pela operadora → "Parada por você na rodada 3"; `stopped` por REQ-026 → "Parada na rodada 3: Você não opera mais este trabalho."; `failed` → "Parada por falha na rodada 3: {motivo}".
- [x] V-09a (NFR-01, REQ-035): com ciclo `reviewing` e temporizador falso, `fetchReview` é chamado de novo aos 3 000 ms e aos 6 000 ms; uma mudança para `executing` na segunda resposta aparece no estado do hook · hook + API falsa.
- [x] V-09b: a resposta passa a `approved` → nenhuma chamada nova depois de mais 9 000 ms.
- [x] V-09c: depois de `request` ou `start` resolver, uma leitura acontece imediatamente, sem esperar os 3 s.
- [x] V-09d (US-03 cen. 2): uma leitura falha → `failure` com o texto de erro de leitura da etapa Tarefas; a leitura seguinte devolve o ciclo → `failure` nulo e a visão nova.
- [x] V-11h (US-01 cen. 1–3, REQ-002, REQ-005): sem ciclo, 7 de 7 → "Revisão" e "Execução" com Claude Code · Opus · Máximo e "Iniciar revisão" habilitado; `defaults` com Sonnet · Alto → o campo Revisão vem assim; 5 de 7 → "Iniciar revisão" desabilitado, "Faltam 2 de 7 tarefas" visível e "Revisar mesmo assim" disponível.
- [x] V-11b (§7.4, REQ-006, REQ-010, NFR-05): "Revisar mesmo assim" abre "Faltam 2 de 7 tarefas. A revisão sai marcada como parcial e vale só para o que já foi feito. Revisar mesmo assim?" e, confirmado, chama `start` com `partial: true`; `start` recusado com `review_sessions_open` e contagem 2 → "Há 2 sessões abertas neste trabalho. A revisão pode ver mudanças que elas ainda estão fazendo. Iniciar mesmo assim?" e, confirmado, reenvia com `allowOpenSessions: true`; "Parar revisão" abre "As duas sessões do ciclo serão encerradas. O que elas já mudaram no checkout continua lá. Parar a revisão?"; cada confirmação é operável por teclado (Esc cancela, foco no botão principal).
- [x] V-11a (§7.1, REQ-030): `reviewing`/`executing` → só "Parar revisão"; `caveats` → "Aceitar ressalvas" e "Pedir correção"; `failed` → "Tentar de novo" e "Encerrar revisão"; `approved`/`accepted`/`stopped` → o formulário com "Iniciar revisão"; com `pendingAction` → "Aplicando…" e ações desabilitadas; `review_cycle_changed` numa ação → "A revisão mudou. Veja o estado atual." e nova leitura.
- [x] V-11c (REQ-033): três rodadas → listadas 3, 2, 1, com "Reprovada", "Reprovada", "Aprovada" e um link por relatório que abre o visualizador de artefatos com o `reportArtifactId`; ciclo parcial → marca "Parcial" visível; as duas escolhas visíveis.
- [x] V-11d (REQ-034): `step.sessionId` preenchido → a conversa dessa sessão aparece com as permissões da aba Execução; a vez muda para a outra sessão → a conversa troca.
- [x] V-11e (§2, REQ-031): membro sem ciclo → "A revisão ainda não começou." e nenhum botão; membro com ciclo `caveats` → estado e rodadas visíveis, nenhum botão de ação; membro com pendência → "Rodada {n} · Aguardando a pessoa operadora".
- [x] V-11g (NFR-05): o texto de estado e rodada fica numa região `aria-live="polite"` cujo conteúdo muda de "Rodada 1 · Revisando…" para "Rodada 1 · Executando…" quando a visão muda; todos os botões têm nome acessível e são alcançáveis por Tab.
- [x] V-12a (REQ-001): conjunto legível → abas na ordem Planejamento, Spec, Tarefas, Revisão, Execução no terminal; sem conjunto → sem aba Revisão; membro com conjunto → aba visível.
- [x] V-12c (REQ-038): ciclo `executing` com sessão ativa → a tela abre em Revisão; sem ciclo e com sessão ativa → abre em Execução, como hoje.
- [x] V-13f (§9): sessões com finalidade `review` e `review_execute` aparecem no histórico da aba Execução, com conversa e eventos, como as outras.

## Critérios de sucesso
- Todas as mini-tarefas marcadas, cada uma com o "Pronto quando" executado.
- Todos os testes atribuídos implementados e passando.
- Ao fim da tarefa: `pnpm --dir apps/web test` completo passando uma vez.
- Typecheck e lint de `apps/web` sem erros; nenhuma regra do AGENTS.md violada.

## Registro de execução
<!-- The implementer appends one entry per mini-task: date, what was done, commands run with their result, deviations. -->
- 2026-11-25 · 07.1 concluída: `reviewContract.ts`, `reviewClient.ts`, `reviewCopy.ts`, `reviewModel.ts` (`reviewTabState`, `reviewHeadline`, `reviewActions`, `reviewIsFinal`, `reviewNeedsAnswer`), `reviewFailure.ts` e `REVIEW_TAB_ID`/`REVIEW_TAB_LABEL` em `stageTabs.ts`. V-12b e V-11f passaram. `pnpm --dir apps/web exec vitest run src/features/issues/assigned-work/reviewModel.test.ts` (21 testes passaram). "Pergunta ou permissão pendente" = `step.sessionStatus === "asking"`. Desvios: `src/test/setup.ts` ganhou o mock de `tasks.review`; criados `src/test/review.ts` (fixtures) e `reviewFailure.ts` (classifica as recusas do tRPC).
- 2026-11-25 · 07.2 concluída: `hooks/useReviewStage.ts` com `useReviewPolling.ts` (setTimeout encadeado a `REVIEW_POLL_MS = 3_000`, para quando o ciclo é final) e `useReviewActions.ts` (`start` devolve `started|sessions_open|failed`, `request` devolve a mensagem de erro ou `null`, ambos releem logo depois). V-09a–d passaram: `pnpm --dir apps/web exec vitest run src/features/issues/assigned-work/hooks/useReviewStage.test.tsx` (4 testes). Desvio: o hook foi dividido em três arquivos pelo limite de 30 linhas por função.
- 2026-11-25 · 07.3 concluída: `ReviewStartForm.tsx`, `ReviewConfirm.tsx` e `hooks/useReviewStartFlow.ts` (confirmação de parcial, reenvio com `allowOpenSessions: true` depois de `review_sessions_open`, `requestKey` por tentativa). V-11h e V-11b passaram: `pnpm --dir apps/web exec vitest run src/features/issues/assigned-work/components/ReviewStartForm.test.tsx` (8 testes, incluindo Esc cancela e foco no botão principal). Desvio: `useReviewStartFlow.ts` não estava na lista de arquivos, criado para manter o componente enxuto.
- 2026-11-25 · 07.4 concluída: `ReviewStage.tsx`, `ReviewCycleStatus.tsx` (estado e rodada em `aria-live="polite"`), `ReviewRoundList.tsx` (da mais recente para a mais antiga, link abre o relatório no `ArtifactViewer`), `ReviewActions.tsx`, `ReviewConversation.tsx` (reusa `SessionConversation`; pede `refresh` do detalhe uma vez se a sessão da vez ainda não está nele). V-11a/c/d/e/g passaram: `pnpm --dir apps/web exec vitest run src/features/issues/assigned-work/components/ReviewStage.test.tsx src/features/issues/assigned-work/components/ReviewStageContent.test.tsx` (16 testes). Desvios: os testes foram divididos em dois arquivos mais `src/test/reviewStage.tsx` pelo limite de 100 linhas; "Encerrar revisão" (em `failed`) age sem confirmação, porque a spec (§7.4, REQ-030) só pede confirmação em "Parar revisão".
- 2026-11-25 · 07.5 concluída: `hooks/useReviewTab.tsx` (aba e `open`), `OperatorStages.tsx` (aba Revisão depois de Tarefas para operadora e membros, e a regra "ciclo não final → Revisão" antes de "sessão ativa → Execução"), `useTasksTab.tsx` passou a devolver `readable`. V-12a, V-12c e V-13f passaram: `pnpm --dir apps/web exec vitest run src/features/issues/assigned-work/components/OperatorStages.test.tsx src/features/issues/assigned-work/components/ExecutionHistory.test.tsx` e `pnpm --dir apps/web typecheck` sem erros; nenhum mapeamento de finalidade precisou mudar. Desvio: o teste V-40f existente de `OperatorStages` ganhou "RevisãoPendente" na lista de abas.
- 2026-11-25 · gates da Task 07: `pnpm --dir apps/web test` (113 arquivos, 625 testes passaram) · `pnpm --dir apps/web typecheck` (passou) · `eslint src/features/issues/assigned-work src/test` (sem erros).
- 2026-11-25 · Correção da review-001 (M-2): `useReviewTab` passa o estado de leitura ao `ReviewStage` (prop opcional `stage`), então a aba e o painel fazem uma única leitura a cada 3 s. Teste novo: `hooks/useReviewTab.test.tsx`.
- 2026-11-25 · Correção da review-003: V-12a e V-12c saíram de `OperatorStages.test.tsx` (129 linhas) para `OperatorStagesReview.test.tsx`, com o suporte de montagem em `src/test/operatorStages.tsx`; `OperatorStages.test.tsx` ficou com 83 linhas.
