---
status: completed
title: "Tela: gerar tarefas e plano de execução"
type: frontend
complexity: high
---

# Task 08: Tela: gerar tarefas e plano de execução

## Visão geral
Esta tarefa completa a etapa "Tarefas" na tela. Ela entrega:
- "Gerar tarefas", com a escolha da spec, do agente, do modelo e do esforço;
- o editor do plano, com sessões, atalhos e o seletor "Sessão" por tarefa, salvo de uma vez;
- os estados de cada sessão do plano, com "Iniciar", "Iniciar mesmo assim" e "Iniciar de novo".

Tudo passa pelo diálogo de sessão da Spec C, que ganha o `purpose`. A pessoa operadora edita, e as demais leem.

<critical>
- LEIA a spec (`docs/specs/tarefas-e-plano-de-execucao/spec.md`, US-11 a US-14, §6 REQ-083–085, REQ-092–107, REQ-109, REQ-110, §7.4–7.7, §8 B-35, B-36, B-39, B-41, B-42, NFR-17, §13, §15), `apps/web/AGENTS.md`, `apps/web/DESIGN.md` e as regras do projeto (AGENTS.md/CLAUDE.md, `.agents/rules/code-standards.md`) antes de começar. Use as skills `nextjs-folder-structure` e `trpc-nextjs`. Leia o guia pertinente em `apps/web/node_modules/next/dist/docs/` antes de usar uma API do Next.
- FAÇA UMA MINI-TAREFA POR VEZ, na ordem. Só marque `[x]` depois de rodar o "Pronto quando" dela e ver passar.
- NÃO saia dos arquivos listados sem registrar o motivo no Registro de execução. Nada fora do escopo da spec.
- TESTES JUNTO COM O CÓDIGO: cada mini-tarefa implementa os testes atribuídos a ela, seguindo a skill de testes do projeto (`software-testing`). Isso quer dizer: asserção sobre o efeito observável e específico, nada de `toBeTruthy` ou de só checar que não lança exceção; valor esperado tirado da spec, nunca recalculado a partir do código; dublês só em dependências lentas, variáveis ou externas; relógio e aleatoriedade controlados. Em bug, reproduza antes de corrigir.
- Ao começar, mude `status` para `in_progress` (aqui e em `_tasks.md`). Mude para `completed` só quando todas as mini-tarefas estiverem marcadas e os critérios de sucesso tiverem sido comprovados por comando. A revisão contra a spec acontece uma vez, depois de todas as tarefas: não a espere aqui, mas não marque nada que não tenha prova, porque ela vai conferir.
</critical>

## Requisitos
- REQ-083, REQ-084 e REQ-109 / US-11.2: para quem opera, "Gerar tarefas" abre o diálogo de sessão com "Agente: Claude Code · Modelo: Opus · Esforço: Máximo", editáveis, e o prompt de geração vindo do `preflight`, editável como na Spec A. Confirmar chama o `open` com `{ kind: "generate_tasks", specArtifactId, choice }`.
- REQ-085: com mais de uma spec, o diálogo pede qual quebrar, com a mais recente selecionada. Trocar a spec recarrega o prompt do `preflight`.
- REQ-110 / US-13.5 / B-42: um agente indisponível aparece desabilitado, com o motivo do `preflight` ("O Codex ainda não conduz sessões no Flow Dev."). O mesmo vale para o seletor de agente das sessões do plano.
- REQ-092–094: o editor tem sessões ordenadas, cada uma com agente, modelo e esforço. Toda sessão nova começa em Claude Code · Opus · Máximo.
- REQ-093, os atalhos:
  - "Todas numa sessão" e "Uma sessão por tarefa" refazem as sessões não iniciadas com as tarefas que não estão em sessões iniciadas;
  - "Mesmo modelo para todas" aplica uma escolha a todas as não iniciadas.
- REQ-095–099:
  - o salvamento envia a lista inteira com a `version` lida;
  - os erros aparecem com a mensagem do servidor: a de ordem é exatamente a de US-13.4, e a de conflito é "O plano mudou em outra aba. Recarregue para continuar.";
  - `stale` mostra "As tarefas mudaram desde que o plano foi salvo. Revise o plano." com `role="status"`;
  - as tarefas sem sessão ficam em "Sem sessão";
  - uma sessão iniciada aparece sem controles de edição.
