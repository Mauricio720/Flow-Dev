---
status: completed
title: Diálogo de tarefas da sessão no plano
type: frontend
complexity: medium
---

# Task 02: Diálogo de tarefas da sessão no plano

## Visão geral
Esta tarefa entrega o que a pessoa vê e usa. Cada sessão não iniciada ganha "Escolher tarefas", e o plano ganha "Nova sessão". As duas ações abrem o diálogo modal `PlanSessionTasksDialog`, com uma caixa de seleção por tarefa. "Aplicar" e "Criar sessão" mudam só o rascunho, usando a regra pura da Task 01. O plano continua indo ao servidor só por "Salvar". A tarefa termina com a conferência no navegador (V-04) e com a suíte completa do pacote.

<critical>
- LEIA a spec (`docs/specs/selecao-de-tarefas-por-sessao/spec.md`) e as regras do projeto (`AGENTS.md`, `apps/web/AGENTS.md`, `.claude/rules/code-standards.md`) antes de começar. Leia também a skill `nextjs-folder-structure`, porque esta tarefa cria componente e hook. A spec D (`docs/specs/tarefas-e-plano-de-execucao/spec.md`) é a base; os IDs "D-" vêm dela.
- FAÇA UMA MINI-TAREFA POR VEZ, na ordem. Só marque `[x]` depois de rodar o "Pronto quando" dela e ver passar.
- NÃO saia dos arquivos listados sem registrar o motivo no Registro de execução. Nada fora do escopo da spec.
- TESTES JUNTO COM O CÓDIGO: cada mini-tarefa implementa os testes atribuídos a ela, seguindo a skill de testes do projeto (`.claude/skills/software-testing/SKILL.md`). Isso quer dizer: asserção sobre o efeito observável e específico, nada de `toBeTruthy` ou de só checar que não lança exceção; valor esperado tirado da spec, nunca recalculado a partir do código; dublês só em dependências lentas, variáveis ou externas; relógio e aleatoriedade controlados. Em bug, reproduza antes de corrigir.
- Ao começar, mude `status` para `in_progress` (aqui e em `_tasks.md`). Mude para `completed` só quando todas as mini-tarefas estiverem marcadas e os critérios de sucesso tiverem sido comprovados por comando. A revisão contra a spec acontece uma vez, depois de todas as tarefas: não a espere aqui, mas não marque nada que não tenha prova, porque ela vai conferir.
</critical>

## Requisitos
- REQ-001: ENQUANTO a pessoa puder editar o plano (D-REQ-107, ou seja `view.canEdit && !reader`), cada sessão não iniciada DEVE oferecer "Escolher tarefas", e o plano DEVE oferecer "Nova sessão".
- REQ-002: acionar uma delas DEVE abrir o diálogo, com o título "Tarefas da Sessão N" ou "Tarefas da nova sessão". O diálogo lista todas as tarefas do conjunto na ordem do manifesto (`set.tasks`). Cada uma tem uma caixa "NN — Título" e o lugar atual: "Sem sessão", "Está na Sessão N" ou "Sessão N · iniciada".
- REQ-003: o diálogo DEVE abrir com marcadas exatamente as tarefas da própria sessão (nenhuma, em "Nova sessão"). As tarefas de sessões iniciadas ficam desabilitadas.
- REQ-004 (ligação): "Aplicar" chama `setSessionTasks` sobre o rascunho e fecha o diálogo.
- REQ-005 (ligação): "Criar sessão" chama `createSessionWith` sobre o rascunho e fecha o diálogo.
- REQ-006: em "Nova sessão", "Criar sessão" DEVE ficar desabilitado enquanto nenhuma tarefa estiver marcada.
- REQ-007: "Cancelar" ou Esc DEVEM fechar o diálogo sem mudar o rascunho. Ao fechar por qualquer caminho, o foco DEVE voltar à ação que o abriu.
- REQ-008: o diálogo DEVE mudar só o rascunho. Nada vai ao servidor até "Salvar" (D-DEC-25).
- DEC-02: o diálogo é modal, como o `TerminalLaunchDialog`, e usa `useDialogFocus`. Com ele aberto, o resto do plano não é editável.
- Não muda (spec, "Comportamento que não muda"), provado pela V-03 e pelas V-02k e V-02l:
  - o seletor "Sessão da tarefa NN";
  - os três atalhos;
  - a escolha de agente, modelo e esforço por sessão;
  - a seção "Sem sessão";
  - o modo leitura;
  - o uso do plano inteiro pelo teclado (D-NFR-17);
  - as mensagens de recusa do servidor ao salvar;
  - as tarefas concluídas, que continuam escolhíveis.

