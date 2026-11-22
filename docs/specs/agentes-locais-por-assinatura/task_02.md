---
status: completed
title: Configuração dos agentes por projeto na API
type: backend
complexity: medium
---

# Task 02: Configuração dos agentes por projeto na API

## Visão geral
Um admin lê e grava, via tRPC, o provedor, o modelo e o esforço de cada agente (Issue Author e Planejamento) de um projeto. A gravação valida contra o catálogo e detecta conflito de versão; um projeto sem configuração usa o padrão. Esta tarefa produz os tipos e o `resolve` que os gateways (tarefa 06) e a tela (tarefa 05) usam.

<critical>
- LEIA a spec (`spec.md`, §7, §14, §15 e DEC-05) e as regras do projeto (AGENTS.md, `.agents/rules/code-standards.md`) antes de começar. Leia as skills `layered-backend` e, para a 02.4, `trpc-nextjs`.
- FAÇA UMA MINI-TAREFA POR VEZ, na ordem. Só marque `[x]` depois de rodar o "Pronto quando" dela e ver passar.
- NÃO saia dos arquivos listados sem registrar o motivo no Registro de execução. Nada fora do escopo da spec.
- TESTES JUNTO COM O CÓDIGO: cada mini-tarefa implementa os testes atribuídos a ela.
- Ao começar, mude `status` para `in_progress` (aqui e em `_tasks.md`). Não marque `completed`: isso acontece depois da revisão aprovada.
</critical>

## Requisitos
- REQ-015: quando um admin salva, o sistema DEVE gravar e exibir a escolha; quando quem salva não é admin, o servidor DEVE recusar.
- REQ-016: um modelo fora da lista do provedor, ou um esforço diferente de Baixo, Médio ou Alto, DEVE ser recusado com "Escolha um modelo e um esforço disponíveis para este provedor.".
- REQ-017: um agente sem configuração salva DEVE usar Claude Code + `sonnet` + `low`.
- REQ-018: se a configuração mudou desde que a página foi aberta, a gravação DEVE ser recusada (conflito).
- REQ-019 (leitura): uma configuração salva com modelo fora do catálogo DEVE aparecer como indisponível.
- Regras de §7: catálogo (Claude Code: `sonnet`, `opus`, `haiku`; Codex: `gpt-6.1-sol`), no máximo uma configuração por agente e projeto, e a tabela de permissões.
- B-09: um admin que perde o papel com a página aberta tem a gravação recusada.

## Interfaces
- **Consome:** `AccessDao.isAdmin(userId)` e `ProjectDao.findVisible(actor, projectId, isAdmin)` (existentes).
- **Produz:**
  - em `packages/api/src/application/agents/agentTypes.ts`: `type AgentProvider = "claude" | "codex"`, `type AgentEffort = "low" | "medium" | "high"`, `type AgentKind = "issue_author" | "planning"` e `type AgentChoice = { provider: AgentProvider; model: string; effort: AgentEffort }`;
  - em `packages/api/src/application/agents/agentCatalog.ts`: `AGENT_CATALOG: Record<AgentProvider, readonly string[]>`, `DEFAULT_AGENT_CHOICE: AgentChoice` e `isCatalogChoice(choice: AgentChoice): boolean`;
  - `AgentSettingsDao`, com `list(projectId)`, `find(projectId, agent)` e `save(input: SaveAgentSettingInput) → StoredAgentSetting | null`, em que `null` significa conflito de versão;
  - `AgentSettingsService`, com `view(actor, projectId) → AgentSettingView[]`, `update(actor, input: UpdateAgentSettingInput) → AgentSettingView` e `resolve(projectId: string, agent: AgentKind) → Promise<{ choice: AgentChoice; available: boolean }>`;
  - `AgentSettingView = AgentChoice & { agent: AgentKind; version: number; isDefault: boolean; modelAvailable: boolean }`;
  - `projects.agentSettings.get({ projectId }) → { agents: AgentSettingView[]; catalog: typeof AGENT_CATALOG }`;
  - `projects.agentSettings.update({ projectId, agent, provider, model, effort, expectedVersion }) → AgentSettingView`, com os erros `FORBIDDEN`, `BAD_REQUEST` (reason `agent_settings_invalid`) e `CONFLICT` (reason `agent_settings_conflict`).

