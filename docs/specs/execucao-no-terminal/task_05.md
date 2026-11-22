---
status: completed
title: Diálogo de abertura no terminal
type: frontend
complexity: medium
---

# Task 05: Diálogo de abertura no terminal

## Visão geral
Na tela do trabalho com o planejamento aprovado, a pessoa operadora ganha a ação "Abrir no terminal". O diálogo mostra a pasta vinculada, a branch, os avisos e o prompt editável, e confirma a abertura. Depois de abrir, a tela troca "A próxima atividade ainda não foi iniciada." por "Execução aberta no terminal por <pessoa> às HH:MM". Os anexos entram no diálogo na task_06.

<critical>
- LEIA a spec (`spec.md`, US-02, REQ-005, REQ-006, REQ-008, REQ-009, REQ-010, REQ-011, REQ-012, REQ-013, REQ-015, REQ-038, REQ-040, §7.3, §7.4, §9, §15 `tasks.terminal.*`, B-01, B-03, B-04, NFR-05) e as regras do projeto (AGENTS.md/CLAUDE.md, `.agents/rules/code-standards.md`, `apps/web/AGENTS.md`, `apps/web/DESIGN.md`) antes de começar. Leia as skills `nextjs-folder-structure` e `trpc-nextjs`, e o guia do Next em `apps/web/node_modules/next/dist/docs/` para o que for usar.
- FAÇA UMA MINI-TAREFA POR VEZ, na ordem. Só marque `[x]` depois de rodar o "Pronto quando" dela e ver passar.
- NÃO saia dos arquivos listados sem registrar o motivo no Registro de execução. Nada fora do escopo da spec: o `AttachmentPicker` é da task_06.
- TESTES JUNTO COM O CÓDIGO: cada mini-tarefa implementa os testes atribuídos a ela.
- Ao começar, mude `status` para `in_progress` (aqui e em `_tasks.md`). Mude para `completed` só quando todas as mini-tarefas estiverem marcadas e os critérios de sucesso tiverem sido comprovados por comando. A revisão contra a spec acontece uma vez, depois de todas as tarefas: não a espere aqui, mas não marque nada que não tenha prova, porque ela vai conferir.
</critical>

## Requisitos
- REQ-005: ENQUANTO o planejamento estiver aprovado, o sistema DEVE oferecer a ação "Abrir no terminal" à pessoa operadora, e a ninguém mais.
- REQ-006: QUANDO a pessoa acionar a ação com vínculo válido, o sistema DEVE mostrar um diálogo com a pasta vinculada, a branch atual e o prompt pré-preenchido num campo editável.
- REQ-008: SE a pasta tiver mudanças não commitadas, ENTÃO o diálogo DEVE mostrar "Há mudanças não commitadas nesta pasta. O Claude vai trabalhar sobre elas." sem bloquear a abertura.
- REQ-009: SE a pessoa não tiver vínculo para o projeto, ENTÃO o diálogo DEVE explicar a falta, oferecer o caminho para as Configurações e não oferecer a confirmação.
- REQ-013 (UI): SE o prompt estiver vazio ou passar de 20.000 caracteres, ENTÃO o diálogo DEVE impedir a confirmação e mostrar o limite.
- REQ-015 (UI): duplo clique ou reenvio usam o mesmo `requestKey`.
- REQ-040 (UI): QUANDO a sessão abrir, a tarefa DEVE mostrar "Execução aberta no terminal por <pessoa> às HH:MM" no lugar de "A próxima atividade ainda não foi iniciada.".
- US-02 (1–5): cenários de aceite do diálogo.
- REQ-011, REQ-012, REQ-038, B-04 (UI): as recusas do servidor aparecem no diálogo com a mensagem do servidor.
- B-01: a ação some enquanto uma nova recomendação está em revisão e volta com a nova aprovação.
- B-03: com HEAD destacado, o diálogo mostra "HEAD destacado (a1b2c3d)" no lugar da branch.
- NFR-05 (diálogo): rótulos em todos os campos, foco preso, Esc fecha; o contador de caracteres e os erros são anunciados (`aria-live`).
- Não muda (§9), NM-06: QUANDO não houver sessão, a tela aprovada DEVE CONTINUAR A mostrar "A próxima atividade ainda não foi iniciada.".

## Interfaces
- **Consome (task_03):**
  - `trpc.tasks.terminal.preflight.query({ projectId, taskId })` → `{ checkout: { path; branch; detachedSha; dirty } | null; defaultPrompt; maxPromptLength; issueImages }`;
  - `trpc.tasks.terminal.open.mutate({ projectId, taskId, prompt, requestKey, attachmentIds: [], issueImageIds: [] })` → `{ sessionId; unavailableIssueImages }`;
  - `tasks.byId` com `terminal.lastOpened: { userName; openedAt } | null`;
  - as mensagens dos motivos novos em `TRPCError.message`.
