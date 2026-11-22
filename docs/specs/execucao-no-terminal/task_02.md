---
status: completed
title: Vínculo do clone local ao projeto
type: backend
complexity: medium
---

# Task 02: Vínculo do clone local ao projeto

## Visão geral
Cada pessoa com acesso ao projeto informa, nas Configurações, a pasta do próprio clone local. O Flow Dev confere que a pasta é a raiz de um clone do repositório do projeto (§7.1) antes de salvar. Esta tarefa também cria a migration 0046 com as três tabelas da feature, para que as tarefas seguintes já tenham o banco pronto. Sem vínculo não há onde abrir a execução (US-01, P1).

<critical>
- LEIA a spec (`spec.md`, US-01, REQ-001 a REQ-004, §7.1, §7.4, §14, §15 `projects.localCheckout.*`, B-02, B-08, DEC-06) e as regras do projeto (AGENTS.md/CLAUDE.md, `.agents/rules/code-standards.md`) antes de começar. Leia as skills `layered-backend`, `trpc-nextjs` e `nextjs-folder-structure`, além de `apps/web/AGENTS.md`.
- FAÇA UMA MINI-TAREFA POR VEZ, na ordem. Só marque `[x]` depois de rodar o "Pronto quando" dela e ver passar.
- NÃO saia dos arquivos listados sem registrar o motivo no Registro de execução. Nada fora do escopo da spec.
- TESTES JUNTO COM O CÓDIGO: cada mini-tarefa implementa os testes atribuídos a ela.
- Ao começar, mude `status` para `in_progress` (aqui e em `_tasks.md`). Mude para `completed` só quando todas as mini-tarefas estiverem marcadas e os critérios de sucesso tiverem sido comprovados por comando. A revisão contra a spec acontece uma vez, depois de todas as tarefas: não a espere aqui, mas não marque nada que não tenha prova, porque ela vai conferir.
</critical>

## Requisitos
- REQ-001: O sistema DEVE permitir que cada pessoa com acesso ao projeto salve, troque e remova um vínculo próprio entre o projeto e uma pasta local.
- REQ-002: QUANDO a pessoa salvar uma pasta, o sistema DEVE aceitá-la só se as quatro validações da §7.1 passarem.
- REQ-003: SE uma validação falhar, ENTÃO o sistema DEVE recusar com a mensagem da §7.1 e manter o vínculo anterior.
- REQ-004: O sistema DEVE mostrar a cada pessoa apenas o próprio vínculo.
- §7.1: as quatro regras e mensagens (caminho absoluto de até 1.024 caracteres; pasta existe e pode ser lida; raiz de um repositório git, ou "Escolha a raiz do repositório: <raiz>." numa subpasta; algum remote aponta para `owner/repo` do projeto, em HTTPS ou SSH, com ou sem `.git`, sem diferenciar maiúsculas).
- §7.4: salvar, trocar e remover o próprio vínculo vale para operadora, membro e admin; ninguém vê o vínculo de outra pessoa.
- B-02: um fork no `origin` com `upstream` igual ao projeto é aceito.
- B-08: caminho com espaços e acentos (`/home/ana/Área de trabalho/shop`) vincula normalmente.
- §14 e §20: migration `0046_terminal_execution.sql` com rollback; as tabelas legadas `local_machines` e `local_project_links` ficam intocadas (DEC-06).
- NM-05 (§9, não muda): a edição dos detalhes, do quadro e dos agentes continua restrita aos administradores; a seção nova não muda essas permissões.

## Interfaces
- **Consome:**
  - `ProjectAccessService.requireProject(actor, projectId)` (`packages/api/src/application/services/access/projectAccessService.ts`), que devolve o projeto com `repositoryOwner` e `repositoryName`;
  - `protectedProcedure` e `router` (`packages/api/src/trpc.ts`);
  - `fixture()` (`packages/api/test/fixture.ts`).