## Mini-tarefas

- [x] **02.1 — Tipos e catálogo dos agentes**
  - **Arquivos:** `packages/api/src/application/agents/agentTypes.ts`, `packages/api/src/application/agents/agentCatalog.ts` e `packages/api/src/application/agents/agentCatalog.test.ts` (criar)
  - **Testes:** V-08c, V-07f
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run src/application/agents/agentCatalog.test.ts` passa; `pnpm --dir packages/api typecheck` sem erros
- [x] **02.2 — Tabela `project_agent_settings` e DAO Drizzle**
  - **Arquivos:**
    - criar `packages/api/drizzle/0045_project_agent_settings.sql` e `packages/api/drizzle/0045_project_agent_settings_rollback.sql`;
    - alterar `packages/api/drizzle/meta/_journal.json` e `packages/api/test/databaseMigrations.ts`;
    - criar `packages/api/src/infra/database/schema/projectAgentSettings.ts` e alterar `packages/api/src/infra/database/schema.ts`;
    - criar `packages/api/src/application/database/dao/agentSettingsDao.ts` e `packages/api/src/infra/database/dao/projects/drizzleAgentSettingsDao.ts`;
    - criar `packages/api/test/agent-settings-dao.test.ts`.
  - **Testes:** V-08d, V-08f, V-08i
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/agent-settings-dao.test.ts test/migrations.test.ts` passa; `pnpm --dir packages/api db:migrate` aplica no banco de dev; typecheck sem erros
  - **Nota:** aplicar a migration no dev logo após editar o schema; schema sem migration quebra as rotas do worker.
- [x] **02.3 — Serviço com permissão, validação e padrão**
  - **Arquivos:** `packages/api/src/application/services/projects/agentSettingsService.ts`, `packages/api/src/application/services/projects/agentSettingsErrors.ts` e `packages/api/src/application/services/projects/agentSettingsService.test.ts` (criar)
  - **Testes:** V-07a, V-07b, V-08g, V-08j
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run src/application/services/projects/agentSettingsService.test.ts` passa; typecheck sem erros
- [x] **02.4 — Controller, procedures tRPC e composição**
  - **Arquivos:** `packages/api/src/controllers/agentSettingsController.ts` e `packages/api/src/schemas/agentSettings.ts` (criar), `packages/api/src/routers/projects.ts` e `packages/api/src/infra/composition.ts` (`createProductionAgentSettingsController`), `packages/api/test/agent-settings.test.ts` (criar)
  - **Testes:** V-08a, V-08b, V-08e, V-08h, V-08k
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/agent-settings.test.ts` passa; typecheck sem erros

## Detalhes de implementação
- Espelhar `updateDetails`:
  - router: `packages/api/src/routers/projects.ts:16`;
  - controller: `packages/api/src/controllers/projectsController.ts`;
  - serviço: `packages/api/src/application/services/projects/projectLifecycleService.ts`;
  - mapeamento de erro: `mapProjectError`.
- `expectedVersion: 0` significa "sem linha" e usa `insert ... on conflict do nothing`. Retorno vazio é conflito. Com versão ≥ 1, usar `update ... where version = expectedVersion`.
- A coluna `model` não tem check de catálogo no banco (spec §14). O catálogo é validado só na gravação, para que REQ-019 continue possível.
- `resolve` nunca lança por modelo fora do catálogo: devolve `available: false`.
- O catálogo nasce com o Codex. A 04.4 o retira se o spike reprovar.
- O banco de dev ainda guarda a 0045 revertida (`c78d44d`). Usar o nome distinto `0045_project_agent_settings` com timestamp novo no journal.

### Arquivos relevantes
- `packages/api/src/application/services/projects/projectDetails.test.ts`: o padrão de teste com `expectedVersion`.
- `packages/api/test/databaseMigrations.ts`: a lista `FEATURE_MIGRATIONS`, onde a migration nova é registrada.
- `packages/api/src/infra/database/schema.ts`: o ponto de export dos schemas.

### Arquivos afetados
- `packages/api/src/routers/projects.ts`: o sub-router `agentSettings`.
- `packages/api/src/infra/composition.ts`: a fábrica do controller.

### Decisões relacionadas
- DEC-05 (spec §17): tabela própria, em que a ausência de linha significa o padrão.

