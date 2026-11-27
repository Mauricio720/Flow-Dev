# Revisão de conformidade 003: Várias contas de assinatura de IA, escolhidas por trabalho

> **Data:** 2026-11-26 · **Escopo:** feature inteira, revisão de acompanhamento das [review-001](review-001.md) e [review-002](review-002.md) · **Intervalo:** mudanças não commitadas sobre `fd7ea94`
> **Spec:** `docs/specs/contas-de-assinatura-por-trabalho/spec.md`, `_tasks.md`, `task_01.md` a `task_08.md`

## Veredito: REPROVADO

É a segunda revisão seguida sem nenhuma correção aplicada. O código, os testes e a spec são os mesmos da review-001. Os achados B-1, I-1 a I-3 e M-1 a M-4 continuam abertos, e S-1 a S-5 continuam esperando a decisão do usuário.

| Bloqueante | Importante | Menor | Spec a discutir |
|---|---|---|---|
| 1 | 3 | 4 | 5 |

## O que foi conferido

| Verificação | Resultado |
|---|---|
| Arquivos alterados depois da review-002 (`find . -newer reviews/review-002.md`, sem `node_modules`, `.git` e builds) | só `_tasks.md` e `reviews/etapa.md`, gravados pela própria review-002 |
| Commits (`git log`) | nenhum novo; HEAD continua `fd7ea94` |
| Worktrees (`git worktree list`) | só `issue-11` e `issue-18`; nenhum da Issue #6 |
| B-1: `codexSessionEvents.ts:18` com `turn/failed` | presente |
| I-1: `sessionServiceStatus.ts:36` com `return account.codexCatalog;` | presente |
| I-2: `codexProcess.ts:34` com `buildAgentEnvironment(env, credentialEnvironment("codex", home))` | presente |
| I-3: `sessionWorkerParts.ts` | 102 linhas |

Os comandos de verificação não foram rodados de novo, porque o código não mudou. Os resultados de referência são os da review-001. Esta revisão não afirma nenhum resultado novo.

## Situação dos achados

Igual à tabela "Situação dos achados da review-001" da [review-002](review-002.md): todos ❌ abertos, e S-1 a S-5 ⏳.

## Observação sobre o fluxo

As review-002 e review-003 rodaram com `etapa: execute` sem que a etapa de execução tivesse acontecido entre elas. Enquanto o prompt de correção não for aplicado, uma nova revisão vai repetir este resultado.

## Prompt de correção

> Aplique, nesta ordem, o "Prompt de correção" da review-001 (`docs/specs/contas-de-assinatura-por-trabalho/reviews/review-001.md`), repetido na review-002:
> 1. **B-1**: limite do Codex pelas notificações reais (`error` com `willRetry: false` e `turn/completed` com `turn.status === "failed"`, por `codexErrorInfo === "usageLimitExceeded"`), sem `turn/failed`; V-07d reescrito e um teste de worker com "Limite de uso da conta Codex B atingido" (REQ-024).
> 2. **I-1**: catálogo da conta Codex disponível logo depois da verificação (REQ-021), com teste, e sem a semeadura de contorno em `work-account-journey.test.ts`.
> 3. **I-2**: `codexProcess.ts` com o ambiente de hoje e só `CODEX_HOME` sobrescrito (REQ-026), com teste.
> 4. **I-3**: os cinco arquivos com até 100 linhas.
> 5. **M-1 a M-4**: motivo no log `launch_failed`, constantes no lugar dos valores mágicos, assinatura única de `TerminalExecutionReader.read` e spec atualizada (seções 15, 16 e Histórico, mais as decisões sobre S-1 a S-5).
>
> Registre cada correção no "Registro de execução" da tarefa. Ao terminar, rode e mostre: `pnpm --dir packages/api typecheck`, `pnpm --dir packages/api test`, `pnpm --dir packages/api test:integration` (sem `TEST_DATABASE_URL`), `pnpm --dir apps/web test`, `pnpm --dir apps/web typecheck`, `rtk proxy pnpm lint`.