- **Consome (existente):**
  - `TaskDetail` e `withOperatorPermissions` (`apps/web/src/features/issues/assigned-work/contract.ts` e `planningPermissions.ts`);
  - `PlanningActions` (`components/PlanningActions.tsx`) e `PlanningDecisionView` (`components/PlanningDecisionView.tsx`);
  - `ROUTE_NEXT_NOTE` (`planningCopy.ts`);
  - `projectSettingsPath(projectId)` (`apps/web/src/lib/navigation/projectRoutes.ts`);
  - `useDialogFocus` (`apps/web/src/features/issues/issue-deletion/useDialogFocus.ts`);
  - `Button` e `Textarea` (`apps/web/src/components/ui/`).
- **Produz** (usado pela task_06):
  - `planning.permissions.canOpenTerminal: boolean`;
  - componente `TerminalLaunchDialog` (`apps/web/src/features/issues/assigned-work/components/TerminalLaunchDialog.tsx`), com um slot `attachments?: ReactNode` e a propriedade `confirmBlocked?: boolean` para a task_06;
  - hook `useTerminalLaunch({ projectId, taskId })` (`apps/web/src/features/issues/assigned-work/hooks/useTerminalLaunch.ts`), que devolve `{ preflight, prompt, setPrompt, promptProblem, confirm(extra?: { attachmentIds: string[]; issueImageIds: string[] }), phase, failure }`.

## Mini-tarefas

- [x] **05.1 — Permissão e ação "Abrir no terminal"**
  - **Arquivos:**
    - alterar `apps/web/src/features/issues/assigned-work/planningPermissions.ts` (`canOpenTerminal`), `apps/web/src/features/issues/assigned-work/contract.ts` e `apps/web/src/features/issues/assigned-work/components/PlanningActions.tsx`;
    - criar `apps/web/src/features/issues/assigned-work/terminalCopy.ts`;
    - criar `apps/web/src/features/issues/assigned-work/components/TerminalLaunchAction.test.tsx`.
  - **Testes:** V-09a
  - **Pronto quando:** `pnpm --dir apps/web exec vitest run src/features/issues/assigned-work/components/TerminalLaunchAction.test.tsx src/features/issues/assigned-work/components/PlanningStage.test.tsx` passa.
  - **Nota:** `canOpenTerminal` é verdadeiro só com `planning.status === "approved"` e a decisão aprovada, e só quando o detalhe vem da visão da operadora (`withOperatorPermissions`). Para quem não é operadora, o valor é falso.
- [x] **05.2 — `TerminalLaunchDialog` com preflight e prompt editável**
  - **Arquivos:**
    - criar `apps/web/src/features/issues/assigned-work/components/TerminalLaunchDialog.tsx`, `apps/web/src/features/issues/assigned-work/components/TerminalCheckoutSummary.tsx` e `apps/web/src/features/issues/assigned-work/components/TerminalPromptField.tsx`;
    - criar `apps/web/src/features/issues/assigned-work/hooks/useTerminalLaunch.ts` e `apps/web/src/features/issues/assigned-work/terminalClient.ts`;
    - alterar `apps/web/src/features/issues/assigned-work/terminalCopy.ts`;
    - criar `apps/web/src/features/issues/assigned-work/components/TerminalLaunchDialog.test.tsx`.
  - **Testes:** V-09b, V-09c, V-09d, V-09e, V-09f, V-09g
  - **Pronto quando:** `pnpm --dir apps/web exec vitest run src/features/issues/assigned-work/components/TerminalLaunchDialog.test.tsx` passa; `pnpm --dir apps/web typecheck` sem erros.
  - **Nota:**
    - o diálogo segue o padrão de `IssueDeletionAction.tsx` (`<dialog open aria-modal="true">` com `useDialogFocus`); se importar `useDialogFocus` de outra feature violar a `nextjs-folder-structure`, promova o hook para a pasta compartilhada que a skill indica e registre;
    - o campo tem rótulo "Prompt", e o contador `N / 20.000` fica em `aria-live="polite"`;
    - o link "Abrir Configurações do projeto" usa `projectSettingsPath`.
