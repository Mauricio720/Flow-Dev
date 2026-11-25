# Revisão de conformidade 003: Revisão automática da feature (Issue #9)

> **Data:** 2026-11-25 · **Escopo:** feature inteira, **parcial**: task_08 (e2e V-14, smoke V-15, definição de pronto) excluída a pedido do usuário. Rechecagem das correções da review-002 e de tudo o que elas tocaram, inclusive o `ScriptedSessionRunner` e `test/codex-secret-answer.test.ts`. · **Intervalo:** mudanças não commitadas sobre `ef8a480` (a árvore mistura as Issues #8 e #10; só os arquivos da #9 foram julgados)
> **Spec:** `docs/specs/revisao-automatica-da-feature/spec.md`, `_tasks.md`, `task_01.md`–`task_07.md` · **Regras lidas:** `AGENTS.md`, `CLAUDE.md`, `apps/web/AGENTS.md`, `.agents/rules/code-standards.md`, skills `layered-backend`, `trpc-nextjs`, `nextjs-folder-structure`, `software-testing`

## Veredito: REPROVADO

Os achados da review-002 foram corrigidos, e os testes do ciclo, o unitário (3 de 3) e o web passaram. Nenhum requisito da spec ficou ausente. A reprovação vem de duas coisas:
- a integração ainda falhou em 1 de 2 execuções completas, num teste não alterado e fora da #9 (`codex-service-flow.test.ts`, V-54a);
- dois arquivos da #9 passaram de 100 linhas. Um deles foi criado pela correção da review-002; o outro já estava acima do limite desde a task_07 e passou despercebido nas revisões 001 e 002.

| Bloqueante | Importante | Menor | Spec a discutir |
|---|---|---|---|
| 1 | 1 | 2 | 3 |

## Verificação executada

| Comando | Saída | Resultado |
|---|---|---|
| `pnpm --dir packages/api typecheck` | exit 0 | ✅ |
| `pnpm --dir apps/web typecheck` | exit 0 | ✅ |
| `pnpm lint` | exit 0 (só `apps/web` declara lint) | ✅ |
| `pnpm --dir packages/api test` (3 execuções) | exit 0 nas três · 137 arquivos, 852 testes | ✅ |
| `pnpm --dir apps/web test` | exit 0 · 114 arquivos, 626 testes | ✅ |
| `pnpm --dir packages/api test:integration` (sem `TEST_DATABASE_URL`), 1ª execução | exit 1 · 1 falhou, 850 passaram, 5 ignorados · `codex-service-flow.test.ts:32` V-54a: `status` esperado `waiting`, recebido `running` | ❌ |
| `pnpm --dir packages/api test:integration`, 2ª execução | exit 0 · 851 passaram, 5 ignorados | ✅ |
| `vitest run … test/codex-service-flow` (isolado) | exit 0 · 2 testes | ✅ |
| `scan_diff.py --worktree --max-lines 100` | dependências: nenhuma; arquivos acima de 100 linhas da #9: `scriptedSessionRunner.ts` (101) e `OperatorStages.test.tsx` (129) | — |

Todos os testes do ciclo (`test/review-*`) e `codex-secret-answer.test.ts` passaram nas duas execuções completas. Não rodados: `pnpm build` e Playwright (task_08, excluída).

## Correções da review-002

| Achado | Status | Evidência |
|---|---|---|
| B-1 `codex-secret-answer` intermitente | ✅ (com ressalva, M-2) | O teste positivo esperava a confirmação por 100 ms; agora `DELIVERY_ACK_MS = 5_000` (`test/codex-secret-answer.test.ts:13`). O teste negativo continua com 30 ms. Verde nas duas execuções completas |
| I-1 asserções de horário | ✅ | `review-cycle-rounds.test.ts:25-26` (`approved.endedAt` igual ao relógio do tick que encerrou); `review-cycle-caveats.test.ts:27-28` (`endedAt` e todas as mensagens de usuário). Com `ended_at` nulo, os dois testes falham |
| M-1 janela transição → efeito | 🟡 | A rodada da revisão é gravada antes da transição (`reviewStepTurn.ts:40-41`). A mensagem de continuação perdida numa queda entre a transição e o envio não é reenviada; está registrada como risco residual em `task_05.md` (ver M-1 abaixo) |
| M-2 IDs reaproveitados | ✅ | `review-cycle-recovery.test.ts` e `review-cycle-retry.test.ts` usam REQ-020, REQ-040 e REQ-025 |
| M-3 parâmetros no suporte | ✅ | `review-cycle-recovery-support.ts` usa `FaultContext` |
| Flake V-07b (achado na correção) | ✅ | `review-cycle-pending.test.ts:34,54` esperam o estado com `tickUntil`; a pendência continua provada pelos três ticks de 2 h sem avanço |
| Flake V-38f (achado na correção) | ✅ | `scriptedSessionRunner.ts:80-81`: só `ask` e `permission` marcam o runner como bloqueado, então `settled()` não volta mais no meio de um `write_file`. Unitário verde 3 de 3 nesta revisão; `.blocked` não é lido fora do runner |

## Conformidade com a spec

| Item | Status | Evidência |
|---|---|---|
| REQ-001–019, REQ-022–044 (exceto REQ-021), NFR-01, NFR-02, NFR-04–06 | ✅ | Sem regressão desde a review-002; testes do ciclo verdes nas duas execuções completas |
| REQ-020 | ✅ | `openMissing` a cada tick e finalizador por `review_cycle_id` · teste REQ-020 em `review-cycle-recovery.test.ts` |
| REQ-021 | 🟡 | Resíduo de M-1 |
| REQ-028 | ✅ | "Quando" provado de novo (V-05c) |
| §7.1–§7.5, §9, §14, §20 | ✅ | Como na review-002 |
| DEC-01–03, DEC-05, DEC-07, DEC-08 | ✅ | Sem dependência nova; sem WebSocket |
| B-01–B-07, B-09–B-12 | ✅ | Como na review-002 |
| Fora de escopo | ✅ | Nada adicionado à feature; a mudança em `codex-secret-answer.test.ts` é só de teste (M-2) |
| V-14, V-15, §24 | — | task_08, excluída |

## Regras do projeto

| Regra (fonte) | Status | Evidência |
|---|---|---|
| Máx. 100 linhas por `.ts` (`code-standards.md` "File Size") | ❌ | `packages/api/src/infra/terminal/scriptedSessionRunner.ts` 99 → 101; `apps/web/src/features/issues/assigned-work/components/OperatorStages.test.tsx` 98 → 129 (I-1). Pré-existentes acima do limite que ganharam uma linha: `schema.ts` 127 → 128, `test/issue-deletion-support.ts` 105 → 106 |
| Máx. 30 linhas por função, 3 parâmetros, sem linha em branco em função, sem comentários | ✅ | Nos arquivos tocados desde a review-002 |
| Camadas, tRPC, pastas | ✅ | |
| Sem dependência nova | ✅ | |
| Não aumentar timeout para contornar lentidão (`AGENTS.md` "Verificação") | 🟡 | `testTimeout` intocado. A janela de confirmação do teste de resposta secreta subiu de 100 ms para 5 s, acima do valor de produção (1,5 s) (M-2) |
| Verificação (`AGENTS.md` "Verificação") | ❌ | `test:integration` falhou em 1 de 2 execuções (B-1) |

## Achados

### B-1 (Bloqueante, fora do código da #9) — Integração ainda instável por testes sensíveis a carga
- **Onde:** `test/codex-service-flow.test.ts:30-32`. O teste espera o pedido `turn/start` aparecer no arquivo do Codex falso (`waitFor(record, "turn/start")`) e exige logo em seguida `status: "waiting"`. Sob carga, a sessão ainda está `running`. O arquivo não foi alterado pela #9 e passa isolado. É o terceiro teste diferente fora da #9 que falha por tempo, depois de `codex-secret-answer` (review-002) e `codex-runtime-requests` (sessão de correção).
- **Contra:** `AGENTS.md` "Verificação"; §24 (`test:integration` passando).
- **Problema:** a suíte não fica verde de forma confiável. Corrigir um teste por rodada dentro da #9 não fecha o problema, porque os testes sensíveis a tempo são da base, não da feature.
- **Correção esperada:** escolher uma das saídas:
  - tratar a instabilidade como pré-existente: registrar em `_tasks.md` > "Premissas e bloqueios", abrir uma Issue própria e aceitar este achado para a #9;
  - ou, na #9, fazer o V-54a esperar o status `waiting` por poll no banco, em vez de exigi-lo logo depois do `turn/start`, e repetir até três execuções completas verdes.

### I-1 (Importante) — Dois arquivos da #9 acima de 100 linhas · task_03 (correção) e task_07 (07.5)
- **Onde:**
  - `packages/api/src/infra/terminal/scriptedSessionRunner.ts`: 101 linhas. Tinha 99 em `HEAD`; a correção da review-002 (`:80-81`) e o `buffered.shift()` da task_03 passaram do limite.
  - `apps/web/src/features/issues/assigned-work/components/OperatorStages.test.tsx`: 129 linhas. Tinha 98 em `HEAD`; os testes V-12a e V-12c da task_07 entraram no mesmo arquivo. O scanner já o apontava na review-001, mas ele ficou de fora daquela revisão e da 002.
- **Contra:** `.agents/rules/code-standards.md` "File Size" ("Never create classes or `.ts` files with more than 100 lines").
- **Correção esperada:**
  - mover V-12a e V-12c para um arquivo próprio (por exemplo `OperatorStagesReview.test.tsx`), com o suporte de montagem compartilhado;
  - tirar duas linhas do runner, por exemplo extraindo `speakOrAsk`/`hold` para um módulo pequeno, ou juntando o `pending` à chamada.

### M-1 (Menor) — Mensagem de continuação não é recuperada depois de uma queda · task_05 (05.3)
- **Onde:** `reviewStepTurn.ts:55-60` (execução → transição para `reviewing` → `continueReview`) e `:41-44` (revisão → transição para `executing` → `continueExecution` com sessão já aberta).
- **Contra:** REQ-021, §16 passo 2.5.
- **Problema:** se o serviço cair entre a transição e o envio, a sessão da vez nunca recebe a mensagem e o ciclo fica parado sem falha. O implementador registrou isso como risco residual (`task_05.md`, última entrada), mas o risco não está aceito na spec nem em "Premissas e bloqueios".
- **Correção esperada:** você aceita o risco e ele vai para "Premissas e bloqueios"; ou a chave da mensagem passa a derivar de (ciclo, papel, rodada, `step_started_at`), que fica estável depois da transição. Aí, a cada tick, a mensagem é reenviada quando nenhuma mensagem com essa chave existe para a sessão da vez, com o mesmo cuidado de não reenviar a abertura (prompt inicial).

### M-2 (Menor) — Janela do teste de resposta secreta acima da de produção e sem registro · fora das tarefas
- **Onde:** `test/codex-secret-answer.test.ts:13` `DELIVERY_ACK_MS = 5_000`; o padrão de produção é `ACK_TIMEOUT_MS = 1_500` (`src/infra/database/postgresSecretAnswerSender.ts:6`).
- **Contra:** `AGENTS.md` "Verificação" (não contornar lentidão aumentando prazos); rastreabilidade das mudanças fora da lista de arquivos.
- **Problema:** o teste passa a tolerar uma confirmação 3 vezes mais lenta do que a produção aceita, e a mudança não aparece em nenhum `task_NN.md`.
- **Correção esperada:** usar o padrão de produção (omitir o argumento ou usar `ACK_TIMEOUT_MS`) e registrar a mudança no log da tarefa que a motivou.

## Atualizações de spec a discutir
- **Leitura depois do ciclo final** (vinda da review-002): a tela para de ler no estado final (§16 passo 3), então um ciclo novo iniciado em outra aba só aparece ao recarregar. E sem nenhum ciclo, a leitura de 3 s roda para sempre em toda página de trabalho com conjunto legível.
- **Revisão cresce a cada gravação do serviço** (vinda da review-001).
- **Pasta na raiz do checkout** (vinda da review-001).

## Divergências entre o relatório do implementador e a evidência
- Resumo da correção: "três execuções completas seguidas da integração, que não ficavam verdes de forma estável antes" → nesta revisão, uma de duas execuções completas falhou (V-54a, fora da #9).
- Revisões 001 e 002 (deste revisor): `OperatorStages.test.tsx` acima de 100 linhas não foi listado, apesar de aparecer no scanner da review-001.

## Fora do escopo, mas na árvore
- `packages/api/.preflight.tmp.ts` (não versionado, de 2026-11-24) tem `console.log` e IDs reais. Não deve entrar em commit.

## Prompt de correção

> Corrija, nesta ordem, sem alterar nada fora do listado (a task_08 continua fora):
> 1. **B-1**: decida com a operadora. Se a instabilidade for tratada como pré-existente, registre-a em `docs/specs/revisao-automatica-da-feature/_tasks.md` > "Premissas e bloqueios" (testes `codex-service-flow` V-54a, `codex-secret-answer` e `codex-runtime-requests` sensíveis a carga, fora da #9) e não mexa neles. Senão, em `packages/api/test/codex-service-flow.test.ts`, espere o status `waiting` por poll no banco depois de `turn/start`, sem esperas fixas nem timeout maior.
> 2. **I-1**: mova os testes V-12a e V-12c de `apps/web/src/features/issues/assigned-work/components/OperatorStages.test.tsx` para um arquivo próprio, deixando os dois com até 100 linhas; reduza `packages/api/src/infra/terminal/scriptedSessionRunner.ts` para até 100 linhas sem mudar o comportamento (`.agents/rules/code-standards.md`).
> 3. **M-1**: ou registre a aceitação do risco em "Premissas e bloqueios", ou torne a mensagem da etapa recuperável no tick seguinte com uma chave estável (ciclo, papel, rodada, `step_started_at`), sem reenviar a abertura. Teste: queda injetada entre a transição e o envio, e a sessão recebe uma única mensagem no tick seguinte (REQ-021).
> 4. **M-2**: em `packages/api/test/codex-secret-answer.test.ts`, use o prazo padrão de produção nos testes positivos e registre a mudança no log da tarefa.
>
> Restrições: arquivos com até 100 linhas, funções com até 30 linhas e até 3 parâmetros, sem comentários, sem dependência nova, sem `TEST_DATABASE_URL`, sem aumentar `testTimeout`.
> Ao terminar, rode e mostre a saída de: `pnpm --dir packages/api typecheck`, `pnpm --dir apps/web typecheck`, `pnpm lint`, `pnpm --dir packages/api test`, `pnpm --dir apps/web test` e `pnpm --dir packages/api test:integration` (três execuções completas).
