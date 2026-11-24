# Revisão de conformidade 004: Sessão do Claude dentro do Flow Dev

> **Data:** 2026-11-23 · **Escopo:** feature inteira, com rechecagem dos itens tocados pela review-003 · **Intervalo:** mudanças não commitadas
> **Spec:** `spec.md`, `_tasks.md`, `task_01.md` a `task_07.md`, `v20-spike.md` e reviews 001–003 · **Regras:** `AGENTS.md`, `apps/web/AGENTS.md`, `code-standards.md`, rules E2E e skills layered-backend, nextjs-folder-structure e software-testing.
> **Prontidão:** 7 tarefas completed, 26/26 mini-tarefas; verificador estrutural passou. Dispensa E2E/UI de task_07 preservada.

## Veredito: APROVADO COM RESSALVAS

Os três bloqueios e os achados de latência e limites de função da review-003 foram corrigidos. Os cenários novos usam PostgreSQL descartável e runtime roteirizado; os gates completos passaram antes da separação final de dois arquivos de teste, cujas suítes afetadas e typecheck foram repetidos e passaram. Restam duas inconsistências documentais já identificadas na review-003, sem divergência nova no comportamento implementado.

| Bloqueante | Importante | Menor | Spec a discutir |
|---|---|---|---|
| 0 | 0 | 0 | 2 |

## Verificação executada

| Comando | Resultado |
|---|---|
| `rtk python3 -I .agents/skills/spec-to-tasks/scripts/tasks_status.py docs/specs/sessao-no-flow-dev` | exit 0 · 7 completed · 26/26 · OK |
| `rtk python3 -I .agents/skills/spec-conformance/scripts/scan_diff.py --repo . --worktree --max-lines 100` | exit 0 · nenhum arquivo TS/TSX acima de 100 linhas; sem dependências novas. Dicas de assertions_removed conferidas: as expectativas permanecem, apenas as chamadas dos helpers mudaram para objeto. |
| `rtk pnpm --dir packages/api test` | exit 0 · 101 arquivos · 662 testes passam |
| `rtk pnpm --dir packages/api test:integration` | exit 0 · 112 arquivos passam, 2 ignorados · 624 testes passam, 5 ignorados |
| Testes focados após dividir os arquivos acima de 100 linhas: `session-supervisor-start`, `session-preparation-race`, `session-controls`, `session-controls-recovery` | exit 0 · 4 arquivos · 15 testes passam |
| `rtk pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/session-decision.test.ts` | exit 0 · 1 arquivo · 4 testes passam |
| `rtk pnpm --dir packages/api typecheck` | exit 0 |
| `rtk pnpm --dir apps/web test` | exit 0 · 84 arquivos · 418 testes passam |
| `rtk pnpm lint` | exit 0 · eslint da web |
| `rtk proxy pnpm typecheck` | exit 0 · API e web; tipos das rotas gerados |
| `rtk pnpm build` | exit 0 · 17 páginas geradas; avisos de tracing preexistentes em `agentInstructions.ts:23` |
| Ensaio NFR-10: `rtk pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts --silent=false test/session-latency.test.ts` | exit 0 · 21 sessões, 20 mensagens, uma captura durante a carga; p95/máximo de entrada no runtime 1.176 ms; consulta da timeline p95 98 ms, máximo 99 ms; limite calculado da tela 1.598 ms. Método e ressalvas em `latency-report.md`. |
| `rtk git diff --check` | exit 0 |

Não foram executados Playwright, V-30a/b, V-32g nem a passada manual V-31 pela UI: a dispensa expressa em `task_07.md` foi mantida. Os cinco testes reais de Claude seguem opt-in/ignorados e não são apresentados como evidência executada.

## Conformidade com a spec