- REQ-100 e REQ-104 / 7.5, os estados com texto:
  - "Pronta";
  - "Bloqueada: aguardando 01 (Em andamento)";
  - "Em execução";
  - "Encerrada · 1 tarefa não concluída";
  - "Concluída";

  Cada sessão mostra também o link para a conversa da sessão mais recente.
- REQ-101 / US-14.1: "Iniciar" abre o diálogo com o prompt de execução e "Claude Code · Opus · esforço Máximo (definido no plano)", sem seletores.
- REQ-102 / US-14.3: com a sessão bloqueada, "Iniciar mesmo assim" pede "A sessão depende de tarefas não concluídas: 01. Iniciar mesmo assim?" e abre o diálogo com `force: true`. Depois, o plano mostra "Iniciada com dependências abertas por Ana às 15:10".
- REQ-105 / US-14.4: com o estado `ended`, aparece "Iniciar de novo", que abre o diálogo do mesmo item (o servidor monta o prompt só com as tarefas não concluídas).
- REQ-104: o histórico de sessões da etapa de execução mostra "Claude Code · Sonnet · Alto" nas sessões que têm escolha, e nada nas de rota.
- REQ-107 / 7.7 / B-36: sem `canEdit`, o plano aparece só para leitura (sem seletores, atalhos, "Salvar" nem botões de iniciar), e "Gerar tarefas" não aparece.
- B-41: a confirmação de sessão ativa da Spec C (`TerminalSessionConfirm`) continua valendo nos dois propósitos.
- NFR-17: tudo funciona pelo teclado. Cada tarefa tem um seletor "Sessão" (nativo, sem arrastar e soltar), os estados têm texto, e os avisos de bloqueio e de mudança usam `role="status"`.
- Rótulos da 7.4: "Claude Code" e "Codex"; "Opus", "Sonnet" e "Haiku"; "Baixo", "Médio", "Alto", "Muito alto" e "Máximo" (`low`, `medium`, `high`, `xhigh`, `max`). Um modelo sem rótulo conhecido aparece com o nome técnico (o Codex virá da Spec E).

## Interfaces
- **Consome:**
  - da task_04: `tasks.plan.get` e `tasks.plan.save` (§15) e os erros `plan_*`;
  - da task_05: `tasks.terminal.preflight` e `tasks.terminal.open` com `purpose`, e a saída do `preflight` com `prompt`, `choice` e `agents`; `agent`, `model` e `effort` nas sessões de `tasks.byId`;
  - da task_07: `useTaskSet`, `TasksStage` (slots `generateSlot` e `planSlot`), `taskSetCopy.ts` e `taskStatusLabel`;
  - existente: `TerminalLaunchDialog`, `useTerminalLaunch`, `TerminalLaunchBody`, `TerminalLaunchFooter`, `TerminalSessionConfirm`, `ExecutionHistory.tsx`, `terminalContract.ts` e `planning.permissions.canOpenTerminal`.
- **Produz** (usado pela task_09 e pela Spec E):
  - `AgentChoiceField` (`components/AgentChoiceField.tsx`), com as props `{ agents: AgentAvailability[]; value: AgentChoice; onChange?: (choice) => void; readOnly?: boolean }`. A Spec E o reaproveita no diálogo da rota (REQ-126);
  - `agentChoiceCopy.ts` com `agentChoiceLabel(choice)` ("Claude Code · Opus · Máximo");
  - `planEditorModel.ts` (puro): `allInOne`, `onePerTask`, `sameChoiceForAll`, `moveTask(plan, taskId, target)` e `toSaveInput(plan)`;
  - `LaunchPurpose` em `terminalContract.ts`, e o `TerminalLaunchDialog` com a prop `purpose`.

## Mini-tarefas

