# Revisão de conformidade 006: Várias contas de assinatura de IA, escolhidas por trabalho

> **Data:** 2026-11-26 · **Escopo:** feature inteira, depois da rodada de correções da review-001 · **Intervalo:** mudanças não commitadas sobre `fd7ea94`
> **Spec:** `spec.md` (com a resposta do usuário à Q-03 de 2026-11-26), `_tasks.md`, `task_01.md` a `task_08.md`
> **Regras lidas:** `AGENTS.md`, `apps/web/AGENTS.md`, `.agents/rules/code-standards.md`, `.agents/rules/e2e-testing.md`, skills obrigatórias e `software-testing`
> **Independência:** as correções foram aplicadas nesta mesma sessão, a pedido do usuário, que pediu também para seguir com a revisão aqui. Por isso esta revisão rechecou com testes e leitura tudo o que as correções tocaram, e não só os achados antigos.

## Veredito: REPROVADO

As correções da review-001 resolveram os achados (B-1, I-1 a I-3, M-1 a M-4). Dois problemas continuam:
- A resposta à Q-03 ("só a dona da conta vê o nome e o caminho") não está implementada. O nome da conta e o caminho do diretório aparecem para quem só lê o trabalho em três lugares: a mensagem de retomada que falhou, a mensagem de limite e a falha da revisão automática.
- A mensagem de conta deslogada na abertura (REQ-022) é gravada, mas nenhuma tela a mostra. A pessoa vê só "Falhou ao abrir". A review-001 deixou esse ponto passar.

| Bloqueante | Importante | Menor | Spec a discutir |
|---|---|---|---|
| 1 | 1 | 1 | 3 |

## Verificação executada

| Comando | Saída | Resultado |
|---|---|---|
| `pnpm --dir packages/api typecheck` | exit 0 | ✅ |
| `pnpm --dir apps/web typecheck` | exit 0 | ✅ |
| `pnpm --dir packages/api test` | exit 0 · 146 arquivos, 910 testes | ✅ |
| `pnpm --dir apps/web test` | exit 0 · 125 arquivos, 675 testes | ✅ |
| `pnpm --dir packages/api test:integration` (sem `TEST_DATABASE_URL`), 1ª execução | exit 1 · 1 falha: `terminal-session-choice.test.ts` ainda chamava `read(taskId, now)`; corrigido, e o arquivo passou sozinho (4 passed) | corrigido |
| `pnpm --dir packages/api test:integration`, 2ª execução | exit 1 · 943 passaram, 2 falharam, 5 pulados: `session-latency.test.ts` (p95 de entrada) e `review-cycle-shell-writes.test.ts` (teste novo de outra frente) | ⚠️ |
| `vitest run … test/review-cycle-shell-writes.test.ts test/session-latency.test.ts`, 2× | exit 0 · 2 passed nas duas | instáveis sob carga, fora desta feature |
| `rtk proxy pnpm lint` | exit 0 | ✅ |
| `pnpm --dir apps/web e2e:prepare` + `test:e2e e2e/ai-accounts.spec.ts e2e/work-accounts.spec.ts` | exit 0 · 2 passed, 0 skipped | ✅ |
| `rtk proxy pnpm build` | exit 0 · `ƒ /settings/ai-accounts` | ✅ |
| `scan_diff.py --worktree --max-lines 100` | só `schema.ts` (128 → 129, já acima antes) como arquivo longo; o dublê do inspetor é restrito; `.preflight.tmp.ts` (anterior à feature) | — |

A integração completa não ficou verde, por duas falhas que só aparecem sob carga e não tocam o código das contas. Isso conta como comando de verificação falhando e reforça o REPROVADO, mas não é defeito desta feature.

Obs.: `codexProcess.ts` foi alterado às 17:20 por outra sessão, para resolver o caminho do servidor falso com `dirname`/`join` em vez de `new URL`. A correção I-2 continua no arquivo, e as execuções acima vieram depois dessa alteração.

## Situação dos achados da review-001