- **Produz** (usado pelas tasks 03 e 05):
  - Schema Drizzle `projectLocalCheckouts`, `taskTerminalSessions`, `taskTerminalAttachments`, exportados por `packages/api/src/infra/database/schema.ts`.
  - `packages/api/src/application/services/projects/localCheckoutRules.ts`:
    - `MAX_CHECKOUT_PATH_LENGTH = 1024`;
    - `isValidCheckoutPath(path: string): boolean`;
    - `repositorySlugOf(remoteUrl: string): string | null`, que devolve `"owner/repo"` em minúsculas;
    - `matchesRepository(remotes: string[], repository: string): boolean`.
  - `packages/api/src/application/terminal/gitCheckoutInspector.ts`:
    ```ts
    export type CheckoutInspection =
      | { kind: "missing" }
      | { kind: "not_repository" }
      | { kind: "subfolder"; root: string }
      | { kind: "repository"; root: string; remotes: string[]; branch: string | null; detachedSha: string | null; dirty: boolean };
    export interface GitCheckoutInspector { inspect(path: string): Promise<CheckoutInspection> }
    ```
  - `packages/api/src/infra/terminal/execGitCheckoutInspector.ts`: `class ExecGitCheckoutInspector implements GitCheckoutInspector`.
  - `packages/api/src/application/services/projects/localCheckoutErrors.ts`:
    - `CheckoutValidationError`, com `code: "checkout_path_invalid" | "checkout_not_found" | "checkout_not_git_root" | "checkout_remote_mismatch"` e `details: { path?: string; root?: string; remotes?: string[]; repository?: string }`;
    - `StaleLocalCheckoutError` (`version_conflict`).
  - `packages/api/src/application/services/projects/localCheckoutService.ts`, `class LocalCheckoutService`:
    - `get(actor, projectId)`;
    - `save(actor, { projectId, path, expectedVersion? })`;
    - `remove(actor, projectId)`;
    - `verify(path: string, repository: string): Promise<VerifiedCheckout>`, com `VerifiedCheckout = { path: string; branch: string | null; detachedSha: string | null; dirty: boolean }`, que lança `CheckoutValidationError`. A task 03 revalida o vínculo na abertura com esse método.
  - `packages/api/src/application/database/dao/localCheckoutDao.ts`, interface `LocalCheckoutDao`:
    - `find(userId, projectId)`;
    - `save({ userId, projectId, path, verifiedAt, expectedVersion? })`, que devolve a linha, ou `null` em conflito de versão;
    - `remove(userId, projectId)`.
  - tRPC: `projects.localCheckout.get({ projectId })`, `.save({ projectId, path, expectedVersion? })`, `.remove({ projectId })`, com as saídas da §15.
  - `apps/web/src/lib/projects/contract.ts`: `export type LocalCheckout = RouterOutputs["projects"]["localCheckout"]["get"]`.

## Mini-tarefas