## Premissas
- As permissões seguem as das Configurações de hoje: só admin edita (spec P-04).

## Testes atribuídos
- [x] V-08c: `isCatalogChoice({ provider: "claude", model: "gpt-6.1-sol", effort: "low" })` → `false`; `claude`/`sonnet` → `true`.
- [x] V-07f: `DEFAULT_AGENT_CHOICE` é `claude`/`sonnet`/`low`.
- [x] V-08d: duas gravações com `expectedVersion: 1` → a segunda devolve `null`, e a linha guarda a primeira.
- [x] V-08f: o projeto com configuração é apagado → a linha some por cascade.
- [x] V-08i: `expectedVersion: 0` com a linha já existente → `null`.
- [x] V-07a: projeto sem linha → `resolve` devolve o padrão com `available: true`, e `view` marca `isDefault: true`.
- [x] V-07b: linha com `model: "gpt-antigo"` → `resolve` devolve `available: false`, e `view` devolve `modelAvailable: false`.
- [x] V-08g: `update` com Claude + `gpt-6.1-sol` → `AgentSettingsInvalidError`.
- [x] V-08j: `update` de quem não é admin → `ProjectAdminRequiredError` antes de chamar o DAO.
- [x] V-08a: um admin grava Planejamento → Codex/`gpt-6.1-sol`/`medium` com `expectedVersion: 0` → versão 1, e o Issue Author continua `isDefault: true`.
- [x] V-08b: quem não é admin chama `update` pela rota → `FORBIDDEN`, nada gravado.
- [x] V-08e: um membro chama `get` → recebe os dois agentes; quem está fora do projeto recebe o mesmo erro de visibilidade das Configurações.
- [x] V-08h: `effort: "max"` → `BAD_REQUEST` pelo schema de entrada.
- [x] V-08k: conflito do DAO → `CONFLICT` com reason `agent_settings_conflict`.

## Critérios de sucesso
- Todas as mini-tarefas marcadas, cada uma com o "Pronto quando" executado.
- Todos os testes atribuídos implementados e passando.
- A migration foi aplicada no banco de dev, e o rollback SQL desfaz a tabela.
- Typecheck e lint de `packages/api` sem erros; nenhuma regra do AGENTS.md violada.

## Registro de execução

- **02.1:** `agentTypes.ts`, `agentCatalog.ts` (+ teste). Catálogo mantém o Codex (spike: "Codex: aprovado"). `pnpm --dir packages/api exec vitest run src/application/agents/agentCatalog.test.ts`: 4 passam; typecheck limpo.
- **02.2:** migration `0045_project_agent_settings` (+ rollback), journal (`when` 1792611753324 > o último aplicado no dev), `test/databaseMigrations.ts`, schema Drizzle, `AgentSettingsDao` e `DrizzleAgentSettingsDao`. `updated_by` é anulável com `on delete set null`, igual às outras tabelas com autor. Integração: `agent-settings-dao.test.ts` + `migrations.test.ts` (7 passam). `pnpm db:migrate` aplicou no banco de dev (tabela conferida com `\d`); o rollback SQL foi testado dentro de uma transação revertida.
- **02.3:** `AgentSettingsService` (`view`, `update`, `resolve`), `agentSettingsErrors.ts`, `agentSettingsView.ts` (arquivo extra para respeitar o limite de linhas). 6 testes unitários passam.
- **02.4:** `AgentSettingsController`, `schemas/agentSettings.ts`, sub-router `projects.agentSettings`, `createProductionAgentSettingsController` e `createAgentSettingsService` (a 06 reusa) em `composition.ts`. Desvio: `trpc.ts` ganhou uma linha para expor `data.reason` dos erros `AgentSettingsError` (`agent_settings_invalid`/`agent_settings_conflict`), senão a UI não distinguiria o conflito. `test/agent-settings.test.ts`: 7 passam (V-08a, b, e, h, k, B-09 e a mensagem de catálogo). Suíte unitária completa de `packages/api`: 460 passam; typecheck limpo.

## Revisões

- 2026-11-22 · review-003 · APROVADO COM RESSALVAS · reviews/review-003.md (as revisões 001 e 002 reprovaram; todos os achados delas foram corrigidos e reconferidos na 003)