- [x] **05.3 — Confirmação, erros do servidor e linha "Execução aberta…"**
  - **Arquivos:**
    - alterar `apps/web/src/features/issues/assigned-work/hooks/useTerminalLaunch.ts`, `apps/web/src/features/issues/assigned-work/components/TerminalLaunchDialog.tsx`, `apps/web/src/features/issues/assigned-work/components/PlanningDecisionView.tsx` e `apps/web/src/features/issues/assigned-work/terminalCopy.ts`;
    - criar `apps/web/src/features/issues/assigned-work/components/TerminalLaunchConfirm.test.tsx`;
    - alterar `apps/web/src/features/issues/assigned-work/components/PlanningDecisionView.test.tsx`.
  - **Testes:** V-09h, V-09i, V-09j, V-09k
  - **Pronto quando:** `pnpm --dir apps/web exec vitest run src/features/issues/assigned-work/components/TerminalLaunchConfirm.test.tsx src/features/issues/assigned-work/components/PlanningDecisionView.test.tsx` passa; `pnpm --dir apps/web typecheck` sem erros.
  - **Nota:**
    - o `requestKey` é gerado com `crypto.randomUUID()` ao abrir o diálogo e reaproveitado em toda nova tentativa dentro dele;
    - o botão "Abrir no terminal" do diálogo fica desabilitado enquanto `phase === "sending"`;
    - depois do sucesso, o diálogo fecha e a tela é revalidada (`router.refresh()` ou o mecanismo usado por `usePlanningActions`), para mostrar `terminal.lastOpened`;
    - HH:MM usa o fuso local, com `formatMoment` ou o helper de hora já usado em `PlanningDecisionView`.

## Detalhes de implementação
- **Padrões a espelhar:**
  - botões e avisos: `PlanningActions.tsx` (`CommandNotice` com `role="alert"` e `role="status"`);
  - diálogo acessível: `IssueDeletionAction.tsx` e `useDialogFocus.ts`;
  - cliente tRPC por função isolada: `planningClient.ts`.
- **Textos** (em `terminalCopy.ts`, exatamente como na spec):
  - ação e confirmação: "Abrir no terminal";
  - branch: "Branch: <nome>", e "HEAD destacado (<sha>)" quando destacado;
  - sujeira: o aviso da REQ-008;
  - sem vínculo: "Você ainda não vinculou o clone local deste projeto. Vincule a pasta nas Configurações para abrir a execução." e o link "Abrir Configurações do projeto";
  - limite: "O prompt precisa ter entre 1 e 20.000 caracteres.";
  - após abrir: "Execução aberta no terminal por <pessoa> às HH:MM".
- **Erros:** mostre `TRPCError.message` do servidor em `role="alert"` dentro do diálogo, sem fechá-lo. Os motivos possíveis estão na §15.

### Arquivos relevantes
- `apps/web/src/features/issues/assigned-work/components/PlanningActions.tsx`: onde a ação entra (ramo `planning.status === "approved"`).
- `apps/web/src/features/issues/assigned-work/components/PlanningDecisionView.tsx`: hoje mostra `ROUTE_NEXT_NOTE` na decisão aprovada; passa a mostrar a linha da REQ-040 quando houver `terminal.lastOpened`.
- `apps/web/src/features/issues/assigned-work/planningPermissions.ts`: derivação de permissões.
- `apps/web/src/features/issues/issue-deletion/IssueDeletionAction.tsx` e `useDialogFocus.ts`: diálogo com foco preso e Esc.
- `apps/web/src/features/issues/assigned-work/components/PlanningStage.test.tsx` e `PlanningDecisionView.test.tsx`: montagem de `TaskDetail` em teste.

### Arquivos afetados
- Os listados nas mini-tarefas.

### Decisões relacionadas
- DEC-01 (§17): a confirmação dispara o terminal nativo no servidor local; o diálogo só envia o prompt.

## Premissas
- O texto exato de "sem vínculo" e o do limite não estão na spec; os desta tarefa são a proposta, registrada para a revisão final.