## Interfaces
- **Consome:**
  - da Task 01, `placeOf`, `setSessionTasks`, `createSessionWith` e `TaskPlace` (`planSelectionModel.ts`);
  - `useDialogFocus(open, busy, onClose, { trigger, dialog, heading })` de `apps/web/src/hooks/useDialogFocus.ts`;
  - `EditablePlan` e `EditableItem` (`planContract.ts`), `TaskItem` (`taskSetContract.ts`);
  - `edit` de `useExecutionPlan`;
  - de `planCopy.ts`, as constantes `APPLY_LABEL`, `NEW_SESSION_LABEL`, `NO_SESSION_LABEL`, `STARTED_NOTE` e `sessionTitle`.
- **Produz:**
  - em `planEditHandlers.ts`, dois handlers novos em `planEditHandlers(edit, taskIds)`:
    - `setTasks: (key: string, taskIds: string[]) => void`;
    - `createSession: (taskIds: string[]) => void`;
  - em `planCopy.ts`:
    - `CHOOSE_TASKS_LABEL = "Escolher tarefas"`, `CREATE_SESSION_LABEL = "Criar sessão"`, `CANCEL_LABEL = "Cancelar"`, `NEW_SESSION_TASKS_TITLE = "Tarefas da nova sessão"`;
    - `sessionTasksTitle(position)` → "Tarefas da Sessão N";
    - `taskChoiceLabel(number, title)` → "NN — Título";
    - `inSessionText(position)` → "Está na Sessão N";
    - `startedPlaceText(position)` → "Sessão N · iniciada";
  - o componente `PlanSessionTasksDialog` (`components/PlanSessionTasksDialog.tsx`). Ele recebe:
    - o alvo `{ kind: "item"; key: string; position: number } | { kind: "new" }`;
    - `plan`, `tasks: TaskItem[]` e o `trigger` (`RefObject<HTMLButtonElement | null>`);
    - `onApply(taskIds: string[])` e `onClose()`;
  - o hook `usePlanSelectionDialog` (`hooks/usePlanSelectionDialog.ts`). Ele guarda o alvo aberto e o botão que abriu o diálogo, e expõe `open(target, button)` e `close()`.

## Mini-tarefas

- [x] **02.1 — "Escolher tarefas" numa sessão existente, com "Aplicar"**
  - **Arquivos:**
    - `apps/web/src/features/issues/assigned-work/planCopy.ts` (constantes acima);
    - `apps/web/src/features/issues/assigned-work/planEditHandlers.ts` (`setTasks`);
    - `apps/web/src/features/issues/assigned-work/components/PlanSessionTasksDialog.tsx` (criar);
    - `apps/web/src/features/issues/assigned-work/components/PlanSessionTaskChoice.tsx` (criar; a linha com a caixa, o rótulo e o lugar, se o diálogo passar de 30 linhas por função);
    - `apps/web/src/features/issues/assigned-work/hooks/usePlanSelectionDialog.ts` (criar);
    - `apps/web/src/features/issues/assigned-work/components/PlanSessionCard.tsx` (botão "Escolher tarefas" quando `editable`, com uma prop `onChooseTasks(button)`);
    - `apps/web/src/features/issues/assigned-work/components/ExecutionPlanEditor.tsx` (abre e renderiza o diálogo);
    - `apps/web/src/test/planEditor.tsx` (helpers `openSessionTasks(position)` e `taskChoice(number)`);
    - `apps/web/src/features/issues/assigned-work/components/ExecutionPlanSelection.test.tsx` (criar).
  - **Testes:** V-02a, V-02b, V-02c, V-02d, V-02e
  - **Pronto quando:** `pnpm --dir apps/web exec vitest run src/features/issues/assigned-work/components/ExecutionPlanSelection.test.tsx src/features/issues/assigned-work/components/ExecutionPlanEditor.test.tsx src/features/issues/assigned-work/components/PlanSessionCard.test.tsx` passa.
