---
status: completed
title: Worker com credenciais da conta, checagem de login e limite de uso
type: backend
complexity: critical
---

# Task 05: Worker com credenciais da conta, checagem de login e limite de uso

## Visão geral
Faz o worker de sessões respeitar a conta gravada na sessão. Antes de iniciar ou retomar, ele confere se a conta pertence à dona e a esta máquina e se está logada. Depois, executa o Agent SDK ou o app-server do Codex com o diretório da conta. Também traduz a recusa por limite de uso no motivo "Limite de uso da conta X atingido". É o que torna a escolha real e impede a troca silenciosa de conta (US-03, US-04).

<critical>
- LEIA a spec (`spec.md`) e as regras do projeto (AGENTS.md/CLAUDE.md, `.agents/rules/code-standards.md`) antes de começar.
- FAÇA UMA MINI-TAREFA POR VEZ, na ordem. Só marque `[x]` depois de rodar o "Pronto quando" dela e ver passar.
- NÃO saia dos arquivos listados sem registrar o motivo no Registro de execução. Nada fora do escopo da spec.
- TESTES JUNTO COM O CÓDIGO: cada mini-tarefa implementa os testes atribuídos a ela, seguindo a skill de testes do projeto (`software-testing`). Isso quer dizer: asserção sobre o efeito observável e específico, nada de `toBeTruthy` ou de só checar que não lança exceção; valor esperado tirado da spec, nunca recalculado a partir do código; dublês só em dependências lentas, variáveis ou externas; relógio e aleatoriedade controlados. Em bug, reproduza antes de corrigir.
- Ao começar, mude `status` para `in_progress` (aqui e em `_tasks.md`). Mude para `completed` só quando todas as mini-tarefas estiverem marcadas e os critérios de sucesso tiverem sido comprovados por comando. A revisão contra a spec acontece uma vez, depois de todas as tarefas: não a espere aqui, mas não marque nada que não tenha prova, porque ela vai conferir.
</critical>

## Requisitos
- REQ-014 (execução): sessão com `agentAccountId` roda com `CLAUDE_CONFIG_DIR` (Claude) ou `CODEX_HOME` (Codex) apontando para o diretório da conta.
- REQ-017: a retomada usa o `agentAccountId` da sessão, nunca a escolha atual do trabalho.
- REQ-022: conta deslogada na abertura ou na retomada → `markLaunchFailed` (abertura) ou término com falha (retomada) sem iniciar o agente, com "A conta <nome> (<provedor>) não está logada. Rode `<loginCommand>`."
- REQ-023: verificação além de 10 s → "Não foi possível verificar o login da conta <nome>. Tente de novo." (limite injetável no teste).
- REQ-024 / B-09: recusa por limite → motivo de término "Limite de uso da conta <nome> atingido"; o texto já recebido fica no histórico; a transição de estado é a mesma de hoje para falha do agente (§9).
- REQ-025: nunca abrir, retomar ou repetir em outra conta; nenhuma sessão nova é criada por falha.
- NFR-02 / DEC-05: o worker recusa conta de outro `host_id` ou de dona diferente da sessão (falha de abertura).
- NFR-03: a checagem antes da abertura acrescenta no máximo 10 s.
- NFR-04: logs `started`, `resumed`, `launch_failed`, `exited` com `account=<id>|default`, sem e-mail.
- B-02: duas sessões do mesmo trabalho em contas diferentes rodam ao mesmo tempo, cada uma com seu ambiente.
- Não muda (§9): sessão sem conta (inclusive as anteriores à feature) inicia e retoma com o ambiente atual intacto.

## Interfaces
- **Consome:** `AgentAccountDao.findById` (task 01); `AgentAccountHome.ensure/pathOf`, `AgentLoginInspector.inspect`, `loginCommandOf`, `credentialEnvironment` (task 02); `TerminalSessionRecord.agentAccountId` (task 01); sessões com conta gravada (task 04); `SessionStarter`, `SessionResumeStep`, `SessionExitHandling`; `RuntimeStartInput`/`RuntimeResumeInput` (`application/terminal/agentSessionRuntime.ts`); `buildQueryOptions` (`infra/terminal/agentSdkQueryOptions.ts`); `CodexProcess` (`infra/terminal/codex/codexProcess.ts`); `agentSdkExit`, `failCodexSession`/`codexExitOutcome`; regex `USAGE_LIMIT` de `infra/agents/agentFailure.ts`.
- **Produz:**
  - `RuntimeStartInput.credentialHome?: string` e `RuntimeResumeInput.credentialHome?: string`.
  - `SessionAccountGate` em `packages/api/src/application/services/terminal/sessionAccountGate.ts`: `check(session) → { ok: true; credentialHome?: string; account: AgentAccountRecord | null } | { ok: false; reason: string }`, usado por `SessionStarter` e `SessionResumeStep`.
  - `RuntimeExit.limit?: true` (ou `kind` existente com `detail` classificado) para a saída marcar o motivo de REQ-024; `usageLimitReason(label)`.

