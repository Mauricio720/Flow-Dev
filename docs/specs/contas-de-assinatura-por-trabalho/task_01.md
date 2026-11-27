---
status: completed
title: Migration, schema e DAO das contas
type: backend
complexity: high
---

# Task 01: Migration, schema e DAO das contas

## Visão geral
Cria a persistência da feature: as tabelas `agent_accounts` e `task_agent_accounts`, a coluna `task_terminal_sessions.agent_account_id` e o DAO das contas. Todo o resto (serviço, escolha no trabalho, worker) depende desses contratos.

<critical>
- LEIA a spec (`spec.md`) e as regras do projeto (AGENTS.md/CLAUDE.md, `.agents/rules/code-standards.md`) antes de começar.
- FAÇA UMA MINI-TAREFA POR VEZ, na ordem. Só marque `[x]` depois de rodar o "Pronto quando" dela e ver passar.
- NÃO saia dos arquivos listados sem registrar o motivo no Registro de execução. Nada fora do escopo da spec.
- TESTES JUNTO COM O CÓDIGO: cada mini-tarefa implementa os testes atribuídos a ela, seguindo a skill de testes do projeto (`software-testing`). Isso quer dizer: asserção sobre o efeito observável e específico, nada de `toBeTruthy` ou de só checar que não lança exceção; valor esperado tirado da spec, nunca recalculado a partir do código; dublês só em dependências lentas, variáveis ou externas; relógio e aleatoriedade controlados. Em bug, reproduza antes de corrigir.
- Ao começar, mude `status` para `in_progress` (aqui e em `_tasks.md`). Mude para `completed` só quando todas as mini-tarefas estiverem marcadas e os critérios de sucesso tiverem sido comprovados por comando. A revisão contra a spec acontece uma vez, depois de todas as tarefas: não a espere aqui, mas não marque nada que não tenha prova, porque ela vai conferir.
</critical>

## Requisitos
- Spec §14: tabelas, colunas, checks, índice único parcial e chaves `restrict`/`cascade`/`set null` exatamente como descritos.
- Spec §20: migration opcional (colunas novas anuláveis), rollback que apaga as tabelas e a coluna; sem preenchimento retroativo (DEC-04).
- REQ-004 (parte de dados): unicidade de `lower(label)` por dona, máquina e provedor, só entre contas não removidas.
- REQ-009/REQ-010 (parte de dados): remoção lógica por `removed_at`; contagem de sessões não encerradas por conta.
- Invariantes §7: uma conta pertence a uma pessoa, um provedor e uma máquina; um trabalho tem no máximo uma escolha por provedor (chave `(task_id, provider)`).

## Interfaces
- **Consome:** `projectLocalCheckouts` (`packages/api/src/infra/database/schema/projectLocalCheckouts.ts`) como padrão de tabela pessoal por máquina; `Database` do Drizzle; `TerminalSessionRecord` em `packages/api/src/application/database/dao/terminalSessionDao.ts`.
- **Produz:**
  - `packages/api/src/application/agent-accounts/agentAccountTypes.ts`: `AgentAccountProvider = "claude" | "codex"`, `AgentAccountStatus = "pending_login" | "logged_in" | "logged_out" | "check_failed"`, `AgentAccountRecord = { id; ownerUserId; hostId; provider; label; status; identity: string | null; plan: string | null; codexCatalog: CodexStatus | null; checkedAt: Date | null; removedAt: Date | null; version: number; createdAt: Date }`.
  - `packages/api/src/application/agent-accounts/agentAccountDao.ts` (porta `AgentAccountDao`): `insert({ ownerUserId, hostId, provider, label })`, `listActive({ ownerUserId, hostId })`, `findById(id)`, `rename({ id, label, version })` → registro ou `null` quando a versão é velha, `saveCheck({ id, status, identity, plan, codexCatalog?, checkedAt })`, `markRemoved({ id, at })`, `countOpenSessions(id)`. Violação do índice único sai como erro tipado `AgentAccountLabelTaken`.
  - `TerminalSessionRecord.agentAccountId: string | null` e o campo correspondente em `CreateTerminalSessionInput`.
  - Tabelas Drizzle `agentAccounts` e `taskAgentAccounts` em `packages/api/src/infra/database/schema/agentAccounts.ts`.

## Mini-tarefas

