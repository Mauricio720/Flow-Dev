# Revisão de conformidade 002: Várias contas de assinatura de IA, escolhidas por trabalho

> **Data:** 2026-11-26 · **Escopo:** feature inteira (task_01 a task_08, todas `completed`, 27/27), revisão de acompanhamento da [review-001](review-001.md) · **Intervalo:** mudanças não commitadas sobre `fd7ea94`
> **Spec:** `docs/specs/contas-de-assinatura-por-trabalho/spec.md`, `_tasks.md`, `task_01.md` a `task_08.md`
> **Regras lidas:** as mesmas da review-001 (`AGENTS.md`, `apps/web/AGENTS.md`, `.agents/rules/code-standards.md`, `.agents/rules/e2e-testing.md`, skills obrigatórias e `software-testing`)

## Veredito: REPROVADO

Nenhuma correção foi aplicada desde a review-001. Os achados B-1, I-1 a I-3 e M-1 a M-4 continuam abertos, nas mesmas linhas. O prompt de correção da review-001 continua valendo e está repetido abaixo.

| Bloqueante | Importante | Menor | Spec a discutir |
|---|---|---|---|
| 1 | 3 | 4 | 5 |

## O que foi conferido

| Verificação | Resultado |
|---|---|
| Arquivos alterados depois da review-001 (`find . -newer reviews/review-001.md`, sem `node_modules`, `.git` e builds) | só `_tasks.md` (linha da Revisão final) e `reviews/etapa.md`, gravados pela própria review-001; nenhum arquivo de código, teste ou spec |
| Outro worktree da Issue #6 (`git worktree list`) | não existe; há só `issue-11` e `issue-18`, ambos em `fd7ea94` |
| Commits novos (`git log`) | nenhum; HEAD continua `fd7ea94` |
| Registros de execução das tasks | nenhuma entrada de correção depois da review-001 |
| Spec (`spec.md`, Histórico) | sem entradas novas; S-1 a S-5 sem decisão registrada |

Os comandos de verificação (typecheck, testes, integração, lint, e2e e build) **não foram rodados de novo**, porque o código é o mesmo da review-001. Os resultados daquela execução, de 2026-11-26, estão no relatório dela: tudo verde, menos 1 falha instável em `session-latency.test.ts`, que passa isolado. Esta revisão não afirma nenhum resultado novo.

## Situação dos achados da review-001

| Achado | Situação | Evidência atual |
|---|---|---|
| B-1 · task_05 05.3: limite do Codex só por `turn/failed`, que o Codex 0.159.3 não emite (REQ-024) | ❌ aberto | `packages/api/src/infra/terminal/codex/codexSessionEvents.ts:18`: `if (method === "turn/failed") { onFailure?.(…` |
| I-1 · task_06 06.2: conta do Codex recém-logada sem catálogo, Codex indisponível por até 10 min (REQ-021) | ❌ aberto | `sessionServiceStatus.ts:36`: `return account.codexCatalog;` |
| I-2 · task_05 05.2: Codex com conta recebe só o ambiente curto (REQ-026) | ❌ aberto | `codexProcess.ts:34`: `buildAgentEnvironment(env, credentialEnvironment("codex", home))` |
| I-3: arquivos acima de 100 linhas (`code-standards.md`, File Size) | ❌ aberto | `sessionWorkerParts.ts` 102, `agent-account-service.test.ts` 101, `codex-runtime-start.test.ts` 104, `ExecutionHistory.test.tsx` 113, `PlanSessionCard.test.tsx` 113 |
| M-1: `launch_failed` sem o motivo | ❌ aberto | `sessionStarter.ts:45` |
| M-2: strings e números mágicos | ❌ aberto | mesmas linhas da review-001 |
| M-3: `read(taskId, viewerUserIdOrNow, requestedNow?)` | ❌ aberto | `terminalExecutionReader.ts:18` |
| M-4: spec sem as decisões da implementação (Definição de pronto) | ❌ aberto | Histórico de `spec.md` parado em 2026-11-25 |
| S-1 a S-5: atualizações de spec a discutir | ⏳ aguardando decisão do usuário | sem registro na spec |

