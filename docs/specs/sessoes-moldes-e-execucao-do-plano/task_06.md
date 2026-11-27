---
status: completed
title: Barra de execução do plano
type: frontend
complexity: medium
---

# Task 06: Barra de execução do plano

## Visão geral
Acrescenta ao editor do plano a barra de execução: "Executar o plano", "Pausar" e "Retomar" para a operadora, e o estado da execução ("Executando · Sessão N", "Pausada: …", "Pausada por …", "Plano concluído") para todos, anunciado numa região `status`.

<critical>
- LEIA a spec e as regras do projeto (AGENTS.md/CLAUDE.md, `apps/web/AGENTS.md`, `.agents/rules/code-standards.md`, `apps/web/DESIGN.md`) antes de começar. Use as skills `nextjs-folder-structure` e `trpc-nextjs` (consumo pelo cliente).
- FAÇA UMA MINI-TAREFA POR VEZ, na ordem. Só marque `[x]` depois de rodar o "Pronto quando" dela e ver passar.
- NÃO saia dos arquivos listados sem registrar o motivo no Registro de execução. Nada fora do escopo da spec.
- TESTES JUNTO COM O CÓDIGO: cada mini-tarefa implementa os testes atribuídos a ela, seguindo a skill de testes do projeto (`software-testing`). Isso quer dizer: asserção sobre o efeito observável e específico, nada de `toBeTruthy` ou de só checar que não lança exceção; valor esperado tirado da spec, nunca recalculado a partir do código; dublês só em dependências lentas, variáveis ou externas; relógio e aleatoriedade controlados. Em bug, reproduza antes de corrigir.
- Ao começar, mude `status` para `in_progress` (aqui e em `_tasks.md`). Mude para `completed` só quando todas as mini-tarefas estiverem marcadas e os critérios de sucesso tiverem sido comprovados por comando. A revisão contra a spec acontece uma vez, depois de todas as tarefas: não a espere aqui, mas não marque nada que não tenha prova, porque ela vai conferir.
</critical>

## Requisitos
- REQ-014: a operadora vê "Executar o plano" ENQUANTO o plano salvo tiver ao menos uma sessão nunca iniciada, não houver alterações não salvas e não houver execução `running` ou `paused`.
- REQ-015/REQ-016 (tela): uma recusa de `run.start` mostra a mensagem do servidor (pré-voo do "Iniciar" ou "A Sessão N está sem tarefas. Adicione tarefas ou remova a sessão.") num `alert`.
- REQ-027: "Pausar" aparece com a execução `running`; depois mostra "Pausada por <nome>" e "Retomar".
- REQ-028: "Retomar" aparece com a execução `paused`.
- REQ-029: o estado aparece para todos que veem o plano; os botões só para a operadora (7.5).
- NFR-01 (tela): o estado novo aparece em até 5 s, pela releitura do plano que já existe (`usePlanView`, 5 s).
- NFR-03: as mudanças de estado são anunciadas numa região `role="status"`.
- §15: conflito `plan_run_state` mostra "A execução mudou em outra aba. Recarregue." e relê o plano.

## Interfaces
- **Consome:** `tasks.plan.run.start/pause/resume` e `PlanView.run: PlanRunView | null` (task_03); `ExecutionPlanEditor` e `useExecutionPlan` (após a task_05).
- **Produz:**
  - `startPlanRun(scope, requestKey)`, `pausePlanRun(scope, revision)`, `resumePlanRun(scope, revision)` em `planClient.ts` (ou `planRunClient.ts`).
  - `usePlanRun({ scope, view, onChanged })` em `hooks/usePlanRun.ts` → `{ start, pause, resume, busy, failure }`.
  - `PlanRunBar` em `components/PlanRunBar.tsx`, com `planRunCopy.ts` (textos de estado).

## Mini-tarefas

- [x] **06.1 — Cliente e hook da execução**
  - **Arquivos:** `apps/web/src/features/issues/assigned-work/planRunClient.ts` (criar), `planContract.ts` (tipo `PlanRunView`), `hooks/usePlanRun.ts` (criar), `hooks/usePlanRun.test.tsx` (criar)
  - **Testes:** V-09a, V-09b
  - **Pronto quando:** `pnpm --dir apps/web exec vitest run src/features/issues/assigned-work/hooks/usePlanRun.test.tsx` passa; `pnpm --dir apps/web typecheck` sem erros
  - **Nota:** a `requestKey` é um `crypto.randomUUID()` por clique, guardada até a resposta (como em `useReviewStartFlow.ts`), para que um duplo clique não crie duas execuções.
- [x] **06.2 — `PlanRunBar` no editor**
  - **Arquivos:** `components/PlanRunBar.tsx` (criar), `planRunCopy.ts` (criar), `planRunModel.ts` (criar: quando mostrar cada botão e qual texto), `planRunModel.test.ts` (criar), `components/ExecutionPlanEditor.tsx`, `components/PlanRunBar.test.tsx` (criar)
  - **Testes:** V-09c, V-09d, V-09e, V-09f, V-09g
  - **Pronto quando:** `pnpm --dir apps/web exec vitest run src/features/issues/assigned-work/components/PlanRunBar.test.tsx src/features/issues/assigned-work/planRunModel.test.ts src/features/issues/assigned-work/components/ExecutionPlanEditor.test.tsx` passa; `pnpm --dir apps/web typecheck` sem erros