- [x] **02.1 — Migration 0046 e schema das três tabelas**
  - **Arquivos:**
    - criar `packages/api/drizzle/0046_terminal_execution.sql` e `packages/api/drizzle/0046_terminal_execution_rollback.sql`;
    - alterar `packages/api/drizzle/meta/_journal.json`;
    - criar `packages/api/src/infra/database/schema/projectLocalCheckouts.ts` e `packages/api/src/infra/database/schema/tasks/terminal.ts`;
    - alterar `packages/api/src/infra/database/schema.ts` (exports) e `packages/api/test/databaseMigrations.ts` (`FEATURE_MIGRATIONS` recebe `"0046_terminal_execution"`);
    - criar `packages/api/test/terminal-schema.test.ts`.
  - **Testes:** restrições do esquema descritas na nota (sem ID na matriz da spec; a PK é provada por V-01k em 02.4)
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/terminal-schema.test.ts test/migrations.test.ts` passa; `pnpm --dir packages/api typecheck` sem erros.
  - **Nota:** as colunas seguem a §14. `task_terminal_sessions` ganha também `launch_failed_at timestamptz null` e `launch_error text null` (premissa de `_tasks.md`). Os checks são:
    - `route` aceita só `direct_execution`, `tech_spec` e `prd`;
    - `origin` aceita só `upload` e `issue_image`;
    - `path` tem de 1 a 1.024 caracteres;
    - `original_name` tem de 1 a 255 caracteres;
    - `byte_size` fica entre 1 e 10.485.760;
    - `version` é maior ou igual a 1.

    Há ainda o unique (`user_id`, `request_key`) e o unique parcial (`user_id`, `task_id`, `sha256`) com `session_id IS NULL`. O teste insere linhas que violam cada restrição e espera a recusa. O rollback apaga as três tabelas.
- [x] **02.2 — Regras puras de caminho e de remote**
  - **Arquivos:** criar `packages/api/src/application/services/projects/localCheckoutRules.ts` e `packages/api/src/application/services/projects/localCheckoutRules.test.ts`
  - **Testes:** V-01b, V-01h
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run src/application/services/projects/localCheckoutRules.test.ts` passa.
- [x] **02.3 — Inspetor git por `execFile`**
  - **Arquivos:**
    - criar `packages/api/src/application/terminal/gitCheckoutInspector.ts`;
    - criar `packages/api/src/infra/terminal/execGitCheckoutInspector.ts`, e `packages/api/src/infra/terminal/gitCommands.ts` se o inspetor passar de 100 linhas;
    - criar `packages/api/test/git-checkout-inspector.test.ts`.
  - **Testes:** V-01d, V-01e, V-01l
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/git-checkout-inspector.test.ts` passa contra repositórios criados com `git init` em `mkdtemp`. Os casos são:
    - pasta inexistente;
    - pasta sem git;
    - subpasta de um repositório, que devolve a raiz;
    - raiz com dois remotes;
    - branch;
    - HEAD destacado, com o SHA curto de 7 caracteres;
    - arquivo modificado e arquivo novo, que contam como `dirty`;
    - pasta com espaço e acento.
  - **Nota:** use `git -C <path> rev-parse --show-toplevel`, `git remote -v` (ou `config --get-regexp`), `git symbolic-ref --short -q HEAD`, `git rev-parse --short=7 HEAD` e `git status --porcelain`, todos por `execFile`, sem shell, com timeout. Compare a raiz com o caminho informado depois de `realpath`.
- [x] **02.4 — DAO, serviço, controller e `projects.localCheckout.*`**
  - **Arquivos:**
    - criar `packages/api/src/application/database/dao/localCheckoutDao.ts` e `packages/api/src/infra/database/dao/projects/drizzleLocalCheckoutDao.ts`;
    - criar `packages/api/src/application/services/projects/localCheckoutErrors.ts` e `packages/api/src/application/services/projects/localCheckoutService.ts`;
    - criar `packages/api/src/controllers/localCheckoutController.ts` e `packages/api/src/controllers/localCheckoutErrorMapper.ts`;
    - criar `packages/api/src/schemas/localCheckout.ts`;
    - alterar `packages/api/src/routers/projects.ts`, `packages/api/src/infra/composition.ts` (`createProductionLocalCheckoutController`) e `apps/web/src/lib/projects/contract.ts`;
    - criar `packages/api/test/local-checkout.test.ts`.
  - **Testes:** V-01a, V-01c, V-01f, V-01g, V-01i, V-01j, V-01k
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/local-checkout.test.ts` passa; `pnpm --dir packages/api typecheck` sem erros.
  - **Nota:** espelhe `agentSettings` (`agentSettingsController.ts`, `agentSettingsService.ts`, `test/agent-settings.test.ts`), com uma diferença: não há `requireAdmin`, porque qualquer pessoa com acesso ao projeto pode salvar (§7.4). O mapper produz as mensagens exatas da §7.1, com os placeholders preenchidos (`<caminho>`, `<raiz>`, `<owner/repo>`, `<lista>` dos slugs separados por vírgula). Códigos: `BAD_REQUEST` para as validações, `CONFLICT` para `version_conflict`.
- [x] **02.5 — Seção "Meu repositório local" nas Configurações**
  - **Arquivos:**
    - criar `apps/web/src/features/projects/project-settings/components/LocalCheckoutSection.tsx` e `apps/web/src/features/projects/project-settings/components/LocalCheckoutForm.tsx`;
    - criar `apps/web/src/features/projects/project-settings/hooks/useLocalCheckout.ts` e `apps/web/src/features/projects/project-settings/localCheckoutCopy.ts`;
    - alterar `apps/web/src/features/projects/project-settings/index.tsx` e `apps/web/src/app/projects/[projectId]/settings/page.tsx` (carrega `projects.localCheckout.get`);
    - alterar `apps/web/src/test/projects.ts` (dados de teste);
    - criar `apps/web/src/features/projects/project-settings/LocalCheckout.test.tsx`.
  - **Testes:** V-01m, V-01n, V-01o
  - **Pronto quando:** `pnpm --dir apps/web exec vitest run src/features/projects/project-settings/LocalCheckout.test.tsx src/features/projects/project-settings/ProjectSettings.test.tsx` passa; `pnpm --dir apps/web typecheck` sem erros.
  - **Nota:** a seção aparece para todos, admin ou não, logo depois de `RepositoryReadOnly`. O formulário tem `aria-label` "Meu repositório local", o campo tem o rótulo "Pasta do clone" e os botões são "Salvar pasta" e "Remover vínculo". A verificação aparece como "Verificada em <data>".