| Item | Status | Evidência |
|---|---|---|
| REQ-051, US-06.1, fluxo §16 — prompt/anexos prontos antes do runtime | ✅ | `terminalOpenSteps.ts:23-26` grava `prepared_at` só depois da preparação completa; `drizzleSessionControlDao.ts:18` exige a marca no claim. `session-preparation-race.test.ts` segura a preparação por barreira com PostgreSQL, executa o worker concorrente, confere que não houve start e depois prova um start com prompt e conteúdo do anexo. |
| REQ-054 — prompt realmente ausente continua sendo falha | ✅ | `session-supervisor-start.test.ts` remove o arquivo após a preparação e confirma `launch_failed`, sem runtime. |
| Idempotência do open e do start | ✅ | `session-supervisor-start.test.ts` cobre chave/idempotência e dois supervisores concorrentes; o novo caso de preparação confirma um único start. |
| REQ-074, REQ-076–079 — encerrar sessão interrompida sem retomada | ✅ | `session-controls-recovery.test.ts` executa restart, pedido de end, captura do Markdown, status `ended`, nenhuma chamada `resume` e flags limpas. Uma sessão interrompida de outro host mantém seu pedido sem ser alterada. |
| REQ-073, B-24, B-30, §7.2 — pergunta após fim da vez | ✅ | `sessionSignals.ts:14` move `waiting → asking`; o teste roteirizado verifica pedido cancelado, promessa negada por `interrupt` e retorno a `waiting`. O teste B-30 de interrupção sem vez ativa continua passando. |
| REQ-057, NFR-10 — latência | ✅ | Ensaio reproduzível em `test/session-latency.test.ts`; p95 de início do envio até runtime e limite calculado de tela abaixo dos limites da spec. O ensaio inclui captura concorrente. |
| Limites de função e parâmetros, `code-standards.md:39,82,154` | ✅ | `SessionComposer` ocupa 27 linhas de função; `runUntilAnswered`, `decide` e `send` recebem um objeto. Os testes extraídos mantêm cada arquivo abaixo de 100 linhas. |
| Restante da feature e comportamento que não muda | ✅ | As suítes completas API e web passaram; regressões de autorização, timeline, respostas, encerramento ativo e regressão Spec B permanecem verdes. A verificação integral e as dispensas estão registradas na review-003. |
| V-30a/b, V-32g e V-31 manual | ⚪ dispensados | Aceite de processo em `task_07.md`; nenhuma afirmação de aprovação por E2E/UI. |
| Fora de escopo e DEC-15–20 | ✅ | Nenhuma dependência nova; runtime roteirizado só para testes; sem TTY, streaming palavra a palavra, porta ou execução remota. |

## Regras do projeto

| Regra | Situação e evidência |
|---|---|
| Máximo de 100 linhas TS/TSX (`code-standards.md`) | Conforme após extração: scanner e contagem dos arquivos afetados sem excessos. |
| Funções até 30 linhas e até 3 parâmetros (`code-standards.md`) | Conforme nos locais apontados em M-1. |
| Camadas backend (`layered-backend`) | DAO de status/claim permanece em `infra/database/dao`; coordenação e controle ficam em serviços de aplicação; controller não acessa Drizzle. |
| Localização frontend (`nextjs-folder-structure`) | Composer continua na feature assigned-work; alteração limita-se ao tamanho da função. |
| Testes de integração e sincronização (`software-testing`) | PostgreSQL real para claims/estados, barreira determinística sem sleep no B-1, runtime roteirizado nos fluxos B-2/B-3 e medição reproduzível para I-1. |
| E2E dispensado e rules espelhadas | Nenhum E2E foi reaberto. As rules não foram alteradas. |

## Achados

Nenhum achado de implementação bloqueante, importante ou menor nesta rodada.

## Atualizações de spec/documentação a discutir

1. `apps/web/PRODUCT.md` ainda descreve a execução como removida, apesar do produto aprovado e implementado.
2. `apps/web/DESIGN.md` ainda restringe as caixas da thread ao draft e ao composer, enquanto a spec aprovada prevê cartões de perguntas e permissões.

Esses dois pontos são documentais e não impedem a conformidade do código. Permanecem da review-003; não foram ampliados nesta rodada.

## Correção pendente

Nenhuma correção de código pendente. Se a documentação canônica for atualizada, alinhar `PRODUCT.md` e `DESIGN.md` à feature aprovada sem reabrir a dispensa E2E/UI aceita em `task_07.md`.