- [x] **02.2 — "Nova sessão" no plano, com "Criar sessão"**
  - **Arquivos:**
    - `planCopy.ts` (se faltar algo);
    - `planEditHandlers.ts` (`createSession`);
    - `components/PlanSessionTasksDialog.tsx` (título, nada marcado e botão desabilitado no alvo `new`);
    - `components/ExecutionPlanEditor.tsx` (botão "Nova sessão" abaixo da lista de sessões, só quando `canEdit`);
    - `components/ExecutionPlanNewSession.test.tsx` (criar).
  - **Testes:** V-02f, V-02g
  - **Pronto quando:** `pnpm --dir apps/web exec vitest run src/features/issues/assigned-work/components/ExecutionPlanNewSession.test.tsx src/features/issues/assigned-work/components/ExecutionPlanSelection.test.tsx` passa.
- [x] **02.3 — Cancelar, Esc, foco, teclado, modo leitura e erro do servidor**
  - **Arquivos:**
    - `components/PlanSessionTasksDialog.tsx` (Cancelar e a volta do foco, se 02.1 ainda não fez);
    - `hooks/usePlanSelectionDialog.ts`;
    - `components/ExecutionPlanSelectionKeyboard.test.tsx` (criar).
  - **Testes:** V-02h, V-02i, V-02j, V-02k, V-02l, V-02m, V-03a, V-03b, V-03c, V-03d
  - **Pronto quando:** `pnpm --dir apps/web exec vitest run src/features/issues/assigned-work/components/ExecutionPlanSelectionKeyboard.test.tsx src/features/issues/assigned-work/planEditorModel.test.ts src/features/issues/assigned-work/components/ExecutionPlanEditor.test.tsx src/features/issues/assigned-work/components/ExecutionPlanEditorReadOnly.test.tsx src/features/issues/assigned-work/components/PlanSessionCard.test.tsx` passa, e `git diff --stat` não mostra mudança nesses quatro arquivos de teste atuais. Além disso, `pnpm --dir apps/web typecheck` sem erros.
- [x] **02.4 — Conferência no navegador e suíte completa**
  - **Arquivos:** nenhum de código. Registre o resultado no Registro de execução.
  - **Testes:** V-04a, V-04b, V-04c
  - **Pronto quando:** as três conferências estão anotadas, cada uma com o resultado (ver "Premissas" sobre o conjunto de 30 tarefas). `pnpm --dir apps/web test`, `pnpm --dir apps/web typecheck` e `pnpm lint` passam.

## Detalhes de implementação
- **Padrão do diálogo:** espelhe `components/TerminalLaunchDialog.tsx`:
  - `<dialog open aria-modal="true" aria-labelledby=…>`;
  - um título `h2` com `ref` e `tabIndex={-1}`;
  - `useDialogFocus(true, false, close, { trigger, dialog, heading })`;
  - `close` chama `onClose()` e depois `requestAnimationFrame(() => trigger.current?.focus())`.

  A lista precisa rolar dentro do diálogo com 30 tarefas (`max-h-[calc(100vh-2rem)] overflow-y-auto`, como no modelo).
- **Estado das marcas:** as marcas são estado local do diálogo, iniciado na abertura com as tarefas de `placeOf`, cuja chave é a do alvo. Se o plano for relido a cada 5 s, as marcas não mudam enquanto o diálogo está aberto. "Aplicar" envia as marcas atuais. A regra da Task 01 ignora as tarefas iniciadas e uma chave que sumiu.
- **Caixas:** use `<input type="checkbox">` nativo com `<label>`, para o Espaço funcionar sem código extra. O nome acessível é "NN — Título", e o lugar vai como texto ao lado (ou `aria-describedby`). A tarefa de sessão iniciada usa `disabled`. Use os tokens de `apps/web/DESIGN.md` e o `Button` de `@/components/ui/button`, como em `PlanShortcuts.tsx`.
- **Foco por botão:** há um botão "Escolher tarefas" por cartão. Por isso, `usePlanSelectionDialog` guarda num `useRef<HTMLButtonElement | null>` o botão recebido em `open(target, event.currentTarget)` e passa esse ref como `trigger`.
- **Limites do AGENTS.md:** `ExecutionPlanEditor` já tem cerca de 27 linhas na função. O estado do diálogo vai para o hook, e a renderização do diálogo pode ir para um componente pequeno, para manter cada função com no máximo 30 linhas e cada arquivo com menos de 100. Os arquivos de teste novos também ficam com menos de 100 linhas, por isso os casos estão divididos em três arquivos.
- **Consultas nos testes:**
  - os três atalhos e o diálogo têm um botão "Aplicar", então consulte `within(screen.getByRole("dialog"))`;
  - "Escolher tarefas" se repete por cartão, então consulte dentro do `listitem` da sessão, em `screen.getByRole("list", { name: "Sessões do plano" })`;
  - "Nova sessão" também é uma opção do seletor, então use `getByRole("button", { name: "Nova sessão" })`.