- [x] **01.1 — Migration 0057 com rollback e registro**
  - **Arquivos:** `packages/api/drizzle/0057_agent_accounts.sql` (criar), `packages/api/drizzle/0057_agent_accounts_rollback.sql` (criar), `packages/api/drizzle/meta/_journal.json`, `packages/api/test/databaseMigrations.ts` (`FEATURE_MIGRATIONS`), `packages/api/src/infra/database/schema/agentAccounts.ts` (criar), export no índice de schema, `packages/api/test/agent-accounts-migration.test.ts` (criar)
  - **Testes:** V-14a
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/agent-accounts-migration.test.ts` passa; `pnpm --dir packages/api typecheck` sem erros
  - **Nota:** confira antes que a 0057 está livre (`ls packages/api/drizzle`); a 0056 é da Issue #7. Siga o formato de `0055_route_switches.sql` e do seu rollback, e o teste de migration mais próximo em `packages/api/test/` (use `applyMigrationsAfter`).
- [x] **01.2 — Porta e `DrizzleAgentAccountDao`**
  - **Arquivos:** `packages/api/src/application/agent-accounts/agentAccountTypes.ts` (criar), `packages/api/src/application/agent-accounts/agentAccountDao.ts` (criar), `packages/api/src/infra/database/dao/agent-accounts/drizzleAgentAccountDao.ts` (criar; divida em `agentAccountWrites.ts`/`agentAccountReads.ts` se passar de 100 linhas), `packages/api/test/agent-account-dao.test.ts` (criar)
  - **Testes:** V-14b
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/agent-account-dao.test.ts` passa; `pnpm --dir packages/api typecheck` sem erros
- [x] **01.3 — `agent_account_id` na sessão**
  - **Arquivos:** `packages/api/src/infra/database/schema/tasks/terminalTables.ts`, `packages/api/src/application/database/dao/terminalSessionDao.ts`, `packages/api/src/infra/database/dao/terminal/terminalSessionWrites.ts` e o mapeamento de leitura em `drizzleTerminalSessionDao.ts`, `packages/api/test/agent-account-session-column.test.ts` (criar)
  - **Testes:** V-14c
  - **Pronto quando:** teste acima passa; `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/session-resume.test.ts` continua passando; `pnpm --dir packages/api typecheck` sem erros
  - **Nota:** outra sessão mexe em `terminalTables.ts` (Issue #7). Não reverta mudanças alheias.

## Detalhes de implementação
Migrations depois da 0011 são SQL escrito à mão, com `_rollback.sql` irmão e sem snapshot. Toda migration nova entra em `drizzle/meta/_journal.json` e em `FEATURE_MIGRATIONS`. O DAO segue o padrão de `packages/api/src/infra/database/dao/` (classe `Drizzle…Dao` que implementa a porta de `application/`). Para o mapeamento de erro de unicidade, procure como o DAO de clones locais trata `23505`.

### Arquivos relevantes
- `packages/api/drizzle/0055_route_switches.sql` e `_rollback.sql`: formato atual.
- `packages/api/src/infra/database/schema/projectLocalCheckouts.ts`: tabela pessoal por `host_id`, padrão de DEC-05.
- `packages/api/src/application/terminal/codexCatalog.ts`: tipo `CodexStatus`, o formato de `codex_catalog`.
- `packages/api/test/database.ts` e `test/databaseTemplate.ts`: `testDatabase()` e o template migrado.

### Arquivos afetados
- `packages/api/src/infra/database/schema/tasks/terminalTables.ts`: coluna `agentAccountId` anulável com FK `restrict`.
- `packages/api/src/application/database/dao/terminalSessionDao.ts`: `agentAccountId` no registro e na criação.

### Decisões relacionadas
- DEC-02 (spec §17): a escolha fica em `task_agent_accounts (task_id, provider)`; escolher o login padrão apaga a linha.
- DEC-04: sem linha para o login padrão; `null` na sessão é o login padrão.
- DEC-05: `owner_user_id` + `host_id`.

## Premissas
- Migration 0057 (decisão do usuário em 2026-11-25). Se ela estiver ocupada, use a próxima livre e corrija a spec §14 e o `_tasks.md`.

## Testes atribuídos
- [ ] V-14a: banco migrado até a 0056 → aplicar a 0057 cria `agent_accounts`, `task_agent_accounts` e `task_terminal_sessions.agent_account_id` (anulável, sessões existentes ficam `null`); aplicar o rollback remove as duas tabelas e a coluna, e as sessões continuam legíveis · Postgres descartável real.
- [ ] V-14b: dona A, host H, Claude: inserir "Pessoal" e depois "pessoal" → `AgentAccountLabelTaken`; o mesmo nome no Codex ou para outra dona → aceito; marcar "Pessoal" como removida e inserir "Pessoal" de novo → aceito; `rename` com versão velha → `null`; `listActive` não traz removidas; `countOpenSessions` conta só sessões não encerradas daquela conta; apagar a conta com sessão referenciando → recusado pelo `restrict` · Postgres real.
- [ ] V-14c: criar sessão com `agentAccountId` → o registro lido traz o mesmo id; criar sem → `agentAccountId: null` · Postgres real.

## Critérios de sucesso
- Todas as mini-tarefas marcadas, cada uma com o "Pronto quando" executado.
- Todos os testes atribuídos implementados e passando.
- Migration aplica e reverte num banco descartável na ordem do journal.
- `pnpm --dir packages/api test:integration` completo passa ao fechar a tarefa; typecheck e lint do pacote sem erros.

## Registro de execução
- 01.1 — `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/agent-accounts-migration.test.ts` e `pnpm --dir packages/api typecheck` — passaram.
- 01.2 — `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/agent-account-dao.test.ts` e `pnpm --dir packages/api typecheck` — passaram.
- 01.3 — `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/agent-account-session-column.test.ts`, `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/session-resume.test.ts` e `pnpm --dir packages/api typecheck` — passaram.
- Fechamento — `pnpm --dir packages/api test:integration` — 199 arquivos passaram, 2 pulados; 901 testes passaram, 5 pulados. `pnpm lint` passou; o pacote API não declara script `lint`. As alterações existentes da Issue #7 em `terminalTables.ts`, journal e suporte de migrations foram preservadas.
