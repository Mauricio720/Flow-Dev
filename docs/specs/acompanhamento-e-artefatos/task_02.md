---
status: completed
title: Migration 0047 e schema do acompanhamento
type: backend
complexity: medium
---

# Task 02: Migration 0047 e schema do acompanhamento

## Visão geral
Cria o modelo de dados da spec: as colunas novas de `task_terminal_sessions` e as tabelas `task_terminal_events`, `task_artifacts` e `task_artifact_versions`, com rollback. Também expõe o schema Drizzle e os tipos de estado e de evento que as tarefas 03 a 05 consomem. As sessões da Spec A passam a ter `status`, e a falha de disparo grava `launch_failed`.

<critical>
- LEIA a spec (`spec.md`: §7.2, §14, §20) e as regras do projeto (AGENTS.md/CLAUDE.md, `.agents/rules/code-standards.md`) antes de começar. Leia a skill `layered-backend`.
- FAÇA UMA MINI-TAREFA POR VEZ, na ordem. Só marque `[x]` depois de rodar o "Pronto quando" dela e ver passar.
- NÃO saia dos arquivos listados sem registrar o motivo no Registro de execução. Nada fora do escopo da spec.
- TESTES JUNTO COM O CÓDIGO: cada mini-tarefa implementa os testes atribuídos a ela.
- Ao começar, mude `status` para `in_progress` (aqui e em `_tasks.md`). Mude para `completed` só quando todas as mini-tarefas estiverem marcadas e os critérios de sucesso tiverem sido comprovados por comando. A revisão contra a spec acontece uma vez, depois de todas as tarefas: não a espere aqui, mas não marque nada que não tenha prova, porque ela vai conferir.
</critical>

## Requisitos
- §14: migration `0047_terminal_tracking_artifacts.sql`, com rollback `0047_terminal_tracking_artifacts_rollback.sql`, exatamente com as colunas, checks, uniques, índices e FKs descritos.
- §14 "Dados existentes": as sessões da Spec A ficam `opening`; as que têm `launch_failed_at` preenchido migram para `launch_failed`.
- §7.2: os seis estados (`opening`, `running`, `waiting`, `unconfirmed`, `ended`, `launch_failed`), com `ended` e `launch_failed` finais.
- §20 Rollback: apaga as colunas novas e as três tabelas.
- §7.8 e §7.5: `byte_size` de uma versão até 1 MB (1 048 576 bytes).

## Interfaces
- **Consome:**
  - `taskTerminalSessions` em `packages/api/src/infra/database/schema/tasks/terminal.ts`;
  - `TerminalSessionRecord` e `TerminalSessionDao.markLaunchFailed` em `packages/api/src/application/database/dao/terminalSessionDao.ts`;
  - `FEATURE_MIGRATIONS` em `packages/api/test/databaseMigrations.ts`.
- **Produz:**
  - `packages/api/src/application/terminal/terminalSessionStatus.ts`:
    - `TERMINAL_SESSION_STATUSES = ["opening","running","waiting","unconfirmed","ended","launch_failed"] as const`;
    - `TerminalSessionStatus`;
    - `FINAL_SESSION_STATUSES: ReadonlySet<TerminalSessionStatus>` (`ended`, `launch_failed`);
    - `isActiveSession(status): boolean`;
  - `packages/api/src/application/terminal/terminalEventKind.ts`:
    - `TERMINAL_EVENT_KINDS = ["started","prompt","skill","file_edit","command","waiting","attention","ended"] as const`;
    - `TerminalEventKind`;
  - `packages/api/src/application/terminal/artifactCaptureTrigger.ts`: `ARTIFACT_CAPTURE_TRIGGERS = ["stop","session_end"] as const`, `ArtifactCaptureTrigger`, `MAX_ARTIFACT_BYTES = 1_048_576`;
  - tabelas Drizzle:
    - `taskTerminalEvents` (`packages/api/src/infra/database/schema/tasks/terminalEvents.ts`);
    - `taskArtifacts` e `taskArtifactVersions` (`packages/api/src/infra/database/schema/tasks/artifacts.ts`);
    - as três exportadas por `packages/api/src/infra/database/schema.ts`;
  - `TerminalSessionRecord` ganha `status: TerminalSessionStatus`, `tokenHash: string | null`, `claudeSessionId: string | null`, `endReason: string | null`, `activeSkill: string | null`, `droppedEvents: number`, `startedAt: Date | null`, `endedAt: Date | null` e `lastCaptureAt: Date | null`.

