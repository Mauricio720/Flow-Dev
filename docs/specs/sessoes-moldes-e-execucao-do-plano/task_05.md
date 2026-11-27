---
status: completed
title: Editor do plano com moldes, arrastar, ordem e condições
type: frontend
complexity: medium
---

# Task 05: Editor do plano com moldes, arrastar, ordem e condições

## Visão geral
Troca o seletor "Sessão da tarefa NN" por sessões-molde: a operadora cria sessões vazias, coloca tarefas arrastando ou por "Adicionar tarefas", ordena as sessões e marca "Começa depois de". O cartão mostra as condições de cada sessão. Tudo o que se faz arrastando tem caminho por teclado.

<critical>
- LEIA a spec e as regras do projeto (AGENTS.md/CLAUDE.md, `apps/web/AGENTS.md`, `.agents/rules/code-standards.md`, `apps/web/DESIGN.md`) antes de começar. Use a skill `nextjs-folder-structure`.
- FAÇA UMA MINI-TAREFA POR VEZ, na ordem. Só marque `[x]` depois de rodar o "Pronto quando" dela e ver passar.
- NÃO saia dos arquivos listados sem registrar o motivo no Registro de execução. Nada fora do escopo da spec.
- TESTES JUNTO COM O CÓDIGO: cada mini-tarefa implementa os testes atribuídos a ela, seguindo a skill de testes do projeto (`software-testing`). Isso quer dizer: asserção sobre o efeito observável e específico, nada de `toBeTruthy` ou de só checar que não lança exceção; valor esperado tirado da spec, nunca recalculado a partir do código; dublês só em dependências lentas, variáveis ou externas; relógio e aleatoriedade controlados. Em bug, reproduza antes de corrigir.
- Ao começar, mude `status` para `in_progress` (aqui e em `_tasks.md`). Mude para `completed` só quando todas as mini-tarefas estiverem marcadas e os critérios de sucesso tiverem sido comprovados por comando. A revisão contra a spec acontece uma vez, depois de todas as tarefas: não a espere aqui, mas não marque nada que não tenha prova, porque ela vai conferir.
</critical>

## Requisitos
- REQ-001: "Nova sessão" acrescenta ao fim do rascunho uma sessão vazia em Claude Code · Opus · Máximo (`DEFAULT_CHOICE`), sem diálogo.
- REQ-002: sessão não iniciada e vazia mostra "Sem tarefas. Arraste tarefas para cá ou use Adicionar tarefas.".
- REQ-003: soltar uma tarefa (de "Sem sessão" ou de uma sessão não iniciada) sobre outra sessão não iniciada a move para ela; soltar sobre "Sem sessão" a tira da sessão.
- REQ-004: "Adicionar tarefas" abre o diálogo "Tarefas da Sessão N" (S8-REQ-002 a S8-REQ-004); a sessão que ficar vazia continua.
- REQ-005: "Remover da sessão" leva a tarefa a "Sem sessão"; a sessão continua.
- REQ-006: "Remover sessão" devolve as tarefas a "Sem sessão" e tira do rascunho as condições que apontavam para ela.
- REQ-007: o seletor "Sessão da tarefa NN" (`PlanTaskSessionSelect`) e o diálogo "Tarefas da nova sessão" deixam de existir.
- REQ-009: cada sessão não iniciada muda de posição arrastando o cartão ou por "Subir" e "Descer"; "Sessão N" segue a ordem.
- REQ-010: cada sessão não iniciada, exceto a primeira, oferece "Começa depois de", com uma caixa por sessão anterior; nenhuma marcada por padrão. Ao reordenar, uma condição que passaria a apontar para frente sai do rascunho.
- REQ-012: o cartão de cada sessão não concluída mostra "Começa depois de: Sessão 1, Sessão 2" e "Aguarda a tarefa 01 (Sessão 1)" ou "Aguarda as tarefas 01, 04 (Sessões 1 e 2)"; tarefa sem sessão aparece como "(sem sessão)".
- REQ-013 (tela): estado "Bloqueada: aguardando Sessão 1"; o "Iniciar mesmo assim" diz "A sessão depende de tarefas ou sessões não concluídas: 01, Sessão 1. Iniciar mesmo assim?".
- 7.1: estado "Sem tarefas" para a sessão vazia, sem "Iniciar".
- 7.5: membro ou admin vê sessões e condições, sem botões de edição.
- NFR-03: alvos de soltura com nome acessível; caminhos por teclado ("Adicionar tarefas", "Remover da sessão", "Subir", "Descer").
- Não muda (§9): os atalhos "Todas numa sessão", "Uma sessão por tarefa" e "Mesmo modelo para todas" funcionam; os dois primeiros substituem as sessões não iniciadas e as condições delas saem junto. Sessão iniciada imutável. Salvar só por "Salvar"; releitura a cada 5 s.

