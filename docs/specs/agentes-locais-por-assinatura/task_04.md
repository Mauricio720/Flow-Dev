---
status: completed
title: Runners do Claude Code e do Codex com processo supervisionado
type: backend
complexity: high
---

# Task 04: Runners do Claude Code e do Codex com processo supervisionado

## Visão geral
`LocalAgentRunner.run()` inicia a CLI isolada com os argumentos provados no spike, devolve a saída estruturada e classifica cada falha num `AgentRunFailure`, sem deixar processos para trás. É a peça que troca o modelo cobrado por API pela assinatura da máquina.

<critical>
- LEIA a spec (`spec.md`, §15, DEC-01, DEC-04, NFR-01, NFR-03, §21) e `v00-spike.md` (resultado da tarefa 01) antes de começar. Leia as regras do projeto (AGENTS.md, `.agents/rules/code-standards.md`) e a skill `layered-backend`.
- FAÇA UMA MINI-TAREFA POR VEZ, na ordem. Só marque `[x]` depois de rodar o "Pronto quando" dela e ver passar.
- NÃO saia dos arquivos listados sem registrar o motivo no Registro de execução. Nada fora do escopo da spec.
- TESTES JUNTO COM O CÓDIGO: cada mini-tarefa implementa os testes atribuídos a ela.
- Nenhum teste chama a CLI real: use `fakeCli.mjs` e as fixtures da tarefa 01.
- Ao começar, mude `status` para `in_progress` (aqui e em `_tasks.md`). Não marque `completed`: isso acontece depois da revisão aprovada.
</critical>

## Requisitos
- REQ-006: o agente roda sem shell, sem arquivos da máquina, sem web e sem outros servidores de ferramentas.
- REQ-007: um provedor que não pode ser iniciado com essa restrição DEVE ser recusado sem chamar o modelo.
- REQ-009: uma CLI ausente ou deslogada DEVE falhar com o nome da CLI e o comando de login.
- REQ-010 (classificação): o limite de uso da assinatura DEVE ser reconhecido como `usage_limit`.
- REQ-011: um prazo vencido DEVE encerrar o processo e todos os filhos, e descartar a saída parcial.
- REQ-012: o cancelamento DEVE encerrar o processo em até 5 s.
- REQ-013: o agente não carrega instruções, memórias, hooks, plugins nem MCPs pessoais, e não guarda o histórico da sessão.
- REQ-023: com "Codex: retirado" no spike, o catálogo oferece só o Claude Code.
- NFR-01: o ambiente do processo segue uma lista de permissão, nunca `DATABASE_URL`, `GITHUB_REPOSITORY_TOKEN_KEY`, `BETTER_AUTH_SECRET`, tokens do GitHub ou outras variáveis do `.env.local`.
- NFR-03: depois de prazo, cancelamento ou SIGTERM, nenhum processo da CLI sobra em até 5 s.
- B-01, B-02, B-03; R-03, R-05 (spec §8 e §21).

## Interfaces
- **Consome:**
  - `AgentChoice`, `AgentProvider` e `AGENT_CATALOG` (tarefa 02, `packages/api/src/application/agents/`);
  - a seção "Argumentos" e os padrões de erro de `docs/specs/agentes-locais-por-assinatura/v00-spike.md`;
  - as fixtures de `packages/api/test/fixtures/agents/` (tarefa 01).
- **Produz** em `packages/api/src/application/agents/localAgentRunner.ts`:
  - `type AgentRun = { choice: AgentChoice; instructions: string; prompt: string; outputSchema: object; context: { url: string; capability: string }; timeoutMs: number; signal: AbortSignal }`;
  - `type AgentRunFailure = "missing_binary" | "not_signed_in" | "usage_limit" | "provider_failed" | "invalid_output" | "timeout" | "cancelled" | "isolation_unavailable" | "model_unavailable"`;
  - `class AgentRunError extends Error { failure: AgentRunFailure; detail: string }`;
  - `interface LocalAgentRunner { run(input: AgentRun): Promise<{ output: unknown; durationMs: number }> }`.
- **Produz também** em `packages/api/src/infra/agents/providerRunner.ts`: `class ProviderRunner implements LocalAgentRunner`, com `constructor(options: { claudeBin?: string; codexBin?: string })`, padrões `claude`/`codex`, e `shutdown(): Promise<void>`.

## Mini-tarefas

