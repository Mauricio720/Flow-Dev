# Revisão de conformidade 002: Trocar para execução direta depois das perguntas da spec

> **Data:** 2026-11-25 · **Escopo:** feature inteira, depois da rodada de correções da review-001. Conferi cada correção e o que ela tocou. · **Intervalo:** mudanças não commitadas sobre `HEAD` (`8de2ae2`), filtradas para os arquivos desta feature
> **Spec:** `docs/specs/troca-para-execucao-direta/spec.md`, `_tasks.md`, `task_01.md` a `task_07.md` · **Revisão anterior:** `reviews/review-001.md`
> **Regras lidas:** `CLAUDE.md` → `AGENTS.md`, `apps/web/AGENTS.md`, `.agents/rules/code-standards.md`, `.agents/rules/e2e-testing.md`, skills `layered-backend`, `trpc-nextjs`, `nextjs-folder-structure`, `e2e-environment` e `software-testing`

> **Arquivos tocados pela rodada de correções** (alterados depois da review-001):
> - código: `routeSwitchDecision.ts`, `routeSwitchService.ts`, `routeSwitchController.ts`, `routeSwitchView.ts`, `routeSwitch.ts`, `routeSwitchReads.ts`, `workProgressReads.ts`, `planningProjection.ts`, `drizzleTerminalExecutionDao.ts`, `sessionTimelineQueries.ts`;
> - testes: `routeSwitchView.test.ts`, `route-switch-decide.test.ts`, `route-switch-decide-errors.test.ts`, `route-switch-effective-reads.test.ts`, os novos `route-switch-recorder.test.ts`, `issue-deletion-route-switch.test.ts` e `SessionConversationRouteSwitch.test.tsx`, e `session-recorder.test.ts`, `issue-deletion-terminal.test.ts` e `SessionConversation.test.tsx`, que voltaram a ser iguais ao `HEAD`.
>
> `spec.md` e os `task_NN.md` não mudaram.

## Veredito: APROVADO COM RESSALVAS

As cinco correções de código da review-001 estão feitas e verificadas. O teste da troca concorrente passa, o replan real entrou na V-07f, o log não se repete no replay, os textos soltos viraram constantes e os três arquivos de teste voltaram a ter até 100 linhas. Todas as suítes, o typecheck, o lint e o e2e V-09a passaram de novo. Sobram dois achados menores:
- ao reescrever o teste da V-07f, a prova da V-07c ("pendente e recusada não mudam o chip") se perdeu;
- a spec não foi atualizada com o que mudou na implementação, item 6 do prompt de correção (§24).

| Bloqueante | Importante | Menor | Spec a discutir |
|---|---|---|---|
| 0 | 0 | 2 | 2 |

## Verificação executada

| Comando | Saída | Resultado |
|---|---|---|
| `pnpm --dir packages/api test` | exit 0 · 141 arquivos, 893 testes passaram | ✅ |
| `pnpm --dir packages/api test:integration` (sem `TEST_DATABASE_URL`) | exit 0 · 192 arquivos passaram, 2 ignorados · 881 testes passaram, 5 ignorados | ✅ |
| `pnpm --dir apps/web test` | exit 0 · 117 arquivos, 640 testes passaram | ✅ |
| `pnpm typecheck` (raiz) | exit 0 | ✅ |
| `pnpm lint` (raiz) | exit 0 | ✅ |
| `pnpm --dir apps/web e2e:prepare` | exit 0 | ✅ |
| `pnpm --dir apps/web exec playwright test e2e/route-switch.spec.ts` | exit 0 · 1 passed (V-09a) | ✅ |
| `scan_diff.py --worktree --max-lines 100` | nenhum arquivo longo desta feature. O único longo é `githubIssueDeletionGateway.ts`, de outra frente | ✅ |

## Conferência das correções da review-001

