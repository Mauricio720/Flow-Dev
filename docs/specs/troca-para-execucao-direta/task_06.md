---
status: pending
title: Cartão da troca, registro no Planejamento e seta no histórico
type: frontend
complexity: medium
---

# Task 06: Cartão da troca, registro no Planejamento e seta no histórico

## Visão geral
Entrega a parte visível. Na conversa, um cartão mostra a proposta, com os dois botões para a dona da sessão e sem ações para leitores ou estados finais. A aba Planejamento ganha o registro da troca, e o histórico de sessões mostra "PRD → Execução direta". O chip da lista já muda sozinho pela `WorkProgress.route` (task 05).

<critical>
- LEIA a spec e as regras do projeto (AGENTS.md/CLAUDE.md e `apps/web/AGENTS.md`) antes de começar. Mudança visual: siga `apps/web/DESIGN.md`.
- FAÇA UMA MINI-TAREFA POR VEZ, na ordem. Só marque `[x]` depois de rodar o "Pronto quando" dela e ver passar.
- NÃO saia dos arquivos listados sem registrar o motivo no Registro de execução. Nada fora do escopo da spec.
- TESTES JUNTO COM O CÓDIGO: cada mini-tarefa implementa os testes atribuídos a ela, seguindo a skill de testes do projeto (`software-testing`). Isso quer dizer: asserção sobre o efeito observável e específico, nada de `toBeTruthy` ou de só checar que não lança exceção; valor esperado tirado da spec, nunca recalculado a partir do código; dublês só em dependências lentas, variáveis ou externas; relógio e aleatoriedade controlados. Em bug, reproduza antes de corrigir.
- Ao começar, mude `status` para `in_progress` (aqui e em `_tasks.md`). Mude para `completed` só quando todas as mini-tarefas estiverem marcadas e os critérios de sucesso tiverem sido comprovados por comando. A revisão contra a spec acontece uma vez, depois de todas as tarefas: não a espere aqui, mas não marque nada que não tenha prova, porque ela vai conferir.
</critical>

## Requisitos
- REQ-002: o cartão pendente mostra o resumo, os motivos e os botões "Trocar para execução direta" e "Continuar com a spec" para a dona da sessão.
- REQ-012 (tela): no erro "Essa proposta já foi decidida.", o cartão mostra a mensagem e passa ao estado atual, recarregando a timeline.
- REQ-013 (tela): o estado expirado mostra "Proposta expirada: a sessão terminou antes da decisão", sem ações.
- US-03 cen. 3: um leitor vê o cartão pendente sem botões, com "Aguardando a pessoa operadora decidir a troca de rota".
- Estados finais: "Troca confirmada por <nome>" e "Troca recusada por <nome>" (US-01 cen. 2, US-02 cen. 1).
- REQ-015: a aba Planejamento mantém "Rota recomendada" e "Rota aprovada" e acrescenta "Trocada para Execução direta após as perguntas, confirmada por <nome> em <dd/MM HH:mm>" e os motivos.
- REQ-016: o histórico mostra "<rota de origem> → Execução direta" quando `switchedTo` não é nulo.
- NFR-03: o nome acessível dos botões é igual ao texto visível; durante o envio, os dois ficam `disabled` com `aria-busy="true"`; a mudança de estado é anunciada numa região `aria-live="polite"`.
- Resumo e motivos aparecem como texto puro, sem HTML (§18).

## Interfaces
- **Consome:**
  - da task 05: `TimelineEntry` com `{ type: "route_switch"; proposal: RouteSwitchView }`, inferido do `AppRouter` por `sessionContract.ts`; `PlanningDetail.routeSwitch`; o item de sessão com `switchedTo`;
  - da task 04: a mutation `tasks.session.decideRouteSwitch({ projectId, taskId, sessionId, proposalId, decision, requestKey })` → `{ proposal }`, e o erro `CONFLICT` com a mensagem "Essa proposta já foi decidida.".
- **Produz:**
  - `RouteSwitchCard` em `apps/web/src/features/issues/assigned-work/components/RouteSwitchCard.tsx`, com as props `{ proposal: RouteSwitchView; canDecide: boolean; pending: boolean; error: string | null; onDecide(decision: "confirm" | "decline"): void }`;
  - `useRouteSwitchDecision` em `hooks/useRouteSwitchDecision.ts`;
  - os textos em `routeSwitchCopy.ts`.

## Mini-tarefas

- [ ] **06.1 — Textos e RouteSwitchCard com todos os estados**
  - **Arquivos:** `apps/web/src/features/issues/assigned-work/routeSwitchCopy.ts` (criar), `apps/web/src/features/issues/assigned-work/sessionContract.ts` (alterar: `RouteSwitchEntry`), `apps/web/src/features/issues/assigned-work/components/RouteSwitchCard.tsx` (criar), `apps/web/src/features/issues/assigned-work/components/RouteSwitchCard.test.tsx` (criar), `apps/web/src/test/session.ts` (alterar: fábrica de `route_switch`)
  - **Testes:** V-08a, V-08b, V-08c, V-08d, V-08e, V-08f
  - **Pronto quando:** `pnpm --dir apps/web exec vitest run src/features/issues/assigned-work/components/RouteSwitchCard.test.tsx` passa
  - **Nota:** espelhe a estrutura, a região polite e o estado de envio de `QuestionRequestCard.tsx`.
