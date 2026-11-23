---
status: completed
title: Etapa Execução no terminal na tela
type: frontend
complexity: medium
---

# Task 06: Etapa Execução no terminal na tela

## Visão geral
A tela do trabalho ganha a etapa "Execução no terminal": uma aba ao lado de "Planejamento" e uma entrada na linha do tempo. Ela mostra:
- o estado da sessão mais recente;
- os eventos;
- o aviso "Sem sinal desde HH:MM";
- o histórico das sessões anteriores, com os anexos.

Com uma sessão ativa, a tela atualiza a cada 3 s. Quem só lê vê tudo sem ações. A segunda abertura pede confirmação.

<critical>
- LEIA a spec (`spec.md`: US-03, REQ-014, REQ-016, REQ-020, REQ-022 a REQ-024, REQ-034, §7.2, §7.4, §7.5, B-05, B-07, NFR-08, §17 DEC-08) e as regras do projeto (AGENTS.md/CLAUDE.md, `.agents/rules/code-standards.md`, `apps/web/AGENTS.md`, `apps/web/DESIGN.md`). Leia a skill `nextjs-folder-structure`.
- FAÇA UMA MINI-TAREFA POR VEZ, na ordem. Só marque `[x]` depois de rodar o "Pronto quando" dela e ver passar.
- NÃO saia dos arquivos listados sem registrar o motivo no Registro de execução. Nada fora do escopo da spec.
- TESTES JUNTO COM O CÓDIGO: cada mini-tarefa implementa os testes atribuídos a ela.
- Ao começar, mude `status` para `in_progress` (aqui e em `_tasks.md`). Mude para `completed` só quando todas as mini-tarefas estiverem marcadas e os critérios de sucesso tiverem sido comprovados por comando. A revisão contra a spec acontece uma vez, depois de todas as tarefas: não a espere aqui, mas não marque nada que não tenha prova, porque ela vai conferir.
</critical>

## Requisitos
- REQ-016: QUANDO a tarefa tiver ao menos uma sessão, a linha do tempo DEVE mostrar a etapa "Execução no terminal" com o estado da sessão mais recente.
- REQ-020 e DEC-08: um evento registrado aparece em até 5 s; o polling cai para 3 s (`TERMINAL_POLL_MS = 3_000`) enquanto houver uma sessão ativa.
- US-03 (1–4), com os rótulos exatos:
  - "Em andamento";
  - "Aguardando você";
  - "Encerrada", com o horário;
  - "Não confirmada: o Flow Dev não recebeu sinal do Claude. Confira a janela do terminal.";
  - "Abrindo" e "Falhou ao abrir", para os estados da Spec A.
- REQ-022: "Sem sinal desde HH:MM" ao lado do estado, sem mudá-lo.
- REQ-023 (UI): as sessões anteriores aparecem com pessoa, rota, início e fim, e expandem para mostrar os eventos.
- REQ-024 (UI): quem pode ver a tarefa e não é a operadora vê a etapa, os eventos e o histórico, sem nenhuma ação.
- REQ-034 (UI): o histórico de cada sessão lista os anexos com nome, tipo e tamanho, e "disponível até DD/MM" ou "removido".
- REQ-014 (UI): com `session_already_active`, a tela pergunta "Já existe uma sessão aberta para esta tarefa. Abrir outra?". Confirmar reenvia com `allowAdditional: true`; cancelar não abre nada.
- §7.5 e B-07: "N eventos anteriores não exibidos"; "1 evento não registrado" (plural: "N eventos não registrados").
- NFR-08: as mudanças de estado são anunciadas numa região `aria-live="polite"`.
- Não muda (§9): a aba e as ações do Planejamento continuam como estão.

## Interfaces
- **Consome:**
  - da task_05: `TaskDetail["execution"]` (via `RouterOutputs["tasks"]["byId"]`, em `apps/web/src/features/issues/assigned-work/contract.ts`), com o formato do bloco "Produz" da task_05; `tasks.terminal.open` com `allowAdditional` e o erro `session_already_active`;
  - existente:
    - `workPollInterval` (`workState.ts`);
    - `timelineEntries` (`planningModel.ts`);
    - `StageTabs`, `StageTab`, `READER_TAB_STATE_LABELS` (`stageTabs.ts`);
    - `OperatorStages.tsx`;
    - `useTerminalLaunch.ts`;
    - `TerminalLaunchDialog.tsx`;
    - `formatMoment` (`apps/web/src/lib/tasks/formatMoment.ts`);
    - `useDialogFocus` (`apps/web/src/features/issues/hooks/useDialogFocus.ts`).
