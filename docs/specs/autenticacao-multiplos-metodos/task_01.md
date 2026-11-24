---
status: completed
title: Acesso a dados para usuários sem GitHub
type: backend
complexity: high
---

# Task 01: Acesso a dados para usuários sem GitHub

## Visão geral
Hoje todas as consultas de usuário exigem uma conta GitHub (`innerJoin`). Esta tarefa torna o GitHub opcional no acesso a dados, para que quem entra por Google ou email/senha apareça em `access.me`, na lista de projetos e na busca do admin. Sem ela, as demais tarefas entregam login que quebra logo depois.

<critical>
- LEIA a spec e as regras do projeto (AGENTS.md, `.agents/rules/code-standards.md`) antes de começar.
- FAÇA UMA MINI-TAREFA POR VEZ, na ordem. Só marque `[x]` depois de rodar o "Pronto quando" dela e ver passar.
- NÃO saia dos arquivos listados sem registrar o motivo no Registro de execução. Nada fora do escopo da spec.
- TESTES JUNTO COM O CÓDIGO, seguindo `software-testing`: asserção sobre efeito observável; valor esperado vindo da spec; Postgres real onde SQL é o risco.
- Ao começar, mude `status` para `in_progress` (aqui e em `_tasks.md`). Só mude para `completed` com todos os critérios comprovados por comando.
</critical>

## Requisitos
- REQ-018: o sistema DEVE tratar usuários de qualquer método como completos (sessão, projetos atribuídos, atribuição).
- REQ-019: na busca de atribuição do admin, incluir usuários sem GitHub, identificados por nome e, para eles, por email.
- REQ-022: ENQUANTO o usuário não tiver GitHub vinculado, ele DEVE ser tratado como não admin.
- DEC-04 e DEC-05 (spec §17); Q-08: no lugar de `githubLogin` usar o nome de exibição.
- Não muda: usuários só-GitHub continuam com o mesmo `githubLogin`, e o admin continua por identificador GitHub (spec §9).

## Interfaces
- **Consome:** `users`, `accounts`, `adminDesignations` em `packages/api/src/infra/database/schema.ts`; `AccessDao` (`packages/api/src/application/database/dao/accessDao.ts`).
- **Produz:**
  - `UserRecord = { id; githubId: string | null; githubLogin: string | null; email: string | null; displayName?; avatarUrl?; lastProjectId; assignmentCount }` (`email` só preenchido para usuário sem GitHub).
  - `access.me` devolve `{ id, githubLogin: string | null, isAdmin, lastProjectId, methods: { github: boolean; google: boolean; password: boolean } }`.

## Mini-tarefas

- [x] **01.1 — `UserRecord` e DAO com GitHub opcional**
  - **Arquivos:** `packages/api/src/application/database/dao/accessDao.ts` (alterar), `packages/api/src/infra/database/dao/drizzleAccessDao.ts` (alterar: `leftJoin` na conta GitHub, `email` para quem não tem), `packages/api/src/infra/database/dao/accessInMemoryDao.ts` (alterar), `packages/api/test/access-dao-methods.test.ts` (criar)
  - **Testes:** V-03a (parte DAO: `findUser` de usuário só Google devolve registro com `githubId` nulo)
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/access-dao-methods.test.ts` passa; `pnpm --dir packages/api typecheck` sem erros
  - **Nota:** o arquivo do DAO tem 91 linhas; se passar de 100, extrair a consulta de usuário para `drizzleUserQuery.ts`.
- [x] **01.2 — `access.me` e consumidores de `githubLogin`**
  - **Arquivos:** `packages/api/src/controllers/accessController.ts` (alterar: `methods`, `githubLogin` anulável), `apps/web/src/features/access/access-management/components/UserAccessRow.tsx` (alterar: rótulo = nome de exibição ou nome; email quando sem GitHub), demais usos de `githubLogin` encontrados por `grep -rn githubLogin packages apps --include=*.ts --include=*.tsx` (alterar)
  - **Testes:** V-03a (`me` de usuário só Google devolve `isAdmin: false` e `methods.github: false`, sem `NOT_FOUND`)
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/access-dao-methods.test.ts` passa; `pnpm --dir packages/api typecheck` e `pnpm --dir apps/web typecheck` sem erros
- [x] **01.3 — Atribuição e busca de admin para qualquer método**
  - **Arquivos:** `packages/api/src/application/services/access/assignmentService.ts` (conferir o `findUser`; alterar só se necessário), `packages/api/test/access-dao-methods.test.ts` (estender)
  - **Testes:** V-03b, V-03c
  - **Pronto quando:** o mesmo teste de integração passa com os casos novos