- [x] **08.1 — Escolha de agente no diálogo e "Gerar tarefas"**
  - **Arquivos:** `apps/web/src/features/issues/assigned-work/terminalContract.ts` (`LaunchPurpose` e `AgentChoice` a partir de `RouterInputs`), `terminalClient.ts` (passar `purpose`), `hooks/useTerminalLaunch.ts` (`purpose` no `preflight` e no `open`; a escolha no estado), `components/TerminalLaunchDialog.tsx` e `TerminalLaunchBody.tsx` (`purpose`; spec e escolha), `agentChoiceCopy.ts` (criar), `components/AgentChoiceField.tsx` e `AgentChoiceField.test.tsx` (criar), `components/SpecChoiceField.tsx` (criar), `components/GenerateTasksAction.tsx` e `GenerateTasksAction.test.tsx` (criar), `components/TasksStage.tsx` (`generateSlot`)
  - **Testes:** V-40k, V-40l, V-40m, V-40n
  - **Pronto quando:** `pnpm --dir apps/web exec vitest run src/features/issues/assigned-work/components/AgentChoiceField.test.tsx src/features/issues/assigned-work/components/GenerateTasksAction.test.tsx src/features/issues/assigned-work/components/TerminalLaunchDialog.test.tsx` passa; `pnpm --dir apps/web typecheck` sem erros
  - **Nota:** `useTerminalLaunch.ts` tem 91 linhas. Leve o estado da escolha e do `purpose` para um hook próprio (`useLaunchChoice.ts`), em vez de engordar o existente.
- [x] **08.2 — Modelo puro do editor do plano**
  - **Arquivos:** `apps/web/src/features/issues/assigned-work/planContract.ts` (`PlanView = RouterOutputs["tasks"]["plan"]["get"]`; `EditablePlan`), `planEditorModel.ts` e `planEditorModel.test.ts` (criar)
  - **Testes:** V-35o, V-35p, V-35q, V-35r
  - **Pronto quando:** `pnpm --dir apps/web exec vitest run src/features/issues/assigned-work/planEditorModel.test.ts` passa; `pnpm --dir apps/web typecheck` sem erros
- [x] **08.3 — Editor do plano e salvamento**
  - **Arquivos:** `apps/web/src/features/issues/assigned-work/planClient.ts`, `planCopy.ts`, `hooks/useExecutionPlan.ts` (leitura junto com o `useTaskSet`; edição local; `save`; mensagens de erro por motivo) (criar), `components/ExecutionPlanEditor.tsx`, `PlanSessionCard.tsx`, `PlanTaskSessionSelect.tsx`, `PlanShortcuts.tsx` e `ExecutionPlanEditor.test.tsx` (criar), `components/TasksStage.tsx` (`planSlot`), `apps/web/src/test/setup.ts` (mocks de `tasks.plan.get`/`save`), `apps/web/src/test/plan.ts` (criar: construtores de `PlanView`)
  - **Testes:** V-40o, V-40p
  - **Pronto quando:** `pnpm --dir apps/web exec vitest run src/features/issues/assigned-work/components/ExecutionPlanEditor.test.tsx` passa; `pnpm --dir apps/web typecheck` sem erros
- [x] **08.4 — Estados da sessão do plano, iniciar e histórico**
  - **Arquivos:** `apps/web/src/features/issues/assigned-work/planStateModel.ts` e `planStateModel.test.ts` (criar: texto do estado a partir de `state`, `blockedBy`, `forced` e das tarefas), `components/PlanSessionCard.tsx` (estado, link, ações), `components/PlanLaunchActions.tsx` e `PlanForceConfirm.tsx` (criar), `components/PlanSessionCard.test.tsx` (criar), `components/ExecutionHistory.tsx` e `ExecutionHistory.test.tsx` (agente, modelo e esforço), `executionContract.ts` (campos novos)
  - **Testes:** V-40q, V-40r, V-40s, V-40t
  - **Pronto quando:** `pnpm --dir apps/web exec vitest run src/features/issues/assigned-work/planStateModel.test.ts src/features/issues/assigned-work/components/PlanSessionCard.test.tsx src/features/issues/assigned-work/components/ExecutionHistory.test.tsx` passa; `pnpm --dir apps/web typecheck` sem erros

