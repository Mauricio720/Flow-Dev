---
status: completed
title: Diretório da conta e inspetor de login
type: backend
complexity: high
---

# Task 02: Diretório da conta e inspetor de login

## Visão geral
Entrega as duas peças de infraestrutura que tocam a máquina: o diretório privado de cada conta (criação `0700`, links da configuração pessoal, logout e remoção) e o inspetor que pergunta ao CLI se a conta está logada. Também prepara `buildAgentEnvironment` para sobrescrever `CLAUDE_CONFIG_DIR`/`CODEX_HOME`. Não depende do banco e roda em paralelo com a task 01.

<critical>
- LEIA a spec (`spec.md`) e as regras do projeto (AGENTS.md/CLAUDE.md, `.agents/rules/code-standards.md`) antes de começar.
- FAÇA UMA MINI-TAREFA POR VEZ, na ordem. Só marque `[x]` depois de rodar o "Pronto quando" dela e ver passar.
- NÃO saia dos arquivos listados sem registrar o motivo no Registro de execução. Nada fora do escopo da spec.
- TESTES JUNTO COM O CÓDIGO: cada mini-tarefa implementa os testes atribuídos a ela, seguindo a skill de testes do projeto (`software-testing`). Isso quer dizer: asserção sobre o efeito observável e específico, nada de `toBeTruthy` ou de só checar que não lança exceção; valor esperado tirado da spec, nunca recalculado a partir do código; dublês só em dependências lentas, variáveis ou externas; relógio e aleatoriedade controlados. Em bug, reproduza antes de corrigir.
- Ao começar, mude `status` para `in_progress` (aqui e em `_tasks.md`). Mude para `completed` só quando todas as mini-tarefas estiverem marcadas e os critérios de sucesso tiverem sido comprovados por comando. A revisão contra a spec acontece uma vez, depois de todas as tarefas: não a espere aqui, mas não marque nada que não tenha prova, porque ela vai conferir.
</critical>

## Requisitos
- NFR-01: diretório `0700` em `$XDG_STATE_HOME/flow-dev/agent-accounts/<id>/` (padrão `~/.local/state/…`, mesma raiz de `terminalStateRoot.ts`), fora de checkouts e da pasta de sessões. Nunca ler, copiar ou registrar credenciais.
- REQ-026 / DEC-03: a cada `ensure`, links simbólicos só para os itens da lista fixa que existem no diretório padrão.
  - Claude: `settings.json`, os `*.md` da raiz, `rules/`, `skills/`, `agents/`, `commands/`, `hooks/`, `plugins/`, `output-styles/`.
  - Codex: `config.toml`, `AGENTS.md`, `prompts/`, `skills/`, `rules/`.
  - Nunca: credenciais (`.credentials.json`, `auth.json`), histórico, `projects/`, `sessions/`, `.claude.json`.
- B-06: diretório apagado fora do Flow Dev é recriado vazio (com os links) no próximo `ensure`.
- REQ-009 (parte de máquina) / B-07: `logoutAndDelete` roda o logout do CLI com o diretório da conta e apaga o diretório; se o logout falhar, o diretório é apagado mesmo assim e a falha é devolvida para o serviço registrar.
- REQ-005, REQ-006, DEC-06: `claude auth status --json` (logada só se `loggedIn` e `authMethod` de assinatura `claude.ai`; devolve `email` e `subscriptionType`) e `codex login status` (mesma leitura de `codexCatalogTransport.ts`).
- B-04: CLI ausente → `check_failed` com "O Claude Code não foi encontrado nesta máquina" / "O Codex não foi encontrado nesta máquina".
- Tempo limite de 10 s por consulta → `check_failed` (o valor é injetável no teste).
- Spec §18: diretório derivado do `id` no servidor (recusar id que não seja UUID), `shell: false`, ambiente de `buildAgentEnvironment`.
- Não muda (§9): sem `credentialHome`, o ambiente dos runners (Issue Author, Planejamento) fica igual.