- **Mocks:** os testes de tela usam `mountEditor` e o tRPC simulado de `src/test/planEditor.tsx`, com `vi.useFakeTimers({ shouldAdvanceTime: true })`, como os testes atuais. O diálogo e a regra não são substituídos por dublês.

### Arquivos relevantes
- `apps/web/src/features/issues/assigned-work/components/TerminalLaunchDialog.tsx`: o padrão do modal e do foco.
- `apps/web/src/hooks/useDialogFocus.ts`: Esc e a armadilha de Tab dentro do `<dialog>`.
- `apps/web/src/features/issues/assigned-work/components/ExecutionPlanEditor.tsx`: onde `canEdit`, `edits` e os cartões são montados.
- `apps/web/src/features/issues/assigned-work/components/PlanSessionCard.tsx`: `editable = canEdit && !item.started` define quem mostra "Escolher tarefas".
- `apps/web/src/features/issues/assigned-work/components/PlanShortcuts.tsx`: o estilo de botões secundários.
- `apps/web/src/features/issues/assigned-work/components/ExecutionPlanEditor.test.tsx` e `ExecutionPlanEditorReadOnly.test.tsx`: o formato dos testes de tela e o payload esperado de `tasks.plan.save`.
- `apps/web/src/test/planEditor.tsx`, `src/test/plan.ts`, `src/test/taskSet.ts`, `src/test/terminal.ts`: `SET` (01 Esquema, 02 Rotas, que depende de 01, 03 Tela, 04 Docs), `twoSessions`, `planItemOf`, `OPUS_MAX_INPUT` e `terminalRejection`.

### Arquivos afetados
- `planCopy.ts`, `planEditHandlers.ts`, `PlanSessionCard.tsx` e `ExecutionPlanEditor.tsx`: alterados.
- `PlanSessionTasksDialog.tsx`, `PlanSessionTaskChoice.tsx` (se precisar) e `usePlanSelectionDialog.ts`: novos.
- `src/test/planEditor.tsx`: helpers novos. Os existentes não mudam.
- Três arquivos de teste novos.

### Decisões relacionadas
- DEC-01: só a tela muda; nenhum arquivo de `packages/api` é tocado.
- DEC-02 (confirmada em 2026-11-24): o diálogo modal, e com ele aberto o resto do plano não é editável.

## Premissas
- **DEC-02:** confirmada por você em 2026-11-24 (diálogo modal).
- **Lugar de "Nova sessão":** a spec só diz que o plano oferece a ação. O botão fica logo abaixo da lista de sessões, acima de "Sem sessão", e aparece também quando o plano não tem sessões.
- **Conjunto de 30 tarefas (V-04b):** se nenhum projeto de desenvolvimento tiver um conjunto com 30 tarefas, monte um temporário num repositório de teste (30 arquivos `task_NN.md` e um `_tasks.md` válidos, conferidos com o `tasks_status.py`). Não faça commit dele neste repositório. A preparação do ambiente local está na memória "Flow Dev local E2E setup".
- **Sem e2e novo:** `e2e/task-plan.spec.ts` está em `test.fixme`, e a spec descarta e2e novo e integração nova.