- [x] **01.4 — Admin só com GitHub vinculado**
  - **Arquivos:** `packages/api/test/access-dao-methods.test.ts` (estender)
  - **Testes:** V-03d, V-08b
  - **Pronto quando:** teste passa; `pnpm --dir packages/api exec vitest run src/application/services/access` passa (nada regrediu)

## Detalhes de implementação
Espelhar o estilo atual do `DrizzleAccessDao`. Usar `leftJoin` com a mesma condição `githubAccounts`. O agrupamento (`groupBy`) deve aceitar `accounts.accountId` nulo. Para a coluna `email`, selecionar `users.email` e devolvê-lo apenas quando não houver conta GitHub (o email sintético não deve vazar). O teste de integração usa as fixtures de `packages/api/test/fixture.ts`.

### Arquivos relevantes
- `packages/api/src/infra/database/dao/drizzleAccessDao.ts`: `userQuery`, `isAdmin`, `toUser`.
- `packages/api/src/controllers/accessController.ts`: `me`.
- `packages/api/test/fixture.ts`: criação de usuários e contas de teste.

### Arquivos afetados
- Os da lista de mini-tarefas, mais qualquer consumidor de `githubId`/`githubLogin` que o typecheck apontar.

### Decisões relacionadas
- DEC-04 (usuário sem GitHub é cidadão pleno), DEC-05 (admin por GitHub).

## Premissas
Q-08 como sugerido: rótulo = nome de exibição; confirmar cada uso ao alterar.

## Testes atribuídos
- [x] V-03a: usuário só Google chama `me` → `isAdmin: false`, `methods` com só `google: true`, sem `NOT_FOUND` · controller/DAO + Postgres de teste
- [x] V-03b: usuário só Google atribuído ao projeto Alfa → listado em suas atribuições e atribuível pelo admin · DAO + Postgres de teste
- [x] V-03c: admin busca "Ana" → usuário Google aparece com email; usuário GitHub aparece sem email · DAO + Postgres de teste
- [x] V-03d: usuário sem GitHub vinculado → `isAdmin` falso mesmo com nome igual a um admin · DAO + Postgres de teste
- [x] V-08b: admin designado por identificador GitHub continua admin; lista de admins inalterada · DAO + Postgres de teste

## Critérios de sucesso
- Todas as mini-tarefas marcadas, cada uma com o "Pronto quando" executado.
- Todos os testes atribuídos implementados e passando.
- Usuário só Google obtém `access.me` sem erro.
- Typecheck e lint dos pacotes alterados sem erros; nenhuma regra do AGENTS.md violada.

## Registro de execução

- **01.1** — `UserRecord` agora tem `githubId`/`githubLogin` anuláveis e `email` (preenchido só sem conta GitHub; `displayName` cai para `users.name` quando não há GitHub). Consulta de usuário extraída para `drizzleUserQuery.ts` (nota da tarefa; o DAO tinha 91 linhas) com `leftJoin` na conta GitHub; o cursor da lista passou a usar `users.name` (antes usava `githubLogin`, que agora pode ser nulo). Constantes de provedor em `application/auth/providerIds.ts`. In-memory DAO: `isAdmin` falso sem `githubId`, `seedUser` aceita `email` opcional.
  - Fora da lista de arquivos, com motivo: `application/auth/providerIds.ts` (constantes `github`/`google`/`credential`, sem texto mágico), `drizzleUserQuery.ts` (extração prevista na nota), `test/access-methods-support.ts` (helpers de seed; mantém o teste dentro de 100 linhas), `controllers/accessController.ts` (`toUserDto` recebe `UserRecord` e devolve `email`; sem isso o typecheck de 01.1 não fecha).
  - `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/access-dao-methods.test.ts` → 3 passed. `pnpm --dir packages/api typecheck` → sem erros. `vitest run src/application/services/access` → 9 passed.
  - Sensibilidade: trocar `leftJoin` por `innerJoin` em `drizzleUserQuery.ts` faz V-03a falhar (`expected null to match object`); revertido.
  - Limitação conhecida (Q-08): `githubLogin` é `users.name` de quem tem conta GitHub, como hoje; para usuário criado por Google que vincula GitHub depois, `users.name` continua sendo o nome original (o login do GitHub não é guardado).