## Interfaces
- **Consome:** `terminalStateRoot.ts` (raiz do estado), `buildAgentEnvironment` (`packages/api/src/infra/agents/agentEnvironment.ts`), `ToolLocator` (`application/terminal/toolLocator.ts`), `uuidPattern.ts`, leitura de login do Codex em `infra/terminal/codex/codexCatalogTransport.ts`.
- **Produz:**
  - `packages/api/src/application/agent-accounts/agentLoginInspector.ts`: `interface AgentLoginInspector { inspect(input: { provider: AgentAccountProvider; home: string }): Promise<LoginInspection> }`, com `LoginInspection = { status: "logged_in" | "logged_out" | "check_failed"; identity: string | null; plan: string | null; detail: string | null }`.
  - `packages/api/src/application/agent-accounts/agentAccountHome.ts`: `interface AgentAccountHome { ensure(account: { id: string; provider: AgentAccountProvider }): Promise<string>; pathOf(account): string; logoutAndDelete(account): Promise<{ logout: "ok" | "failed" }> }`.
  - `loginCommandOf(provider, home)`: `CLAUDE_CONFIG_DIR='<dir>' claude auth login` ou `CODEX_HOME='<dir>' codex login` (spec §16).
  - `packages/api/src/infra/agents/fileAgentAccountHome.ts`, `cliAgentLoginInspector.ts` (+ arquivos por provedor se passar de 100 linhas).
  - `buildAgentEnvironment(source, extra)` aceitando `CODEX_HOME` na lista e a sobrescrita via `extra`; helper `credentialEnvironment(provider, home): Record<string, string>`.
  - Dublê para testes e e2e: `FakeAgentLoginInspector` controlado pela variável `FLOW_DEV_AGENT_LOGIN_FAKE` (`logged_in` | `logged_out`), aceita só em ambiente de teste, como `FLOW_DEV_SESSION_FAKE_SCRIPT` em `scriptedRunnerConfig.ts`.
- Os tipos `AgentAccountProvider` vêm de `application/agent-accounts/agentAccountTypes.ts`. Se a task 01 ainda não tiver criado esse arquivo, crie-o aqui com o conteúdo definido em `task_01.md` (Interfaces) e registre no Registro de execução.

## Mini-tarefas

- [x] **02.1 — Portas e `FileAgentAccountHome` (diretório `0700` e links de DEC-03)**
  - **Arquivos:** `packages/api/src/application/agent-accounts/agentAccountHome.ts` (criar), `packages/api/src/application/agent-accounts/loginCommand.ts` (criar), `packages/api/src/infra/agents/fileAgentAccountHome.ts` (criar), `packages/api/src/infra/agents/accountConfigLinks.ts` (criar: a lista fixa), `packages/api/src/infra/agents/fileAgentAccountHome.test.ts` (criar)
  - **Testes:** V-04a, V-04b, V-04c, V-04d, V-04f
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run src/infra/agents/fileAgentAccountHome.test.ts` passa
- [x] **02.2 — Inspetor do Claude Code**
  - **Arquivos:** `packages/api/src/application/agent-accounts/agentLoginInspector.ts` (criar), `packages/api/src/infra/agents/cliAgentLoginInspector.ts` (criar), `packages/api/src/infra/agents/claudeLoginStatus.ts` (criar: interpretação do JSON), `packages/api/test/fixtures/claude-auth-status/` (criar: `logged-in.json`, `api-key.json`, `logged-out.json`), `packages/api/src/infra/agents/claudeLoginStatus.test.ts` (criar), `packages/api/test/agent-login-inspector.test.ts` (criar)
  - **Testes:** V-03a, V-03b, V-03c
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run src/infra/agents/claudeLoginStatus.test.ts` e `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/agent-login-inspector.test.ts` passam
  - **Nota:** o caso V-03a roda o `claude` real num diretório temporário vazio (sem login, sem custo). Se o CLI não estiver no PATH, o teste deve pular com mensagem explícita, e isso fica registrado; os casos com JSON gravado não dependem do CLI.