## Testes atribuídos
Fronteira dos casos V-02: o `ExecutionPlanEditor` real, com o diálogo, a regra e os componentes reais, renderizado com RTL. Só o tRPC é simulado, por `src/test/planEditor.tsx`. O plano padrão é `twoSessions()`: Sessão 1 = A (01, 03) e Sessão 2 = B (02, 04), não iniciadas, versão 3.
- [x] V-02a (cenário 1, REQ-001 a REQ-003): no plano padrão, "Escolher tarefas" da Sessão 1 → abre o diálogo "Tarefas da Sessão 1", com quatro caixas na ordem "01 — Esquema", "02 — Rotas", "03 — Tela" e "04 — Docs". A 01 e a 03 estão marcadas, e a 02 e a 04 estão desmarcadas, ao lado do texto "Está na Sessão 2".
- [x] V-02b (cenário 2, REQ-004 e REQ-008): no diálogo da V-02a, desmarcar a 03, marcar a 04 e acionar "Aplicar" → o diálogo fecha. A Sessão 1 mostra Esquema e Docs, a Sessão 2 mostra Rotas, e "Sem sessão" mostra Tela. `tasks.plan.save` não foi chamado. Depois de "Salvar", ele é chamado uma vez com `{ ...SCOPE, version: 3, items: [{ id: A, taskIds: ["task_01", "task_04"], choice: OPUS_MAX_INPUT }, { id: B, taskIds: ["task_02"], choice: OPUS_MAX_INPUT }] }`.
- [x] V-02c (REQ-004, a sessão que fica vazia sai): no plano padrão, abrir "Escolher tarefas" da Sessão 2, desmarcar a 02 e a 04 e aplicar → o contador mostra "1 sessão", há só o cartão "Sessão 1", e "Sem sessão" lista Rotas e Docs.
- [x] V-02d (cenário 4, REQ-001 e REQ-003): Sessão 1 = A (01) iniciada (`started: true, state: "running"`) e Sessão 2 = B (02); 03 e 04 sem sessão. O cartão da Sessão 1 não tem "Escolher tarefas", e o da Sessão 2 tem. No diálogo da Sessão 2, a caixa "01 — Esquema" está desabilitada, com "Sessão 1 · iniciada".
- [x] V-02e (REQ-002, lugar "Sem sessão"): `planOf([planItemOf(A, ["task_01", "task_03"]), planItemOf(B, ["task_02"])], { unassigned: ["task_04"] })`. No diálogo da Sessão 2, a 04 aparece desmarcada com "Sem sessão", e a 01 com "Está na Sessão 1".
- [x] V-02f (cenário 3, REQ-001, REQ-005 e REQ-006): plano vazio (`planOf([], { unassigned: [as quatro] })`) → existe o botão "Nova sessão". Ao acioná-lo, abre "Tarefas da nova sessão", sem nenhuma caixa marcada, e "Criar sessão" está desabilitado. Ao marcar a 01 e a 02, "Criar sessão" fica habilitado. Ao criar, aparece o cartão "Sessão 1" com Esquema e Rotas, e os campos Agente, Modelo e Esforço mostram Claude Code, `opus` e `max`. "Sem sessão" fica com Tela e Docs.
- [x] V-02g (REQ-005, as tarefas saem de onde estavam e a sessão entra no fim): no plano padrão, "Nova sessão", marcar a 03 e criar → os cartões ficam "Sessão 1" (Esquema), "Sessão 2" (Rotas, Docs) e "Sessão 3" (Tela). Depois de "Salvar", o payload é `items: [{ id: A, taskIds: ["task_01"], … }, { id: B, taskIds: ["task_02", "task_04"], … }, { taskIds: ["task_03"], choice: OPUS_MAX_INPUT }]`.
- [x] V-02h (cenário 5, REQ-007 e D-NFR-17): só com o teclado (`userEvent.tab`, `userEvent.keyboard(" ")` e `"{Escape}"`), focar "Escolher tarefas" da Sessão 1 e abri-lo, chegar à caixa "02 — Rotas" e marcá-la com Espaço (ela fica marcada), desmarcá-la com Espaço, e então apertar Esc → o diálogo some. A Sessão 1 continua com Esquema e Tela, `document.activeElement` é o botão "Escolher tarefas" da Sessão 1, e "Salvar" continua desabilitado (rascunho sem mudança).
- [x] V-02i (REQ-007, Cancelar e o foco em "Nova sessão"): no plano padrão, abrir "Nova sessão", marcar a 03 e acionar "Cancelar" → o diálogo some. Continuam dois cartões, com as tarefas de antes, o foco volta ao botão "Nova sessão", e "Salvar" está desabilitado.
- [x] V-02j (REQ-008 e "não muda": a recusa do servidor): `tasks.plan.save` é rejeitado com `terminalRejection("plan_invalid_order", "A tarefa 02 depende da 01, que está numa sessão posterior.", "BAD_REQUEST")`. Pelo diálogo, a Sessão 1 fica com [02, 03] e a Sessão 2 com [01, 04]. Ao acionar "Salvar", o `alert` mostra exatamente "A tarefa 02 depende da 01, que está numa sessão posterior.".
- [x] V-02k (cenário 6 e modo leitura): `mountEditor(twoSessions(), true)` (quem só acompanha) e, num segundo caso, `twoSessions({ canEdit: false })` → nenhum botão "Escolher tarefas" nem "Nova sessão" na página.
- [x] V-02l ("não muda": as concluídas continuam escolhíveis): um conjunto em que a 03 tem `status: "completed"` → no diálogo da Sessão 2, a caixa "03 — Tela" está habilitada e pode ser marcada. Ao aplicar, a Sessão 2 passa a mostrar Tela.
- [x] V-02m (DEC-02: com o diálogo aberto, o resto do plano fica de fora): no diálogo aberto, Tab a partir do último elemento focável → o foco vai para o primeiro elemento focável do próprio diálogo, e não para os seletores "Sessão da tarefa NN" do plano.
- [x] V-03a: `planEditorModel.test.ts` passa sem mudança de asserção.
- [x] V-03b: `ExecutionPlanEditor.test.tsx` passa sem mudança de asserção, o que prova que o seletor por tarefa e as mensagens do servidor continuam.
- [x] V-03c: `ExecutionPlanEditorReadOnly.test.tsx` passa sem mudança de asserção, o que prova que os atalhos, a escolha por sessão e o modo leitura continuam.
- [x] V-03d: `PlanSessionCard.test.tsx` passa sem mudança de asserção, o que prova que os estados e as ações de início continuam.
- [ ] V-04a (navegador, conjunto real): pelo diálogo, montar uma sessão com duas tarefas, salvar e recarregar a página → a sessão continua com as duas tarefas, em Claude Code · Opus · Máximo. **Não executado por decisão do usuário em 2026-11-24 (ver Registro de execução).**
- [ ] V-04b (navegador, 30 tarefas): no diálogo de um conjunto com 30 tarefas, a lista rola dentro do diálogo, e "Aplicar" e "Cancelar" continuam alcançáveis e visíveis numa janela de 1280×720 e numa de 390×844. **Não executado por decisão do usuário em 2026-11-24 (ver Registro de execução).**
- [ ] V-04c (navegador, foco visível): navegando só com Tab pelo diálogo, cada caixa e cada botão mostram um anel de foco visível, e o foco volta ao botão de origem ao fechar. **Não executado por decisão do usuário em 2026-11-24 (ver Registro de execução).**