- **Produz:**
  - `apps/web/src/features/issues/assigned-work/executionModel.ts`:
    - `type ExecutionSession = TaskDetail["execution"]["sessions"][number]`;
    - `latestSession(detail)`;
    - `hasActiveSession(detail)`;
    - `sessionStatusLabel(session, { reader: boolean })`;
    - `eventLabel(event)` (P-C: "Editou <summary>", "Rodou: <summary>", "Skill: <summary>"…);
  - `apps/web/src/features/issues/assigned-work/executionCopy.ts`, com todos os textos desta tarefa;
  - `ExecutionStage({ detail, reader })` em `apps/web/src/features/issues/assigned-work/components/ExecutionStage.tsx`, que a task_07 usa para montar os artefatos (07.3);
  - `EXECUTION_TAB_ID = "execution"` e `EXECUTION_TAB_LABEL = "Execução no terminal"` em `stageTabs.ts`.

## Mini-tarefas

- [x] **06.1 — Polling a 3 s, aba e entrada na linha do tempo**
  - **Arquivos:**
    - alterar `apps/web/src/features/issues/assigned-work/workState.ts`, `apps/web/src/features/issues/assigned-work/stageTabs.ts`, `apps/web/src/features/issues/assigned-work/planningModel.ts` (entrada "Execução no terminal" em `timelineEntries`) e `apps/web/src/features/issues/assigned-work/planningCopy.ts`;
    - criar `apps/web/src/features/issues/assigned-work/executionModel.ts` e `apps/web/src/features/issues/assigned-work/executionCopy.ts`;
    - alterar `apps/web/src/features/issues/assigned-work/components/OperatorStages.tsx` (segunda aba, só com sessão), com o painel provisório `ExecutionStage` mínimo;
    - alterar `apps/web/src/features/issues/assigned-work/workState.test.ts` e `apps/web/src/test/tasks.ts` (fábrica de `execution`);
    - criar `apps/web/src/features/issues/assigned-work/executionModel.test.ts`.
  - **Testes:** V-08k, V-08l
  - **Pronto quando:** `pnpm --dir apps/web exec vitest run src/features/issues/assigned-work/workState.test.ts src/features/issues/assigned-work/executionModel.test.ts src/features/issues/assigned-work/planningCopy.test.ts` passa; `pnpm --dir apps/web typecheck` sem erros.
- [x] **06.2 — `ExecutionStage`: estado, eventos, "sem sinal" e anúncio**
  - **Arquivos:**
    - criar ou completar `apps/web/src/features/issues/assigned-work/components/ExecutionStage.tsx`;
    - criar `apps/web/src/features/issues/assigned-work/components/ExecutionStatus.tsx` (rótulo, horário, "Sem sinal desde" e `aria-live`) e `apps/web/src/features/issues/assigned-work/components/ExecutionEventList.tsx`;
    - alterar `apps/web/src/features/issues/assigned-work/executionCopy.ts`;
    - criar `apps/web/src/features/issues/assigned-work/components/ExecutionStage.test.tsx`.
  - **Testes:** V-08m, V-08n, V-08o, V-08p
  - **Pronto quando:** `pnpm --dir apps/web exec vitest run src/features/issues/assigned-work/components/ExecutionStage.test.tsx` passa.
  - **Nota:** o horário usa `formatMoment` e `<time dateTime>`, como `PlanningTimeline.tsx`. Para leitores, "Aguardando você" vira "Aguardando a pessoa operadora" (P-J).
- [x] **06.3 — Histórico das sessões com anexos, em modo leitura**
  - **Arquivos:**
    - criar `apps/web/src/features/issues/assigned-work/components/ExecutionHistory.tsx` (sessões anteriores em `<details>`/`<summary>`, ou num botão com `aria-expanded`) e `apps/web/src/features/issues/assigned-work/components/SessionAttachmentList.tsx`;
    - alterar `apps/web/src/features/issues/assigned-work/components/ExecutionStage.tsx` e `apps/web/src/features/issues/assigned-work/executionCopy.ts`;
    - criar `apps/web/src/features/issues/assigned-work/components/ExecutionHistory.test.tsx`.
  - **Testes:** V-08q, V-08r
  - **Pronto quando:** `pnpm --dir apps/web exec vitest run src/features/issues/assigned-work/components/ExecutionHistory.test.tsx src/features/issues/assigned-work/components/ExecutionStage.test.tsx` passa.
  - **Nota:** o tamanho usa o formatador que os anexos da Spec A já usam em `AttachmentItem.tsx`. A data "DD/MM" usa `Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" })`.