## Mini-tarefas

- [x] **02.1 — Migration 0047, rollback e testes da migration**
  - **Arquivos:**
    - criar `packages/api/drizzle/0047_terminal_tracking_artifacts.sql` e `packages/api/drizzle/0047_terminal_tracking_artifacts_rollback.sql`;
    - alterar `packages/api/drizzle/meta/_journal.json`, como a 0046 fez;
    - alterar `packages/api/test/databaseMigrations.ts` (acrescentar `"0047_terminal_tracking_artifacts"` em `FEATURE_MIGRATIONS`);
    - criar `packages/api/test/terminal-tracking-migration.test.ts`.
  - **Testes:** MIG-a, MIG-b, MIG-c, MIG-d, MIG-e
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/terminal-tracking-migration.test.ts test/terminal-schema.test.ts` passa.
  - **Nota:**
    - para MIG-a, use `applyCurrentMigrations(client, "0047_terminal_tracking_artifacts")` e insira as sessões da Spec A antes; depois, `applyMigration`;
    - os nomes de check e índice seguem o padrão `task_terminal_sessions_route_check`.
- [x] **02.2 — Schema Drizzle, tipos de estado e `launch_failed` gravado**
  - **Arquivos:**
    - alterar `packages/api/src/infra/database/schema/tasks/terminal.ts` (colunas novas da sessão);
    - criar `packages/api/src/infra/database/schema/tasks/terminalEvents.ts` e `packages/api/src/infra/database/schema/tasks/artifacts.ts`;
    - alterar `packages/api/src/infra/database/schema.ts`;
    - criar `packages/api/src/application/terminal/terminalSessionStatus.ts`, `packages/api/src/application/terminal/terminalEventKind.ts` e `packages/api/src/application/terminal/artifactCaptureTrigger.ts`;
    - alterar `packages/api/src/application/database/dao/terminalSessionDao.ts`, `packages/api/src/infra/database/dao/terminal/drizzleTerminalSessionDao.ts` e `packages/api/src/infra/database/dao/terminal/terminalSessionWrites.ts` (`markLaunchFailed` grava também `status = 'launch_failed'`);
    - alterar `packages/api/test/terminal-open.test.ts`, no caso de falha de disparo já existente.
  - **Testes:** MIG-f
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/terminal-open.test.ts test/terminal-schema.test.ts` passa; `pnpm --dir packages/api typecheck` sem erros.

## Detalhes de implementação
- **Padrão a espelhar:** `packages/api/drizzle/0046_terminal_execution.sql` e o rollback dele; `schema/tasks/terminal.ts` para o estilo de `check`, `uniqueIndex` e `index`.
- **SQL da 0047, resumido da §14:**
  - `ALTER TABLE task_terminal_sessions ADD COLUMN status text NOT NULL DEFAULT 'opening'`, com o check dos seis estados, seguido de `UPDATE … SET status = 'launch_failed' WHERE launch_failed_at IS NOT NULL`;
  - `token_hash text UNIQUE NULL`;
  - `claude_session_id`, `end_reason` e `active_skill text NULL`;
  - `dropped_events integer NOT NULL DEFAULT 0`;
  - `started_at`, `ended_at` e `last_capture_at timestamptz NULL`;
  - `task_terminal_events`:
    - `id uuid pk default gen_random_uuid()`;
    - `session_id` FK para `task_terminal_sessions(id)`, `ON DELETE CASCADE`;
    - `kind`, com check dos oito tipos;
    - `summary text NOT NULL`, com check `char_length <= 500`;
    - `path text NULL`, `skill text NULL`, `occurred_at timestamptz NOT NULL DEFAULT now()`;
    - índices (`session_id`, `occurred_at`) e (`session_id`, `kind`, `occurred_at`);
  - `task_artifacts`:
    - `id`;
    - `task_id` FK `CASCADE`;
    - `project_id` FK `RESTRICT`, como a sessão;
    - `relative_path text NOT NULL`;
    - `latest_version integer NOT NULL DEFAULT 0`;
    - `last_failure text NULL`;
    - `created_at`, `updated_at`;
    - unique (`task_id`, `relative_path`);
  - `task_artifact_versions`:
    - `id`;
    - `artifact_id` FK `CASCADE`;
    - `version integer NOT NULL`, check `>= 1`;
    - `skill text NOT NULL`;
    - `session_id` FK `SET NULL`;
    - `content text NOT NULL`, `sha256 text NOT NULL`;
    - `byte_size integer NOT NULL`, check entre 0 e 1048576;
    - `captured_at`;
    - `trigger text`, com check `stop`/`session_end`;
    - unique (`artifact_id`, `version`).