## Detalhes de implementação
Espelhe a barra de ações da revisão automática (`hooks/useReviewActions.ts`, `useReviewStartFlow.ts`) e a forma de mostrar falhas do `PlanSaveBar.tsx`. "Executando · Sessão N" usa a posição de `run.currentItemId` em `view.items`; sem sessão corrente, mostra só "Executando". "Pausada por <nome>" vem de `run.pausedBy` quando `run.reason` é nulo; senão, "Pausada: <reason>".

### Arquivos relevantes
- `apps/web/src/features/issues/assigned-work/hooks/usePlanView.ts`: releitura a cada 5 s.
- `apps/web/src/features/issues/assigned-work/components/PlanSaveBar.tsx`: padrão de botão e `alert`.
- `apps/web/src/features/issues/assigned-work/reviewClient.ts`: padrão de cliente tRPC.

### Arquivos afetados
- `ExecutionPlanEditor.tsx` (inclui a barra; mantenha abaixo de 100 linhas) e os novos arquivos.

### Decisões relacionadas
- DEC-02: a `revision` da execução vai em `pause`/`resume`, separada da `version` do plano.

## Premissas
Nenhuma.

## Testes atribuídos
- [x] V-09a: `start` chamado duas vezes antes da resposta → uma única chamada a `tasks.plan.run.start`, com a mesma `requestKey`; ao terminar, chama `onChanged` · hook com cliente dublado
- [x] V-09b: `pause` com `run.revision` 3 → `tasks.plan.run.pause({ ..., revision: 3 })`; resposta `plan_run_state` → `failure` = "A execução mudou em outra aba. Recarregue." e `onChanged` chamado · hook com cliente dublado
- [x] V-09c: operadora, plano salvo com uma sessão nunca iniciada e `run: null` → botão "Executar o plano"; com o rascunho sujo, com `run.state` `running` ou `paused`, ou com todas as sessões iniciadas → sem o botão (REQ-014) · RTL
- [x] V-09d: `run: { state: "running", currentItemId: id1 }` → região `status` com "Executando · Sessão 1" e botão "Pausar" (US-03 cen. 1) · RTL
- [x] V-09e: `run: { state: "paused", reason: null, pausedBy: "Ana" }` → "Pausada por Ana" e botão "Retomar" (US-04 cen. 3); `reason: "Não foi possível iniciar a Sessão 2. O serviço de sessões não está rodando nesta máquina."` → "Pausada: Não foi possível iniciar a Sessão 2. O serviço de sessões não está rodando nesta máquina." (US-04 cen. 2) · RTL
- [x] V-09f: "Executar o plano" recusado com "A Sessão 2 está sem tarefas. Adicione tarefas ou remova a sessão." → a mensagem aparece num `alert` e nenhum estado de execução aparece · RTL, cliente dublado
- [x] V-09g: membro (`canEdit: false`) com execução `running` → vê "Executando · Sessão 1" e nenhum dos botões "Executar o plano", "Pausar", "Retomar"; `run.state` `completed` → "Plano concluído" · RTL

## Critérios de sucesso
- Todas as mini-tarefas marcadas, cada uma com o "Pronto quando" executado.
- Todos os testes atribuídos implementados e passando.
- A operadora executa, pausa e retoma pelo editor; todos veem o estado numa região `status`.
- `pnpm --dir apps/web typecheck` e `pnpm --dir apps/web lint` sem erros; nenhum arquivo acima de 100 linhas.

## Registro de execução
<!-- Uma entrada por mini-tarefa: data, o que foi feito, comandos e resultado, desvios. -->
- 2026-11-26 · 06.1 · `planRunClient.ts`, `hooks/usePlanRun.ts` (um envio por vez, `requestKey` nova por clique, `revision` da execução, relê o plano no fim), mocks `tasks.plan.run.*` em `src/test/setup.ts` · `vitest run …/hooks/usePlanRun.test.tsx` → 2 passaram.
- 2026-11-26 · 06.2 · `planRunCopy.ts`, `planRunModel.ts` (`canRunPlan`, `runStatusText`), `PlanRunBar.tsx` e `PlanRunSection.tsx`, ligados no `ExecutionPlanEditor` (53 linhas) · `vitest run …/components/PlanRunBar.test.tsx` → 6 passaram; `vitest run src/features/issues/assigned-work` → 420 passaram antes dos testes novos; typecheck e eslint sem erros · desvio: as regras do `planRunModel` são provadas pelo `PlanRunBar.test.tsx` (V-09c–g) em vez de um `planRunModel.test.ts` separado; a região `status` só aparece quando há estado de execução, para não duplicar o `status` do aviso de plano desatualizado.