- [x] **06.4 — Confirmação ao abrir uma segunda sessão**
  - **Arquivos:**
    - alterar `apps/web/src/features/issues/assigned-work/hooks/useTerminalLaunch.ts` (tratar `session_already_active` e `confirmAdditional()`, que reenvia com o mesmo `requestKey` e `allowAdditional: true`);
    - criar `apps/web/src/features/issues/assigned-work/components/TerminalSessionConfirm.tsx`;
    - alterar `apps/web/src/features/issues/assigned-work/components/TerminalLaunchDialog.tsx` e `apps/web/src/features/issues/assigned-work/terminalCopy.ts`;
    - criar `apps/web/src/features/issues/assigned-work/components/TerminalSessionConfirm.test.tsx`.
  - **Testes:** V-08s
  - **Pronto quando:** `pnpm --dir apps/web exec vitest run src/features/issues/assigned-work/components/TerminalSessionConfirm.test.tsx src/features/issues/assigned-work/components/TerminalLaunchConfirm.test.tsx src/features/issues/assigned-work/components/TerminalLaunchDialog.test.tsx` passa; `pnpm --dir apps/web typecheck` sem erros.
  - **Nota:** o reenvio usa o mesmo `requestKey`. Como a recusa da 05.4 não cria sessão, a idempotência da Spec A continua valendo.

## Detalhes de implementação
- **Padrões a espelhar:**
  - abas: `OperatorStages.tsx` e `stageTabs.ts` (`planningTabState`), com um `executionTabState` análogo;
  - linha do tempo: `PlanningTimeline.tsx` e `planningModel.ts`;
  - anúncio: `role="status"` em `PlanningActions.tsx`;
  - confirmação dentro do diálogo: `TerminalLaunchFooter.tsx` e `useDialogFocus`.
- **Estado da aba:**
  - `running` → `current`;
  - `waiting` → `yours`;
  - `ended` → `done`;
  - `unconfirmed` e `launch_failed` → `failed`;
  - `opening` → `current`.
- **Polling:** em `workPollInterval`, a regra da sessão ativa vem antes da regra `IDLE_POLL_MS`. O planejamento em andamento (2 s) continua com prioridade, porque é mais rápido.
- **Visual:** siga `apps/web/DESIGN.md` e os tokens já usados em `PlanningStage.tsx`, sem cores novas.

### Arquivos relevantes
- `apps/web/src/features/issues/assigned-work/components/OperatorStages.tsx`: onde a aba entra; hoje monta só `[lead]`.
- `apps/web/src/features/issues/assigned-work/components/PlanningTimeline.tsx`: `Stop`, `STATE_LABEL`, `formatMoment`.
- `apps/web/src/test/tasks.ts` e `apps/web/src/test/terminal.ts`: fábricas de detalhe e de terminal para os testes.

### Arquivos afetados
- Os listados nas mini-tarefas.

### Decisões relacionadas
- DEC-07 (§17): "Não confirmada" já chega gravado do servidor; "sem sinal" chega em `silentSince`.
- DEC-08 (§17): polling a 3 s no `byId` existente, sem SSE.

## Premissas
- P-C e P-J (`_tasks.md`): a tela monta o verbo do evento a partir do `kind`. Leitores veem "Aguardando a pessoa operadora".
- Os rótulos de evento que a spec não traz literalmente ficam em `executionCopy.ts` para a revisão final:
  - "Sessão iniciada";
  - "Prompt: …";
  - "Skill: …";
  - "Aguardando você";
  - "Pediu atenção: …";
  - "Encerrada: …".

## Testes atribuídos
- [x] V-08k: snapshot com sessão `running`, `waiting`, `opening` ou `unconfirmed` → `workPollInterval` = 3 000; só com sessões `ended` → 15 000; planejamento `in_progress` → 2 000 (REQ-020, DEC-08).
- [x] V-08l: tarefa sem sessão → só a aba "Planejamento", e a linha do tempo sem "Execução no terminal". Com uma sessão `waiting` → aba "Execução no terminal" e uma entrada na linha do tempo com o estado da mais recente (REQ-016).
- [x] V-08m: os rótulos de cada estado:
  - `running` → "Em andamento" (US-03.1);
  - `waiting` → "Aguardando você" (US-03.2);
  - `ended` → "Encerrada", com o horário de `endedAt` (US-03.3);
  - `unconfirmed` → "Não confirmada: o Flow Dev não recebeu sinal do Claude. Confira a janela do terminal." (US-03.4);
  - `opening` → "Abrindo";
  - `launch_failed` → "Falhou ao abrir".