## Mini-tarefas

- [x] **05.1 — `SessionAccountGate` no início e na retomada**
  - **Arquivos:** `packages/api/src/application/services/terminal/sessionAccountGate.ts` (criar), `sessionAccountMessages.ts` (criar), `sessionStarter.ts`, `sessionResume.ts`, `packages/api/src/infra/sessionWorkerParts.ts` / `sessionWorkerComposition.ts` (injetar o gate), `packages/api/test/session-account-gate.test.ts` (criar)
  - **Testes:** V-07a, V-07b, V-07e, V-09c
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/session-account-gate.test.ts` e `test/session-resume.test.ts` passam
  - **Nota:** o gate roda depois de `readPrompt` e antes de `runtime.start`. Na retomada, roda depois de `claimResume` e, se falhar, usa o caminho `fail` atual com o motivo da conta.
- [x] **05.2 — `credentialHome` no Agent SDK e no app-server do Codex**
  - **Arquivos:** `packages/api/src/application/terminal/agentSessionRuntime.ts`, `packages/api/src/infra/terminal/agentSdkQueryOptions.ts`, `agentSdkSession.ts`/`agentSdkSessionRuntime.ts`, `packages/api/src/infra/terminal/codex/codexProcess.ts`, `codexSessionStart.ts`/`codexSessionResume.ts`, `packages/api/src/infra/terminal/agentSdkQueryOptions.test.ts`, `packages/api/test/session-account-environment.test.ts` (criar)
  - **Testes:** V-06b, V-06c, V-10b
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run src/infra/terminal/agentSdkQueryOptions.test.ts` e `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/session-account-environment.test.ts test/codex-runtime-start.test.ts` passam
  - **Nota:** `CodexProcess.start` hoje recebe o ambiente no construtor; passe `credentialHome` por chamada (`start({ credentialHome })`) para não compartilhar ambiente entre sessões (B-02).
- [x] **05.3 — Motivo "Limite de uso da conta X atingido"**
  - **Arquivos:** `packages/api/src/infra/terminal/agentSdkExit.ts`, `packages/api/src/infra/terminal/codex/codexSessionExit.ts` (ou `codexSessionState.ts`), `packages/api/src/infra/agents/agentFailure.ts` (exportar o teste de limite), `packages/api/src/application/services/terminal/sessionExit.ts`, `packages/api/src/infra/terminal/agentSdkExit.test.ts` (criar), `packages/api/test/session-account-limit.test.ts` (criar)
  - **Testes:** V-07c, V-07d
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run src/infra/terminal/agentSdkExit.test.ts` e `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/session-account-limit.test.ts` passam
- [x] **05.4 — Jornada troca e retomada, sessões simultâneas e logs**
  - **Arquivos:** `packages/api/test/work-account-journey.test.ts` (criar), `packages/api/src/application/services/terminal/sessionLog.ts` (campo `account`), `sessionStarter.ts`, `sessionResume.ts`, `sessionExit.ts`
  - **Testes:** V-06d, V-10c
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/work-account-journey.test.ts` passa; `pnpm --dir packages/api typecheck` sem erros

## Detalhes de implementação
Use o runtime falso que registra o ambiente: estenda `scriptedSessionRuntime`/`scriptedCodexAppServer` ou crie um `RecordingRuntime` em `packages/api/test/support/` que guarde o `RuntimeStartInput`/`RuntimeResumeInput` recebido. Para o Agent SDK, `buildQueryOptions` recebe `credentialHome` e aplica `credentialEnvironment("claude", home)` sobre `terminalEnvironment(env)`. A checagem de limite reaproveita o `USAGE_LIMIT` de `agentFailure.ts` sobre o `detail`/stderr; para o Agent SDK, considere também o status 429. Siga `test/session-worker-support.ts` e `test/session-resume.test.ts` para montar o worker com Postgres real. Logs: a sessão registra `account: session.agentAccountId ?? "default"`.