- [x] **02.3 — Inspetor do Codex, tempo limite e CLI ausente; dublê de teste**
  - **Arquivos:** `packages/api/src/infra/agents/codexLoginStatus.ts` (criar), `packages/api/src/infra/agents/cliAgentLoginInspector.ts`, `packages/api/src/infra/agents/fakeAgentLoginInspector.ts` (criar), `packages/api/test/agent-login-inspector.test.ts`
  - **Testes:** V-03d, V-03e, V-03f
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/agent-login-inspector.test.ts` passa
- [x] **02.4 — Sobrescrita de `CLAUDE_CONFIG_DIR`/`CODEX_HOME` no ambiente**
  - **Arquivos:** `packages/api/src/infra/agents/agentEnvironment.ts`, `packages/api/src/infra/agents/agentEnvironment.test.ts`, `packages/api/src/infra/agents/fileAgentAccountHome.ts` (logout com `logoutAndDelete`), `packages/api/src/infra/agents/fileAgentAccountHome.test.ts`
  - **Testes:** V-04e, V-10a
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run src/infra/agents/` passa (inclui as suítes atuais de runners); `pnpm --dir packages/api typecheck` sem erros

## Detalhes de implementação
Espelhe `terminalStateRoot.ts` para a raiz e `codexProcess.ts`/`agentProcess.ts` para iniciar processos (`spawn` com `shell: false`, matar o grupo no tempo limite). O logout é `claude auth logout` / `codex logout` com o ambiente da conta. Os links são `fs.symlink` absolutos para o diretório padrão (P-02: `CLAUDE_CONFIG_DIR` ou `~/.claude`; `CODEX_HOME` ou `~/.codex`). Um link já existente e correto não é recriado; um link para item que sumiu do padrão é removido.

### Arquivos relevantes
- `packages/api/src/infra/terminal/terminalStateRoot.ts`: raiz `XDG_STATE_HOME`.
- `packages/api/src/infra/agents/agentEnvironment.ts`: lista de variáveis permitidas (hoje já tem `CLAUDE_CONFIG_DIR`, não tem `CODEX_HOME`).
- `packages/api/src/infra/terminal/codex/codexCatalogTransport.ts`: leitura atual do login do Codex.
- `packages/api/src/infra/agents/agentProviderInfo.ts`: rótulos "Claude Code"/"Codex".

### Arquivos afetados
- `packages/api/src/infra/agents/agentEnvironment.ts`: `CODEX_HOME` permitido; `extra` sobrescreve.

### Decisões relacionadas
- DEC-01: o Flow Dev só cria o diretório e pergunta ao CLI.
- DEC-03: lista fixa de links.
- DEC-06: comandos de verificação.

## Premissas
- Sem o spike manual V-01, não há prova de que o CLI segue cada link nem de que não pede onboarding num diretório novo. Os testes aqui provam o sistema de arquivos; o usuário confere o resto no teste manual final.