## Detalhes de implementação
- O editor guarda uma cópia local do `PlanView` (`EditablePlan`). Os atalhos e o seletor "Sessão" mudam só a cópia, e "Salvar" envia `toSaveInput`. Depois de salvar, ou de um erro de conflito, ele relê `plan.get`. A UI não reimplementa as regras do servidor: a validação final é a do `save`, e a tela só mostra a mensagem.
- O seletor "Sessão" de cada tarefa lista "Sem sessão", "Sessão 1" … "Sessão N" (só as não iniciadas) e "Nova sessão". Mover para "Nova sessão" cria a sessão com `DEFAULT_CHOICE` (Claude Code · Opus · Máximo). Uma sessão que fica vazia some.
- O link para a conversa usa o `latestSessionId` e abre a sessão na etapa de execução, do mesmo jeito que o histórico da Spec C seleciona uma sessão. Se não houver como abrir uma sessão pelo id, mostre o estado da sessão sem link e registre no log desta tarefa.
- "Iniciada com dependências abertas por Ana às 15:10" usa `forced.by` (nome de exibição, vindo do `plan.get`) e `forced.at` formatado em `HH:mm`, no fuso do navegador.
- Depois que o diálogo abre a sessão (`onOpened`), o editor e a lista relêem os dados (`refresh` do `useTaskSet` e do `useExecutionPlan`).
- Os textos ficam em `planCopy.ts` e `agentChoiceCopy.ts`, exatos como na spec.

### Arquivos relevantes
- `apps/web/src/features/issues/assigned-work/components/TerminalLaunchAction.tsx`, `TerminalLaunchDialog.tsx`, `TerminalLaunchDialog.test.tsx` e `TerminalSessionConfirm.tsx`: o diálogo e a confirmação de sessão ativa.
- `apps/web/src/features/issues/assigned-work/components/PermissionModeField.tsx`: campo de escolha com rótulos e teclado, para espelhar no `AgentChoiceField`.
- `apps/web/src/features/issues/assigned-work/components/ExecutionHistory.tsx`: o histórico de sessões.

### Arquivos afetados
- Os listados nas mini-tarefas.

### Decisões relacionadas
- DEC-25 (edição local, um salvamento com versão), DEC-26 (`purpose` no mesmo diálogo).

## Premissas
- Atalhos na tela: ver `_tasks.md`, "Premissas e bloqueios".
- `plan.get` devolve `forced.by` como nome de exibição. Se a task_04 devolveu o id, acrescente o nome no controller (join em `users`) e registre o desvio no log.