| Achado | Status | Evidência |
|---|---|---|
| M-1 — segunda confirmação da mesma decisão | ✅ Corrigido | `routeSwitchDecision.ts`: `isSecondConfirmation` reconhece `23505` + `task_route_switches_decision_confirmed_unique` fora da transação, que já foi desfeita, e devolve `existingOutcome`. A chave não bate, então o resultado é `already_decided` → `CONFLICT` "Essa proposta já foi decidida.". O teste `route-switch-decide-errors.test.ts` › "RN-03 refuses to confirm a second proposal…" passa pelo router real com duas sessões e confere: a segunda continua `pending` com os campos de decisão nulos, e só existe a mensagem da primeira. O comportamento resultante na tela fica para S-1 |
| M-2 — testes acima de 100 linhas | ✅ Corrigido | `session-recorder.test.ts` (97), `issue-deletion-terminal.test.ts` (93) e `SessionConversation.test.tsx` (71) são idênticos ao `HEAD` (`git diff --stat` vazio). Os casos foram para `route-switch-recorder.test.ts` (38), `issue-deletion-route-switch.test.ts` (35) e `SessionConversationRouteSwitch.test.tsx` (51). As asserções foram preservadas; nos testes de API, o `run` local virou o helper `cycle`, e a V-03f continua provando que o turno rodou |
| M-3 — V-07f sem replan | ✅ Corrigido, com regressão (veja M-1 abaixo) | `route-switch-effective-reads.test.ts` › "V-07f drops the switch of the replaced decision…": aprova uma D2 (`tech_spec`) com a troca confirmada da D1 ainda no banco. Confere `readProgress` = `tech_spec`, `planning.decision.id` = D2 e `routeSwitch` = `null`. Agora a versão "qualquer troca da tarefa" falharia |
| M-4 — textos e tipos soltos | ✅ Corrigido | `CONFIRMED_ROUTE_SWITCH_STATUS` (`routeSwitch.ts:2`) usado em `workProgressReads.ts:10`, `drizzleTerminalExecutionDao.ts:21` e `routeSwitchReads.ts:28,60`. `toDecidedRouteSwitchView` (`routeSwitchView.ts`) substitui o `"waiting"` em `routeSwitchService.ts:33` e `planningProjection.ts:21`, com teste próprio. Cast `as PlanningRoute` (`workProgressReads.ts:11`). `TerminalSessionStatus` importado no topo de `sessionTimelineQueries.ts`, e o `decisionId` que não era usado foi removido. Resta o `row!` em `sessionTimelineQueries.ts:23`, que o prompt não pedia para trocar |
| M-5 — log repetido no replay | ✅ Corrigido | `routeSwitchService.decide` devolve `outcome`, e o controller só loga com `decided` (`routeSwitchController.ts:20`). O teste `route-switch-decide.test.ts` › "V-06c does not log the decision again…" confere um único `route_switch_decided` e a mesma resposta no replay |
| Prompt item 6 — atualizar a spec (S-2) | ❌ Não feito | `spec.md` não mudou desde 22:05, antes da review-001: §15 ainda diz `kind: "route_switch"` (linha 252), e US-03 cen. 1 ainda cita "Rota recomendada" (linha 83). Veja M-2 abaixo |

## Conformidade com a spec

Releitura dos itens que as correções tocaram. Os demais seguem como na review-001 (todos ✅) e foram cobertos de novo pelas suítes e pelo e2e desta sessão.

