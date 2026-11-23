---
status: pending
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

- [ ] **08.1 — Escolha de agente no diálogo e "Gerar tarefas"**
  - **Arquivos:** `apps/web/src/features/issues/assigned-work/terminalContract.ts` (`LaunchPurpose` e `AgentChoice` a partir de `RouterInputs`), `terminalClient.ts` (passar `purpose`), `hooks/useTerminalLaunch.ts` (`purpose` no `preflight` e no `open`; a escolha no estado), `components/TerminalLaunchDialog.tsx` e `TerminalLaunchBody.tsx` (`purpose`; spec e escolha), `agentChoiceCopy.ts` (criar), `components/AgentChoiceField.tsx` e `AgentChoiceField.test.tsx` (criar), `components/SpecChoiceField.tsx` (criar), `components/GenerateTasksAction.tsx` e `GenerateTasksAction.test.tsx` (criar), `components/TasksStage.tsx` (`generateSlot`)
  - **Testes:** V-40k, V-40l, V-40m, V-40n
  - **Pronto quando:** `pnpm --dir apps/web exec vitest run src/features/issues/assigned-work/components/AgentChoiceField.test.tsx src/features/issues/assigned-work/components/GenerateTasksAction.test.tsx src/features/issues/assigned-work/components/TerminalLaunchDialog.test.tsx` passa; `pnpm --dir apps/web typecheck` sem erros
  - **Nota:** `useTerminalLaunch.ts` tem 91 linhas. Leve o estado da escolha e do `purpose` para um hook próprio (`useLaunchChoice.ts`), em vez de engordar o existente.
- [ ] **08.2 — Modelo puro do editor do plano**
  - **Arquivos:** `apps/web/src/features/issues/assigned-work/planContract.ts` (`PlanView = RouterOutputs["tasks"]["plan"]["get"]`; `EditablePlan`), `planEditorModel.ts` e `planEditorModel.test.ts` (criar)
  - **Testes:** V-35o, V-35p, V-35q, V-35r
  - **Pronto quando:** `pnpm --dir apps/web exec vitest run src/features/issues/assigned-work/planEditorModel.test.ts` passa; `pnpm --dir apps/web typecheck` sem erros
- [ ] **08.3 — Editor do plano e salvamento**
  - **Arquivos:** `apps/web/src/features/issues/assigned-work/planClient.ts`, `planCopy.ts`, `hooks/useExecutionPlan.ts` (leitura junto com o `useTaskSet`; edição local; `save`; mensagens de erro por motivo) (criar), `components/ExecutionPlanEditor.tsx`, `PlanSessionCard.tsx`, `PlanTaskSessionSelect.tsx`, `PlanShortcuts.tsx` e `ExecutionPlanEditor.test.tsx` (criar), `components/TasksStage.tsx` (`planSlot`), `apps/web/src/test/setup.ts` (mocks de `tasks.plan.get`/`save`), `apps/web/src/test/plan.ts` (criar: construtores de `PlanView`)
  - **Testes:** V-40o, V-40p
  - **Pronto quando:** `pnpm --dir apps/web exec vitest run src/features/issues/assigned-work/components/ExecutionPlanEditor.test.tsx` passa; `pnpm --dir apps/web typecheck` sem erros
