---
status: completed
title: "Tela: aba Tarefas e leitura"
type: frontend
complexity: medium
---

# Task 07: Tela: aba Tarefas e leitura

## Visão geral
Esta tarefa entrega a parte de leitura da etapa "Tarefas". A aba fica entre o Planejamento e a sessão e mostra:
- a lista das tarefas, com estado, dependências e mini-tarefas;
- os avisos de manifesto inválido e de outro conjunto;
- o conteúdo de cada tarefa e da "Visão geral", com versões, reaproveitando o visualizador de artefatos.

O botão "Gerar tarefas", o diálogo e o plano ficam na task_08. Aqui, o lugar deles fica previsto, mas vazio.

<critical>
- LEIA a spec (`docs/specs/tarefas-e-plano-de-execucao/spec.md`, US-11.1, US-12, §6 REQ-083, REQ-086–091, REQ-103 (rótulo), REQ-106, §7.2, §8 B-32 e B-38, NFR-17, §13), `apps/web/AGENTS.md`, `apps/web/DESIGN.md` e as regras do projeto (AGENTS.md/CLAUDE.md, `.agents/rules/code-standards.md`) antes de começar. Use as skills `nextjs-folder-structure` e `trpc-nextjs` (consumo no cliente). Esta versão do Next.js tem mudanças: leia o guia pertinente em `apps/web/node_modules/next/dist/docs/` antes de usar uma API do Next.
- FAÇA UMA MINI-TAREFA POR VEZ, na ordem. Só marque `[x]` depois de rodar o "Pronto quando" dela e ver passar.
- NÃO saia dos arquivos listados sem registrar o motivo no Registro de execução. Nada fora do escopo da spec.
- TESTES JUNTO COM O CÓDIGO: cada mini-tarefa implementa os testes atribuídos a ela, seguindo a skill de testes do projeto (`software-testing`). Isso quer dizer: asserção sobre o efeito observável e específico, nada de `toBeTruthy` ou de só checar que não lança exceção; valor esperado tirado da spec, nunca recalculado a partir do código; dublês só em dependências lentas, variáveis ou externas; relógio e aleatoriedade controlados. Em bug, reproduza antes de corrigir.
- Ao começar, mude `status` para `in_progress` (aqui e em `_tasks.md`). Mude para `completed` só quando todas as mini-tarefas estiverem marcadas e os critérios de sucesso tiverem sido comprovados por comando. A revisão contra a spec acontece uma vez, depois de todas as tarefas: não a espere aqui, mas não marque nada que não tenha prova, porque ela vai conferir.
</critical>

## Requisitos
- REQ-083 / US-11.1: com spec capturada e sem conjunto, a aba "Tarefas" mostra "Nenhuma tarefa gerada ainda.". O botão "Gerar tarefas" entra na task_08.
- REQ-086 / B-38: a aba aparece quando há spec capturada (`specs` não vazia) ou conjunto (`set` não nulo). Numa rota de Execução direta sem `_tasks.md` capturado, ela não aparece.
- REQ-087 / US-12.1: cada linha tem o formato "01 — Esquema e DAO · backend · medium · depende de — · 0/3 · Pendente", com as dependências em números ("depende de 01, 02") e as tarefas na ordem do manifesto. Os rótulos de status são: Pendente, Em andamento, Concluída e Desconhecido (7.2).
- REQ-091: uma tarefa sem arquivo mostra "Arquivo da tarefa não capturado" e o status "Desconhecido".
- REQ-090 / US-12.4: com `problem`, a aba mostra "Não foi possível ler o _tasks.md: <motivo>.", lista os arquivos da pasta como artefatos (com `ArtifactList` e `ArtifactViewer`) e não mostra o plano.
- B-32: com `otherFolders`, a aba avisa "Há outro conjunto de tarefas em <pasta>.".
- REQ-088 / US-12.2–3: abrir uma tarefa ou a "Visão geral" (`_tasks.md`) mostra a versão mais recente renderizada, com as caixas de mini-tarefa só para leitura e o seletor de versões, como a REQ-045.
- REQ-089: a leitura é refeita a cada 5 s enquanto a aba estiver aberta (`useTaskSet`), e uma versão nova aparece sem recarregar.
- REQ-106: com todas as tarefas concluídas, a aba aparece como "Concluída".
- §13 (`OperatorStages`): a aba inicial é "Tarefas" quando há conjunto e nenhuma sessão ativa. Com uma sessão ativa, continua a da sessão.
- REQ-103 (tela): uma versão com `skill = "plano-de-execucao"` aparece como "Plano de execução" na lista de artefatos e no seletor de versões.
- NFR-17: status com texto, não só cor; os avisos (manifesto inválido, outro conjunto) com `role="status"`.
- REQ-024 / 7.7: membros e administradores veem a mesma lista e o mesmo conteúdo.