| Item | Status | Evidência |
|---|---|---|
| REQ-004/005/006 | ✅ | O serviço devolve `{ proposal, outcome }`, e o controller expõe só `proposal`; o contrato da procedure (§15) não mudou. V-05a/b/c passam |
| REQ-012 / B-02 | ✅ | V-06b, V-06c e V-06e passam. O replay devolve a mesma resposta (`expect(replay).toEqual(first)`) |
| RN-03 (uma confirmada por decisão) | ✅ | Índice + tratamento de domínio; teste "RN-03 refuses…" |
| REQ-014 / V-07a | ✅ | Primeiro caso de `route-switch-effective-reads.test.ts` |
| V-07b / V-07c | 🟡 | Sem prova depois da reescrita: M-1 |
| REQ-015 / V-07f | ✅ | `routeSwitch` confirmado com `decidedBy: "Ana"`; `null` depois do replan |
| REQ-018 / B-04 | ✅ | V-07e (prompt) e V-07f (chip e Planejamento) |
| §19 (logs) | ✅ | `route_switch_decided` agora sai uma vez por decisão |
| REQ-013 / tela | ✅ | `toDecidedRouteSwitchView` só é usado em registros decididos; a timeline continua calculando "expirada" com `toRouteSwitchView` |
| §24 Definição de pronto: a spec atualizada com o que mudou | ❌ | M-2 |

## Regras do projeto

| Regra (fonte) | Status | Evidência |
|---|---|---|
| `.ts` com no máximo 100 linhas (`code-standards.md` › File Size) | ✅ | Nenhum arquivo desta feature passa de 100 (scanner) |
| Funções com no máximo 30 linhas | ✅ | `decideRouteSwitch` foi dividida em `decideInTransaction` e `isSecondConfirmation` |
| Constantes para textos (`code-standards.md` › Magic Numbers and Strings) | ✅ | `UNIQUE_VIOLATION_CODE`, `SINGLE_CONFIRMATION_CONSTRAINT`, `CONFIRMED_ROUTE_SWITCH_STATUS`, `ONE_HOUR_IN_MILLISECONDS` |
| Sem comentários, sem linha em branco dentro de função, até 3 parâmetros | ✅ | Arquivos tocados relidos |
| `layered-backend`: tradução do erro de banco na infra, domínio no serviço | ✅ | O 23505 vira `already_decided` no DAO; o serviço converte em `TaskError` |
| Sem commit/push/PR sem pedido | ✅ | Nada commitado |

## Achados

### task_05 · 05.2

#### M-1 (Menor) — A reescrita do teste da V-07f deixou a V-07c sem prova
- **Onde:** `packages/api/test/route-switch-effective-reads.test.ts`. O caso "V-07a, V-07b and V-07c use only the confirmed switch on the current decision" só confere `route: "direct_execution"` com as três propostas no banco (confirmada, pendente e recusada). O trecho que apagava a confirmada e conferia `route: "prd"` saiu.
- **Contra:** V-07c em `task_05.md` ("tarefa `prd` só com uma proposta `pending` e outra `declined` → `route = "prd"`") e V-07b ("tarefa `prd` sem troca → `prd`").
- **Problema** (inferido da leitura, não rodei a mutação): contraexemplo: tire o `eq(taskRouteSwitches.status, CONFIRMED_ROUTE_SWITCH_STATUS)` do join de `readRoutes` (`workProgressReads.ts:10`). O primeiro caso continua passando, porque a confirmada está no banco e o resultado é `direct_execution`. A V-07f também, porque a D2 não tem nenhuma proposta. O código atual está certo, e o filtro existe; o que falta é a prova. O título do teste diz V-07b e V-07c sem conferir nenhuma das duas.
- **Correção esperada:** um caso, ou um passo no mesmo teste, em que a decisão vigente `prd` tem só uma proposta `pending` e uma `declined`, sem confirmada. Ele confere `readProgress(...).route = "prd"` e `planning.routeSwitch = null`. Depois, ajuste o título do primeiro caso para V-07a.

### Spec e registros

#### M-2 (Menor) — A spec e os registros de execução não refletem a implementação nem a rodada de correções
- **Onde:**
  - `docs/specs/troca-para-execucao-direta/spec.md:252`: "`{ kind: "route_switch", … }`", mas o código usa `type`;
  - `spec.md:83`: US-03 cen. 1, e também REQ-015, cita "Rota recomendada/Rota aprovada", mas a tela mantém "Recomendação original/Rota salva", como o usuário confirmou;
  - PT-04 e a mudança no roteiro do e2e só aparecem no `_tasks.md` e no `task_07.md`;
  - nenhum `task_NN.md` registra a rodada de correções da review-001.