- [ ] **08.4 — Estados da sessão do plano, iniciar e histórico**
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
- [ ] V-40k: operadora, spec `docs/specs/login/spec.md`, sem conjunto → botão "Gerar tarefas"; ao acionar, o diálogo mostra Agente "Claude Code", Modelo "Opus" e Esforço "Máximo" selecionados e o prompt do `preflight` editável; trocar para "Sonnet" e "Alto" e confirmar → `open` chamado com `purpose: { kind: "generate_tasks", specArtifactId, choice: { agent: "claude", model: "sonnet", effort: "high" } }` · componentes (RTL)
- [ ] V-40l: duas specs (`b` mais recente) → o diálogo mostra a escolha da spec com `b` selecionada; escolher `a` → nova chamada ao `preflight` com o `specArtifactId` de `a`, e o prompt mostrado muda (REQ-085) · componentes (RTL)
- [ ] V-40m: `agents` com o Codex `available: false` e o motivo → a opção "Codex" desabilitada, com "O Codex ainda não conduz sessões no Flow Dev." visível e associado à opção; membro sem `canOpenTerminal` → nenhum botão "Gerar tarefas" · componentes (RTL)
- [ ] V-40n: diálogo com `purpose` `plan_item` e `choice` `{ claude, opus, max }` → o texto "Claude Code · Opus · esforço Máximo (definido no plano)" e nenhum seletor de agente, modelo nem esforço; o prompt continua editável · componentes (RTL)
- [ ] V-35o: tarefas 01–03, Sessão 1 iniciada com a 01, e uma Sessão 2 não iniciada com a 02 → "Todas numa sessão" → Sessão 1 intacta, e uma sessão não iniciada com 02 e 03 em Opus · Máximo · função pura
- [ ] V-35p: tarefas 01–03 sem plano → "Uma sessão por tarefa" → três sessões, cada uma com uma tarefa e Claude Code · Opus · Máximo (REQ-094) · função pura
- [ ] V-35q: Sessão 1 iniciada em Opus · Máximo, e as Sessões 2 e 3 não iniciadas → "Mesmo modelo para todas" com Haiku · Médio → 2 e 3 em `haiku`/`medium`, e a 1 continua `opus`/`max` · função pura
- [ ] V-35r: `moveTask` da 03 para "Nova sessão" → sessão nova com a 03 e Opus · Máximo; a 02, única da Sessão 2, para "Sem sessão" → a Sessão 2 some, e a 02 fica sem sessão · função pura
- [ ] V-40o: pelo teclado (Tab e setas), mudar o seletor "Sessão" da 01 para "Sessão 2" e o da 02 para "Sessão 1", e acionar "Salvar"; o servidor responde `plan_invalid_order` → "A tarefa 02 depende da 01, que está numa sessão posterior." visível; com `plan_conflict` → "O plano mudou em outra aba. Recarregue para continuar."; com `stale: true` → `role="status"` com "As tarefas mudaram desde que o plano foi salvo. Revise o plano."; tarefas fora das sessões listadas em "Sem sessão" · componentes (RTL)
- [ ] V-40p: `canEdit: false` → o plano com sessões, tarefas, escolhas e estados, sem seletores, atalhos, "Salvar" nem botões de iniciar (REQ-107, B-36) · componentes (RTL)
- [ ] V-40q: item `blocked` com `blockedBy: [{ taskId: "task_01", status: "in_progress" }]` → `role="status"` com "Bloqueada: aguardando 01 (Em andamento)" e o botão "Iniciar mesmo assim"; ao acionar → confirmação "A sessão depende de tarefas não concluídas: 01. Iniciar mesmo assim?"; confirmar → diálogo aberto com `purpose: { kind: "plan_item", planItemId, force: true }`; item com `forced: { by: "Ana", at: 15:10 }` → "Iniciada com dependências abertas por Ana às 15:10" · componentes (RTL)
- [ ] V-40r: item `ended` com 1 de 2 tarefas concluída → "Encerrada · 1 tarefa não concluída" e "Iniciar de novo"; `running` → "Em execução", com o link para a conversa e sem botão de iniciar; `ready` → "Pronta" e "Iniciar"; `done` → "Concluída" · componentes (RTL)
- [ ] V-40s: histórico com uma sessão `sonnet`/`high` e uma de rota → a primeira mostra "Claude Code · Sonnet · Alto", e a de rota nenhum rótulo de modelo (REQ-104) · componentes (RTL)
- [ ] V-40t: "Iniciar" de um item em `codex`, com o Codex indisponível no `preflight` → o diálogo mostra o motivo da REQ-110 e não permite confirmar; o item continua com o seletor de agente editável no plano (B-42) · componentes (RTL)

## Critérios de sucesso
- Todas as mini-tarefas marcadas, cada uma com o "Pronto quando" executado.
- Todos os testes atribuídos implementados e passando.
- `pnpm --dir apps/web test` passando ao fim da tarefa, incluindo os testes do diálogo da Spec C (`TerminalLaunch*`).
- `pnpm --dir apps/web typecheck` e `pnpm --dir apps/web lint` sem erros.

## Registro de execução
<!-- Uma entrada por mini-tarefa: data, o que foi feito, comandos e resultado, desvios. -->