A conformidade dos demais itens (REQ-001 a REQ-026, NFR-01 a NFR-05, B-01 a B-09, seção 9, DEC-01 a DEC-07, migração) é a mesma registrada na review-001, porque o código não mudou.

## Divergências entre o relatório do implementador e a evidência
- O `_tasks.md` aponta "aplicar o prompt de correção da última revisão" como próximo passo, e isso não aconteceu: nenhum arquivo mudou. As divergências listadas na review-001 continuam valendo.

## Prompt de correção

> Aplique as correções da review-001 (`docs/specs/contas-de-assinatura-por-trabalho/reviews/review-001.md`, seção "Prompt de correção"), nesta ordem, sem alterar nada fora do listado:
> 1. **B-1**: `packages/api/src/infra/terminal/codex/codexSessionEvents.ts`, `codexSession.ts`, `codexSessionExit.ts`, `protocol/codexMethods.ts`: remova `turn/failed` e detecte a falha de turno pelas notificações reais do Codex 0.159.3. Use `error` (`{ error: TurnError, willRetry, threadId, turnId }`) com `willRetry: false`, e `turn/completed` com `turn.status === "failed"`. Classifique o limite por `codexErrorInfo === "usageLimitExceeded"` (REQ-024). Reescreva o V-07d com essas formas e acrescente um teste de worker que termina uma sessão Codex na conta "Codex B" com "Limite de uso da conta Codex B atingido".
> 2. **I-1**: `agentAccountVerification.ts` e/ou `sessionServiceStatus.ts`: uma conta Codex `logged_in` precisa ter catálogo sem esperar o ciclo de 10 min (REQ-021). Teste: conta verificada sem catálogo prévio → prévia com Codex disponível e os modelos da conta. Desfaça a semeadura de catálogo em `work-account-journey.test.ts` que só contornava a lacuna.
> 3. **I-2**: `codexProcess.ts`: com `credentialHome`, use o ambiente de hoje e sobrescreva só `CODEX_HOME` (REQ-026). Teste: uma variável fora da lista curta (ex.: `SSH_AUTH_SOCK`) chega igual com e sem conta.
> 4. **I-3**: deixe com até 100 linhas `sessionWorkerParts.ts`, `test/agent-account-service.test.ts`, `test/codex-runtime-start.test.ts`, `ExecutionHistory.test.tsx` e `PlanSessionCard.test.tsx`, sem mudar asserções.
> 5. **M-1**: `sessionStarter.ts`: `launch_failed` volta a registrar o motivo (sem caminho nem e-mail) junto com `account`.
> 6. **M-2**: constantes para `429` (reuse `CLAUDE_LIMIT_STATUS`), `/model usage limit/i`, `"login padrão"` e uma única constante para "Conta de IA não encontrada.".
> 7. **M-3**: `terminalExecutionReader.ts`: assinatura única `read(taskId, viewerUserId, now)` e os testes antigos atualizados.
> 8. **M-4**: registre em `spec.md` (seções 15, 16 e Histórico) as decisões da implementação listadas na review-001 e as decisões do usuário sobre S-1 a S-5.
>
> Registre cada correção no "Registro de execução" da tarefa correspondente. Restrições: `.ts` com até 100 linhas, funções com até 30 linhas, sem comentários, sem dependências novas, textos em pt-BR iguais aos da spec.
> Ao terminar, rode e mostre a saída de: `pnpm --dir packages/api typecheck`, `pnpm --dir packages/api test`, `pnpm --dir packages/api test:integration` (sem `TEST_DATABASE_URL`), `pnpm --dir apps/web test`, `pnpm --dir apps/web typecheck`, `rtk proxy pnpm lint`. Não marque como concluído sem essa saída.