- **01.2** — `access.me` devolve `githubLogin` anulável e `methods: { github, google, password }`. Novo `AccessDao.findLinkedMethods(userId)` (providers `github`/`google`/`credential` em `accounts`), implementado no Drizzle e no in-memory (este fica com exatamente 100 linhas). `UserAccessRow`: rótulo = nome de exibição, senão login, senão email; segunda linha mostra `@login` para quem tem GitHub e o email para quem não tem, mais a contagem de projetos. Único consumidor de `githubLogin` na web; `grep -rn githubLogin` não achou outros.
  - Fora da lista, com motivo: `application/database/dao/accessDao.ts`, `drizzleAccessDao.ts` e `accessInMemoryDao.ts` (o `methods` precisa de uma consulta de contas); `projectAccessService.test.ts` (um fake literal de `AccessDao` ganhou `findLinkedMethods` para o typecheck); `access-management/index.tsx` (frase "pessoas que já entraram com GitHub" deixaria de ser verdade) e `components/AccessFilters.tsx` (placeholder "login do GitHub" → "nome ou login do GitHub", pois a busca cobre nome).
  - `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/access-dao-methods.test.ts` → 6 passed (V-03a com `me` de usuário só Google: `isAdmin: false`, `methods` só com `google: true`, sem `NOT_FOUND`). `pnpm --dir packages/api typecheck` e `pnpm --dir apps/web typecheck` → sem erros. `eslint src/features/access` → sem avisos.
  - Observação para o final: `apps/web/PRODUCT.md` ainda diz "Entrada apenas via GitHub OAuth"; não alterei porque o arquivo já tem mudanças não commitadas de outro trabalho e a spec não o lista.
- **01.3** — `assignmentService.ts` conferido: não cita GitHub e só usa `findUser`/`isAdmin`/`findProject`, então não precisou de alteração. V-03b (atribuir projeto a usuário só Google, listar em `listAssignments` do DAO e do serviço, `assignmentCount` 1) e V-03c (busca "Ana" no controller devolve o usuário Google com `email` e o usuário GitHub com `email: null`). Teste extra: paginação da busca com 54 usuários (sem repetir nem pular) protege o cursor por `users.name`.
  - `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/access-dao-methods.test.ts` → 9 passed.
  - Sensibilidade: trocar a chave do cursor por `""` em `drizzleAccessDao.ts` faz o teste de paginação falhar (`expected … to be null`); revertido e reconfirmado em 9 passed.
- **01.4** — V-03d: usuário Google com nome igual ao admin (`admin`) e sem GitHub é não admin no DAO e em `me`; ao vincular o GitHub designado (id 9001) passa a admin. V-08b: admin designado pelo GitHub 77 segue admin depois de `replaceAdmins`, o usuário só GitHub comum segue não admin, e `admin_designations` fica com exatamente a linha `77/admin`. O DAO não precisou de mudança de comportamento: `isAdmin` já exigia a conta GitHub (REQ-022).
  - `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/access-dao-methods.test.ts` → 12 passed. `pnpm --dir packages/api exec vitest run src/application/services/access` → 9 passed. `pnpm --dir packages/api typecheck` → sem erros.
  - Limite de linhas: `test/access-dao-methods.test.ts` ficou com 99 linhas; V-03b também confere a lista de projetos (`projects.list`) do usuário Google atribuído.
- **Fechamento da tarefa 01** — todas as mini-tarefas marcadas e comprovadas por comando. Verificação extra: `pnpm --dir packages/api test` (unitários) → 114 arquivos, 766 testes passando; `pnpm --dir apps/web typecheck` e `eslint src/features/access` sem erros. A suíte completa de integração, `pnpm lint` e `pnpm build` ficam para o fim do trabalho (critérios da tarefa 09).