- **Contra:** spec §24 ("a spec foi atualizada com o que mudou na implementação") e o item 6 do prompt de correção da review-001. O fluxo do `_tasks.md` também pede anotar os comandos no Registro de execução.
- **Correção esperada:**
  - atualizar a §15 (`type`, e a forma de `TimelineEntry` com `id` e `at`), REQ-015 e US-03 cen. 1 (os rótulos existentes), REQ-017 (a linha termina com "· Complexidade: X") e a §22/V-09 (roteiro sem `wait_message` depois do `ask`), mantendo os IDs;
  - registrar no Histórico da spec a decisão tomada em M-1 da review-001 (S-1 abaixo);
  - acrescentar ao Registro de execução de `task_04.md` e `task_05.md` as correções e os comandos rodados.

## Atualizações de spec a discutir
- **S-1 (o que a tela mostra depois da segunda confirmação), atualizado:** a implementação escolheu responder "Essa proposta já foi decidida." Só que a segunda proposta continua `pending`. Depois de recarregar, o cartão volta com os botões, e cada novo "Trocar" repete o erro; só "Continuar com a spec" resolve. Vale decidir na spec se essa pendente deve aparecer como expirada, ou ser descartada com "este trabalho já foi trocado", quando a decisão já tem troca confirmada, e qual texto o erro deve ter.
- **S-3 (chip durante um replan em revisão), mantido da review-001:** `readRoutes` segue a decisão mais recente por `created_at`, sem filtrar por status. Enquanto uma D2 está em revisão, o chip mostra a rota dela, embora a "decisão vigente" (`tasks.planning_decision_id`) ainda seja a D1, trocada.

## Divergências entre o relatório do implementador e a evidência
- O item 6 do prompt de correção (atualizar a spec) não foi feito, e a rodada não foi registrada em nenhum `task_NN.md`. A evidência das outras cinco correções bate com o que rodei.

## Prompt de correção

> Corrija, nesta ordem, sem alterar nada fora do listado:
> 1. **M-1** (task_05 · 05.2): em `packages/api/test/route-switch-effective-reads.test.ts`, acrescente um caso com a decisão vigente `prd` e só duas propostas, uma `pending` e uma `declined`, sem confirmada. Confira `readProgress(...).route = "prd"` (V-07c) e `planning.routeSwitch = null`. Renomeie o primeiro caso para cobrir só a V-07a. A V-07b já fica provada por esse cenário sem troca confirmada. O arquivo continua com até 100 linhas.
> 2. **M-2** (spec): em `docs/specs/troca-para-execucao-direta/spec.md`, mantendo os IDs:
>    - troque `kind` por `type` na §15 e mostre a forma de `TimelineEntry` (`{ type: "route_switch"; id; proposal; at }`);
>    - use em REQ-015 e US-03 cen. 1 os rótulos "Recomendação original" e "Rota salva";
>    - registre em REQ-017 a linha completa "Rota aprovada: PRD · trocada para Execução direta · Complexidade: X";
>    - registre o roteiro final do e2e na §22/V-09;
>    - acrescente ao Histórico a regra da segunda confirmação da mesma decisão (`CONFLICT` "Essa proposta já foi decidida.", com a proposta mantida pendente).
>
>    No Registro de execução de `task_04.md` e `task_05.md`, anote as correções da review-001 e os comandos rodados.
>
> Restrições: `.agents/rules/code-standards.md` (sem comentários, `.ts` ≤ 100 linhas, funções ≤ 30, constantes nomeadas). Sem dependências novas, e sem commit, push ou PR.
> Ao terminar, rode e mostre a saída de: `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/route-switch-effective-reads.test.ts` e `pnpm --dir packages/api typecheck`. Não marque nada como concluído sem essa saída.
