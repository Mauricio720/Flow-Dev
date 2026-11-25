# Revisão de conformidade 004: Revisão automática da feature (Issue #9)

> **Data:** 2026-11-25 · **Escopo:** feature inteira, **parcial**: task_08 (e2e V-14, smoke V-15, definição de pronto) excluída a pedido do usuário. Rechecagem das correções da review-003 e de tudo o que elas tocaram. · **Intervalo:** mudanças não commitadas sobre `ef8a480` (a árvore mistura as Issues #8 e #10; só os arquivos da #9 foram julgados)
> **Spec:** `docs/specs/revisao-automatica-da-feature/spec.md`, `_tasks.md`, `task_01.md`–`task_07.md` · **Regras lidas:** `AGENTS.md`, `CLAUDE.md`, `apps/web/AGENTS.md`, `.agents/rules/code-standards.md`, skills `layered-backend`, `trpc-nextjs`, `nextjs-folder-structure`, `software-testing`

## Veredito: APROVADO COM RESSALVAS

As correções da review-003 se confirmaram. Os gates passaram todos, inclusive três execuções completas da integração. Nenhum requisito em escopo está ausente, e nenhum arquivo da #9 passa do limite. Restam dois achados menores:
- a aceitação do risco residual de REQ-021 foi registrada pelo implementador e ainda espera a confirmação da operadora;
- uma afirmação em "Premissas e bloqueios" não bate com o código.

| Bloqueante | Importante | Menor | Spec a discutir |
|---|---|---|---|
| 0 | 0 | 2 | 3 |

## Verificação executada

| Comando | Saída | Resultado |
|---|---|---|
| `pnpm --dir packages/api typecheck` | exit 0 | ✅ |
| `pnpm --dir apps/web typecheck` | exit 0 | ✅ |
| `pnpm lint` | exit 0 (só `apps/web` declara lint) | ✅ |
| `pnpm --dir packages/api test` (2 execuções) | exit 0 nas duas · 137 arquivos, 852 testes | ✅ |
| `pnpm --dir apps/web test` | exit 0 · 115 arquivos, 626 testes | ✅ |
| `pnpm --dir packages/api test:integration` (sem `TEST_DATABASE_URL`), 3 execuções | exit 0 nas três · 181 arquivos, 851 testes, 5 ignorados | ✅ |
| `scan_diff.py --worktree --max-lines 100` | dependências: nenhuma; nenhum arquivo da #9 acima de 100 linhas; sem comentário, escape de tipo ou teste desabilitado nos arquivos da #9 | — |

Não rodados: `pnpm build` e Playwright (task_08, excluída).

## Correções da review-003

| Achado | Status | Evidência |
|---|---|---|
| B-1 V-54a intermitente | ✅ | `test/codex-service-flow.test.ts:31` espera `waiting` com o `waitForStatus` que o arquivo já tinha, sem timeout novo; verde nas três execuções completas |
| I-1 arquivos acima de 100 linhas | ✅ | `scriptedSessionRunner.ts` com 100 linhas (`RunnerConfig` em `scriptedRunnerConfig.ts`, sem mudar comportamento). `OperatorStages.test.tsx` com 83 linhas e `OperatorStagesReview.test.tsx` com 37: os 4 testes V-12a/V-12c migraram sem perda (9 + 4 casos; `HEAD` tinha 9). Montagem compartilhada em `src/test/operatorStages.tsx` |
| M-1 mensagem de continuação não recuperada | 🟡 | Sem mudança no código; registrado como risco em `_tasks.md:104`, "aceito em 2026-11-25, a confirmar" (M-1 abaixo) |
| M-2 prazo do teste de resposta secreta | ✅ | `test/codex-secret-answer.test.ts:18,51` usam o padrão de produção (1,5 s); o teste negativo mantém 30 ms; registrado em `task_03.md` |

## Conformidade com a spec

| Item | Status | Evidência |
|---|---|---|
| REQ-001–020, REQ-022–044, NFR-01, NFR-02, NFR-04–06 | ✅ | Sem regressão; todos os testes do ciclo verdes nas três execuções completas |
| REQ-021 | 🟡 | Retomada coberta para papel sem sessão (`openMissing`) e sessão órfã (finalizador); fica a janela entre a transição e o envio da mensagem (M-1) |
| §7.1–§7.5, §9, §14, §20 | ✅ | |
| DEC-01–03, DEC-05, DEC-07, DEC-08 | ✅ | Sem dependência nova; sem WebSocket |
| B-01–B-07, B-09–B-12 | ✅ | |
| Fora de escopo | ✅ | Nada adicionado à feature. As mudanças em `codex-secret-answer` e `codex-service-flow` são só de teste, para estabilizar a suíte |
| V-14, V-15, §24 | — | task_08, excluída |

## Regras do projeto

| Regra (fonte) | Status | Evidência |
|---|---|---|
| Máx. 100 linhas por `.ts` (`code-standards.md` "File Size") | ✅ | Nenhum arquivo da #9 acima do limite. Pré-existentes acima do limite que ganharam uma linha de import ou export: `schema.ts` 127 → 128, `test/issue-deletion-support.ts` 105 → 106 |
| Máx. 30 linhas por função, 3 parâmetros, sem linha em branco em função, sem comentários | ✅ | |
| Camadas, tRPC, pastas | ✅ | |
| Sem dependência nova | ✅ | |
| Não aumentar timeout para contornar lentidão (`AGENTS.md`) | ✅ | `testTimeout` intocado; o teste de resposta secreta usa o prazo de produção |
| Verificação (`AGENTS.md`) | ✅ | Gates verdes (tabela acima) |

## Achados

### M-1 (Menor) — Risco residual de REQ-021 aceito em nome da operadora · task_05 (05.3)
- **Onde:** `_tasks.md:104`, "Mensagem de continuação não recuperada após queda (aceito em 2026-11-25, a confirmar)". O código continua com a janela em `reviewStepTurn.ts:41-44` e `:55-60`.
- **Contra:** REQ-021. Aceitar risco é decisão da operadora, não do implementador.
- **Problema:** a anotação diz "aceito", mas ninguém confirmou.
- **Correção esperada:** a operadora confirma, e "a confirmar" sai do texto. Ou recusa, e a mensagem passa a ser recuperável (chave estável por ciclo, papel, rodada e `step_started_at`, sem reenviar a abertura).

### M-2 (Menor) — "Premissas e bloqueios" diz que `codex-runtime-requests` foi ajustado, e não foi · fora das tarefas
- **Onde:** `_tasks.md:105`: "Os dois primeiros e o V-54a foram ajustados nesta feature". Os dois primeiros são `codex-secret-answer` e `codex-runtime-requests`, mas `test/codex-runtime-requests.test.ts` não aparece no `git status` (não foi alterado).
- **Contra:** rastreabilidade; a revisão não confia em afirmação sem evidência.
- **Problema:** a anotação dá a entender que a intermitência de `codex-runtime-requests` (uma falha observada na sessão de correção da review-001) foi tratada. Não foi. Ele passou nas três execuções desta revisão, mas segue sem ajuste.
- **Correção esperada:** corrigir o texto para "`codex-secret-answer` e `codex-service-flow` V-54a foram ajustados; `codex-runtime-requests` não, e falhou uma vez" (ou ajustar o teste).

## Atualizações de spec a discutir
- **Leitura depois do ciclo final:** a tela para de ler no estado final (§16 passo 3), então um ciclo novo iniciado em outra aba só aparece ao recarregar. E sem nenhum ciclo, a leitura de 3 s roda para sempre em toda página de trabalho com conjunto legível.
- **Revisão cresce a cada gravação do serviço:** um pedido feito com a tela de 3 s atrás recebe "A revisão mudou." mesmo com o estado visível igual (REQ-032).
- **Pasta na raiz do checkout:** os prompts escrevem "raiz do checkout" no lugar de `{pasta}` (`reviewPrompts.ts:19`), caso que a §7.5 não prevê.

## Divergências entre o relatório do implementador e a evidência
- `_tasks.md:105` afirma ajuste em `codex-runtime-requests`; o arquivo não mudou (M-2).
- As demais afirmações da rodada (100 linhas no runner, 83 em `OperatorStages.test.tsx`, prazo de produção no teste de resposta secreta, gates verdes) foram confirmadas.

## Fora do escopo, mas na árvore
- `packages/api/.preflight.tmp.ts` (não versionado, de 2026-11-24) tem `console.log` e IDs reais. Não deve entrar em commit.

## Prompt de correção

> Ajuste, sem alterar código de produção:
> 1. **M-1**, `docs/specs/revisao-automatica-da-feature/_tasks.md` > "Premissas e bloqueios": com a confirmação da operadora, tire "a confirmar" do item da mensagem de continuação. Se ela recusar, implemente a recuperação da mensagem (chave estável por ciclo, papel, rodada e `step_started_at`, sem reenviar a abertura) com um teste de queda injetada entre a transição e o envio (REQ-021).
> 2. **M-2**, mesmo arquivo: corrija o item dos testes sensíveis a carga para dizer que só `codex-secret-answer` e `codex-service-flow` V-54a foram ajustados, e que `codex-runtime-requests` falhou uma vez e não foi alterado.
>
> Se o item 1 virar código, rode e mostre: `pnpm --dir packages/api typecheck`, `pnpm --dir packages/api test` e `pnpm --dir packages/api test:integration` (três execuções completas).