## Critérios de sucesso
- Todas as mini-tarefas marcadas, cada uma com o "Pronto quando" executado.
- Todos os testes atribuídos implementados e passando; os testes de V-03 passam sem nenhuma linha alterada.
- Nada em `packages/api` foi alterado (`git diff --stat packages/api` vazio).
- Arquivos `.ts` e `.tsx` novos ou alterados com menos de 100 linhas, funções com no máximo 30 linhas e nenhum comentário.
- `pnpm --dir apps/web test`, `pnpm --dir apps/web typecheck` e `pnpm lint` passam, e o V-04 foi conferido uma vez e registrado.

## Registro de execução
<!-- Uma entrada por mini-tarefa: data · mini-tarefa · o que foi feito · comandos e resultado · desvios. -->
- 2026-11-24 · 02.1 · "Escolher tarefas" por sessão não iniciada, com o diálogo `PlanSessionTasksDialog` (+ `PlanSessionTaskChoice`), o hook `usePlanSelectionDialog`, o handler `setTasks`, as constantes de `planCopy.ts`, os helpers `sessionCard`, `openSessionTasks`, `taskChoice` e `applyChoice` em `src/test/planEditor.tsx` e os testes V-02a a V-02e em `ExecutionPlanSelection.test.tsx`. · `pnpm --dir apps/web exec vitest run src/features/issues/assigned-work/components/ExecutionPlanSelection.test.tsx src/features/issues/assigned-work/components/ExecutionPlanEditor.test.tsx src/features/issues/assigned-work/components/PlanSessionCard.test.tsx` → 3 arquivos, 16 testes passando. · Desvios, todos para respeitar os limites de 30 linhas por função e 100 por arquivo: `ExecutionPlanEditor` já estava com 29 linhas, então o cabeçalho saiu para `components/PlanHeader.tsx` e a renderização do diálogo para `components/PlanSessionTasksHost.tsx`; o tipo `SelectionTarget` ficou em `planContract.ts`; `createSession` já entrou em `planEditHandlers.ts` junto com `setTasks`, mas só a 02.2 o liga à tela.
- 2026-11-24 · 02.2 · Botão "Nova sessão" (`components/PlanNewSessionButton.tsx`), abaixo da lista de sessões e acima de "Sem sessão", só com `canEdit`; o diálogo no alvo `new` (título, nada marcado, "Criar sessão" desabilitado sem marcas) e o `createSession` ligado pelo `PlanSessionTasksHost`; testes V-02f e V-02g em `ExecutionPlanNewSession.test.tsx`. · `pnpm --dir apps/web exec vitest run src/features/issues/assigned-work/components/ExecutionPlanNewSession.test.tsx src/features/issues/assigned-work/components/ExecutionPlanSelection.test.tsx` → 2 arquivos, 7 testes passando. · Desvio: o botão ficou num componente próprio (`PlanNewSessionButton.tsx`, fora da lista da mini-tarefa) para manter `ExecutionPlanEditor` com no máximo 30 linhas; `PlanSessionTasksDialog.tsx` já cobria o alvo `new` desde a 02.1.
- 2026-11-24 · 02.3 · Testes V-02h a V-02m em `ExecutionPlanSelectionKeyboard.test.tsx` (teclado com Tab, Espaço e Esc; Cancelar e volta do foco a "Nova sessão"; recusa `plan_invalid_order` do servidor; modo leitura e `canEdit: false`; tarefa concluída habilitada; Tab preso no diálogo). O código do Cancelar, do Esc e da volta do foco já vinha da 02.1 (`close` do diálogo + `useDialogFocus`), então nada de produção mudou aqui. · `pnpm --dir apps/web exec vitest run` nos 5 arquivos pedidos (o novo, `planEditorModel.test.ts`, `ExecutionPlanEditor.test.tsx`, `ExecutionPlanEditorReadOnly.test.tsx`, `PlanSessionCard.test.tsx`) → 33 testes passando; `git diff --stat` dos quatro testes atuais e de `packages/api` vazio; `pnpm --dir apps/web typecheck` sem erros (o primeiro typecheck apontou `task.number` e `task.title` anuláveis em `PlanSessionTaskChoice.tsx`, corrigido com `?? task.id`). · Desvios: `src/test/planEditor.tsx` ganhou o terceiro parâmetro opcional `set` em `mountEditor` (os usos existentes não mudam), para o V-02l montar um conjunto com a tarefa 03 concluída.
- 2026-11-24 · 02.4 (parcial; a mini-tarefa continua desmarcada) · Suíte e verificações estáticas: `pnpm --dir apps/web test` → 105 arquivos, 547 testes passando; `pnpm --dir apps/web typecheck` sem erros; `rtk proxy pnpm lint` → `eslint` sem erros, saída 0 (o `pnpm lint` direto devolveu só "ESLint output (JSON parse failed …)" pelo filtro de saída, e foi repetido sem filtro). · V-04a, V-04b e V-04c NÃO foram conferidos no navegador: a tela do trabalho só libera quem opera com a verificação do GitHub, e um usuário semeado não a tem (é o mesmo motivo de `e2e/task-plan.spec.ts` estar em `test.fixme`). Não foi montado conjunto de 30 tarefas nem alterado o app para contornar isso. Aguardando a decisão de como cumprir o V-04.
- 2026-11-24 · 02.4 (fechamento) · Decisão do usuário: fechar sem o V-04, porque a tela do trabalho exige a verificação do GitHub, que um usuário semeado não tem. `pnpm --dir apps/web test`, `typecheck` e `lint` passaram (entrada anterior). V-04a, V-04b e V-04c seguem sem conferência e ficam desmarcados na lista de testes: o "Pronto quando" da spec ("e o V-04 foi conferido uma vez") está cumprido só pela metade, e a revisão final deve tratá-lo como ressalva.