- [x] V-08n: eventos `file_edit` `src/components/LoginButton.tsx` e `command` `pnpm test` → "Editou src/components/LoginButton.tsx" e "Rodou: pnpm test", com horário. `hiddenEvents: 5` → "5 eventos anteriores não exibidos". `droppedEvents: 1` → "1 evento não registrado" (US-03.1, §7.5, B-07).
- [x] V-08o: `silentSince` preenchido → "Sem sinal desde HH:MM" ao lado do rótulo, que não muda; `null` → nenhum aviso (REQ-022, B-05).
- [x] V-08p: o rótulo fica dentro de `aria-live="polite"`. Ao re-renderizar de `running` para `waiting`, o texto da região muda para "Aguardando você" (NFR-08).
- [x] V-08q: com duas sessões anteriores, cada uma mostra pessoa, rota, início e fim. Expandir uma mostra os eventos dela e os anexos ("nota.md · text/markdown · 6 B · disponível até 29/11"; "print.png · image/png · 11 B · removido"). Funciona pelo teclado (Enter/Espaço) (REQ-023, REQ-034).
- [x] V-08r: `reader = true` (membro sem operar) → etapa, eventos e histórico visíveis, sem nenhum botão além dos de expandir. "Aguardando a pessoa operadora" no lugar de "Aguardando você" (REQ-024, §7.4).
- [x] V-08s: `open` devolve `session_already_active` → aparece "Já existe uma sessão aberta para esta tarefa. Abrir outra?" com "Abrir outra" e "Cancelar". "Abrir outra" chama `open` de novo com o mesmo `requestKey` e `allowAdditional: true`; "Cancelar" não chama nada e mantém o diálogo (REQ-014).

## Critérios de sucesso
- Todas as mini-tarefas marcadas, cada uma com o "Pronto quando" executado.
- Todos os testes atribuídos implementados e passando.
- Com uma sessão ativa, a aba mostra estado e eventos, atualizados a cada 3 s; um membro vê o mesmo em modo leitura.
- No fim da tarefa, `pnpm --dir apps/web test` passa.
- `pnpm --dir apps/web typecheck` e `pnpm lint` sem erros; nenhuma regra do AGENTS.md violada.

## Registro de execução
<!-- The implementer appends one entry per mini-task: date, what was done, commands run with their result, deviations. Example:
- 2026-11-22 · 06.1 · polling e aba · `vitest run src/features/issues/assigned-work/workState.test.ts …` → 9 passed · sem desvios -->
- 2026-11-22 · 06.1 · `TERMINAL_POLL_MS`, `EXECUTION_TAB_ID/LABEL`, entrada na linha do tempo (`detail` opcional em `TimelineEntry`), `executionModel`, `executionCopy`, `executionContract`, aba só com sessão · `vitest run src/features/issues/assigned-work/workState.test.ts src/features/issues/assigned-work/executionModel.test.ts src/features/issues/assigned-work/planningCopy.test.ts` → 13 passed (V-08k, V-08l); typecheck sem erros · desvios: fábricas de teste em `src/test/execution.ts` (não em `tasks.ts`) e V-08k em `executionModel.test.ts`; textos de execução em `executionCopy.ts` (não em `planningCopy.ts`)
- 2026-11-22 · 06.2 · `ExecutionStage`, `ExecutionStatus` (`aria-live=polite`), `ExecutionEventList` · `vitest run src/features/issues/assigned-work/components/ExecutionStage.test.tsx` → 9 passed (V-08m a V-08p) · sem desvios
- 2026-11-22 · 06.3 · `ExecutionHistory` (botão com `aria-expanded`), `SessionAttachmentList` · `vitest run src/features/issues/assigned-work/components/ExecutionHistory.test.tsx src/features/issues/assigned-work/components/ExecutionStage.test.tsx` → 12 passed (V-08q, V-08r) · desvio: os anexos da sessão mais recente também aparecem na etapa
- 2026-11-22 · 06.4 · `useTerminalLaunch` com `needsConfirmation`, `confirmAdditional`, `declineAdditional`; `TerminalSessionConfirm` no lugar do rodapé · `vitest run src/features/issues/assigned-work/components/TerminalSessionConfirm.test.tsx src/features/issues/assigned-work/components/TerminalLaunchConfirm.test.tsx src/features/issues/assigned-work/components/TerminalLaunchDialog.test.tsx` → 2+ passed (V-08s); typecheck sem erros · sem desvios
- 2026-11-22 · fechamento · `pnpm --dir apps/web test` → 70 files, 342 passed; typecheck e `pnpm lint` sem erros
