# Revisão de conformidade 005: Várias contas de assinatura de IA, escolhidas por trabalho

> **Data:** 2026-11-26 · **Escopo:** feature inteira, revisão de acompanhamento da [review-004](review-004.md) (achados detalhados na [review-001](review-001.md)) · **Intervalo:** mudanças não commitadas sobre `fd7ea94`
> **Spec:** `docs/specs/contas-de-assinatura-por-trabalho/spec.md`, `_tasks.md`, `task_01.md` a `task_08.md`

## Veredito: REPROVADO

Nada mudou desde a review-004. B-1, I-1 a I-3 e M-1 a M-4 continuam abertos, e S-1 a S-5 continuam esperando a decisão do usuário.

| Bloqueante | Importante | Menor | Spec a discutir |
|---|---|---|---|
| 1 | 3 | 4 | 5 |

## O que foi conferido

| Verificação | Resultado |
|---|---|
| Arquivos alterados depois da review-004 (`find . -newer reviews/review-004.md`, sem `node_modules`, `.git` e builds) | só `_tasks.md` e `reviews/etapa.md`, gravados pela própria revisão |
| Commits (`git log`) | nenhum novo; HEAD `fd7ea94` |
| Worktrees (`git worktree list`) | só `issue-11` e `issue-18` |
| B-1: `codexSessionEvents.ts:18` com `turn/failed` | presente |
| I-1: `sessionServiceStatus.ts:36` com `return account.codexCatalog;` | presente |
| I-2: `codexProcess.ts:34` com `buildAgentEnvironment(env, credentialEnvironment("codex", home))` | presente |
| I-3: `sessionWorkerParts.ts` | 102 linhas |

Os comandos de verificação não foram rodados de novo, porque nenhum arquivo mudou desde a execução da review-004: typecheck da API, 17 arquivos de integração com 45 testes e 15 arquivos unitários com 80 testes, todos verdes. Os testes verdes não resolvem os achados.

## Observação sobre o fluxo

É a quarta revisão seguida (002 a 005) sem correção da feature. A etapa de execução não está acontecendo entre as revisões.

## Prompt de correção

> Aplique o "Prompt de correção" completo da review-001 (`docs/specs/contas-de-assinatura-por-trabalho/reviews/review-001.md`), nesta ordem: B-1 (limite do Codex pelas notificações reais `error`/`turn/completed` com `codexErrorInfo === "usageLimitExceeded"`, sem `turn/failed`, com V-07d reescrito e teste de worker), I-1 (catálogo da conta Codex logo depois da verificação, com teste), I-2 (`codexProcess.ts` com o ambiente de hoje e só `CODEX_HOME` sobrescrito, com teste), I-3 (os cinco arquivos com até 100 linhas), M-1 a M-4 (motivo no log `launch_failed`, constantes, assinatura única de `TerminalExecutionReader.read`, spec atualizada com as decisões sobre S-1 a S-5).
> Registre cada correção no "Registro de execução" da tarefa. Ao terminar, rode e mostre: `pnpm --dir packages/api typecheck`, `pnpm --dir packages/api test`, `pnpm --dir packages/api test:integration` (sem `TEST_DATABASE_URL`), `pnpm --dir apps/web test`, `pnpm --dir apps/web typecheck`, `rtk proxy pnpm lint`.