| Achado | Situação | Evidência |
|---|---|---|
| B-1: limite do Codex por `turn/failed` | ✅ corrigido | `codexTurnFailure.ts` lê `error` com `willRetry: false` e `turn/completed` com `status: "failed"` por `codexErrorInfo`; `codexSessionEvents.ts` não tem mais `turn/failed`. Testes: `codex-runtime-account.test.ts` (inclui mensagem que a regex não pega e o caso sem limite que mantém a sessão) e `session-account-codex-limit.test.ts` (worker: "Limite de uso da conta Codex B atingido", 1 sessão) |
| I-1: catálogo nulo depois do login | ✅ corrigido | `agentAccountVerification.ts` `freshCodexCatalog`; composição com `LocalCodexCatalogProbe` por `codexHome`; `agent-account-codex-catalog.test.ts` (indisponível antes, `gpt-c-1` depois, 1 leitura) |
| I-2: ambiente curto no Codex com conta | ✅ corrigido | `codexProcess.ts:16` `{ ...this.env, ...credentialEnvironment("codex", …) }`; V-06c em `codex-runtime-account.test.ts` (`SSH_AUTH_SOCK` igual com e sem conta) |
| I-3: arquivos acima de 100 linhas | ✅ corrigido | `sessionWorkerParts.ts` 98, `codex-runtime-start.test.ts` 56, `agent-account-service.test.ts` 51 (+ `agent-account-verify.test.ts` 40), `ExecutionHistory.test.tsx` 98, `PlanSessionCard.test.tsx` 88 |
| M-1: `launch_failed` sem motivo | ✅ corrigido | `sessionStarter.ts` registra `reason` (`account_rejected` nas recusas de conta); asserção em `work-account-journey.test.ts` |
| M-2: valores mágicos | ✅ corrigido | `CLAUDE_LIMIT_STATUS` reaproveitado, `MODEL_USAGE_LIMIT`, `DEFAULT_LOGIN_LIMIT_LABEL`, `ACCOUNT_NOT_FOUND_MESSAGE` |
| M-3: `read` sobrecarregado | ✅ corrigido | `terminalExecutionReader.ts` `read(taskId, viewerUserId, now)`; os três testes antigos atualizados |
| M-4: spec sem as decisões | ✅ corrigido | `spec.md` §15, DEC-06, §22, Q-03 a Q-07 e Histórico de 2026-11-26 |

## Conformidade com a spec (itens que mudaram de status)

| Item | Status | Evidência |
|---|---|---|
| REQ-021 | ✅ | ver I-1 corrigido |
| REQ-024 (Claude e Codex) | ✅ | V-07c, V-07d no runtime e no worker |
| REQ-026 | ✅ | ver I-2 corrigido |
| REQ-022 (aviso ao abrir) | 🟡 | `markLaunchFailed` grava a mensagem em `launch_error`, mas nenhuma visão a devolve; a tela mostra só "Falhou ao abrir" (I-1 abaixo) |
| Q-03 / NFR-01 / Q-02 (nome e caminho só para a dona) | ❌ | B-1 abaixo |
| Demais REQ, NFR, B-xx, seção 9, DEC | ✅ | sem mudança desde a review-001; as suítes e o e2e acima continuam verdes |

## Regras do projeto

| Regra (fonte) | Status | Evidência |
|---|---|---|
| `.ts` até 100 linhas (`code-standards.md`) | ✅ | arquivos novos e alterados da feature dentro do limite; `schema.ts` já passava antes |
| Sem comentários, funções até 30 linhas, até 3 parâmetros | ✅ | arquivos novos da rodada (`codexTurnFailure.ts`, `accountWorkerParts.ts`, `codexRuntimeFixture.ts` e os testes) |
| Valores mágicos em constantes | ✅ | ver M-2 |
| Camadas (`layered-backend`) | ✅ | o probe entra pela porta `CodexCatalogProbe`, composto em `infra/agentAccountComposition.ts` |

## Achados

### task_05 · 05.1 e 05.3, task_04 · 04.2 (revisão automática)

#### B-1 (Bloqueante): nome da conta e caminho do diretório visíveis para quem não é a dona (Q-03)
- **Contra:** Q-03 (respondida em 2026-11-26: só a dona vê nome e caminho), NFR-01 ("o caminho do diretório só é mostrado à dona") e Q-02/REQ-018.
- **Onde:**
  1. `packages/api/src/application/services/terminal/sessionResume.ts`: `if (account && !account.ok) return this.fail(session.id, queued, account.reason, account.reason);` grava como mensagem de sistema da conversa a mensagem de `sessionAccountMessages.ts:4-7`, com nome, provedor e `CODEX_HOME='…'`/`CLAUDE_CONFIG_DIR='…'`. A conversa é lida por todo membro do trabalho.
  2. `packages/api/src/application/services/terminal/sessionExit.ts`: `usageLimitReason(account?.label ?? DEFAULT_LOGIN_LIMIT_LABEL)` grava "Limite de uso da conta <nome> atingido" como mensagem de sistema ou `launch_error`, visível a quem lê.
  3. `packages/api/src/application/services/review/reviewStepFailure.ts:36`: `return turn.launchError ?? …` leva o `launch_error` da sessão (com nome e caminho) para `failure` da visão da revisão automática (`reviewCycleView.ts:10`), mostrada a todos os membros.
  4. `packages/api/src/application/services/terminal/sessionServiceStatus.ts:34`: a prévia do Codex mostra o comando com o caminho da conta escolhida mesmo quando quem abre é outra pessoa operadora (cenário de REQ-019).