- [x] **04.1 — Contrato do runner e supervisor de processo**
  - **Arquivos:** `packages/api/src/application/agents/localAgentRunner.ts`, `packages/api/src/infra/agents/agentProcess.ts`, `packages/api/src/infra/agents/agentProcess.test.ts`, `packages/api/test/fixtures/agents/fakeCli.mjs` (criar)
  - **Testes:** V-04a, V-04b, V-04c, V-04d, V-02c
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run src/infra/agents/agentProcess.test.ts` passa; `pnpm --dir packages/api typecheck` sem erros
- [x] **04.2 — Ambiente com lista de permissão e classificador de falhas**
  - **Arquivos:** `packages/api/src/infra/agents/agentEnvironment.ts`, `packages/api/src/infra/agents/agentFailure.ts`, `packages/api/src/infra/agents/agentEnvironment.test.ts` e `packages/api/src/infra/agents/agentFailure.test.ts` (criar)
  - **Testes:** V-05b, V-03b, V-03c, V-03d, V-03h
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run src/infra/agents/agentEnvironment.test.ts src/infra/agents/agentFailure.test.ts` passa; typecheck sem erros
- [x] **04.3 — Runner do Claude Code**
  - **Arquivos:** `packages/api/src/infra/agents/claudeCodeRunner.ts` e `packages/api/src/infra/agents/claudeCodeRunner.test.ts` (criar)
  - **Testes:** V-05a, V-05c, V-05d, V-02e, V-03a
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run src/infra/agents/claudeCodeRunner.test.ts` passa; typecheck sem erros
- [x] **04.4 [P] — Runner do Codex, ou retirada do Codex do catálogo**
  - **Arquivos:** com "Codex: aprovado", `packages/api/src/infra/agents/codexRunner.ts` e `codexRunner.test.ts` (criar); com "Codex: retirado", `packages/api/src/application/agents/agentCatalog.ts` e `agentCatalog.test.ts`
  - **Testes:** V-05e
  - **Pronto quando:** o teste correspondente passa; typecheck sem erros
- [x] **04.5 — `ProviderRunner`: despacho, catálogo e encerramento**
  - **Arquivos:** `packages/api/src/infra/agents/providerRunner.ts` e `packages/api/src/infra/agents/providerRunner.test.ts` (criar)
  - **Testes:** V-03e, V-03i, V-04e, V-03l
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run src/infra/agents/` passa; typecheck sem erros

## Detalhes de implementação
- **Supervisor:**
  - `spawn` com `detached: true`, e kill do grupo com `process.kill(-pid)`: SIGTERM, e SIGKILL depois de 2 s;
  - saída limitada a 256 KB;
  - `cwd` num `mkdtemp`, apagado em `finally`.
- **Capability:** o Claude a recebe pelo `--mcp-config` gravado no diretório temporário com modo 0600; o Codex, pela variável indicada em `bearer_token_env_var`. Nunca como argumento visível em `ps`.
- **Esforço:** `low|medium|high` vai direto para `--effort` (Claude) e `-c model_reasoning_effort=` (Codex).
- **Detalhe da falha:**
  - Claude: "rode `claude` e faça login"; Codex: "rode `codex login`";
  - `provider_failed` leva o nome da CLI e o código de saída;
  - nunca o stderr bruto.
- **Ordem de classificação:** o código de saída vence o stdout. JSON válido com saída ≠ 0 é falha.
- **Provedor fora do catálogo:** `isolation_unavailable` antes do spawn (REQ-007).
- **Versão da CLI:** registrar `claude --version` / `codex --version` uma vez por processo, na primeira execução de cada provedor (R-05).
- **Os argumentos são uma constante** copiada de `v00-spike.md`; o teste compara com essa lista.

### Arquivos relevantes
- `docs/specs/agentes-locais-por-assinatura/v00-spike.md`: os argumentos, o formato da saída e os padrões de erro.
- `packages/api/runtime/acp/claudeModelFilter.mjs`: um exemplo de como a CLI do Claude já foi embrulhada no projeto (só referência, não reutilizar).

### Arquivos afetados
- `packages/api/src/application/agents/agentCatalog.ts`: só se o Codex for retirado.

### Decisões relacionadas
- DEC-01 (spec §17): as CLIs rodam em modo headless como processos filhos.
- DEC-04 (spec §17): o isolamento.

## Premissas
- Se a tarefa 01 terminou com "Codex: retirado", a 04.4 só ajusta o catálogo, e `codexRunner.ts` não é criado.

