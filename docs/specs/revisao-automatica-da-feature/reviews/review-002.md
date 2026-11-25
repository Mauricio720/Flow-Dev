# Revisão de conformidade 002: Revisão automática da feature (Issue #9)

> **Data:** 2026-11-25 · **Escopo:** feature inteira, **parcial**: task_08 (e2e V-14, smoke V-15, definição de pronto) excluída a pedido do usuário. Rechecagem das correções da review-001 e de tudo o que elas tocaram. · **Intervalo:** mudanças não commitadas sobre `ef8a480` (a árvore mistura as Issues #8 e #10; só os arquivos da #9 foram julgados)
> **Spec:** `docs/specs/revisao-automatica-da-feature/spec.md`, `_tasks.md`, `task_01.md`–`task_07.md` · **Regras lidas:** `AGENTS.md`, `CLAUDE.md`, `apps/web/AGENTS.md`, `.agents/rules/code-standards.md`, skills `layered-backend`, `trpc-nextjs`, `nextjs-folder-structure`, `software-testing`

## Veredito: REPROVADO

Os sete achados da review-001 foram corrigidos e provados por testes. O código da #9 não tem mais nada bloqueante. A reprovação vem de duas coisas:
- a suíte de integração ainda falhou numa das duas execuções completas, num teste fora da #9 (`codex-secret-answer`, timeout de confirmação de 1,5 s);
- as correções enfraqueceram as asserções de horário de REQ-028 e do fim do ciclo.

| Bloqueante | Importante | Menor | Spec a discutir |
|---|---|---|---|
| 1 | 1 | 3 | 3 |

## Verificação executada

| Comando | Saída | Resultado |
|---|---|---|
| `pnpm --dir packages/api typecheck` | exit 0 | ✅ |
| `pnpm --dir apps/web typecheck` | exit 0 | ✅ |
| `pnpm lint` | exit 0 (só `apps/web` declara lint) | ✅ |
| `pnpm --dir packages/api test` | exit 0 · 137 arquivos, 852 testes | ✅ |
| `pnpm --dir apps/web test` | exit 0 · 114 arquivos, 626 testes | ✅ |
| `pnpm --dir packages/api test:integration` (sem `TEST_DATABASE_URL`), 1ª execução | exit 1 · 1 falhou, 850 passaram, 5 ignorados · `codex-secret-answer.test.ts › delivers through a separate Postgres listener…` (`secret_delivery_failed`) | ❌ |
| `pnpm --dir packages/api test:integration`, 2ª execução | exit 0 · 851 passaram, 5 ignorados | ✅ |
| `scan_diff.py --worktree --max-lines 100` | dependências: nenhuma; nenhum arquivo da #9 acima de 100 linhas; sem comentário, escape de tipo ou teste desabilitado nos arquivos da #9 | — |

Todos os testes do ciclo (`test/review-*`) passaram nas duas execuções completas. Na sessão de correção, o mesmo grupo passou 4 vezes seguidas sob carga paralela. Não rodados: `pnpm build` e Playwright (task_08, excluída).

## Correções da review-001

| Achado | Status | Evidência |
|---|---|---|
| B-1 `get` escondia o ciclo final | ✅ | `reviewCycleService.ts:24-25` usa `findLatest`; `test/review-cycle-finished-read.test.ts` (parada pela operadora pelo fluxo real, aprovada, aceita com rodadas, ciclo novo depois de um final). Sem a correção, os três testes falham (`cycle: null`) |
| B-2 testes intermitentes do ciclo | ✅ | `tickUntil` (`review-cycle-sessions-support.ts:60-69`) e mensagens buscadas pelo conteúdo; V-05a, V-05e e V-06f verdes nas duas execuções completas |
| I-1 papel sem sessão e sessão órfã | ✅ (com resíduo, M-1) | `reviewCycleStep.ts` (`needsSession` + `openMissing` a cada tick), `reviewStepOpen.ts` (`openMissing`), `reviewCycleFinisher.ts` (encerra todas as sessões com `review_cycle_id`); `test/review-cycle-recovery.test.ts` |
| I-2 tamanho e parâmetros | ✅ | `reviewStepTurn.ts` com 97 linhas, uma instrução por linha; `ReviewStageLoader`, `ReviewMessenger` e `ReviewCycleFinisher` separados; `transition`, `failOpen` e `persist` recebem objeto; testes de rodadas e ressalvas com no máximo 90 linhas |
| M-1 "Tentar de novo" depois de `fix` | ✅ | `reviewRetryPrompt.ts`, `reviewStepActions.ts:73-78`; `reviewRetryPrompt.test.ts` e `test/review-cycle-retry.test.ts` |
| M-2 leitura duplicada | ✅ | `useReviewTab.tsx` passa `stage` ao `ReviewStage`; `hooks/useReviewTab.test.tsx` (uma leitura por intervalo) |
| M-3 constantes e regex | ✅ | `NEW_ATTEMPT`/`NO_NEW_ATTEMPT` (`reviewStepActions.ts:11-12`); `reportNumber` reaproveitado em `reviewStageLoader.ts` |

## Conformidade com a spec

| Item | Status | Evidência |
|---|---|---|
| REQ-001–011 | ✅ | Sem mudança desde a review-001 · V-04a–h, V-11h, V-11b, V-12a |
| REQ-012–019 | ✅ | `reviewStepTurn.ts`, `reviewStageLoader.ts` · V-05a/b/c/d/e/h, V-07a/b |
| REQ-020, REQ-021, NFR-04 | 🟡 | Os cenários da review-001 estão cobertos (V-06k executor, parada durante a abertura); sobra a janela entre a transição e a gravação da rodada ou a mensagem (M-1) |
| REQ-022–027, REQ-042–044 | ✅ | V-06a–m |
| REQ-025, §7.5 "Tentar de novo" | ✅ | `reviewRetryPrompt.ts` · V-06b (ressalvas) |
| REQ-028 | 🟡 | Código grava `ended_at` (`reviewStepActions.ts:44`), mas o teste não prova mais o "quando" (I-1) |
| REQ-029–032 | ✅ | V-05d, V-02, V-04g, V-08a/b |
| REQ-033, REQ-039, §7.2, §7.4 | ✅ | `get` devolve o ciclo final; a tela mostra estado, rodadas e "Concluída" (`reviewModel.ts`) · `review-cycle-finished-read.test.ts`, V-12b, V-11a |
| REQ-034, REQ-035, REQ-037, REQ-038, REQ-040, REQ-041 | ✅ | V-11d, V-09a, V-05a, V-12c; `reviewCycleFinisher.ts` |
| NFR-01, NFR-02, NFR-05, NFR-06 | ✅ | V-09a, V-05e, V-11g, V-05g |
| §9 Não muda | ✅ | V-13a–f; B-07: sessões manuais têm `review_cycle_id` nulo e o finalizador não as encerra |
| DEC-01–03, DEC-05, DEC-07, DEC-08 | ✅ | Sem dependência nova; sem WebSocket |
| B-01–B-07, B-09–B-12 | ✅ | Como na review-001 |
| Fora de escopo | ✅ | Nada adicionado |
| V-14, V-15, §24 | — | task_08, excluída |

## Regras do projeto

| Regra (fonte) | Status | Evidência |
|---|---|---|
| Máx. 100 linhas por `.ts` (`code-standards.md` "File Size") | ✅ | Nenhum arquivo da #9 acima de 100. Pré-existente: `test/issue-deletion-support.ts` passou de 105 para 106 linhas (era acima do limite em `HEAD`) |
| Máx. 30 linhas por função, sem linha em branco em função, sem comentários | ✅ | |
| Máx. 3 parâmetros (`code-standards.md` "Parameters") | 🟡 | `test/review-cycle-recovery-support.ts:20` `injected` tem 4 (M-3) |
| Camadas, tRPC, pastas (`layered-backend`, `trpc-nextjs`, `nextjs-folder-structure`) | ✅ | Composição do passo em `infra/reviewStepComposition.ts`; serviços sem import de infra |
| Sem dependência nova; Flow Dev não escreve no checkout | ✅ | |
| Verificação (`AGENTS.md` "Verificação") | ❌ | `test:integration` falhou em 1 de 2 execuções (B-1) |
| Não aumentar timeout para contornar lentidão (`AGENTS.md`) | ✅ | `MAX_TICKS` de 8 para 24 em `review-cycle-sessions-support.ts:12` é um orçamento de iterações com saída antecipada, não um timeout de teste |

## Achados

### B-1 (Bloqueante, fora do código da #9) — Suíte de integração não fica verde de forma estável
- **Onde:** `test/codex-secret-answer.test.ts:30`, que falha com `TaskError: secret_delivery_failed`. O envio espera confirmação por no máximo `ACK_TIMEOUT_MS = 1_500` (`src/infra/database/postgresSecretAnswerSender.ts:6`). Na sessão de correção, `codex-runtime-requests.test.ts › adds a denial reason…` também falhou uma vez. Os dois passam isolados.
- **Contra:** `AGENTS.md` "Verificação" e a definição de pronto (§24: `test:integration` passando).
- **Problema:** nenhum dos dois arquivos, nem o `PostgresSecretAnswerSender`, foi alterado pela #9. A falha depende de carga: a confirmação de 1,5 s estoura com a suíte inteira rodando, e a #9 acrescentou cerca de 20 arquivos de integração. O task_04 e o task_06 já registravam essa falha como intermitente. Esta revisão não conseguiu provar se ela existia antes da #9.
- **Correção esperada:** investigar a causa sem subir o timeout (`AGENTS.md`), por exemplo um relógio ou prazo injetável no teste, ou isolar o listener do resto da carga. Outra saída é você registrar a falha como pré-existente e aceita fora da #9. Nesse caso, este achado deixa de bloquear.

### I-1 (Importante) — Asserções de horário enfraquecidas nas correções · task_05 (05.3, 05.4)
- **Onde:**
  - `test/review-cycle-rounds.test.ts:28` passa `approved.endedAt!` lido da própria linha para `expectApprovedAndClosed` (`review-cycle-rounds-support.ts:65`). A comparação é tautológica: com `ended_at` nulo, o teste continuaria passando.
  - `test/review-cycle-caveats.test.ts:26` (V-05c) deixou de verificar `endedAt`. Antes verificava `endedAt: world.worker.clock.now()`. A prova de "nenhuma mensagem nova" ficou restrita ao texto da continuação (`:24,:27`).
- **Contra:** REQ-028 ("registrando quem aceitou e **quando**"), REQ-019/REQ-040 (fim do ciclo); `software-testing` (asserções enfraquecidas, valor esperado vindo da própria implementação).
- **Comportamento que escapa:** um `accept` ou uma aprovação que não grave `ended_at` passa nos testes.
- **Correção esperada:** depois de `tickUntil`, sem tick extra, `world.worker.clock.now()` é a hora usada no tick que encerrou. Comparar `endedAt` com ela em V-05a e V-05c. Em V-05c, voltar a contar todas as mensagens de usuário da sessão de revisão.

### M-1 (Menor) — Janela entre a transição e o efeito dela · task_05 (05.3), task_06 (06.4)
- **Onde:** `reviewStepTurn.ts:40-44`: a transição para `executing` (`:40`) vem antes de `recordReview` (`:42`). Em `reviewStepTurn.ts:55-60`, a transição para `reviewing` vem antes de `continueReview` (`:60`).
- **Contra:** REQ-021 ("retomar os ciclos não finais pelo estado guardado"), §16 passo 2.5 (ler, gravar a rodada, depois mandar a mensagem).
- **Problema:** se o serviço cair entre `:40` e `:42` na rodada 1, `openMissing` não acha relatório (`previousReportPath` devolve nulo) e o ciclo fica em "Executando" sem sessão e sem falha. Na rodada 2 ou depois, ele abriria a execução com o relatório da rodada anterior. Se a queda for entre `:55` e `:60`, a mensagem de continuação nunca é enviada e a revisão fica ociosa em "Revisando". A janela é estreita (duas gravações seguidas).
- **Correção esperada:** gravar a rodada antes da transição; ela é idempotente pelo `(cycle_id, number)`. A cada tick, se a sessão da vez existe e a mensagem da etapa com a chave derivada ainda não foi gravada, enviá-la. Ou fazer transição e gravação da rodada numa transação.

### M-2 (Menor) — IDs de verificação reaproveitados nos testes novos · task_06
- **Onde:** `test/review-cycle-recovery.test.ts:39` ("V-06l ends a session launched while the operator stopped") e `test/review-cycle-retry.test.ts:17` ("V-06b sends the caveats message again").
- **Contra:** matriz da spec (§23) e `task_06.md:101`, onde V-06l é a exclusão da Issue (REQ-027) e V-06b é a etapa não atualizada.
- **Correção esperada:** nomes sem ID da matriz, ou com o ID do requisito que provam (REQ-020/REQ-040, REQ-025), para não confundir a rastreabilidade.

### M-3 (Menor) — Suporte de teste com 4 parâmetros e expressão com vírgula · task_06
- **Onde:** `test/review-cycle-recovery-support.ts:20` `injected(target, input, fault, shouldFail)`; `:13` `(pending ? ((pending = false), true) : false)`.
- **Contra:** `code-standards.md` "Parameters"; clareza.
- **Correção esperada:** objeto de parâmetros; um contador ou função nomeada no lugar da expressão com vírgula.

## Atualizações de spec a discutir
- **Leitura depois do ciclo final:** a §16 passo 3 manda parar de ler no estado final, e o código obedece. Com isso, quem estiver com a etapa aberta não vê um ciclo novo iniciado em outra aba até recarregar (REQ-035). E sem nenhum ciclo, a leitura de 3 s roda para sempre em toda página de trabalho com conjunto legível. Decidir se a leitura continua em ritmo mais lento depois do fim, e se deve existir sem ciclo.
- **Revisão cresce a cada gravação do serviço** (vinda da review-001): um pedido feito com a tela de 3 s atrás recebe "A revisão mudou." mesmo com o estado visível igual.
- **Pasta na raiz do checkout** (vinda da review-001): os prompts escrevem "raiz do checkout" no lugar de `{pasta}` (`reviewPrompts.ts:19`).

## Divergências entre o relatório do implementador e a evidência
- task_05, correção: "Estável: 4 execuções seguidas de `test/review-` com carga paralela" → confirmado; os testes do ciclo também passaram nas duas execuções completas desta revisão.
- task_06, gates: "`codex-secret-answer.test.ts`… não toca a revisão" → o arquivo de fato não foi alterado pela #9, mas a falha continua tornando o gate vermelho (B-1).

## Fora do escopo, mas na árvore
- `packages/api/.preflight.tmp.ts` (não versionado, de 2026-11-24, anterior à #9) tem `console.log` e IDs reais. Não deve entrar em commit.

## Prompt de correção

> Corrija, nesta ordem, sem alterar nada fora do listado (a task_08 continua fora):
> 1. **B-1**, `packages/api/test/codex-secret-answer.test.ts` e `src/infra/database/postgresSecretAnswerSender.ts`: descubra por que a confirmação de 1,5 s estoura com a suíte inteira e torne o teste determinístico sem subir timeouts (`AGENTS.md`). Se a decisão for aceitar como pré-existente, registre isso em `_tasks.md` > "Premissas e bloqueios" e não mexa no código.
> 2. **I-1**, `test/review-cycle-rounds.test.ts`, `test/review-cycle-rounds-support.ts` e `test/review-cycle-caveats.test.ts`: em V-05a e V-05c, compare `endedAt` com `world.worker.clock.now()` lido logo depois do `tickUntil` que encerrou o ciclo, antes de qualquer tick extra (REQ-028, REQ-040). Em V-05c, volte a contar todas as mensagens de usuário da sessão de revisão.
> 3. **M-1**, `src/application/services/review/reviewStepTurn.ts`: grave a rodada (`openRound` + `recordReview`) antes da transição para `executing`. Garanta que a mensagem da etapa seguinte seja reenviada no tick seguinte se a transição foi gravada e a mensagem não (chave derivada de ciclo, papel, rodada e revisão). Teste: queda injetada entre a transição e a mensagem de continuação, e a revisão recebe a mensagem no tick seguinte (REQ-021).
> 4. **M-2**, `test/review-cycle-recovery.test.ts:39` e `test/review-cycle-retry.test.ts:17`: renomeie sem reaproveitar V-06l e V-06b.
> 5. **M-3**, `test/review-cycle-recovery-support.ts`: objeto de parâmetros em `injected`; troque a expressão com vírgula por código legível.
>
> Restrições: arquivos com até 100 linhas, funções com até 30 linhas e até 3 parâmetros, sem comentários, sem dependência nova, sem `TEST_DATABASE_URL`, sem aumentar `testTimeout`.
> Ao terminar, rode e mostre a saída de: `pnpm --dir packages/api typecheck`, `pnpm --dir apps/web typecheck`, `pnpm lint`, `pnpm --dir packages/api test`, `pnpm --dir apps/web test` e `pnpm --dir packages/api test:integration` (três execuções completas).