### Arquivos relevantes
- `packages/api/src/application/services/terminal/sessionStarter.ts`, `sessionResume.ts`, `sessionExit.ts`.
- `packages/api/src/infra/terminal/agentSdkQueryOptions.ts`, `terminalEnvironment.ts`.
- `packages/api/src/infra/terminal/codex/codexProcess.ts`, `codexSessionState.ts` (`codexExitOutcome`).
- `packages/api/src/infra/agents/agentFailure.ts`: `USAGE_LIMIT`.
- `packages/api/test/session-worker-support.ts`, `test/task-plan-journey.test.ts`: padrões de jornada.

### Arquivos afetados
- `agentSessionRuntime.ts`: `credentialHome` opcional.
- Runtimes do Claude e do Codex: ambiente por sessão.

### Decisões relacionadas
- DEC-01: o histórico do agente fica no diretório da conta, por isso a retomada só na conta original.
- DEC-04: sem `credentialHome`, ambiente atual.
- DEC-05: recusa de outro `host_id`.

## Premissas
- Sem o spike V-01, as mensagens reais de limite não foram capturadas; o teste usa textos que casam com o `USAGE_LIMIT` atual ("You've hit your usage limit", status 429).

## Testes atribuídos
- [ ] V-07a: sessão Claude na conta "Trabalho" e inspetor falso `logged_out` → sessão marcada como falha de abertura com "A conta Trabalho (Claude Code) não está logada. Rode `CLAUDE_CONFIG_DIR='<dir>' claude auth login`.", runtime não chamado, nenhuma sessão nova (US-03 cen. 1) · worker + Postgres real + runtime que registra.
- [ ] V-07b: inspetor que não responde e limite injetado de 50 ms → falha com "Não foi possível verificar o login da conta Trabalho. Tente de novo." e o passo seguinte do worker continua (a fila não trava) (REQ-023) · Postgres real.
- [ ] V-07e: sessão interrompida em "Pessoal" com mensagem na fila e inspetor `logged_out` → retomada falha com o motivo da conta, runtime `resume` não chamado e nenhuma outra conta usada (REQ-022, REQ-025) · Postgres real.
- [ ] V-09c: sessão com conta de `host_id` "outra-maquina" ou de dona diferente da sessão → falha de abertura e runtime não chamado (NFR-02, DEC-05) · Postgres real.
- [ ] V-06b: sessão Claude com conta → `RuntimeStartInput.credentialHome` é o diretório da conta, e `buildQueryOptions` monta `env.CLAUDE_CONFIG_DIR` igual a ele · Postgres real + runtime que registra; unitário em `agentSdkQueryOptions.test.ts`.
- [ ] V-06c: sessão Codex com conta → o processo do app-server (fake `FLOW_DEV_CODEX_FAKE_SCRIPT`) recebe `CODEX_HOME` igual ao diretório da conta · processo fake real.
- [ ] V-10b: sessão sem `agentAccountId` → `credentialHome` ausente, e o ambiente do Agent SDK e do Codex é igual ao de hoje (`CLAUDE_CONFIG_DIR`/`CODEX_HOME` do servidor); retomada de uma sessão sem conta idem (§9) · Postgres real.
- [ ] V-07c: runtime Claude roteirizado emite texto e depois falha com "You've hit your usage limit" na conta "Pessoal" → motivo "Limite de uso da conta Pessoal atingido", o texto emitido continua no histórico, a transição de estado é a mesma da falha atual, e nenhuma sessão nova existe (US-03 cen. 2 adaptado, B-09) · Postgres real.
- [ ] V-07d: Codex roteirizado recusa por limite na conta "Codex B" → motivo "Limite de uso da conta Codex B atingido" (US-03 cen. 2) · Postgres real + fake do app-server.
- [ ] V-06d: jornada: abrir sessão Claude em "Pessoal" (via controller da task 04), interromper, trocar o Claude do trabalho para "Trabalho", retomar → `resume` recebe o diretório de "Pessoal"; abrir sessão nova → `start` recebe o de "Trabalho"; as duas ficam ativas ao mesmo tempo com ambientes distintos (US-04 cen. 1–2, B-02); depois trocar o Codex para "Codex C" e iniciar a sessão do plano de novo → roda em "Codex C" (US-03 cen. 3) · controller + worker + Postgres real + runtime que registra.
- [ ] V-10c: logs de `started`, `launch_failed` e `exited` capturados → contêm `account=<id>` para sessão com conta e `account=default` sem conta; nenhum contém o e-mail da conta (NFR-04) · Postgres real, log capturado.

## Critérios de sucesso
- Todas as mini-tarefas marcadas, cada uma com o "Pronto quando" executado.
- Todos os testes atribuídos implementados e passando.
- Nenhum caminho do worker cai no login padrão ou em outra conta quando a sessão tem conta.
- `pnpm --dir packages/api test` e `test:integration` completos passam ao fechar a tarefa; typecheck e lint sem erros.