## Testes atribuídos
- [ ] V-04a: `ensure` de uma conta nova → diretório `<raiz>/agent-accounts/<id>` existe com modo `0700` · sistema de arquivos temporário real.
- [ ] V-04b: diretório padrão do Claude com `settings.json`, `CLAUDE.md`, `skills/` e `hooks/` (sem `plugins/`) → a conta recebe links para exatamente esses quatro, apontando para o padrão; no Codex com `config.toml` e `AGENTS.md` → só esses dois · FS temporário.
- [ ] V-04c: padrão com `.credentials.json`, `.claude.json`, `projects/`, `history.jsonl` (Claude) e `auth.json`, `sessions/` (Codex) → nenhum deles aparece no diretório da conta, nem como link nem como cópia · FS temporário.
- [ ] V-04d: apagar o diretório da conta e chamar `ensure` → diretório recriado vazio, `0700`, com os links (B-06) · FS temporário.
- [ ] V-04e: `logoutAndDelete` com um executável falso de CLI no PATH que registra `argv` e `CLAUDE_CONFIG_DIR` → logout chamado com o diretório da conta, diretório apagado, `{ logout: "ok" }`; com o executável saindo com código 1 → diretório apagado mesmo assim e `{ logout: "failed" }` (B-07) · FS temporário + processo real.
- [ ] V-04f: `pathOf({ id: "../x" })` ou id que não é UUID → lança erro e nada é criado fora da raiz · FS temporário.
- [ ] V-03a: `claude auth status --json` real num `CLAUDE_CONFIG_DIR` vazio → `{ status: "logged_out", identity: null, plan: null }` · CLI real.
- [ ] V-03b: JSON gravado com `loggedIn: true`, `authMethod: "claude.ai"`, `email: "ana@exemplo.com"`, `subscriptionType: "max"` → `{ status: "logged_in", identity: "ana@exemplo.com", plan: "max" }` · interpretação pura.
- [ ] V-03c: JSON gravado com `loggedIn: true` e `authMethod` de chave de API → `logged_out` (login por API key não conta como assinatura) · interpretação pura.
- [ ] V-03d: PATH sem `claude`/`codex` → `check_failed` com "O Claude Code não foi encontrado nesta máquina" / "O Codex não foi encontrado nesta máquina" (B-04) · processo real.
- [ ] V-03e: `codex login status` real num `CODEX_HOME` vazio → `logged_out` (pula com mensagem se o Codex não estiver instalado) · CLI real.
- [ ] V-03f: executável falso que dorme além do limite injetado (ex.: 200 ms) → `check_failed` e o processo é encerrado · processo real, limite injetado.
- [ ] V-10a: `buildAgentEnvironment(env)` sem `extra` → `CLAUDE_CONFIG_DIR` igual ao de origem e sem `CODEX_HOME` novo; com `credentialEnvironment("claude", dir)` → `CLAUDE_CONFIG_DIR = dir`; com `("codex", dir)` → `CODEX_HOME = dir`; as suítes atuais de `claudeCodeRunner`/`codexRunner` continuam passando sem mudança · unitário.

## Critérios de sucesso
- Todas as mini-tarefas marcadas, cada uma com o "Pronto quando" executado.
- Todos os testes atribuídos implementados e passando.
- Nenhum código lê o conteúdo de arquivo de credencial (procure por `.credentials.json`/`auth.json`: só aparecem na lista de exclusão e nos testes).
- `pnpm --dir packages/api test` e `test:integration` completos passam ao fechar a tarefa; typecheck e lint sem erros.

## Registro de execução
- 02.1 — `pnpm --dir packages/api exec vitest run src/infra/agents/fileAgentAccountHome.test.ts` — passou (2 testes; modos, links permitidos, exclusões, recriação e id inválido).
- 02.2 — `pnpm --dir packages/api exec vitest run src/infra/agents/claudeLoginStatus.test.ts`, `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/agent-login-inspector.test.ts` e `pnpm --dir packages/api typecheck` — passaram; CLI Claude real encontrado e retornou `logged_out` em diretório vazio.
- 02.3 — `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/agent-login-inspector.test.ts` e `pnpm --dir packages/api typecheck` — passaram; o CLI Codex real respondeu `logged_out` em diretório vazio, e timeout, CLI ausente e fake restrito a teste foram cobertos.
- 02.4 — `pnpm --dir packages/api exec vitest run src/infra/agents/`, `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/agent-login-inspector.test.ts` e `pnpm --dir packages/api typecheck` — passaram; a primeira tentativa de typecheck revelou retorno union incompatível no helper, corrigido com retorno `Record<string, string>` e então os mesmos comandos passaram.
- Fechamento — `pnpm --dir packages/api test` — 144 arquivos e 902 testes passaram; `pnpm --dir packages/api test:integration` — 200 arquivos passaram, 2 pulados; 907 testes passaram, 5 pulados. O pacote API não declara script `lint`; `pnpm lint` do monorepo só roda lint nos pacotes que o declaram.

### Ajuste posterior (task 07.3, 2026-11-26)
- Por decisão do usuário, o dublê `FLOW_DEV_AGENT_LOGIN_FAKE` passou a ser recusado só com `NODE_ENV=production`, e não mais fora de `NODE_ENV=test`, porque o servidor do e2e é um `next dev`. O V-03f foi ajustado para essa regra. Detalhes no registro da task 07.