## Interfaces
- **Consome:** `PlanView.items[].after`, `waitingSessions`, estado `empty` e `planSaveInputSchema` com `after` (task_01), pelo tipo inferido `RouterOutputs["tasks"]["plan"]["get"]` em `planContract.ts`.
- **Produz:**
  - `EditableItem` ganha `after: string[]` (chaves de itens do rascunho).
  - Em `planEditorModel.ts`/`planSessionModel.ts` (criar): `addEmptySession(plan)`, `moveTask(plan, taskId, target)` sem apagar sessões vazias, `removeFromSession(plan, taskId)`, `removeSession(plan, key)`, `moveSession(plan, { key, to })`, `setAfter(plan, { key, after })`, `toSaveInput(plan)` → `after` em posições 1-based.
  - `setSessionTasks` mantém a sessão vazia; `createSessionWith` sai.
  - Componentes: `PlanSessionAfterField`, `PlanSessionConditions`, `PlanSessionOrderActions` (Subir/Descer/Remover sessão) em `apps/web/src/features/issues/assigned-work/components/`.

## Mini-tarefas

- [x] **05.1 — Operações do rascunho para moldes, ordem e condições**
  - **Arquivos:** `apps/web/src/features/issues/assigned-work/planContract.ts`, `planEditorModel.ts`, `planSessionModel.ts` (criar), `planSessionModel.test.ts` (criar), `planEditorModel.test.ts`, `planSelectionModel.ts`, `planSelectionModel.test.ts`, `planEditHandlers.ts`
  - **Testes:** V-07a, V-07b, V-07c, V-07d, V-07e, V-07f, V-07g, V-07h, V-07i, V-07j, V-07k
  - **Pronto quando:** `pnpm --dir apps/web exec vitest run src/features/issues/assigned-work/planSessionModel.test.ts src/features/issues/assigned-work/planEditorModel.test.ts src/features/issues/assigned-work/planSelectionModel.test.ts` passa; `pnpm --dir apps/web typecheck` sem erros
  - **Nota:** `MoveTarget` perde `{ kind: "new" }`. `planEditorModel.ts` já tem 77 linhas: as operações novas vão para `planSessionModel.ts`.
- [x] **05.2 — Cartões-molde com arrastar e caminhos de teclado**
  - **Arquivos:** `components/ExecutionPlanEditor.tsx`, `PlanSessionCard.tsx`, `PlanTaskRow.tsx`, `UnassignedTasks.tsx`, `PlanNewSessionButton.tsx`, `PlanSessionTasksHost.tsx`, `PlanSessionTasksDialog.tsx`, `PlanSessionOrderActions.tsx` (criar), `PlanTaskSessionSelect.tsx` (remover), `hooks/usePlanSelectionDialog.ts`, `planCopy.ts`, `components/ExecutionPlanMolds.test.tsx` (criar) e os testes atuais `ExecutionPlanEditor.test.tsx`, `ExecutionPlanNewSession.test.tsx`, `ExecutionPlanSelection.test.tsx`, `ExecutionPlanSelectionKeyboard.test.tsx`, `PlanSessionCard.test.tsx`
  - **Testes:** V-08a, V-08b, V-08c, V-08d, V-08e, V-11b
  - **Pronto quando:** `pnpm --dir apps/web exec vitest run src/features/issues/assigned-work/components/ExecutionPlanMolds.test.tsx src/features/issues/assigned-work/components/ExecutionPlanEditor.test.tsx src/features/issues/assigned-work/components/ExecutionPlanNewSession.test.tsx src/features/issues/assigned-work/components/ExecutionPlanSelection.test.tsx src/features/issues/assigned-work/components/ExecutionPlanSelectionKeyboard.test.tsx src/features/issues/assigned-work/components/PlanSessionCard.test.tsx` passa; `pnpm --dir apps/web typecheck` sem erros
  - **Nota:** arrastar nativo (DEC-06): `draggable` na linha da tarefa e no cartão, `onDragOver` com `preventDefault` e `onDrop` no cartão e em "Sem sessão", com `dataTransfer` carregando o id da tarefa ou a chave da sessão. Testes que cobriam o seletor e o diálogo "Tarefas da nova sessão" são substituídos pelos novos casos; registre quais foram removidos e por quê (REQ-007).