## Registro de execução
- 05.1 — `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/session-account-gate.test.ts test/session-resume.test.ts` — passou (2 arquivos, 7 testes). Cobre abertura com conta deslogada, host/dona incorretos sem runtime, timeout injetável e retomada que termina sem retomar nem entregar a mensagem.
- 05.2 — `pnpm --dir packages/api exec vitest run src/infra/terminal/agentSdkQueryOptions.test.ts` e `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/session-account-environment.test.ts test/codex-runtime-start.test.ts` — passaram (9 testes unitários, 6 de integração). Claude recebe `credentialHome` na abertura e retomada; Codex subprocess recebe `CODEX_HOME` por chamada e preserva o ambiente do servidor sem conta. A primeira execução apontou que o ambiente filtrado do Codex fake perdia a variável de teste; corrigido preservando a variável restrita a NODE_ENV=test.
- 05.3 — `pnpm --dir packages/api exec vitest run src/infra/terminal/agentSdkExit.test.ts` e `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/session-account-limit.test.ts test/codex-runtime-start.test.ts` — passaram (2 testes unitários, 6 de integração). Agent SDK status/texto e notificação `turn/failed` do Codex classificam limite; o worker grava o nome da conta como motivo e preserva a resposta parcial no histórico.
- 05.4 — `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/work-account-journey.test.ts` passou (2 testes) e `pnpm --dir packages/api typecheck` passou. A jornada mantém Pessoal ao retomar, usa Trabalho em nova sessão simultânea, inicia item de plano com a escolha atual Codex B/C e verifica account id nos logs sem email.
- Fechamento — `pnpm --dir packages/api test` passou (146 arquivos, 907 testes); `pnpm --dir packages/api test:integration` passou (210 arquivos, 937 testes, 2 arquivos/5 testes ignorados); typecheck e `pnpm lint` passaram. A primeira integração completa encontrou falso positivo para "model usage limit reached"; a classificação foi restringida e a suíte completa passou na confirmação.

### Correções da review-001 (2026-11-26, rodada feita na sessão de revisão, a pedido do usuário)
- B-1 (05.3): o limite do Codex passou a ser lido nas notificações reais do app-server 0.159.3: `error` com `willRetry: false` e `turn/completed` com `turn.status: "failed"`, pelo `codexErrorInfo: "usageLimitExceeded"` (regex como reserva), em `codexTurnFailure.ts`. O caminho inventado `turn/failed` saiu. Turno com falha que não é de limite segue como antes. Testes: `test/codex-runtime-account.test.ts` (V-07d com as formas geradas, inclusive mensagem que a regex não pega, e o caso sem limite) e `test/session-account-codex-limit.test.ts` (worker + Postgres: sessão Codex em "Codex B" termina com "Limite de uso da conta Codex B atingido", sem sessão nova).
- I-2 (05.2): `codexProcess.ts` com conta usa o ambiente de hoje e troca só o `CODEX_HOME`. Teste V-06c em `codex-runtime-account.test.ts` (o `SSH_AUTH_SOCK` chega igual com e sem conta).
- I-3: montagem das contas do worker extraída para `infra/accountWorkerParts.ts` (`sessionWorkerParts.ts` 102 → 98); `codex-runtime-start.test.ts` 104 → 56, com o apoio em `test/support/codexRuntimeFixture.ts`.
- M-1: `launch_failed` volta a registrar `reason`; numa recusa por conta, o código `account_rejected` (a mensagem completa traz o caminho do diretório). Asserção em `work-account-journey.test.ts`.
- M-2: `CLAUDE_LIMIT_STATUS` reaproveitado, `MODEL_USAGE_LIMIT` e `DEFAULT_LOGIN_LIMIT_LABEL` em constantes.
- Verificação da rodada: `pnpm --dir packages/api typecheck` e `pnpm --dir apps/web typecheck` exit 0; `pnpm --dir packages/api test` 146 arquivos, 910 testes; `pnpm --dir apps/web test` 125 arquivos, 675 testes; `rtk proxy pnpm lint` exit 0. `pnpm --dir packages/api test:integration`: na primeira execução, 1 falha (`terminal-session-choice` ainda chamava o reader com a assinatura antiga, corrigido e confirmado: 4 passed); na segunda, 943 passaram e 2 falharam por carga (`session-latency`, instável já conhecido, e `review-cycle-shell-writes`, teste novo de outra frente). Os dois passaram sozinhos, 2 vezes cada.