## Testes atribuídos
- [x] V-09a: decisão aprovada e operadora → botão "Abrir no terminal" visível; planejamento em `review` (refeito, B-01), ou quem não é a operadora → sem o botão (REQ-005).
- [x] V-09b: preflight com vínculo em `main` → o diálogo mostra a pasta, "Branch: main" e o prompt pré-preenchido num campo editável com rótulo, começando por `/direct-executor` (US-02.1, REQ-006).
- [x] V-09c: `branch: null` e `detachedSha: "a1b2c3d"` → "HEAD destacado (a1b2c3d)" (B-03).
- [x] V-09d: `dirty: true` → o aviso da REQ-008 aparece, e "Abrir no terminal" continua habilitado (US-02.4).
- [x] V-09e: `checkout: null` → explicação, link para as Configurações do projeto, e nenhum botão de confirmação (US-02.5, REQ-009).
- [x] V-09f: apagar todo o prompt, ou colar 20.001 caracteres → confirmação desabilitada e o limite visível; o contador acompanha a digitação (REQ-013).
- [x] V-09g: ao abrir, o foco vai para o diálogo e Tab não sai dele; Esc fecha e devolve o foco ao botão de origem; o contador está numa região `aria-live` (NFR-05).
- [x] V-09h: `tasks.byId` com `terminal.lastOpened = { userName: "Ana", openedAt }` → "Execução aberta no terminal por Ana às HH:MM" no lugar de `ROUTE_NEXT_NOTE` (REQ-040).
- [x] V-09i: aprovado e `terminal.lastOpened: null` → continua "A próxima atividade ainda não foi iniciada." (NM-06).
- [x] V-09j: editar o prompt acrescentando "Use o componente Button existente." e confirmar → `open` recebe o texto editado; duplo clique envia uma única requisição; uma nova tentativa após falha de rede reaproveita o mesmo `requestKey` (US-02.2, REQ-015).
- [x] V-09k: `open` rejeitado com `checkout_invalid`, `claude_unavailable`, `skill_missing`, `operator_required` (B-04) e `terminal_disabled` → a mensagem do servidor aparece em `role="alert"` e o diálogo continua aberto.

## Critérios de sucesso
- Todas as mini-tarefas marcadas, cada uma com o "Pronto quando" executado.
- Todos os testes atribuídos implementados e passando.
- Na tela do trabalho, a operadora com o planejamento aprovado abre o diálogo, edita o prompt e confirma. O componente chama `open` com o texto editado e passa a mostrar a linha da REQ-040.
- No fim da tarefa, `pnpm --dir apps/web test` passa.
- `pnpm --dir apps/web typecheck` e `pnpm lint` sem erros; nenhuma regra do AGENTS.md violada.

## Registro de execução
<!-- The implementer appends one entry per mini-task: date, what was done, commands run with their result, deviations. Example:
- 2026-11-22 · 05.1 · ação e permissão · `vitest run src/features/issues/assigned-work/components/TerminalLaunchAction.test.tsx` → 3 passed · sem desvios -->
- 2026-11-22 · 05.1 · permissão e ação "Abrir no terminal" · `vitest run src/features/issues/assigned-work/components/TerminalLaunchAction.test.tsx src/features/issues/assigned-work/components/PlanningStage.test.tsx` → 13 passed · `canOpenTerminal` entrou também no DTO do servidor (`planningDtoMapper.ts`, verdadeiro só para a operadora com a decisão aprovada) e nas fixtures de teste (`src/test/tasks.ts`, `PlanningStage.test.tsx`, `planningDtoMapper.test.ts`); a ação fica em `PlanningActions.tsx`
- 2026-11-22 · 05.2 · `TerminalLaunchDialog` com preflight e prompt editável · `vitest run src/features/issues/assigned-work/components/TerminalLaunchDialog.test.tsx` → 7 passed; `pnpm --dir apps/web typecheck` sem erros · `useDialogFocus` foi promovido de `features/issues/issue-deletion/` para `src/hooks/useDialogFocus.ts` (feature irmã não importa de feature irmã, pela `nextjs-folder-structure`) e agora também prende o Tab em `textarea`, `input` e `select`; arquivos extras: `terminalContract.ts`, `components/TerminalLaunchAction.tsx`, `components/TerminalLaunchBody.tsx`, `src/test/terminal.ts`, mock de `tasks.terminal` em `src/test/setup.ts`, `formatTimeOfDay` em `lib/tasks/formatMoment.ts`; os textos de "sem vínculo" e do limite são os da proposta da tarefa
- 2026-11-22 · 05.3 · confirmação, erros do servidor e linha "Execução aberta…" · `vitest run src/features/issues/assigned-work/components/TerminalLaunchConfirm.test.tsx src/features/issues/assigned-work/components/PlanningDecisionView.test.tsx` → 16 passed; `pnpm --dir apps/web typecheck` sem erros · o `requestKey` nasce com o hook (ao abrir o diálogo) e vale para toda nova tentativa; o sucesso chama `actions.refresh` (o `onChanged` de `usePlanningActions`) e fecha o diálogo; `PlanningDecisionView` recebe `lastOpened` de `tasks.byId.terminal`
- 2026-11-22 · fechamento · `pnpm --dir apps/web test` → 309 passed; `pnpm --dir apps/web typecheck`, `pnpm --dir packages/api typecheck` e `pnpm lint` sem erros