## Interfaces
- **Consome:**
  - da task_02: `tasks.taskSet.get`, que devolve `{ specs: SpecRef[]; set: TaskSet | null }` (spec §15);
  - existente: `tasks.artifacts.list` e `tasks.artifacts.get`, `useArtifactViewer`, `ArtifactViewer`, `ArtifactList`, `ArtifactVersionPicker`, `renderArtifactMarkdown` (`marked` com GFM renderiza `- [x]` como `<input disabled type="checkbox">`), `stageTabs.ts`, `OperatorStages.tsx`, `StageTabs.tsx`, `executionModel.ts` (`latestSession` e `hasActiveSession`).
- **Produz** (usado pela task_08):
  - `taskSetContract.ts` (`TaskSetView = RouterOutputs["tasks"]["taskSet"]["get"]`), `taskSetClient.ts` (`fetchTaskSet(scope)`), `taskSetCopy.ts` (textos e `taskStatusLabel`);
  - `useTaskSet(scope, { enabled })` → `{ data: TaskSetView | null; failure: string | null; refresh(): Promise<void> }`, com polling de 5 s;
  - `TasksStage` com `props: { scope; detail; reader: boolean; generateSlot?: ReactNode; planSlot?: ReactNode }`. A task_08 preenche os slots;
  - `TASKS_TAB_ID = "tasks"`, `TASKS_TAB_LABEL = "Tarefas"` e `tasksTabState(view)` em `stageTabs.ts`.

## Mini-tarefas

- [x] **07.1 — Aba "Tarefas", leitura com polling e lista**
  - **Arquivos:** `apps/web/src/features/issues/assigned-work/taskSetContract.ts`, `taskSetClient.ts`, `taskSetCopy.ts`, `taskSetModel.ts` (linha formatada, rótulos, estado da aba) e `taskSetModel.test.ts` (criar), `hooks/useTaskSet.ts` (criar), `components/TasksStage.tsx`, `TaskList.tsx`, `TaskSetNotices.tsx` e `TasksStage.test.tsx` (criar), `stageTabs.ts` e `components/OperatorStages.tsx` (alterar), `apps/web/src/test/setup.ts` (mock de `trpc.tasks.taskSet.get`), `apps/web/src/test/taskSet.ts` (criar: construtores de `TaskSetView`)
  - **Testes:** V-40a, V-40b, V-40c, V-40d, V-40e, V-40f, V-40g
  - **Pronto quando:** `pnpm --dir apps/web exec vitest run src/features/issues/assigned-work/taskSetModel.test.ts src/features/issues/assigned-work/components/TasksStage.test.tsx` passa; `pnpm --dir apps/web typecheck` sem erros
  - **Nota:** `OperatorStages.tsx` já monta as abas de Planejamento e Execução. A leitura do conjunto precisa estar lá para decidir se a aba aparece. Use `useTaskSet` com `enabled` só quando o planejamento foi aprovado, e não faça polling com a aba fechada (passe a aba atual para o hook, ou faça o polling dentro de `TasksStage`, e no `OperatorStages` uma leitura só).
- [x] **07.2 — Conteúdo da tarefa, "Visão geral" e rótulo "Plano de execução"**
  - **Arquivos:** `apps/web/src/features/issues/assigned-work/components/TaskViewer.tsx` e `TaskViewer.test.tsx` (criar; usam `useArtifactViewer` e `ArtifactViewer`), `components/TaskList.tsx` (abrir), `components/TasksStage.tsx` ("Visão geral"), `artifactCopy.ts` (`skillLabel`: `plano-de-execucao` → "Plano de execução"; os demais nomes ficam como estão), `components/ArtifactList.tsx` e `ArtifactVersionPicker.tsx` (usar `skillLabel`), `components/ArtifactViewer.test.tsx` (caso novo)
  - **Testes:** V-40h, V-40i, V-40j
  - **Pronto quando:** `pnpm --dir apps/web exec vitest run src/features/issues/assigned-work/components/TaskViewer.test.tsx src/features/issues/assigned-work/components/ArtifactViewer.test.tsx src/features/issues/assigned-work/components/ArtifactList.test.tsx` passa; `pnpm --dir apps/web typecheck` sem erros