- [ ] **06.2 — Cartão na conversa e mutation de decisão**
  - **Arquivos:** `apps/web/src/features/issues/assigned-work/sessionClient.ts` (alterar), `apps/web/src/features/issues/assigned-work/hooks/useRouteSwitchDecision.ts` (criar), `apps/web/src/features/issues/assigned-work/components/SessionEntry.tsx` (alterar), `apps/web/src/features/issues/assigned-work/sessionTimelineModel.ts` (alterar, se ele filtrar ou agrupar por `type`), `apps/web/src/features/issues/assigned-work/components/SessionConversation.test.tsx` (alterar)
  - **Testes:** V-08g, V-08h
  - **Pronto quando:** `pnpm --dir apps/web exec vitest run src/features/issues/assigned-work/components/SessionConversation.test.tsx src/features/issues/assigned-work/components/RouteSwitchCard.test.tsx` passa
  - **Nota:** `canDecide` usa a mesma condição que hoje habilita responder a uma pergunta na conversa (dona com permissão de operar). A `requestKey` é gerada uma vez por clique e reaproveitada no retry, como em `useSessionActions.ts`.
- [ ] **06.3 — Registro no Planejamento e seta no histórico**
  - **Arquivos:** `apps/web/src/features/issues/assigned-work/components/PlanningDecisionView.tsx` (alterar; se crescer, crie `PlanningRouteSwitchRecord.tsx`), `apps/web/src/features/issues/assigned-work/components/PlanningDecisionView.test.tsx` (alterar), `apps/web/src/features/issues/assigned-work/components/ExecutionHistory.tsx` (alterar), `apps/web/src/features/issues/assigned-work/components/ExecutionHistory.test.tsx` (alterar), `apps/web/src/test/tasks.ts` ou `apps/web/src/test/execution.ts` (alterar fábricas)
  - **Testes:** V-08i, V-08j
  - **Pronto quando:** `pnpm --dir apps/web exec vitest run src/features/issues/assigned-work/components/PlanningDecisionView.test.tsx src/features/issues/assigned-work/components/ExecutionHistory.test.tsx` passa; `pnpm --dir apps/web typecheck` e `pnpm --dir apps/web lint` sem erros
  - **Nota:** formate a data no fuso fixo do teste, como os outros campos de data de `PlanningDecisionView`.

## Detalhes de implementação
- Siga `nextjs-folder-structure`: o componente fica na feature `assigned-work`, os textos num arquivo `*Copy.ts` dela e o hook em `hooks/`. Consuma tRPC como `trpc-nextjs` descreve: o cliente fica em `sessionClient.ts`.
- `ActiveRow.tsx` já usa `progress.route` no chip. Não precisa mudar, porque a task 05 entrega a rota efetiva.

### Arquivos relevantes
- `apps/web/src/features/issues/assigned-work/components/QuestionRequestCard.tsx` e seus testes: o padrão de cartão da conversa.
- `apps/web/src/features/issues/assigned-work/components/SessionEntry.tsx`: escolhe o componente pelo `type`.
- `apps/web/src/features/issues/assigned-work/planningCopy.ts`: `ROUTE_LABEL` na tela.
- `apps/web/src/features/issues/assigned-work/hooks/useSessionActions.ts`: mutations de sessão e `requestKey`.

### Arquivos afetados
- Os arquivos listados nas mini-tarefas.

### Decisões relacionadas
- DEC-01: o cartão é próprio do Flow Dev, não um AskUserQuestion.

## Premissas
Nenhuma.

## Testes atribuídos
- [ ] V-08a: pendente, `canDecide` → mostra "Mudança de texto em uma tela, sem regra nova", os 2 motivos e os botões `getByRole("button", { name: "Trocar para execução direta" })` e `{ name: "Continuar com a spec" }`; clicar em cada um chama `onDecide("confirm")` e `onDecide("decline")` · componente
- [ ] V-08b: pendente, `canDecide: false` (leitor) → nenhum botão; mostra "Aguardando a pessoa operadora decidir a troca de rota" · componente
- [ ] V-08c: `confirmed`, `decidedBy: "Ana"` → "Troca confirmada por Ana"; nenhum botão · componente
- [ ] V-08d: `declined`, `decidedBy: "Ana"` → "Troca recusada por Ana"; nenhum botão · componente
- [ ] V-08e: `expired` → "Proposta expirada: a sessão terminou antes da decisão"; nenhum botão · componente
- [ ] V-08f: `pending: true` → os dois botões `disabled` e com `aria-busy="true"` · componente
- [ ] V-08g: na conversa com API falsa, clicar em "Trocar" faz a mutation responder `CONFLICT` "Essa proposta já foi decidida." → a mensagem aparece, a timeline é recarregada e o cartão mostra o estado devolvido ("Troca recusada por Ana") · componente + API falsa
- [ ] V-08h: a timeline traz o mesmo cartão, primeiro `pending` e depois `confirmed` → a região `aria-live="polite"` passa a ter "Troca confirmada por Ana" · componente + API falsa
- [ ] V-08i: Planejamento com `routeSwitch` confirmado por Ana em 25/11 10:06 → mostra "Rota recomendada: PRD", "Rota aprovada: PRD", "Trocada para Execução direta após as perguntas, confirmada por Ana em 25/11 10:06" e os motivos; com `routeSwitch: null`, nada disso aparece · componente
- [ ] V-08j: histórico com uma sessão `route: "prd"` e `switchedTo: "direct_execution"` → mostra "PRD → Execução direta"; uma sessão com `switchedTo: null` mostra só "PRD" · componente

## Critérios de sucesso
- Todas as mini-tarefas marcadas, cada uma com o "Pronto quando" executado.
- Todos os testes atribuídos implementados e passando.
- `pnpm --dir apps/web test`, `pnpm --dir apps/web typecheck` e `pnpm --dir apps/web lint` passam no fim da tarefa.

## Registro de execução