- [x] **05.3 — "Começa depois de", condições no cartão e força com sessões**
  - **Arquivos:** `components/PlanSessionAfterField.tsx` (criar), `PlanSessionConditions.tsx` (criar), `PlanSessionState.tsx`, `PlanSessionFooter.tsx`, `PlanLaunchActions.tsx`, `PlanForceConfirm.tsx`, `planStateModel.ts`, `planStateModel.test.ts`, `planCopy.ts`, `components/PlanSessionConditions.test.tsx` (criar), `components/ExecutionPlanEditorReadOnly.test.tsx`, `components/TerminalLaunchPlanItem.test.tsx`
  - **Testes:** V-08f, V-08g, V-08h, V-08i, V-08j, V-08k
  - **Pronto quando:** `pnpm --dir apps/web exec vitest run src/features/issues/assigned-work/components/PlanSessionConditions.test.tsx src/features/issues/assigned-work/planStateModel.test.ts src/features/issues/assigned-work/components/ExecutionPlanEditorReadOnly.test.tsx src/features/issues/assigned-work/components/TerminalLaunchPlanItem.test.tsx` passa; `pnpm --dir apps/web typecheck` sem erros

## Detalhes de implementação
O editor atual: `ExecutionPlanEditor.tsx` monta `PlanSessionCard` por item, `UnassignedTasks` e `PlanSessionTasksHost` (diálogo da Issue #8). `planEditHandlers.ts` liga as operações do modelo ao `edit` de `useExecutionPlan`. O texto das condições depende da visão salva (`waitingSessions`, `blockedBy`) para sessões salvas; para a numeração, use a posição no rascunho. `ExecutionPlanEditor.tsx` tem linhas longas e 54 linhas: extraia a lista de cartões para `PlanSessionList.tsx` se crescer.

### Arquivos relevantes
- `apps/web/src/features/issues/assigned-work/planCopy.ts`: textos atuais do plano (`sessionTitle`, `CHOOSE_TASKS_LABEL`).
- `apps/web/src/features/issues/assigned-work/launchPurposeModel.ts`: `DEFAULT_CHOICE`.
- `apps/web/src/features/issues/assigned-work/components/PlanSessionTasksDialog.tsx`: diálogo "Tarefas da Sessão N".

### Arquivos afetados
- Os listados nas mini-tarefas; `PlanTaskSessionSelect.tsx` é removido.

### Decisões relacionadas
- DEC-06: arrastar e soltar nativo, sem `@dnd-kit`; o e2e usa `dragTo`.
- DEC-04: `after` vai em posições no save; o rascunho guarda chaves.

## Premissas
- "Adicionar tarefas" é o novo rótulo do botão que hoje abre o diálogo da Issue #8 (`CHOOSE_TASKS_LABEL`).
- O nome acessível dos alvos de soltura é o título do cartão ("Sessão N") e "Sem sessão".

## Testes atribuídos
- [x] V-07a: rascunho sem sessões → `addEmptySession` duas vezes → duas sessões com `taskIds: []`, `after: []` e `DEFAULT_CHOICE`, chaves distintas · modelo puro
- [x] V-07b: 01 em "Sem sessão" e Sessão 1 vazia → `moveTask(01 → Sessão 1)` → Sessão 1 com a 01; mover a 01 de volta para `{ kind: "none" }` → Sessão 1 vazia continua no rascunho · puro
- [x] V-07c: tarefa numa sessão iniciada ou destino iniciado → `moveTask` devolve o rascunho igual · puro
- [x] V-07d: Sessão 2 com a 02 e a 03 → `removeFromSession(02)` e `removeFromSession(03)` → Sessão 2 vazia continua; 02 e 03 não estão em nenhuma sessão · puro
- [x] V-07e: Sessão 3 com `after` = [Sessão 2] → `removeSession(Sessão 2)` → Sessão 2 some, as tarefas dela ficam sem sessão, e a Sessão 3 tem `after: []` · puro
- [x] V-07f: Sessões 1, 2, 3 → `moveSession(Sessão 3, to: 1)` → ordem Sessão 3, 1, 2 (US-02 cen. 1); "Subir" na primeira e "Descer" na última não mudam nada; sessão iniciada não se move · puro
- [x] V-07g: Sessão 3 com `after` = [Sessão 2]; `moveSession(Sessão 3, to: 2)` → a Sessão 3 (agora 2ª) perde o `after` para a antiga Sessão 2 (agora depois dela) · puro
- [x] V-07h: `setAfter(Sessão 3, [Sessão 1])` → `after` gravado; chave de sessão posterior é ignorada · puro
- [x] V-07i: rascunho com Sessão 1 (id salvo), Sessão 2 nova e Sessão 3 nova com `after` = [Sessão 1, Sessão 2] → `toSaveInput` dá à Sessão 3 `after: [1, 2]` e omite o `id` das novas · puro
- [x] V-07j: Sessões 2 e 3 com condições → "Todas numa sessão" e "Uma sessão por tarefa" substituem as não iniciadas e nenhuma condição sobra; "Mesmo modelo para todas" mantém as condições · puro
- [x] V-07k: `setSessionTasks` da Sessão 2 com nenhuma tarefa marcada → a Sessão 2 continua no rascunho, vazia (REQ-004) · puro
- [x] V-08a: plano sem sessões, tarefas 01–03 → clicar "Nova sessão" duas vezes → "Sessão 1" e "Sessão 2", cada uma com "Sem tarefas. Arraste tarefas para cá ou use Adicionar tarefas.", e nenhum `dialog` aberto (US-01 cen. 1) · RTL
- [x] V-08b: nenhum elemento com nome "Sessão da tarefa 01" na tela; não há opção "Nova sessão" por tarefa (REQ-007) · RTL
- [x] V-08c: `fireEvent.dragStart` na linha da 01 em "Sem sessão" e `fireEvent.drop` na região "Sessão 1" → a 01 aparece na Sessão 1; em "Adicionar tarefas" da Sessão 2, marcar 02 e 03 e aplicar → elas aparecem na Sessão 2, e "Sem sessão" some (US-01 cen. 2) · RTL
- [x] V-08d: "Remover da sessão" na 02 e na 03 → a Sessão 2 continua com o texto de vazia, e 02 e 03 aparecem em "Sem sessão" (US-01 cen. 3); "Remover sessão" tira o cartão · RTL
- [x] V-08e: só pelo teclado, "Descer" na Sessão 1 → os títulos passam a "Sessão 1" (antiga 2) e "Sessão 2" (antiga 1); "Subir" da primeira e "Descer" da última desabilitados; os alvos de soltura têm nome acessível (NFR-03) · RTL
- [x] V-08f: três sessões → a primeira não tem "Começa depois de"; a Sessão 3 tem caixas "Sessão 1" e "Sessão 2", desmarcadas; marcar "Sessão 1" → o cartão mostra "Começa depois de: Sessão 1" (US-02 cen. 3) · RTL
- [x] V-08g: visão com a Sessão 2 (02, depende da 01 na Sessão 1) → "Aguarda a tarefa 01 (Sessão 1)" sem marcar nada (US-02 cen. 2); com 01 e 04 em sessões 1 e 2 → "Aguarda as tarefas 01, 04 (Sessões 1 e 2)"; tarefa sem sessão → "Aguarda a tarefa 03 (sem sessão)" · RTL
- [x] V-08h: sessão salva com `waitingSessions` = [Sessão 1] → estado "Bloqueada: aguardando Sessão 1" · RTL
- [x] V-08i: sessão vazia salva (`empty`) → estado "Sem tarefas" e sem botão "Iniciar" · RTL
- [x] V-08j: "Iniciar mesmo assim" numa sessão que aguarda a 01 e a Sessão 1 → confirmação "A sessão depende de tarefas ou sessões não concluídas: 01, Sessão 1. Iniciar mesmo assim?" · RTL
- [x] V-08k: leitura por membro (`canEdit: false`) → vê sessões, "Começa depois de: Sessão 1" e "Aguarda…", sem "Nova sessão", "Adicionar tarefas", "Remover…", "Subir", "Descer" nem caixas; as linhas não são arrastáveis · RTL
- [x] V-11b: os casos atuais de `ExecutionPlanEditor*`, `PlanSessionCard`, `planSelectionModel` e `TerminalLaunchPlanItem` que continuam válidos passam sem mudar o oráculo; os que cobriam o seletor por tarefa e "Tarefas da nova sessão" foram substituídos e listados no Registro de execução · RTL

## Critérios de sucesso
- Todas as mini-tarefas marcadas, cada uma com o "Pronto quando" executado.
- Todos os testes atribuídos implementados e passando.
- O plano é montado só por "Nova sessão", arrastar, "Adicionar tarefas" e os atalhos; `PlanTaskSessionSelect.tsx` não existe mais.
- `pnpm --dir apps/web typecheck` e `pnpm --dir apps/web lint` sem erros; nenhum arquivo acima de 100 linhas.

## Registro de execução
<!-- Uma entrada por mini-tarefa: data, o que foi feito, comandos e resultado, desvios. -->
- 2026-11-26 · 05.1 · `EditableItem.after` (chaves), `planSessionModel.ts` (`addEmptySession`, `removeFromSession`, `removeSession`, `moveSession`, `setAfter`), `emptySession` e `toSaveInput` com posições em `planEditorModel.ts`, `setSessionTasks` mantém a sessão vazia, `createSessionWith` e `MoveTarget` "new" removidos, novos handlers em `planEditHandlers.ts` · `vitest run planSessionModel.test.ts planEditorModel.test.ts planSelectionModel.test.ts` → 25 passaram · desvio: os casos antigos V-35r, "chave sem colisão por moveTask new", V-01b/V-01c (sessão vazia sumia) e o bloco `createSessionWith` (V-01h–k) foram trocados ou removidos, porque a REQ-004/REQ-007/REQ-008 mudam esse comportamento.
- 2026-11-26 · 05.2 · `planDragData.ts` (arrastar nativo com tipos próprios), `PlanSessionCard` (alvo de soltura com nome "Sessão N", arrastável), `PlanSessionOrderActions` (Adicionar tarefas, Subir, Descer, Remover sessão), `PlanTaskRow` com "Remover da sessão", `UnassignedTasks` como alvo, `PlanNewSessionButton` sem diálogo, `PlanSessionList.tsx` (extraído do editor), `PlanTaskSessionSelect.tsx` removido, diálogo sem o modo "nova sessão", helpers `dragOnto`/`taskRow`/`removeFromSession` em `src/test/planEditor.tsx` · `vitest run src/features/issues/assigned-work` → 409 passaram, depois `ExecutionPlanMolds.test.tsx` → 5 passaram · desvio (V-11b): `ExecutionPlanNewSession.test.tsx` (V-02f/V-02g, diálogo "Tarefas da nova sessão") foi removido pela REQ-007; nos testes que usavam o seletor por tarefa (`ExecutionPlanEditor.test.tsx`, `PlanFolderChange.test.tsx`) o mesmo movimento passou a ser feito por "Adicionar tarefas", "Remover da sessão" ou arrastar, com o mesmo oráculo; V-02c agora espera a sessão vazia mantida; V-02i volta o foco a "Adicionar tarefas"; os payloads esperados ganharam `after: []`.
- 2026-11-26 · 05.3 · `planConditionsModel.ts`, `PlanSessionAfterField`, `PlanSessionConditions`, estado "Sem tarefas", bloqueio por sessão em `planStateText`, `forceWaits` no "Iniciar mesmo assim" · `vitest run … PlanSessionConditions.test.tsx` → 6 passaram; `pnpm --dir apps/web typecheck` e `eslint src/features/issues/assigned-work src/test` sem erros · desvio: a confirmação de força passou a usar sempre "A sessão depende de tarefas ou sessões não concluídas: …" (REQ-013); o V-40q de `PlanSessionCard.test.tsx` foi atualizado para esse texto.