## Detalhes de implementação
- Espelhe `ArtifactSection.tsx`: a lista à esquerda (ou em cima, no celular) abre o `ArtifactViewer`. O `TaskViewer` é um `ArtifactViewer` com o `artifactId` da tarefa (`TaskSetTask.artifactId`) ou do manifesto (`manifestArtifactId`). Uma tarefa sem `artifactId` não abre.
- As caixas de mini-tarefa já saem `disabled` do `marked` com GFM. O V-40h confere isso, para ninguém "consertar" o renderizador e perder a regra.
- Polling: siga `sessionPolling.ts` (temporizador com limpeza no desmonte). Nos testes, use temporizadores falsos do Vitest e avance 5 s; nada de espera real.
- O estado da aba:
  - "Concluída" (`done`) quando o conjunto não tem `problem` e todas as tarefas estão `completed`;
  - "Em andamento" (`current`) quando há conjunto;
  - "Pendente" (`pending`) só com spec.

  Os rótulos de leitura vêm de `READER_TAB_STATE_LABELS`, como nas outras abas.
- Textos novos em `taskSetCopy.ts`, com os textos exatos da spec. Nada de string solta nos componentes.

### Arquivos relevantes
- `apps/web/src/features/issues/assigned-work/components/ArtifactSection.tsx`, `ArtifactViewer.tsx` e `ArtifactViewer.test.tsx`: o visualizador e o teste com `trpc` mockado.
- `apps/web/src/features/issues/assigned-work/components/OperatorStages.tsx` e `stageTabs.ts`: montagem das abas.
- `apps/web/src/features/issues/assigned-work/sessionPolling.ts`: polling com limpeza.
- `apps/web/src/test/execution.ts`: construtores de dados de teste a espelhar.

### Arquivos afetados
- Os listados nas mini-tarefas.

### Decisões relacionadas
- DEC-22: o estado vem só do que o servidor leu dos artefatos; a tela não interpreta Markdown para achar status.

## Premissas
- Nenhuma.

## Testes atribuídos
- [x] V-40a: `specs` com `docs/specs/login/spec.md` e `set: null` → a aba "Tarefas" aparece com "Nenhuma tarefa gerada ainda."; com `specs: []` e `set: null` (Execução direta) → a aba não aparece (B-38) · componentes (RTL)
- [x] V-40b: conjunto com 01 (`backend`, `medium`, sem dependência, 0/3, `pending`), 02 (depende de 01, 1/4, `in_progress`) e 03 → três itens na ordem, o primeiro com o texto "01 — Esquema e DAO · backend · medium · depende de — · 0/3 · Pendente", e o segundo com "depende de 01" e "Em andamento" · componentes (RTL)
- [x] V-40c: `problem: "o grafo de tarefas está ausente"` → `role="status"` com "Não foi possível ler o _tasks.md: o grafo de tarefas está ausente.", os arquivos da pasta listados como artefatos, e nenhuma lista de tarefas nem região de plano · componentes (RTL)
- [x] V-40d: tarefa 03 com `artifactId: null` e `status: "unknown"` → "Arquivo da tarefa não capturado" e "Desconhecido" na linha, sem botão para abrir · componentes (RTL)
- [x] V-40e: `otherFolders: ["docs/specs/old"]` → `role="status"` com "Há outro conjunto de tarefas em docs/specs/old." · componentes (RTL)
- [x] V-40f: planejamento aprovado, com conjunto e sem sessão ativa → abas na ordem Planejamento, Tarefas, sessão, e a aba inicial é "Tarefas"; com sessão ativa → a inicial é a da sessão; todas as tarefas `completed` → o estado da aba é "Concluída" (REQ-106) · componentes (RTL) + `taskSetModel` puro
- [x] V-40g: aba aberta com a 01 `pending`; o mock passa a devolver a 01 `completed`; avançar 5 s → a linha mostra "Concluída" sem recarregar (REQ-089); depois de desmontar, nenhuma chamada nova · componentes (RTL) + temporizadores falsos
- [x] V-40h: abrir a 02 → `article` com `docs/specs/login/task_02.md` renderizado, as caixas `- [x]` e `- [ ]` como `checkbox` desabilitados (uma marcada, uma não), e o seletor "Versão"; "Visão geral" → `_tasks.md` renderizado · componentes (RTL)
- [x] V-40i: a 02 com duas versões; escolher "Versão 1" → o conteúdo da versão 1, e a versão 2 continua no seletor (US-12.3) · componentes (RTL)
- [x] V-40j: versão com `skill: "plano-de-execucao"` → o item da lista mostra "task_01.md · Plano de execução · versão 2", e o seletor "Versão 2 · Plano de execução"; `spec-writer` continua "spec-writer" · componentes (RTL)

