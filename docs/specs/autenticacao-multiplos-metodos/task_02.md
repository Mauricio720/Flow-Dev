---
status: in_progress
title: Autorização de repositório exige GitHub vinculado
type: backend
complexity: high
---

# Task 02: Autorização de repositório exige GitHub vinculado

## Visão geral
Hoje, sem identidade GitHub na conta, a callback de autorização de repositório não valida quem é o GitHub e qualquer conta GitHub poderia ser autorizada. Esta tarefa fecha esse buraco e faz as ações que usam repositório responderem `github_link_required` para quem não vinculou o GitHub.

<critical>
- LEIA a spec e as regras do projeto (AGENTS.md, `.agents/rules/code-standards.md`) antes de começar.
- FAÇA UMA MINI-TAREFA POR VEZ, na ordem. Só marque `[x]` depois de rodar o "Pronto quando" dela e ver passar.
- NÃO saia dos arquivos listados sem registrar o motivo no Registro de execução. Nada fora do escopo da spec.
- TESTES JUNTO COM O CÓDIGO, seguindo `software-testing`: GitHub por dublê controlado; Postgres real para credenciais.
- Ao começar, mude `status` para `in_progress` (aqui e em `_tasks.md`). Só mude para `completed` com todos os critérios comprovados por comando.
</critical>

## Requisitos
- REQ-020 (servidor): ENQUANTO o usuário não tiver GitHub vinculado, QUANDO executar ação que lê repositório ou publica issue, responder erro `github_link_required`.
- REQ-021: SE usuário sem GitHub vinculado iniciar a autorização de repositório, recusar antes de aceitar qualquer credencial.
- Não muda: a autorização de repositório segue separada do login, com os mesmos escopos e tokens criptografados (spec §9).

## Interfaces
- **Consome:** `RepositoryAuthorizationService` (`packages/api/src/application/github/repositoryAuthorizationService.ts`), `RepositoryAuthorizationStore.githubIdentity`, `repositoryOAuthController.ts`, `repositoryAccessService.ts`, `repositoryErrors.ts`.
- **Produz:** `GithubLinkRequiredError` em `repositoryErrors.ts`, mapeado para `TRPCError { code: "PRECONDITION_FAILED", message: "github_link_required" }`.

## Mini-tarefas

- [ ] **02.1 — Erro `GithubLinkRequiredError` e seu mapeamento**
  - **Arquivos:** `packages/api/src/application/github/repositoryErrors.ts` (alterar), `packages/api/src/controllers/taskErrorMapper.ts` e `packages/api/src/controllers/projectsController.ts` (alterar o ponto que traduz `RepositoryAuthorizationNeededError`; conferir o mapeador correto com `grep -rn RepositoryAuthorizationNeededError packages/api/src/controllers`)
  - **Testes:** V-04a
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run src/controllers` passa com o caso novo; typecheck do pacote sem erros
- [ ] **02.2 — Ações de repositório sem GitHub vinculado**
  - **Arquivos:** `packages/api/src/application/services/projects/repositoryAccessService.ts` (alterar: sem identidade GitHub na conta, lançar `GithubLinkRequiredError` antes de procurar credencial), `packages/api/src/application/github/repositoryAuthorization.test.ts` ou novo `packages/api/test/repository-link-required.test.ts` (criar)
  - **Testes:** V-04a
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/repository-link-required.test.ts` passa
- [ ] **02.3 — Autorização de repositório bloqueada sem vínculo**
  - **Arquivos:** `packages/api/src/controllers/repositoryOAuthController.ts` (alterar `begin` e `callback`: sem conta GitHub vinculada, recusar), `packages/api/src/controllers/repositoryOAuthController.test.ts` (estender), `packages/api/test/repository-link-required.test.ts` (estender)
  - **Testes:** V-04b, V-04c
  - **Pronto quando:** os dois arquivos de teste passam; `pnpm --dir packages/api exec vitest run src/application/github` passa (UT-021, UT-022 seguem verdes)

## Detalhes de implementação
O `githubIdentity` do store devolve `null` quando não há conta GitHub; o serviço (`githubIdentity`) ainda exige que a credencial pertença à mesma conta. A decisão nova é apenas: sem conta GitHub vinculada, falhar com o erro novo e não com `RepositoryAuthorizationNeededError`, que significa "reautorizar". Manter `expectedGithubUserId` sempre definido na callback.

### Arquivos relevantes
- `packages/api/src/application/services/projects/repositoryAccessService.ts`: `requireRead`, `personalContext`, `contextCredentials`.
- `packages/api/src/application/services/issue-deletion/repositoryDeletionAccess.ts`: também usa `githubIdentity`; conferir se precisa do mesmo erro.
- `packages/api/src/infra/github/inMemoryRepositoryAuthorizationStore.ts`: store em memória para testes.

### Arquivos afetados
- Os da lista de mini-tarefas.

### Decisões relacionadas
- Spec §18 (autorização no servidor, buraco fechado por REQ-021).

## Premissas
Nenhuma.

## Testes atribuídos
- [ ] V-04a: usuário só Google tenta ação que lê repositório → `PRECONDITION_FAILED` com `github_link_required` · serviço + Postgres de teste, GitHub por dublê
- [ ] V-04b: usuário só Google inicia autorização de repositório → recusado e nenhuma credencial guardada · controller + Postgres de teste
- [ ] V-04c: o mesmo usuário com conta GitHub vinculada (id 77) autoriza com GitHub 77 → credencial guardada; com GitHub 88 → `AccountMismatchError` · controller + Postgres de teste

## Critérios de sucesso
- Todas as mini-tarefas marcadas, cada uma com o "Pronto quando" executado.
- Todos os testes atribuídos implementados e passando; testes existentes da autorização de repositório continuam verdes.
- Typecheck e lint do pacote sem erros; nenhuma regra do AGENTS.md violada.

## Registro de execução