- **Problema:** depois da decisão, essas mensagens precisam depender de quem lê. Hoje o texto é gravado uma vez e mostrado igual para todos.
- **Correção esperada:** guardar o motivo de conta de forma estruturada (por exemplo, código, id da conta e provedor) ou em duas versões, e montar o texto por leitor. A dona vê o texto de REQ-022, REQ-023 e REQ-024 com nome e comando. As demais pessoas veem uma versão sem nome nem caminho, com o texto registrado na spec, por exemplo "A conta pessoal da pessoa operadora não está logada." e "Limite de uso da conta pessoal da pessoa operadora atingido". A prévia do Codex só mostra o comando quando a conta é de quem abre. Testes com duas pessoas (dona e leitora) para: retomada recusada, limite de uso, falha da revisão automática e prévia.

### task_05 · 05.1 e task_08 · 08.4

#### I-1 (Importante): a mensagem de falha de abertura por conta não chega à tela
- **Onde:** `drizzleTerminalSessionDao.ts:52` grava `launchError`; nenhuma visão devolve esse campo (`terminalExecutionReader.ts` não inclui `launchError`; em `apps/web/src`, `launch_failed` só vira o rótulo "Falhou ao abrir" em `executionCopy.ts:5`).
- **Contra:** REQ-022 e US-03 cen. 1 ("a sessão falha na abertura com 'A conta Trabalho (Claude Code) não está logada. Rode `…`'"), G3 ("saber… por que ela falhou").
- **Problema:** a pessoa operadora não vê o comando de login nem o motivo; só sabe que a sessão falhou. O V-07a prova o dado gravado, não o aviso na tela. A review-001 marcou REQ-022 como ✅ sem conferir esse caminho.
- **Correção esperada:** a visão da sessão no histórico devolve o motivo da falha de abertura respeitando B-1 (texto completo para a dona, versão sem nome e caminho para as demais), e a etapa de execução mostra esse texto junto de "Falhou ao abrir". Testes: leitor do histórico (API) com dona e leitora; RTL da etapa de execução com o motivo.

#### M-1 (Menor): a integração completa tem dois testes instáveis sob carga
- **Onde:** `test/session-latency.test.ts:86` (p95 de entrada ≤ 2000 ms) e `test/review-cycle-shell-writes.test.ts` (outra frente). Os dois falham na suíte completa e passam sozinhos.
- **Problema:** não é defeito desta feature, mas deixa o `test:integration` vermelho no gate.
- **Correção esperada:** fora do escopo desta feature; registrar para a frente dona de cada teste. Não aumente timeout nem reduza workers (`AGENTS.md`).

## Atualizações de spec a discutir
- **Q-04:** texto do motivo de limite no login padrão (hoje "Limite de uso da conta login padrão atingido").
- **Q-05:** limite com a sessão já iniciada vai para `interrupted` com mensagem de sistema; confirmar que basta para REQ-024.
- **Q-06:** texto "A conta desta sessão não está disponível nesta máquina." para a recusa no worker.
- B-1 vai precisar de textos novos para quem não é a dona; registrá-los na spec junto da correção.

## Divergências entre o relatório do implementador e a evidência
- O registro da task_05 desta rodada diz que a integração teve 943 testes passando e 2 falhas por carga, e foi isso o que se viu. Nenhuma divergência nova.
- A review-001 tinha marcado REQ-022 como ✅; o caminho até a tela não foi conferido (I-1).

## Prompt de correção

> Corrija, nesta ordem, sem alterar nada fora do listado:
> 1. **B-1 (Q-03, NFR-01, Q-02)**: nome da conta e caminho do diretório só para a dona. Em `sessionResume.ts` (retomada recusada), `sessionExit.ts` (motivo de limite), `reviewStepFailure.ts` (falha da revisão automática vinda do `launch_error`) e `sessionServiceStatus.ts` (prévia do Codex), guarde o motivo de conta de forma estruturada (código + id da conta + provedor) e monte o texto por leitor: a dona vê os textos de REQ-022, REQ-023 e REQ-024 com nome e comando; as demais pessoas veem a versão sem nome nem caminho. Registre os textos novos na spec (§15). Testes (Postgres real, duas pessoas): retomada recusada, limite de uso, falha da revisão automática e prévia, cada um lido pela dona e por uma leitora.
> 2. **I-1 (REQ-022, US-03 cen. 1)**: devolva o motivo da falha de abertura na visão da sessão (`TerminalExecutionReader.read`), seguindo a regra de B-1, e mostre-o na etapa de execução junto de "Falhou ao abrir". Testes: leitura da API pela dona e pela leitora; RTL da etapa de execução com o motivo.
>
> Restrições: `.ts` com até 100 linhas, funções com até 30 linhas, sem comentários, sem dependências novas, textos em pt-BR registrados na spec. Registre cada correção no "Registro de execução" das tasks 05 e 08.
> Ao terminar, rode e mostre a saída de: `pnpm --dir packages/api typecheck`, `pnpm --dir packages/api test`, `pnpm --dir packages/api test:integration` (sem `TEST_DATABASE_URL`), `pnpm --dir apps/web test`, `pnpm --dir apps/web typecheck`, `rtk proxy pnpm lint` e, como a tela muda, `pnpm --dir apps/web test:e2e e2e/work-accounts.spec.ts`.