## Testes atribuídos
- [x] V-40k: operadora, spec `docs/specs/login/spec.md`, sem conjunto → botão "Gerar tarefas"; ao acionar, o diálogo mostra Agente "Claude Code", Modelo "Opus" e Esforço "Máximo" selecionados e o prompt do `preflight` editável; trocar para "Sonnet" e "Alto" e confirmar → `open` chamado com `purpose: { kind: "generate_tasks", specArtifactId, choice: { agent: "claude", model: "sonnet", effort: "high" } }` · componentes (RTL)
- [x] V-40l: duas specs (`b` mais recente) → o diálogo mostra a escolha da spec com `b` selecionada; escolher `a` → nova chamada ao `preflight` com o `specArtifactId` de `a`, e o prompt mostrado muda (REQ-085) · componentes (RTL)
- [x] V-40m: `agents` com o Codex `available: false` e o motivo → a opção "Codex" desabilitada, com "O Codex ainda não conduz sessões no Flow Dev." visível e associado à opção; membro sem `canOpenTerminal` → nenhum botão "Gerar tarefas" · componentes (RTL)
- [x] V-40n: diálogo com `purpose` `plan_item` e `choice` `{ claude, opus, max }` → o texto "Claude Code · Opus · esforço Máximo (definido no plano)" e nenhum seletor de agente, modelo nem esforço; o prompt continua editável · componentes (RTL)
- [x] V-35o: tarefas 01–03, Sessão 1 iniciada com a 01, e uma Sessão 2 não iniciada com a 02 → "Todas numa sessão" → Sessão 1 intacta, e uma sessão não iniciada com 02 e 03 em Opus · Máximo · função pura
- [x] V-35p: tarefas 01–03 sem plano → "Uma sessão por tarefa" → três sessões, cada uma com uma tarefa e Claude Code · Opus · Máximo (REQ-094) · função pura
- [x] V-35q: Sessão 1 iniciada em Opus · Máximo, e as Sessões 2 e 3 não iniciadas → "Mesmo modelo para todas" com Haiku · Médio → 2 e 3 em `haiku`/`medium`, e a 1 continua `opus`/`max` · função pura
- [x] V-35r: `moveTask` da 03 para "Nova sessão" → sessão nova com a 03 e Opus · Máximo; a 02, única da Sessão 2, para "Sem sessão" → a Sessão 2 some, e a 02 fica sem sessão · função pura
- [x] V-40o: pelo teclado (Tab e setas), mudar o seletor "Sessão" da 01 para "Sessão 2" e o da 02 para "Sessão 1", e acionar "Salvar"; o servidor responde `plan_invalid_order` → "A tarefa 02 depende da 01, que está numa sessão posterior." visível; com `plan_conflict` → "O plano mudou em outra aba. Recarregue para continuar."; com `stale: true` → `role="status"` com "As tarefas mudaram desde que o plano foi salvo. Revise o plano."; tarefas fora das sessões listadas em "Sem sessão" · componentes (RTL)
- [x] V-40p: `canEdit: false` → o plano com sessões, tarefas, escolhas e estados, sem seletores, atalhos, "Salvar" nem botões de iniciar (REQ-107, B-36) · componentes (RTL)
- [x] V-40q: item `blocked` com `blockedBy: [{ taskId: "task_01", status: "in_progress" }]` → `role="status"` com "Bloqueada: aguardando 01 (Em andamento)" e o botão "Iniciar mesmo assim"; ao acionar → confirmação "A sessão depende de tarefas não concluídas: 01. Iniciar mesmo assim?"; confirmar → diálogo aberto com `purpose: { kind: "plan_item", planItemId, force: true }`; item com `forced: { by: "Ana", at: 15:10 }` → "Iniciada com dependências abertas por Ana às 15:10" · componentes (RTL)
- [x] V-40r: item `ended` com 1 de 2 tarefas concluída → "Encerrada · 1 tarefa não concluída" e "Iniciar de novo"; `running` → "Em execução", com o link para a conversa e sem botão de iniciar; `ready` → "Pronta" e "Iniciar"; `done` → "Concluída" · componentes (RTL)
- [x] V-40s: histórico com uma sessão `sonnet`/`high` e uma de rota → a primeira mostra "Claude Code · Sonnet · Alto", e a de rota nenhum rótulo de modelo (REQ-104) · componentes (RTL)
- [x] V-40t: "Iniciar" de um item em `codex`, com o Codex indisponível no `preflight` → o diálogo mostra o motivo da REQ-110 e não permite confirmar; o item continua com o seletor de agente editável no plano (B-42) · componentes (RTL)

## Critérios de sucesso
- Todas as mini-tarefas marcadas, cada uma com o "Pronto quando" executado.
- Todos os testes atribuídos implementados e passando.
- `pnpm --dir apps/web test` passando ao fim da tarefa, incluindo os testes do diálogo da Spec C (`TerminalLaunch*`).
- `pnpm --dir apps/web typecheck` e `pnpm --dir apps/web lint` sem erros.

