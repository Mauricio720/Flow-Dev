# Revisão de conformidade 001: Revisão automática da feature (Issue #9)

> **Data:** 2026-11-25 · **Escopo:** feature inteira, **parcial**: task_08 (e2e V-14, smoke V-15, definição de pronto) excluída a pedido do usuário · **Intervalo:** mudanças não commitadas sobre `ef8a480` (a árvore mistura as Issues #8 e #10; só os arquivos da #9 foram julgados)
> **Spec:** `docs/specs/revisao-automatica-da-feature/spec.md`, `_tasks.md`, `task_01.md`–`task_07.md` · **Regras lidas:** `AGENTS.md`, `CLAUDE.md`, `apps/web/AGENTS.md`, `.agents/rules/code-standards.md`, skills `layered-backend`, `trpc-nextjs`, `nextjs-folder-structure`, `software-testing`

## Veredito: REPROVADO

O `tasks.review.get` só devolve ciclo não final. Por isso a tela nunca mostra um ciclo terminado: nem "Aprovada na rodada {n}", nem "Parada por você…", nem as rodadas dele, e a aba nunca fica "Concluída". Além disso, a suíte de integração falhou em dois testes do próprio ciclo (V-05e e V-06f), que passam isolados. Também falta recuperar o papel sem sessão depois de uma queda (REQ-020/REQ-021).

| Bloqueante | Importante | Menor | Spec a discutir |
|---|---|---|---|
| 2 | 2 | 3 | 2 |

## Verificação executada

| Comando | Saída | Resultado |
|---|---|---|
| `pnpm --dir packages/api typecheck` | exit 0 | ✅ |
| `pnpm --dir apps/web typecheck` | exit 0 | ✅ |
| `pnpm lint` | exit 0 (só `apps/web` declara lint; `packages/api` não tem script) | ✅ |
| `pnpm --dir packages/api test` | exit 0 · 136 arquivos, 849 testes | ✅ |
| `pnpm --dir apps/web test` | exit 0 · 113 arquivos, 625 testes | ✅ |
| `pnpm --dir packages/api test:integration` (sem `TEST_DATABASE_URL`) | exit 1 · 2 falharam, 843 passaram, 5 ignorados · `review-cycle-rounds.test.ts:59` (V-05e: `expected [] to have a length of 1`) e `review-cycle-sessions.test.ts:56` (V-06f: `expected {…} to match object { state: 'reviewing', round: 2 }`) | ❌ |
| `vitest run --config vitest.integration.config.ts test/review-cycle-rounds.test.ts test/review-cycle-sessions.test.ts` (isolados) | exit 0 · 7 testes | ✅ (falha intermitente: confirmada) |
| `scan_diff.py --worktree --max-lines 100` | dependências: nenhuma; 2 arquivos da #9 acima de 100 linhas confirmados; os demais avisos são das Issues #8/#10 ou anteriores | — |

Não rodados: `pnpm build` e Playwright (pertencem à task_08, excluída).

## Conformidade com a spec

| Item | Status | Evidência |
|---|---|---|
| REQ-001, REQ-038 | ✅ | `hooks/useReviewTab.tsx:17`, `OperatorStages.tsx` · V-12a, V-12c |
| REQ-002, REQ-005, REQ-006, REQ-010 | ✅ | `ReviewStartForm.tsx:25-31`, `useReviewStartFlow.ts`, `reviewPrompts.ts:22` · V-11h, V-11b, V-03b |
| REQ-003 (DEC-07) | ✅ | `reviewDefaults.ts:4-6` · V-04a, V-04b |
| REQ-004, REQ-007–009, REQ-011 | ✅ | `reviewCycleService.ts:35-51`, `reviewStartChecks.ts` · V-04c–V-04f, V-04h |
| REQ-012–016, REQ-019 | ✅ | `reviewStepTurn.ts:26-56`, `reviewStageReader.ts:76-87` · V-05a, V-05b, V-05h, V-07a/b |
| REQ-017 / §7.5 | 🟡 | Prompts exatos (`reviewCopy.ts:11-15`, V-03a–f); "Tentar de novo" depois de `fix` reenvia outro texto (M-1) |
| REQ-018 | ✅ | `drizzleTerminalEventDao.ts:23` (pasta do ciclo) · V-05f |
| REQ-020, REQ-021, NFR-04 | 🟡 | Só a primeira abertura da revisão é recuperada (`reviewCycleStep.ts:33`); ver I-1 |
| REQ-022–024, REQ-026–029, REQ-042–044 | ✅ | `reviewStepActions.ts`, `reviewStepFailure.ts`, `reviewStepGuards.ts`, `deletionWork.ts` · V-06a–V-06m, V-05c/d |
| REQ-025 | 🟡 | Ver M-1 |
| REQ-030–032 | ✅ | `reviewCycleRules.ts:6-35`, `reviewCycleController.ts:29-37`, `drizzleReviewCycleDao.ts:37-41` · V-02, V-04g, V-08a/b |
| REQ-033 | ❌ | Estados finais e rodadas de ciclo terminado nunca chegam à tela: `reviewCycleService.ts:24-25` (B-1) |
| REQ-034, REQ-035, REQ-037, REQ-040, REQ-041 | ✅ | `ReviewConversation.tsx`, `useReviewPolling.ts`, `reviewStepTurn.ts:90-95` · V-11d, V-09a, V-05a |
| REQ-039 / §7.2 | ❌ | "Concluída" (Aprovada / Ressalvas aceitas) inalcançável: `reviewModel.ts:18` recebe `null` (B-1) |
| §7.4 estados finais | ❌ | Textos em `reviewModel.ts:35-43`, mas inalcançáveis (B-1). Os demais textos estão corretos (`taskErrorMapper.ts`, `reviewCopy.ts`) |
| §7.3 | ✅ | `reviewStageReader.ts` · V-01a–h |
| NFR-01, NFR-05, NFR-06 | ✅ | `useReviewPolling.ts:5`, `ReviewCycleStatus.tsx:11` (`aria-live="polite"`), `reviewLog.ts` · V-09a, V-11g, V-05g, V-06m |
| NFR-02 | 🟡 | Implementado no mesmo tick; V-05e falha de forma intermitente (B-2) |
| §9 Não muda | ✅ | V-13a–f; `terminalSessionController.ts` delega ao `SessionLauncher` com os testes de abertura intactos |
| §14, §20 | ✅ | `0053_review_cycles.sql`, rollback, journal, `FEATURE_MIGRATIONS` · V-13b, V-04i |
| DEC-01, DEC-02, DEC-05, DEC-08 | ✅ | Passo no worker; leitura de `reviews/etapa.md`; legadas intactas; duas sessões (V-05a) |
| DEC-03 (sem WebSocket, sem dependência ou variável nova) | ✅ | Nenhum arquivo de dependência mudou; o `env` novo só existe em `vitest.integration.config.ts` |
| B-01–B-07, B-09–B-12 | ✅ | V-06b/c, V-01h, V-01f, V-08b, V-06d, V-13e, V-06e/j, V-06g, V-06i, V-01d |
| Fora de escopo | ✅ | Nada de GitHub, limite de rodadas, padrão por projeto ou histórico de ciclos |
| V-14, V-15, §24 | — | task_08, excluída desta revisão |

## Regras do projeto

| Regra (fonte) | Status | Evidência |
|---|---|---|
| Máx. 100 linhas por `.ts` (`code-standards.md` "File Size") | ❌ | `test/review-cycle-rounds.test.ts` 102, `test/review-cycle-caveats.test.ts` 101; `reviewStepTurn.ts` chega a 100 empilhando instruções (I-2) |
| Máx. 3 parâmetros (`code-standards.md` "Parameters") | ❌ | `reviewStepTurn.ts:86` (6), `:96` (6), `reviewStepActions.ts:56` (5) (I-2) |
| Máx. 30 linhas por função, sem linha em branco em função | ✅ | |
| Sem comentários | ✅ | O scanner não achou comentário novo nos arquivos da #9 |
| Constantes nomeadas | 🟡 | M-3 |
| Camadas: controller → serviço → DAO; contratos em `application/` (`layered-backend`) | ✅ | `reviewCycleController.ts`, `application/database/dao/reviewCycle*Dao.ts`, `infra/database/dao/review/` |
| tRPC: router fino, input Zod `.strict()`, `TaskError` pelo mapper (`trpc-nextjs`) | ✅ | `routers/review.ts`, `schemas/review.ts`, `taskErrorMapper.ts` |
| Pasta por feature, `"use client"` nas folhas (`nextjs-folder-structure`) | ✅ | `features/issues/assigned-work/{components,hooks}/Review*` |
| Sem dependência nova e sem escrever no checkout (`_tasks.md` Restrições, §9) | ✅ | Só `CheckoutFileReader.read` em `reviewStepTurn.ts:45,61` |
| Verificação proporcional (`AGENTS.md` "Verificação") | ❌ | `test:integration` não passa (B-2) |

## Achados

### B-1 (Bloqueante) — `get` esconde o ciclo terminado · task_04 (04.2) e task_07 (07.1, 07.4, 07.5)
- **Onde:** `packages/api/src/application/services/review/reviewCycleService.ts:24-25`: `const [open, latest, …] = …; … open ? this.deps.cycles.view(open.id) : Promise.resolve(null)`.
- **Contra:** REQ-033, REQ-039 / §7.2 ("Aprovada ou Ressalvas aceitas → Concluída"), §7.4 ("Aprovada na rodada {n}", "Parada por você na rodada {n}", "Parada na rodada {n}: {motivo}"), US-02 cen. 3, US-04 cen. 1, V-09b.
- **Problema:** assim que o passo grava `approved`, `accepted` ou `stopped`, o `get` devolve `cycle: null`. A tela passa a mostrar "A revisão ainda não começou." (`reviewModel.ts:36`) e a aba fica "Pendente" (`reviewModel.ts:18`). As rodadas e os links dos relatórios somem. O motivo de REQ-026 nunca aparece, e "Parada por você na rodada 3" também não. A leitura de 3 s nunca para, porque `shouldPoll` (`useReviewStage.ts:12-15`) continua verdadeiro com `cycle` nulo. Essa leitura roda em toda página de trabalho com conjunto legível (`useReviewTab.tsx:13`). Os testes da tela (V-09b, V-11a, V-12b) passam contra uma API falsa que devolve ciclos finais, coisa que o servidor real nunca faz. Nenhum teste de integração chama `get` depois de um ciclo terminar.
- **Correção esperada:** `get` devolve a visão do ciclo mais recente do trabalho (`findLatest`), final ou não. Um teste de integração prova: depois de `approved`, de `accepted` e de `stopped` (pela operadora e por REQ-026), o `get` traz o estado, a rodada, as rodadas e o `stopReason`. Com isso a leitura periódica para no estado final.

### B-2 (Bloqueante) — Testes do ciclo falham de forma intermitente na suíte completa · task_05 (05.3) e task_06 (06.2)
- **Onde:** `test/review-cycle-rounds.test.ts:58-59` (V-05e) e `test/review-cycle-sessions.test.ts:46-56` (V-06f). Nos dois, um relógio falso é avançado até `Date.now()` (`review-cycle-sessions-support.ts:31`, `cycleAtCurrentTime`), enquanto o runtime grava eventos com a hora real. O V-05e ainda calcula a `requestKey` esperada com a revisão **atual** do ciclo (`cycleRecord.revision`, linha 58), em vez da revisão capturada no tick.
- **Contra:** `AGENTS.md` "Verificação"; `software-testing`, revisão de flakiness (tempo e ordem).
- **Problema:** na suíte completa, `test:integration` termina com exit 1. Isolados, os dois arquivos passam. Sob carga, a ordem entre o relógio falso e os carimbos reais dos eventos inverte. Além disso, qualquer gravação legítima depois do tick muda a revisão e a chave. São justamente os testes que provam NFR-02 e B-09, então hoje eles não dão sinal confiável.
- **Correção esperada:** os testes usam uma só fonte de tempo, controlada, para o passo e para os eventos do runtime roteirizado, ou comparam por ordem de eventos em vez de hora. O V-05e captura a revisão usada no envio, ou procura a mensagem pelo conteúdo e pela sessão. A suíte completa passa três vezes seguidas.

### I-1 (Importante) — Papel sem sessão só é recuperado na primeira abertura da revisão · task_05 (05.3) e task_06 (06.4)
- **Onde:** `reviewCycleStep.ts:33`: `if (cycle.state !== "reviewing" || … || cycle.stepStartedAt || cycle.reviewSessionId) return;`. Também `reviewStepTurn.ts:34-38` e `reviewStepActions.ts:50-52`: a transição grava `stepStartedAt` antes de `ReviewStepOpen.open`. E `reviewStepOpen.ts:26-27`: `setSession` recusado (`isNull(pendingAction)` em `drizzleReviewCycleWorkerDao.ts:25`) devolve `null` com a sessão já criada.
- **Contra:** REQ-020 ("mesmo se o serviço de sessões reiniciar entre criar a sessão e registrá-la"), REQ-021, REQ-040, NFR-04, §16 passo 2.3 ("Se o papel da vez ainda não tem sessão, abre uma…", a cada tick).
- **Problema:** há dois cenários.
  1. A revisão grava `execute`, o tick passa o ciclo a `executing` e o serviço cai antes de `setSession` da execução (ou antes de `open` de uma substituta). Depois do reinício, `executeSessionId` é nulo e `stepStartedAt` está preenchido. Nenhum passo abre ou registra a sessão: o ciclo fica em "Executando" para sempre, sem falha. A sessão criada pela chave derivada roda sozinha.
  2. A operadora pede "Parar revisão" enquanto `launch` prepara a sessão. Aí `setSession` é recusado, e `finish` (`reviewStepTurn.ts:93`) só encerra as sessões registradas no ciclo. A sessão de execução nova, com `review_cycle_id`, continua viva no checkout depois de Parada.

  O V-06k só cobre o primeiro cenário, e só para a revisão na rodada 1.
- **Correção esperada:** a cada tick, se o papel da vez não tem sessão registrada, o passo procura ou abre a sessão pela `reviewOpenRequestKey(ciclo, papel, tentativa)` e a registra, também para a execução e para as substitutas. `finish` encerra todas as sessões com `review_cycle_id` do ciclo, registradas ou não. Testes: queda injetada entre a transição para `executing` e `setSession` da execução, depois uma única sessão `review_execute`, registrada, e o ciclo segue; `stop` durante `launch`, depois nenhuma sessão do ciclo ativa ao fim.

### I-2 (Importante) — Limites de tamanho e de parâmetros · task_05, task_06
- **Onde:**
  - `test/review-cycle-rounds.test.ts` (102 linhas) e `test/review-cycle-caveats.test.ts` (101 linhas).
  - `reviewStepTurn.ts` tem 100 linhas exatas porque empilha instruções na mesma linha (`:24` `if (…) return; return …`, `:57` método inteiro numa linha, `:100` função inteira numa linha). Os helpers de teste fazem o mesmo (`review-cycle-rounds.test.ts:72`, `review-cycle-sessions-support.ts:31-36`).
  - Parâmetros: `ReviewStepTurn.sendContinuation` (6, `:86`), `logStage` (6, `:96`), `ReviewStepActions.sendRetry` (5, `:56`).
- **Contra:** `.agents/rules/code-standards.md` "File Size" (nenhum `.ts` acima de 100 linhas; acima disso, dividir responsabilidades) e "Parameters" (no máximo 3; acima disso, objeto de parâmetros).
- **Problema:** duas violações diretas, mais o contorno da regra de tamanho, que deixa `ReviewStepTurn` com leitura, validação, gravação da rodada, passagem de vez e encerramento numa classe só.
- **Correção esperada:** dividir `ReviewStepTurn` (por exemplo: leitura e validação da etapa; passagem de vez e encerramento), uma instrução por linha; dividir os dois testes; objetos de parâmetro nas três funções.

### M-1 (Menor) — "Tentar de novo" depois de `fix` não reenvia a mensagem de ressalvas · task_06 (06.1)
- **Onde:** `reviewStepActions.ts:62-65`: o reenvio da execução escolhe `executeInitialPrompt` ou `executeContinuation` pelo número da rodada.
- **Contra:** §7.5 "Tentar de novo: manda de novo a última mensagem da etapa à mesma sessão", REQ-025.
- **Problema:** se a execução falha depois de "Pedir correção", "Tentar de novo" manda "Corrija os achados…" ou "A revisão reprovou de novo…" no lugar da mensagem de ressalvas.
- **Correção esperada:** o reenvio usa a última mensagem enviada à sessão da vez (ou guarda o tipo da mensagem da etapa). Teste: ressalvas, `fix`, falha da execução e `retry`, e a mesma sessão recebe de novo `caveatsPrompt`.

### M-2 (Menor) — Leitura duplicada com a aba Revisão aberta · task_07 (07.5)
- **Onde:** `hooks/useReviewTab.tsx:13` e `components/ReviewStage.tsx:21`: os dois chamam `useReviewStage`, cada um com o próprio temporizador de 3 s.
- **Contra:** §9 ("ler … com a frequência de hoje"), §16 passo 3 (uma leitura a cada 3 s).
- **Correção esperada:** um só estado de leitura, compartilhado entre a aba e o painel.

### M-3 (Menor) — Constantes com nome enganoso e regex duplicada · task_05, task_06
- **Onde:** `reviewStepActions.ts:50` usa `ZERO_DURATION_MS` e `NEXT_ROUND` para incrementar `attempt`. `reviewStepTurn.ts:100` repete a regex de `reviewStageReader.ts:5`.
- **Contra:** `code-standards.md` "Magic Numbers and Strings" (nomes que deixem o conceito claro).
- **Correção esperada:** uma constante própria para o incremento de tentativa; reusar a extração do número do relatório de `reviewStageReader.ts`.

## Atualizações de spec a discutir
- **Revisão cresce a cada gravação do serviço:** §14 manda incrementar `revision` em toda gravação, inclusive `setSession` (`drizzleReviewCycleWorkerDao.ts:25`). Assim, um "Parar revisão" pedido com a tela de 3 s atrás recebe "A revisão mudou." mesmo com o estado visível igual. REQ-032 fala em "estado que já mudou". Decidir se a recusa deve olhar o estado e o papel, ou se fica como está.
- **Pasta na raiz do checkout:** com `tasks_folder` vazio, os prompts escrevem "raiz do checkout" no lugar de `{pasta}` (`reviewPrompts.ts:19`). A §7.5 não prevê o caso; registrar ou proibir.

## Divergências entre o relatório do implementador e a evidência
- task_06, "gates completos": `test:integration` com "1 falha intermitente em `codex-secret-answer.test.ts`… não toca a revisão" → nesta revisão a suíte completa falhou em **dois testes do próprio ciclo** (V-05e, V-06f), que passam isolados.
- task_04, V-04a marcado: "com um ciclo, `view` devolve as rodadas" → vale só para ciclo não final; com o ciclo terminado o `get` devolve `cycle: null` (B-1).
- task_07, V-09b, V-11a e V-12b marcados → passam contra uma API falsa que devolve ciclos finais, que o servidor real não devolve (B-1).

## Fora do escopo, mas na árvore
- `packages/api/.preflight.tmp.ts` (não versionado, de 2026-11-24, anterior à #9) tem `console.log` e IDs reais de projeto, tarefa e usuário. Não deve entrar em commit.

## Prompt de correção

> Corrija, nesta ordem, sem alterar nada fora do listado (a task_08 continua fora):
> 1. **B-1**, `packages/api/src/application/services/review/reviewCycleService.ts`: `get` devolve a visão do ciclo mais recente do trabalho, final ou não (REQ-033, REQ-039, §7.4). Teste de integração novo: depois de `approved`, `accepted`, `stopped` pela operadora e `stopped` por REQ-026, o `get` traz o estado, a rodada, as rodadas com `reportArtifactId` e o `stopReason`. Confira que `useReviewStage` para de ler no estado final com o servidor real (V-09b).
> 2. **B-2**, `test/review-cycle-rounds.test.ts` (V-05e) e `test/review-cycle-sessions.test.ts` (V-06f), com `test/review-cycle-sessions-support.ts`: uma única fonte de tempo controlada para o passo e para os eventos do runtime roteirizado, sem `Date.now()`; o V-05e procura a continuação sem depender da revisão atual do ciclo. A suíte completa de integração passa três vezes seguidas.
> 3. **I-1**, `reviewCycleStep.ts`, `reviewStepOpen.ts`, `reviewStepTurn.ts` (`finish`): a cada tick, papel da vez sem sessão registrada → procurar ou abrir pela `reviewOpenRequestKey` e registrar, para revisão, execução e substitutas (REQ-020, REQ-021, §16 passo 2.3); `finish` encerra todas as sessões com `review_cycle_id` do ciclo. Testes: queda injetada entre a transição para `executing` e o `setSession` da execução, depois uma única sessão `review_execute` registrada e o ciclo segue; `stop` pedido durante o `launch`, depois nenhuma sessão do ciclo ativa.
> 4. **I-2**: dividir `reviewStepTurn.ts` por responsabilidade, uma instrução por linha; dividir `test/review-cycle-rounds.test.ts` e `test/review-cycle-caveats.test.ts` para ficarem com até 100 linhas; objetos de parâmetro em `sendContinuation`, `logStage` e `sendRetry` (`.agents/rules/code-standards.md`).
> 5. **M-1**, `reviewStepActions.ts`: "Tentar de novo" reenvia a última mensagem da etapa, inclusive a de ressalvas (§7.5). Teste: ressalvas, `fix`, falha da execução, `retry`, e a mesma sessão recebe `caveatsPrompt`.
> 6. **M-2**, `hooks/useReviewTab.tsx` e `components/ReviewStage.tsx`: uma só leitura periódica compartilhada.
> 7. **M-3**, `reviewStepActions.ts:50` e `reviewStepTurn.ts:100`: constante própria para a tentativa; reusar a extração do número do relatório.
>
> Restrições: arquivos com até 100 linhas e uma instrução por linha, funções com até 30 linhas e até 3 parâmetros, sem comentários, sem dependência nova, sem `TEST_DATABASE_URL`, sem aumentar `testTimeout`.
> Ao terminar, rode e mostre a saída de: `pnpm --dir packages/api typecheck`, `pnpm --dir apps/web typecheck`, `pnpm lint`, `pnpm --dir packages/api test`, `pnpm --dir apps/web test` e `pnpm --dir packages/api test:integration` (três execuções completas). Não marque nada como concluído sem essa saída.