## Detalhes de implementação
- **Padrão a espelhar:** a feature de agentes do projeto (commits `466bd65` e `3993499`). O backend tem DAO, serviço com `ProjectAccessService`, controller, mapper de erro, schema Zod, router e composição; o frontend tem componente, hook e arquivo de copy.
- **Repositório do projeto:** `${project.repositoryOwner}/${project.repositoryName}` em minúsculas, comparado com `repositorySlugOf` de cada remote. `repositorySlugOf` aceita:
  - `https://github.com/acme/shop(.git)`;
  - `git@github.com:acme/shop(.git)`;
  - `ssh://git@github.com/acme/shop(.git)`.

  Para qualquer outra forma, devolve `null`.
- **Ordem das validações no `verify`:** primeiro `isValidCheckoutPath`, depois `inspector.inspect(path)`, que pode dar `missing`, `not_repository` ou `subfolder`, e por fim `matchesRepository`. O serviço só grava se tudo passar; a falha não toca no vínculo anterior (REQ-003).
- **Concorrência:** `expectedVersion` opcional. Sem ele, o save sobrescreve; com ele divergente, `version_conflict`.

### Arquivos relevantes
- `packages/api/src/controllers/agentSettingsController.ts`: controller fino e mapper de erro a espelhar.
- `packages/api/src/application/services/projects/agentSettingsService.ts`: uso do `ProjectAccessService`.
- `packages/api/src/infra/database/dao/projects/drizzleAgentSettingsDao.ts`: save com versão.
- `packages/api/src/infra/database/schema/projectAgentSettings.ts`: estilo de schema com checks.
- `packages/api/drizzle/0045_project_agent_settings.sql` e `packages/api/drizzle/0045_project_agent_settings_rollback.sql`: formato de migration e rollback.
- `packages/api/test/agent-settings.test.ts`: montagem do router com `createCaller` no banco real.
- `apps/web/src/features/projects/project-settings/components/AgentSettingsEditor.tsx` e `hooks/useAgentSettingsEditor.ts`: formulário com mutation e mensagens.

### Arquivos afetados
- Os listados nas mini-tarefas.

### Decisões relacionadas
- DEC-06 (§17): tabela nova `project_local_checkouts`, sem reaproveitar `local_project_links`.

## Premissas
- `launch_failed_at` e `launch_error` entram na 0046 (premissa registrada em `_tasks.md`), porque a Spec B migra esse estado a partir da Spec A.

## Testes atribuídos
- [x] V-01a: Ana salva `/…/shop`, clone de `acme/shop` → `get` devolve a pasta, `verifiedAt` e `version` 1 (US-01.1).
- [x] V-01b: caminho relativo, vazio ou com 1.025 caracteres → `isValidCheckoutPath` falso; 1.024 caracteres absolutos → verdadeiro.
- [x] V-01c: pasta inexistente → "Pasta não encontrada: <caminho>.", vínculo anterior mantido.
- [x] V-01d: pasta sem git → o inspetor devolve `not_repository`.
- [x] V-01e: subpasta de um repositório → o inspetor devolve `subfolder` com a raiz.
- [x] V-01f: remote `acme/blog` num projeto `acme/shop` → "Esta pasta não é um clone de acme/shop. Remotes encontrados: acme/blog.", e o vínculo anterior continua (US-01.2, REQ-003).
- [x] V-01g: `origin` aponta para o fork `ana/shop`, `upstream` para `acme/shop` → aceito (B-02).
- [x] V-01h: `repositorySlugOf` com HTTPS, SSH, `ssh://`, com e sem `.git`, com maiúsculas → `acme/shop`; URL de outro host ou malformada → `null`.
- [x] V-01i: Ana vinculou; Bruno chama `get` no mesmo projeto → `null` (US-01.3, REQ-004).
- [x] V-01j: save com `expectedVersion` desatualizado → `CONFLICT`, vínculo inalterado.
- [x] V-01k: trocar a pasta (version 2) e remover (`{ removed: true }`, `get` → `null`); a PK impede dois vínculos da mesma pessoa no mesmo projeto (REQ-001).
- [x] V-01l: pasta `…/Área de trabalho/shop` → o inspetor devolve `repository` com a raiz exata (B-08).
- [x] V-01m: a seção mostra a pasta vinculada e "Verificada em <data>"; sem vínculo, o campo vazio e o botão "Salvar pasta".
- [x] V-01n: o save recusado mostra a mensagem do servidor em `role="alert"`, e a pasta salva anteriormente continua exibida.
- [x] V-01o: "Remover vínculo" chama `remove` e volta ao estado sem vínculo; um membro não admin também vê e usa a seção.