## Registro de execução
<!-- Uma entrada por mini-tarefa: data, o que foi feito, comandos e resultado, desvios. -->
- **2026-11-23 · 08.1** — `terminalContract.ts` (`LaunchPurpose`, `AgentChoice`, `AgentOption`, `OpenPurpose`, `PreviewPurpose`), `terminalClient.ts` (o `purpose` só segue quando não é rota, então a rota continua igual), `agentChoiceCopy.ts` (rótulos da 7.4, `agentChoiceLabel`, `plannedChoiceLabel`, textos do diálogo por propósito), `launchPurposeModel.ts` (chaves, `previewPurposeOf`, `openPurposeOf`, `agentProblemOf`), `hooks/useLaunchPreflight.ts`, `useTerminalSender.ts` e `useTerminalLaunch.ts` (33 linhas; a nota da tarefa pedia `useLaunchChoice.ts`, e o estado da escolha ficou no próprio `useTerminalLaunch`, com a leitura e o envio em hooks separados), `components/AgentChoiceField.tsx` (agente em radios com o motivo ligado por `aria-describedby`, modelo e esforço em `select`), `AgentSelect.tsx`, `SpecChoiceField.tsx`, `LaunchChoiceSection.tsx`, `GenerateTasksAction.tsx`, e as mudanças em `TerminalLaunchDialog`, `TerminalLaunchBody` e `TerminalLaunchFooter` (o botão confirmar fica desabilitado quando o agente do item está indisponível). **Desvio:** o `TasksStage` renderiza o `GenerateTasksAction` direto (sem as props `generateSlot` e `planSlot`), porque ele já tem a spec, a permissão e o `reader`. Testes: `AgentChoiceField.test.tsx` (5), `GenerateTasksAction.test.tsx` (4), `TerminalLaunchPlanItem.test.tsx` (3) e os `TerminalLaunch*` da Spec C (V-40k a V-40n, V-40t): 19 testes passando com o `TerminalLaunchDialog.test.tsx`. Os construtores `src/test/terminal.ts` ganharam `AGENTS`, `OPUS_MAX` e `CODEX_REASON`.
- **2026-11-23 · 08.2** — `planContract.ts` e `planEditorModel.ts` (puro: `toEditable`, `allInOne`, `onePerTask`, `sameChoiceForAll`, `setChoice`, `moveTask`, `sessionOf`, `assignedIds`, `toSaveInput`; uma sessão iniciada nunca é tocada, e a que fica vazia some). `planEditorModel.test.ts`: 9 testes (V-35o a V-35r e as bordas).
- **2026-11-23 · 08.3** — `planClient.ts`, `planCopy.ts`, `hooks/usePlanView.ts` (leitura e polling de 5 s) e `hooks/useExecutionPlan.ts` (edição local, `save`, erro por motivo, recarregar), `planEditHandlers.ts`, e `components/ExecutionPlanEditor.tsx`, `PlanSessionCard.tsx`, `PlanTaskRow.tsx`, `PlanTaskSessionSelect.tsx` (seletor nativo "Sessão da tarefa NN", com "Sem sessão", as sessões não iniciadas e "Nova sessão"), `PlanShortcuts.tsx`, `PlanSaveBar.tsx` e `UnassignedTasks.tsx`, montado no `TaskSetBody`. **Desvio no servidor:** `tasks.plan.get` ganhou o campo `agents` (a disponibilidade de cada agente), porque o editor precisa desabilitar o Codex com o motivo e o `preflight` é pesado e tem efeitos; registrado no Histórico da spec, com o teste em `test/plan-read.test.ts`. Testes: `ExecutionPlanEditor.test.tsx` (4) e `ExecutionPlanEditorReadOnly.test.tsx` (5), com `src/test/plan.ts` e `src/test/planEditor.tsx`: V-40o, V-40p e B-42. `src/test/setup.ts` já tinha os mocks de `tasks.plan.*`, acrescentados na 07.1.
- **2026-11-23 · 08.4** — `planStateModel.ts` (`planStateText`, `forcedNote`, `launchActionOf`), `components/PlanSessionState.tsx` (estado com texto, `role="status"` quando bloqueada, link "Ver a conversa"), `PlanForceConfirm.tsx`, `PlanLaunchActions.tsx` (Iniciar, Iniciar mesmo assim, Iniciar de novo; abre o `TerminalLaunchDialog` com `plan_item` e `force: true` só quando preciso), `PlanSessionFooter.tsx`, e o histórico (`ExecutionHistory.tsx`) com "Claude Code · Sonnet · Alto". As ações de iniciar somem enquanto há edição não salva (a sessão que inicia é a salva). O link "Ver a conversa" leva à aba da execução (`focus` do `StageTabs`, ligado no `OperatorStages`); essa aba mostra a sessão mais recente da tarefa, e as anteriores ficam no histórico, então o link não abre uma sessão específica pelo id. Testes: `planStateModel.test.ts` (5), `PlanSessionCard.test.tsx` (7) e um caso novo em `ExecutionHistory.test.tsx`: V-40q, V-40r, V-40s.
- **2026-11-23 · fecho** — `pnpm --dir apps/web test`: 97 arquivos, 488 testes passando. `pnpm --dir apps/web typecheck` e `pnpm --dir apps/web lint` sem erros nem avisos (o filtro do rtk imprime um erro de JSON com a saída vazia do eslint; `rtk proxy pnpm lint` termina com código 0). `pnpm --dir packages/api test` e `test:integration` seguem passando (ver o registro da 09).
- **2026-11-23 · correção da review-001 (I-2, M-3)** — **I-2:** o foco do "Ver a conversa" passou a levar o `sessionId` (`ConversationFocus` em `stageTabs.ts`): `OperatorStages` guarda o foco, `ExecutionStage` o repassa ao `ExecutionHistory`, e o item do histórico dessa sessão abre expandido. A sessão mais recente da tarefa já aparece aberta na etapa. Teste novo em `OperatorStages.test.tsx`: com uma sessão mais nova presente, o link da sessão do item mostra a conversa dela no histórico; sem a ligação do foco, o teste falha. **M-3:** "Bloqueada: aguardando" e "Encerrada · " saíram de `planStateModel.ts` para `blockedStateText` e `endedStateText` em `planCopy.ts`. `pnpm --dir apps/web test`: 97 arquivos, 489 testes; typecheck e lint sem erros.
- **2026-11-23 · correção da review-002 (I-1, M-1)** — **I-1:** com `folderChange` no `plan.get`, o editor mostra `PlanFolderChange.tsx` (`role="status"` com "O plano foi montado para as tarefas de <antiga>, mas o conjunto de tarefas ativo agora está em <nova>. As sessões já iniciadas continuam no histórico, mas saem do plano.") e, para quem opera, o botão "Usar as tarefas de <nova>", que salva o rascunho em andamento ou, sem rascunho, o plano vazio lido (`adopt` em `useExecutionPlan.ts`). Como a tela mostra o plano vazio, não há sessão para "Iniciar" até o `save`, e as sessões não ficam travadas. A persistência foi para `hooks/usePlanPersistence.ts`, para o hook ficar com até 30 linhas. `PlanFolderChange.test.tsx` (4 testes): aviso e adoção com a `version` lida; adoção salva o rascunho; leitura sem botão; sem aviso quando a pasta não mudou. **M-1:** `ExecutionStage` avisa `OperatorStages` (`onConversationShown`) e o foco volta a `null` depois de usado; teste em `OperatorStages.test.tsx`: voltar à aba Execução pela lista de abas deixa o histórico fechado. Conferido por mutação: sem o consumo do foco e com `adopt` ignorando o rascunho, o teste correspondente falha.
- **2026-11-23 · mudança de rumo pela spec da mesma pasta (pedido do usuário)** — caminho combinado: para mudar o rumo, edita-se a spec da mesma pasta (nova versão do `spec.md` pela sessão de rota) e as tarefas são geradas de novo na mesma pasta; a REQ-097 reconcilia o plano, e a troca de pasta fica só como proteção. Faltava a ação na tela: "Gerar tarefas" só existia sem conjunto (REQ-083). Agora, com conjunto existente **ou com manifesto inválido**, quem opera vê "Gerar tarefas de novo" (`GenerateTasksAction` com `regenerate`, ligado no `TaskSetBody`). A ação pede confirmação (`RegenerateTasksConfirm.tsx`, `role="alert"`): "Gerar de novo escreve outra vez os arquivos de tarefa de <pasta>. O status e o registro de execução desses arquivos podem voltar ao começo; as versões já capturadas continuam acessíveis. Gerar de novo?", porque a spec-to-tasks reescreve cada arquivo com `status: pending` e não tem tratamento de regeneração. O diálogo oferece primeiro a spec da pasta do conjunto (`specsOfFolderFirst` em `taskSetModel.ts`), mesmo que outra spec seja mais recente. Nenhuma mudança no servidor: o `open` com `generate_tasks` já aceita qualquer spec da tarefa. Testes: `taskSetModel.test.ts` (ordem), `GenerateTasksAction.test.tsx` (confirmação e spec da pasta primeiro; cancelar não abre o diálogo) e `TasksStage.test.tsx` (botão para quem opera com conjunto, ausente para leitura, presente com manifesto inválido). Conferido por mutação: sem a ordenação, sem a confirmação e sem a ação no ramo do manifesto inválido, o teste correspondente falha. `pnpm --dir apps/web test`: 98 arquivos, 499 testes; typecheck e lint sem erros. **Fora da spec:** a REQ-083 e a US-11 só previam o botão sem conjunto; isso precisa entrar na spec.