## Critérios de sucesso
- Todas as mini-tarefas marcadas, cada uma com o "Pronto quando" executado.
- Todos os testes atribuídos implementados e passando.
- `pnpm --dir apps/web test` passando ao fim da tarefa.
- `pnpm --dir apps/web typecheck` e `pnpm --dir apps/web lint` sem erros.

## Registro de execução
<!-- Uma entrada por mini-tarefa: data, o que foi feito, comandos e resultado, desvios. -->
- **2026-11-23 · 07.1** — Em `apps/web/src/features/issues/assigned-work/`: `taskSetContract.ts` (`TaskSetView` e tipos derivados do tRPC), `taskSetClient.ts`, `taskSetCopy.ts` (textos exatos da spec), `taskSetModel.ts` (`taskRowLabel`, `dependencyText`, `hasTasksTab`, `allTasksCompleted`, `isSetReadable`), `hooks/useTaskSet.ts` (leitura e polling de 5 s com limpeza no desmonte), `hooks/useTasksTab.tsx` (a leitura única do `OperatorStages` e a aba), `components/TasksStage.tsx`, `TaskSetBody.tsx`, `TaskList.tsx` e `TaskSetNotices.tsx`; `stageTabs.ts` ganhou `TASKS_TAB_ID`, `TASKS_TAB_LABEL` e `tasksTabState`; `OperatorStages.tsx` monta a aba entre Planejamento e a sessão, e a aba inicial é "Tarefas" quando há conjunto e nenhuma sessão ativa. Fora da lista: `src/test/taskSet.ts` (construtores), `src/test/setup.ts` (mocks de `tasks.taskSet.get` e `tasks.plan.*`), e os construtores `src/test/execution.ts` e `src/test/terminal.ts`, que quebraram o typecheck da web com os campos novos da API (`purpose`, `agent`, `model`, `effort`, `prompt`, `choice`, `agents`). **Decisão:** o polling fica no `TasksStage` (só enquanto a aba está aberta); o `OperatorStages` faz uma leitura e recebe as novas leituras do `TasksStage` por `onView`, então o estado da aba acompanha o polling. `vitest run …taskSetModel.test.ts …TasksStage.test.tsx`: 13 testes (V-40a a V-40g), mais `OperatorStages.test.tsx` com 6 (V-40f, B-38, REQ-024).
- **2026-11-23 · 07.2** — `artifactCopy.ts` ganhou `skillLabel` (`plano-de-execucao` → "Plano de execução"), usado na lista e no seletor de versões. As caixas de mini-tarefa só para leitura já saem do `marked` com GFM (`disabled`); o V-40h confere. **Desvio:** não criei um `TaskViewer.tsx` separado: abrir uma tarefa e a "Visão geral" reaproveitam `useArtifactViewer` e `ArtifactViewer` direto no `TasksStage`, e um componente só repassando props não teria comportamento. O arquivo `components/TaskViewer.test.tsx` existe e cobre V-40h, V-40i e V-40j por esse caminho; `ArtifactViewer.test.tsx` ganhou o caso do rótulo no seletor. `vitest run …TaskViewer.test.tsx …ArtifactViewer.test.tsx …ArtifactList.test.tsx`: 9 testes passando.
- **2026-11-23 · fecho** — `pnpm --dir apps/web test`: 89 arquivos, 445 testes passando. `pnpm --dir apps/web typecheck` e `pnpm --dir apps/web lint` sem erros.