- `latest_version` começa em 0 (P-E de `_tasks.md`): um artefato que só falhou ainda não tem versão.
- `terminal.ts` tem 49 linhas. As tabelas novas vão em arquivos próprios para respeitar o limite de 100.

### Arquivos relevantes
- `packages/api/drizzle/0046_terminal_execution.sql` e `_rollback.sql`: padrão.
- `packages/api/test/terminal-schema.test.ts`: testes de schema da Spec A, que devem continuar passando.
- `packages/api/test/databaseMigrations.ts`: `applyCurrentMigrations(client, stopBefore)` e `applyMigration`.

### Arquivos afetados
- Os listados nas mini-tarefas.

### Decisões relacionadas
- DEC-07 (§17): o estado é gravado na sessão, então a coluna `status` é a fonte da verdade.
- DEC-13 (§17): o conteúdo completo das versões fica no Postgres, em `content`.

## Premissas
- P-E e P-H (`_tasks.md`): `latest_version` começa em 0; os testes usam os IDs `MIG-a` a `MIG-f`.

## Testes atribuídos
- [x] MIG-a: banco na 0046 com uma sessão normal e uma com `launch_failed_at` → depois da 0047, a primeira tem `status = 'opening'`, `dropped_events = 0` e `token_hash` nulo; a segunda tem `status = 'launch_failed'`.
- [x] MIG-b: inserir `status = 'paused'`, `kind = 'output'`, `trigger = 'manual'`, `summary` com 501 caracteres ou `byte_size = 1048577` → violação de check.
- [x] MIG-c: dois artefatos com a mesma (`task_id`, `relative_path`), duas versões com o mesmo (`artifact_id`, `version`) ou duas sessões com o mesmo `token_hash` → violação de unique.
- [x] MIG-d: apagar uma sessão apaga os eventos dela e põe `session_id = null` nas versões; apagar um artefato apaga as versões; apagar a tarefa apaga os artefatos.
- [x] MIG-e: aplicar o rollback remove as três tabelas e as colunas novas, e reaplicar a 0047 funciona.
- [x] MIG-f: falha no disparo do terminal (caso existente em `terminal-open.test.ts`) → a sessão fica com `status = 'launch_failed'`, além de `launch_failed_at`.

## Critérios de sucesso
- Todas as mini-tarefas marcadas, cada uma com o "Pronto quando" executado.
- Todos os testes atribuídos implementados e passando.
- A 0047 aplica sobre a 0046 e reverte limpa.
- No fim da tarefa, `pnpm --dir packages/api test` e `pnpm --dir packages/api test:integration` passam.
- `pnpm --dir packages/api typecheck` e `pnpm lint` sem erros; nenhuma regra do AGENTS.md violada.

## Registro de execução
<!-- The implementer appends one entry per mini-task: date, what was done, commands run with their result, deviations. Example:
- 2026-11-22 · 02.1 · migration 0047 + testes · `vitest run --config vitest.integration.config.ts test/terminal-tracking-migration.test.ts` → 5 passed · sem desvios -->
- 2026-11-22 · 02.1 · migration 0047 + rollback + journal + FEATURE_MIGRATIONS + `terminal-tracking-migration.test.ts` (MIG-a a MIG-e; MIG-a e MIG-e aplicam o rollback da 0047 sobre o banco migrado para recriar o estado da 0046) · `vitest run --config vitest.integration.config.ts test/terminal-tracking-migration.test.ts test/terminal-schema.test.ts` → 10 passed · desvio: `taskFixture` passou a devolver `client` (suporte de teste)
- 2026-11-22 · 02.2 · schema Drizzle, tipos de estado/evento/trigger, `TerminalSessionRecord`, `markLaunchFailed` com `status`, `relaunch` volta a `opening` e zera `token_hash`; MIG-f em `terminal-open.test.ts` · `vitest run --config vitest.integration.config.ts test/terminal-open.test.ts test/terminal-schema.test.ts` passou; `pnpm --dir packages/api typecheck` sem erros · sem desvios
- 2026-11-22 · fechamento · `pnpm --dir packages/api test` → 86 files, 564 passed; `pnpm --dir packages/api test:integration` → 79 files, 467 passed