## Critérios de sucesso
- Todas as mini-tarefas marcadas, cada uma com o "Pronto quando" executado.
- Todos os testes atribuídos implementados e passando.
- Pelas Configurações, um membro salva um clone válido e o vê como "Verificada"; uma pasta errada é recusada com a mensagem da §7.1.
- No fim da tarefa, a suíte completa passa:
  - `pnpm --dir packages/api test`;
  - `pnpm --dir packages/api test:integration`;
  - `pnpm --dir apps/web test`.
- `pnpm --dir packages/api typecheck`, `pnpm --dir apps/web typecheck` e `pnpm lint` sem erros; nenhuma regra do AGENTS.md violada.

## Registro de execução
<!-- The implementer appends one entry per mini-task: date, what was done, commands run with their result, deviations. Example:
- 2026-11-22 · 02.1 · migration 0046 + schema · `vitest run --config vitest.integration.config.ts test/terminal-schema.test.ts` → 9 passed · sem desvios -->
- 2026-11-22 · 02.1 · migration 0046 + schema · `vitest run --config vitest.integration.config.ts test/terminal-schema.test.ts test/migrations.test.ts` → 6 passed · migration escrita à mão no formato da 0045 (journal idx 46); FKs de usuário, projeto e decisão em `restrict` e de tarefa em `cascade`, então o expurgo da 04.6 precisa apagar as sessões antes das decisões
- 2026-11-22 · 02.2 · regras de caminho e remote · `vitest run src/application/services/projects/localCheckoutRules.test.ts` → 17 passed · sem desvios
- 2026-11-22 · 02.3 · inspetor git por `execFile` · `vitest run --config vitest.integration.config.ts test/git-checkout-inspector.test.ts` → 5 passed · `runGit` passa `-c core.fsmonitor=false` e `GIT_TERMINAL_PROMPT=0`; o caminho salvo é a raiz resolvida por `realpath`
- 2026-11-22 · 02.4 · DAO, serviço, controller, mapper e `projects.localCheckout.*` · `vitest run --config vitest.integration.config.ts test/local-checkout.test.ts` → 8 passed; `pnpm --dir packages/api typecheck` sem erros · a composição ficou em `infra/localCheckoutComposition.ts` (reexportada por `composition.ts`) para não aumentar o arquivo; helpers de teste em `test/local-checkout-support.ts`; `expectedVersion` 0 significa "ainda não há vínculo"
- 2026-11-22 · 02.5 · seção "Meu repositório local" · `vitest run src/features/projects/project-settings` → 25 passed; `pnpm --dir apps/web typecheck` sem erros · além dos arquivos listados: `localCheckoutClient.ts`, mock de `projects.localCheckout` em `src/test/setup.ts` e três asserções antigas de `ProjectSettings.test.tsx` e `AgentSettings.test.tsx` ajustadas, porque a seção nova aparece para todos
- 2026-11-22 · fechamento · `pnpm --dir packages/api test` → 500 passed; `pnpm --dir packages/api test:integration` → 404 passed; `pnpm --dir apps/web test` → 288 passed; `pnpm --dir packages/api typecheck`, `pnpm --dir apps/web typecheck` e `pnpm lint` sem erros