## Testes atribuídos
- [x] V-04a: `fakeCli` que dorme 10 s, com `timeoutMs: 500` → `timeout`, e nenhum PID do grupo vivo depois de 5 s.
- [x] V-04b: `signal.abort()` durante a execução → `cancelled`, e o processo morre em ≤ 5 s.
- [x] V-04c: o JSON é impresso e o processo não encerra → a saída é aproveitada e o processo é encerrado.
- [x] V-04d: um filho `sleep 60` do `fakeCli` também morre no kill do grupo.
- [x] V-02c: saída acima de 256 KB → `invalid_output`.
- [x] V-05b: com `DATABASE_URL`, `GITHUB_REPOSITORY_TOKEN_KEY` e `BETTER_AUTH_SECRET` em `process.env` → nenhuma das três no ambiente montado.
- [x] V-03b: fixture `not-signed-in` → `not_signed_in`, com o comando de login no detalhe.
- [x] V-03c: fixture `usage-limit` do Claude → `usage_limit`; o mesmo para o Codex, se aprovado.
- [x] V-03d: stderr desconhecido com saída ≠ 0 → `provider_failed`, com o nome da CLI e o código de saída.
- [x] V-03h: JSON válido no stdout seguido de erro de limite no stderr, com saída ≠ 0 → `usage_limit`.
- [x] V-05a: os argumentos do Claude são exatamente a lista do spike (`--tools ""`, `--strict-mcp-config`, `--setting-sources ""`, `--no-session-persistence`, `--model` e `--effort` da escolha).
- [x] V-05c: o diretório temporário não existe depois de um sucesso nem depois de uma falha.
- [x] V-05d: `structured_output` e um `result` textual divergente → vale só `structured_output`.
- [x] V-02e: saída 0 sem JSON estruturado → `invalid_output`.
- [x] V-03a: binário inexistente → `missing_binary`, com o nome da CLI no detalhe.
- [x] V-05e: aprovado → os argumentos do Codex são a lista do spike, e o JSON é lido de `--output-schema`; retirado → `AGENT_CATALOG` tem só `claude`.
- [x] V-03e: duas execuções simultâneas do `fakeCli` → terminam de forma independente.
- [x] V-03i: provedor fora do `AGENT_CATALOG` → `isolation_unavailable`, sem spawn.
- [x] V-04e: dois `run` ativos e `shutdown()` → os dois grupos morrem em ≤ 5 s, e as promessas rejeitam com `cancelled`.
- [x] V-03l: a primeira execução de cada provedor registra a versão da CLI uma vez.

## Critérios de sucesso
- Todas as mini-tarefas marcadas, cada uma com o "Pronto quando" executado.
- Todos os testes atribuídos implementados e passando.
- `pnpm --dir packages/api exec vitest run src/infra/agents/` verde, sem processo `fakeCli` sobrando (`pgrep -f fakeCli.mjs` vazio).
- Typecheck e lint de `packages/api` sem erros; nenhuma regra do AGENTS.md violada.

## Registro de execução

- **Base:** `v00-spike.md` (Codex aprovado) lido antes de codar; os argumentos do Claude e do Codex são as constantes de `claudeArguments.ts` e `codexArguments.ts`.
- **04.1:** `localAgentRunner.ts` (contrato; `AgentRunResult` ganhou `exitCode?` e `AgentRunError` ganhou `exitCode`, para o log da 06), `agentProcess.ts` (classe `ProcessRun`: grupo próprio, SIGTERM→SIGKILL em 2 s, 256 KB, prazo, abort, resposta completa de CLI que não encerra), `processGroup.ts` e `agentDirectory.ts` (extraídos para o limite de linhas), `test/fixtures/agents/fakeCli.mjs` + `fakeCliPath.ts`. 8 testes passam, entre eles prazo, abort, filho `sleep 60` morto e saída grande.
- **04.2:** `agentEnvironment.ts` (lista: PATH, HOME, LANG, LC_ALL, LC_CTYPE, USER, LOGNAME, TMPDIR, CLAUDE_CONFIG_DIR), `agentProviderInfo.ts`, `agentFailure.ts` com os padrões do spike. O detalhe da falha tem o formato "Claude Code: rode `claude` e faça login", e o de limite de uso é só o nome do provedor ("Claude Code"/"Codex"), que a UI usa na frase. Testes com as fixtures reais e as sintéticas.
- **04.3:** `claudeCodeRunner.ts`. A capability vai no `--mcp-config` 0600 dentro do diretório temporário, e o prompt pelo stdin. Só `structured_output` vale. Limitação conhecida: `--system-prompt` e `--json-schema` vão como argumento (limite de ~128 KB por argumento no Linux); a 06.1 deve manter as instruções abaixo disso.
- **04.4:** Codex aprovado, então `codexRunner.ts`, `codexArguments.ts` e `codexOutput.ts` foram criados (o catálogo não mudou). `CODEX_HOME` temporário com link para o `auth.json` real; sem `auth.json`, falha `not_signed_in` sem subir a CLI (evita os ~35 s de tentativas medidos no spike). Um evento `401 Unauthorized` encerra a execução cedo.
- **04.5:** `providerRunner.ts` (despacho, `isolation_unavailable` para provedor fora do catálogo, versão da CLI no log uma vez por provedor, `shutdown()` que cancela e espera as execuções ativas). `pnpm --dir packages/api exec vitest run src/infra/agents/`: 41 testes passam; nenhum processo `fakeCli` sobrou; typecheck limpo.

## Revisões

- 2026-11-22 · review-003 · APROVADO COM RESSALVAS · reviews/review-003.md (as revisões 001 e 002 reprovaram; todos os achados delas foram corrigidos e reconferidos na 003)
