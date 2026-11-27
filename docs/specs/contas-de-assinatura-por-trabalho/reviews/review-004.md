# Revisão de conformidade 004: Várias contas de assinatura de IA, escolhidas por trabalho

> **Data:** 2026-11-26 · **Escopo:** feature inteira, revisão de acompanhamento das reviews [001](review-001.md), [002](review-002.md) e [003](review-003.md) · **Intervalo:** mudanças não commitadas sobre `fd7ea94`
> **Spec:** `docs/specs/contas-de-assinatura-por-trabalho/spec.md`, `_tasks.md`, `task_01.md` a `task_08.md`

## Veredito: REPROVADO

Ainda não há correção desta feature. Depois da review-003, a árvore mudou só em arquivos de outra frente (a captura de relatórios da revisão automática), e nenhum deles toca o código das contas. B-1, I-1 a I-3 e M-1 a M-4 continuam abertos, e S-1 a S-5 continuam esperando a decisão do usuário.

| Bloqueante | Importante | Menor | Spec a discutir |
|---|---|---|---|
| 1 | 3 | 4 | 5 |

## O que mudou desde a review-003

| Arquivos | Do que se trata | Relação com esta feature |
|---|---|---|
| `application/services/review/reviewStageLoader.ts`, `reviewStageReader.ts` (+ teste), `application/services/terminal/artifactCapturePlan.ts`, `artifactCaptureService.ts`, `sessionRecorder.ts`, `application/terminal/checkoutFileReader.ts`, `controllers/terminalEventController.ts`, `infra/reviewStepComposition.ts`, `infra/terminal/fsCheckoutFileReader.ts`, `scriptedFileStep.ts`, `scriptedSessionSteps.ts`, `test/review-cycle-shell-writes.test.ts` (novo) | captura, ao fim do turno, de relatórios da revisão escritos pelo shell (`CaptureCandidate`, `modifiedAt`) | nenhuma; nenhum desses arquivos menciona contas, `credentialHome`, `turn/failed` ou `codexCatalog`. Ficam fora do escopo desta revisão |
| Arquivos da feature, `spec.md`, `task_0*.md` | sem mudança | — |

Commits: nenhum novo (HEAD `fd7ea94`). Worktree da Issue #6: não existe.

## Verificação executada

A árvore compartilhada mudou, então rodei de novo o que cobre a feature no pacote alterado:

| Comando | Saída | Resultado |
|---|---|---|
| `pnpm --dir packages/api typecheck` | exit 0 | ✅ |
| `vitest run --config vitest.integration.config.ts` com os 17 arquivos de integração da feature (`agent-account-*`, `agent-accounts-*`, `agent-login-inspector`, `codex-account-catalog`, `codex-catalog-publisher`, `session-account-*`, `work-account-*`, `work-accounts-router`, `codex-runtime-start`), sem `TEST_DATABASE_URL` | exit 0 · 17 arquivos, 45 testes | ✅ |
| `vitest run src/infra/agents src/infra/terminal/agentSdkExit.test.ts src/infra/terminal/agentSdkQueryOptions.test.ts src/application/services/agent-accounts` | exit 0 · 15 arquivos, 80 testes | ✅ |

Os testes verdes não resolvem os achados. O V-07d continua passando porque o roteiro falso emite `turn/failed` (B-1), e os demais achados vêm da leitura do código. Suítes completas, web, e2e e build não foram rodados de novo, porque o código da web e o da feature não mudaram; os resultados de referência são os da review-001.

## Situação dos achados

| Achado | Situação | Evidência atual |
|---|---|---|
| B-1 · task_05 05.3: limite do Codex só por `turn/failed` (REQ-024) | ❌ aberto | `codexSessionEvents.ts:18` |
| I-1 · task_06 06.2: conta Codex recém-logada sem catálogo (REQ-021) | ❌ aberto | `sessionServiceStatus.ts:36` `return account.codexCatalog;` |
| I-2 · task_05 05.2: Codex com conta recebe só o ambiente curto (REQ-026) | ❌ aberto | `codexProcess.ts:34` |
| I-3: arquivos acima de 100 linhas | ❌ aberto | `sessionWorkerParts.ts` 102, `agent-account-service.test.ts` 101, `codex-runtime-start.test.ts` 104, `ExecutionHistory.test.tsx` 113, `PlanSessionCard.test.tsx` 113 |
| M-1 a M-4 | ❌ abertos | mesmas linhas da review-001 |
| S-1 a S-5 | ⏳ aguardando decisão do usuário | — |

## Observação sobre o fluxo

É a terceira revisão seguida (002, 003 e 004) que encontra a feature sem correção. Enquanto a etapa de execução não aplicar o prompt abaixo, uma nova revisão vai repetir este resultado.

## Prompt de correção

> Aplique o "Prompt de correção" completo da review-001 (`docs/specs/contas-de-assinatura-por-trabalho/reviews/review-001.md`), nesta ordem: B-1 (limite do Codex pelas notificações reais `error`/`turn/completed` com `codexErrorInfo === "usageLimitExceeded"`, sem `turn/failed`, com V-07d reescrito e teste de worker), I-1 (catálogo da conta Codex logo depois da verificação, com teste), I-2 (`codexProcess.ts` com o ambiente de hoje e só `CODEX_HOME` sobrescrito, com teste), I-3 (os cinco arquivos com até 100 linhas), M-1 a M-4 (motivo no log `launch_failed`, constantes, assinatura única de `TerminalExecutionReader.read`, spec atualizada com as decisões sobre S-1 a S-5).
> Registre cada correção no "Registro de execução" da tarefa. Ao terminar, rode e mostre: `pnpm --dir packages/api typecheck`, `pnpm --dir packages/api test`, `pnpm --dir packages/api test:integration` (sem `TEST_DATABASE_URL`), `pnpm --dir apps/web test`, `pnpm --dir apps/web typecheck`, `rtk proxy pnpm lint`.
