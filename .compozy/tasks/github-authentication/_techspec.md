# Especificação técnica: autenticação GitHub e acesso a projetos

## Resumo executivo

Esta especificação implementa todo o escopo do [PRD](_prd.md) e das [histórias](_user_stories.md). O login usa Better Auth com OAuth GitHub para identificar a conta pelo ID numérico estável, e sessões opacas persistidas no PostgreSQL. Drizzle ORM e migrações versionadas passam a possuir o catálogo de projetos, usuários, contas OAuth, sessões, designações de administrador e atribuições. A identidade da sessão nunca carrega permissões persistentes: cada operação protegida consulta o papel e a atribuição atuais no banco.

O projeto da ação aparece na rota e no input da operação. Uma preferência de último projeto facilita o retorno a `/`, sem definir o alvo de outra aba. O operador escolheu PostgreSQL, Better Auth, sessões que expiram após sete dias sem uso, GitHub OAuth Apps separadas por ambiente e uma carga inicial que preserva o projeto demonstrativo Flow Dev e importa projetos existentes informados na implantação. A interface será em português, assim como os estados de erro; a futura integração de repositório permanece fora desta entrega.

## Arquitetura do sistema

### Componentes e fluxo

| Componente | Responsabilidade e limite | Local principal |
| --- | --- | --- |
| Entrada OAuth e sessão | Better Auth, provedor GitHub restrito, callbacks, cookie, logout e retorno seguro | `apps/web/src/lib/auth/auth.ts`, `app/api/auth/[...all]/route.ts`, `src/features/auth/` |
| Ponte de sessão | Chamar `auth.api.getSession({ headers })` no servidor, entregar apenas `userId` verificado ao contexto tRPC e às páginas | `apps/web/src/lib/auth/`, `src/lib/trpc/server.ts`, rota tRPC |
| Persistência | Esquema Drizzle PostgreSQL, migrações, DAOs e transações | `packages/api/src/infra/database/` |
| Autorização de projeto | Listar projetos visíveis; validar projeto explícito no mesmo acesso aos dados | `packages/api/src/application/services/access/`, controllers e DAOs |
| Administração | Diretório paginado, atribuir e remover acesso; verificar designação atual | `packages/api/src/controllers/accessController.ts`, `routers/access.ts` |
| Catálogo e carga | Substituir catálogo em memória; importar entradas operacionais sem expor criação pública | `packages/api/src/controllers/projectsController.ts`, `src/scripts/` |
| Provisionamento | Resolver logins GitHub a IDs, substituir conjunto designado atomicamente | `packages/api/src/scripts/provisionAdmins.ts` |
| Interface privada | Escolha, troca, no-project, revogação e gestão administrativa | `apps/web/src/app/`, `src/features/projects/`, `src/features/access/` |

Fluxo: `/login` inicia Better Auth → GitHub autoriza identidade → callback verifica estado e cria ou reconhece conta → sessão PostgreSQL → destino interno validado → página consulta projetos visíveis → `/projects/[projectId]` apresenta o demonstrador sob contexto autorizado. Configurar o adaptador Drizzle, `session.expiresIn: 604800`, `session.updateAge: 0` e `session.cookieCache` desabilitado. Assim, cada uso válido renova a expiração para sete dias depois da atividade, com custo de uma escrita na sessão. `auth.api.getSession({ headers })` valida a sessão persistida em cada pedido protegido; só `session.user.id` entra no contexto tRPC. Papéis, atribuições e tokens não entram no principal. A instância em `apps/web/src/lib/auth/auth.ts` importa conexão e tabelas somente de `@flow-dev/api/server`; `packages/api` não importa código do Next.js. A rota tRPC autentica a sessão, encaminha ao navegador o `Set-Cookie` de renovação emitido pelo Better Auth e passa `userId` ao pacote API; o controller consulta permissões atuais. Renderizações em Server Components validam a sessão, mas não são a única via de renovação do cookie: o cliente também chama o Route Handler de sessão ao retomar a aplicação. A saúde pública `health.check` continua sem dados privados. A [orientação atual do Next.js](https://nextjs.org/docs/app/guides/authentication) exige autorização próxima aos dados; um layout ou `proxy.ts` sozinho não é a barreira.

### Mapeamento do escopo

| Fonte | Implementação responsável |
| --- | --- |
| Meta de identidade; US-001 | Entrada OAuth, conta por `(providerId, accountId)`, perfil opcional |
| Meta de sessão; US-002–003 | Sessões PostgreSQL, ponte de sessão, logout e retorno |
| Meta de projeto vazio; US-004 | `projects.list` filtrado e estado sem projeto |
| Meta de escolha; US-005 | `projects.select`, rota com `projectId`, última escolha |
| Meta de isolamento; US-006 | `ProjectAccessService` e predicados de DAO por projeto |
| Meta de diretório; US-007 | `access.users` e `access.userAssignments` paginados |
| Meta de atribuições; US-008–009 | `access.assign` e `access.remove` idempotentes |
| Meta de administrador global; US-010 | Designação atual e lista de todos os projetos |
| Meta de provisionamento; US-011 | CLI restrita e tabela de designações |

## Desenho de implementação

### Interfaces centrais

Os contratos ficam em `packages/api/src/application/`. As implementações de banco ficam em `infra/`; procedimentos tRPC chamam um controller uma vez. Erros de domínio `SessionRequiredError`, `ProjectUnavailableError`, `AdminRequiredError` e `TargetUserUnavailableError` são convertidos pelo controller em erros tRPC seguros. Falhas desconhecidas viram erro genérico e evento de log, sem expor SQL.

```ts
type SessionPrincipal = { userId: string };
type ProjectDto = { id: string; name: string; description: string | null; isDemo: boolean };
type Page<T> = { items: T[]; nextCursor: string | null };
interface ProjectAccessService {
  listVisible(actor: SessionPrincipal, query: { search?: string; cursor?: string }): Promise<Page<ProjectDto>>;
  requireProject(actor: SessionPrincipal, projectId: string): Promise<ProjectDto>;
  select(actor: SessionPrincipal, projectId: string): Promise<ProjectDto>;
}
```

```ts
interface AssignmentService {
  listUsers(actor: SessionPrincipal, query: { search?: string; cursor?: string }): Promise<Page<UserDto>>;
  listAssignments(actor: SessionPrincipal, userId: string, cursor?: string): Promise<Page<ProjectDto>>;
  assign(actor: SessionPrincipal, target: { userId: string; projectId: string }): Promise<{ assigned: true }>;
  remove(actor: SessionPrincipal, target: { userId: string; projectId: string }): Promise<{ assigned: false }>;
}
```

```ts
interface ProjectDao {
  listVisible(userId: string, query: { search?: string; cursor?: string }): Promise<Page<ProjectRecord>>;
  findAuthorized(userId: string, projectId: string): Promise<ProjectRecord | null>;
  setLastSelected(userId: string, projectId: string): Promise<void>;
}
interface CatalogImporter {
  import(manifest: { externalKey: string; name: string; description?: string }[]): Promise<{ inserted: number; updated: number }>;
}
```

`UserDto` contém `id`, `githubLogin`, `displayName?`, `avatarUrl?` e contagem de projetos; nenhuma resposta devolve email privado, token OAuth ou token de sessão. Os DAOs só aceitam o ID do ator derivado da sessão. O controller abre a transação necessária e traduz `NOT_FOUND` de projeto ausente e projeto não autorizado para a mesma mensagem. `findAuthorized` faz a condição de existência e acesso na consulta que lê o projeto; futuras consultas de dados específicos repetem o predicado de `projectId` e ator, sem usar uma checagem anterior como autorização suficiente.

### Modelos de dados

| Tabela | Campos e restrições |
| --- | --- |
| `users` | `id uuid PK`, `name text NOT NULL` (login GitHub reconhecível), `display_name text NULL`, `email text NOT NULL UNIQUE` (somente `github-<id>@flowdev.invalid`, exigido pelo Better Auth), `email_verified boolean NOT NULL DEFAULT false`, `image text NULL`, `last_project_id uuid NULL FK projects ON DELETE SET NULL`, `created_at`, `updated_at`, `last_signed_in_at`. O valor técnico não é endereço de contato nem identidade de autorização. |
| `accounts` | Modelo Better Auth com `id`, `provider_id='github'`, `account_id text` = ID numérico GitHub como texto, `user_id FK users`, `access_token` criptografado e datas do adaptador; `UNIQUE(provider_id,account_id)`. Sem vínculo por email ou exposição do token. |
| `sessions` | Modelo Better Auth com `id`, `token` opaco único, `user_id FK users`, `expires_at timestamptz`, `created_at`, `updated_at`, `ip_address` e `user_agent` opcionais; expiração após 7 dias sem uso com `expiresIn: 604800` e `updateAge: 0`, e exclusão no logout. Cache de sessão em cookie desabilitado. |
| `projects` | `id uuid PK`, `external_key text UNIQUE NOT NULL`, `name text NOT NULL`, `description text NULL`, `is_demo boolean NOT NULL`, `created_at`, `updated_at`. |
| `project_assignments` | `user_id FK users ON DELETE CASCADE`, `project_id FK projects ON DELETE CASCADE`, `created_at`, `created_by_user_id FK users NULL`, PK `(user_id,project_id)`. Índices por projeto e usuário. |
| `admin_designations` | `github_user_id text PK`, `resolved_login text`, `designated_at`; designação antes do primeiro login. O papel resulta de `accounts.account_id = admin_designations.github_user_id`. |
| `verification` | Modelo Better Auth para `state` OAuth: `id`, `identifier`, `value`, `expires_at`, `created_at`, `updated_at`; limpeza de registros expirados. |
| `rate_limit` | Modelo Better Auth com `id`, `key`, `count`, `last_request`; armazenamento PostgreSQL para limitar `/sign-in/social` a 10 tentativas/minuto por origem confiável. |

Configurar `modelName`/`fields` do Better Auth para as tabelas e colunas acima e geração de IDs UUID compatível com o esquema Drizzle; gerar a migração pelo Drizzle e conferir o esquema de autenticação com o CLI do Better Auth. Usar índice de busca por login normalizado, paginação por cursor estável `(name,id)` ou `(external_key,id)`, página padrão de 50 e `nextCursor`. Não há limite de número total: o cliente pode carregar páginas seguintes e buscar. O manifesto de implantação é JSON com `externalKey`, `name` e `description?`; a entrada `flow-dev-demo` recebe UUID fixo na migração. A carga valida chaves/nomes únicos e aplica `upsert` em uma transação; entradas omitidas não são apagadas. Remoções futuras de projeto usam FK em cascata e deixam seleção inválida sem acesso. Limpar registros expirados de verificação e limitação de taxa conforme a política operacional do Better Auth.

### Endpoints e comandos

| Superfície | Entrada | Sucesso | Falhas externas |
| --- | --- | --- | --- |
| `GET/POST /api/auth/[...all]` | Ações Better Auth de início social, callback, sessão e logout; destino local sanitizado | Redireciona e cria/remove cookie de sessão | Consentimento negado/estado ou código inválido: `/login?erro=acesso_negado` ou `falha_autorizacao`; GitHub/DB indisponível: `falha_temporaria`; limite: 429 |
| Rotas Better Auth fora do escopo | `/link-social`, `/get-access-token`, `/refresh-token`, `/account-info`, senha e cadastro | Nenhuma ação permitida | `disabledPaths` bloqueia sem devolver token ou alterar conta |
| `health.check` | Nenhuma | Estado público sem dados privados | 500 genérico |
| `access.me` | Nenhuma | `{id,githubLogin,isAdmin,lastProjectId}` | 401 sessão ausente/expirada; 500 falha DB |
| `projects.list` | `{search?,cursor?}` | `Page<ProjectDto>` conforme atribuições ou designação | 400 cursor inválido; 401; 500 |
| `projects.byId` | `{projectId:uuid}` | `ProjectDto` permitido | 400 ID inválido; 401; 404 ausente/não permitido; 500 |
| `projects.select` | `{projectId:uuid}` | `ProjectDto` selecionado | 400; 401; 404; 500 |
| `access.users` | `{search?,cursor?}` | `Page<UserDto>` | 400 busca/cursor inválido; 401; 403 não admin; 500 |
| `access.userAssignments` | `{userId:uuid,cursor?}` | `Page<ProjectDto>` | 400; 401; 403; 404 usuário ausente; 500 |
| `access.assign` | `{userId:uuid,projectId:uuid}` | `{assigned:true}`, inclusive repetição | 400; 401; 403; 404 usuário/projeto ausente; 500 |
| `access.remove` | `{userId:uuid,projectId:uuid}` | `{assigned:false}`, inclusive repetição de par válido | 400; 401; 403; 404 usuário/projeto ausente; 500 |
| `pnpm --filter @flow-dev/api catalog:import -- --file <manifest.json>` | JSON operacional | Contagens e exit 0 | Validação/DB: exit não zero, transação revertida |
| `pnpm --filter @flow-dev/api admins:provision -- --file <admins.json>` | Array de logins GitHub; `--dry-run` para inspeção | IDs resolvidos e conjunto final, exit 0 | Login inválido/ambíguo, GitHub/DB falho: exit não zero, conjunto anterior intacto |

Os procedimentos de aplicação acima trafegam por `GET/POST /api/trpc`; operações mutáveis são POST e as respostas privadas usam `Cache-Control: no-store`. `health.check` é o único procedimento tRPC público. Todos os demais usam `protectedProcedure`, que valida a sessão Better Auth no servidor em cada requisição antes de criar `SessionPrincipal`. Chamadas HTTP diretas a `/api/trpc`, chamadas pelo server caller, Server Actions e deep links devem chegar ao mesmo controller e aos mesmos predicados de DAO; o server caller constrói o contexto a partir da sessão validada, sem aceitar `userId` fornecido pelo cliente. Nenhuma rota de interface é usada como prova de autorização. Operações administrativas exigem designação atual; operações de projeto exigem `projectId` explícito e atribuição atual ou designação administrativa. `projects.create` público e seu formulário demonstrativo são removidos; não se cria uma API pública de criação nesta funcionalidade. `access.me` serve somente contexto de interface, nunca autoriza uma ação posterior. O controller compara o papel atual em cada operação administrativa. `access.assign/remove` usam restrições únicas e transações; a remoção só afeta o par informado. Uma mutação de projeto mantém bloqueio de leitura na linha de atribuição ou designação até seu commit; remoção de acesso/provisionamento obtém bloqueio de escrita nessa mesma linha. Assim, o commit da revogação e o da mutação têm ordem definida. Consultas de leitura usam um único snapshot SQL com predicado de permissão.

### Rotas e experiência

`/login` continua pública, mas mostra escopo real de identidade e erros portugueses permitidos por enumeração. `/` verifica sessão e lista atual: abre `/projects/[projectId]` se a última escolha ainda é permitida; caso contrário leva a `/projects`. `/projects` é seletor paginado, ou estado sem projeto. `/projects/[projectId]` verifica permissão em renderização e apresenta contexto, indicador de demonstração e opção de troca. `/admin/access` exige designação atual e oferece diretório pesquisável, atribuições paginadas e ações acessíveis. `/dev` fica protegido e contém apenas saúde pública e catálogo filtrado, sem formulário de criação. O logout passa por ação Better Auth e só confirma saída após invalidar a sessão.

Um deep link guarda apenas caminho interno e parâmetros esperados; destinos externos, caminhos `//` e entradas malformadas são descartados. Após login, o destino é revalidado no servidor. Para projeto revogado, mostrar “Seu acesso a este projeto mudou” e oferecer seleção ou estado sem projeto. Em aba aberta, a próxima chamada protegida recebe 404 e a interface descarta os dados daquele projeto; mudança de preferência em outra aba não altera o ID da rota atual. Montar o demonstrador com chave `projectId` e reiniciar seu estado local ao trocar projeto, sair ou perder acesso; conversas e drafts simulados não atravessam contextos. Dados de demonstração permanecem explicitamente identificados e não são apresentados como conteúdo real de repositório.

## Integrações

| Serviço | Uso | Credenciais, falhas e repetição |
| --- | --- | --- |
| GitHub OAuth e `GET /user` | Autorizar identidade com `read:user` e `state`; usar `id` como `accountId` | ID/segredo só no servidor. Negação não cria sessão. Timeout, 5xx ou perfil sem ID falham sem usuário parcial; interface oferece nova tentativa. Perfil sem email/avatar é válido. Atualizar login, nome exibido e última entrada após callback bem-sucedido. Uma nova autenticação detecta autorização inválida; sessão local não depende de consultas contínuas ao GitHub. |
| GitHub `GET /users/{login}` | CLI resolve logins do manifesto de administradores para IDs numéricos | Rejeitar 404, resposta ambígua ou mudança de login durante a resolução; retry limitado em 429/5xx antes de começar a transação. Token de operador é opcional via ambiente para limites da API; nunca embutido. |
| PostgreSQL | Fonte durável para sessão, catálogo e acesso | Falha indisponibiliza ações protegidas e mostra retry; não se presume ausência de acesso. A renovação da sessão ocorre na mesma fonte durável e pode escrever em cada uso. Migrações são executadas antes de abrir tráfego. |

O provedor GitHub padrão do Better Auth acrescenta `user:email` e consulta `/user/emails`; configurar `disableDefaultScope: true`, `scope: ["read:user"]` e `getUserInfo` para consultar apenas `/user`, devolver o ID e login e preencher o email técnico estável. O hook `before` de `/sign-in/social` aceita apenas GitHub e rejeita `scopes` e `additionalParams` enviados pelo cliente; uma requisição direta com `repo` falha antes do redirecionamento OAuth. Desabilitar endpoints de vínculo e leitura/renovação de token com `disabledPaths`, usar `account.accountLinking.disableImplicitLinking: true`, `account.encryptOAuthTokens: true` e `rateLimit` com `storage: "database"` e `customRules["/sign-in/social"] = { window: 60, max: 10 }`. O token OAuth fica criptografado no banco, não chega aos DTOs ou à interface e não é usado para repositórios ([provedor Better Auth](https://github.com/better-auth/better-auth/blob/main/packages/core/src/social-providers/github.ts), [opções Better Auth](https://better-auth.com/docs/reference/options), [escopos GitHub](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/scopes-for-oauth-apps)).

## Análise de impacto

| Componente | Tipo | Alteração e risco | Ação |
| --- | --- | --- | --- |
| `packages/api` banco e contratos | Novo | Persistência e migração podem invalidar IDs de demonstração | Criar esquema, migração, DAOs e carga idempotente |
| `packages/api` tRPC | Modificado | Procedimentos públicos hoje revelam catálogo e criam projetos | Adicionar sessão/políticas; remover `create`; registrar `access` |
| `apps/web` Better Auth | Novo | OAuth, cookies, escopos e endpoints sensíveis a configuração | Validar callback, segredo, origem, hook de escopos e rotas desabilitadas |
| `apps/web` login/topbar | Modificado | Simulações atuais dão falsa confirmação | Ligar login/logout e corrigir textos |
| `apps/web` workspace | Modificado | Demo atual não recebe ID de projeto | Criar rotas contextualizadas e guarda server-side |
| `apps/web` área admin | Novo | Mutação de permissões requer estado atual | Diretório, paginação, atribuição e remoção |
| `/dev` | Modificado | Formulário atual expõe criação pública | Remover formulário e exigir sessão para catálogo |
| Infraestrutura | Novo | Banco e OAuth Apps exclusivas por ambiente necessários | Configurar URL/callback e segredos de desenvolvimento, staging e produção; executar migrações e importações |

## Abordagem de testes

O contrato completo está em [_tests.md](_tests.md). Usar testes unitários TypeScript com Vitest para regras, mapeamento de perfil, destino e comandos; fakes somente nas fronteiras de GitHub e banco. Usar integração tRPC `createCaller` com PostgreSQL descartável para schema, transações, sessões e autorização, incluindo concorrência; testar Route Handlers com requisições reais e provedor OAuth controlado em ambiente de teste. Instalar Playwright para jornadas UI independentes, com banco de teste isolado, dados preparados por teste e locators acessíveis conforme `.agents/rules/e2e-testing.md`. Um teste de staging com OAuth GitHub real e contas não produtivas fica em `qa-release`; nenhum teste automatizado usa credenciais de produção.

## Sequência de desenvolvimento

1. Criar esquema/migrações PostgreSQL, catálogo durável e importação inicial; remover criação pública.
2. Configurar Better Auth GitHub, adaptador, perfil sem email, sessões, limitador, restrição de rotas/escopos e logout.
3. Passar `userId` verificado à API; criar `protectedProcedure`, autorização por projeto e endpoints de catálogo.
4. Criar provisionamento de administradores e operações de diretório/atribuição com transações.
5. Criar rotas, seletor, workspace contextualizado, estados vazios/revogados e área administrativa; corrigir textos demonstrativos.
6. Executar contratos unitários, integração, jornadas Playwright e gate de segurança.

### Dependências técnicas

PostgreSQL acessível por `DATABASE_URL`; uma GitHub OAuth App exclusiva para cada ambiente de desenvolvimento, staging e produção, com homepage naquele ambiente e callback `${BETTER_AUTH_URL}/api/auth/callback/github`; `BETTER_AUTH_URL` definido como origem pública exata do ambiente, além de `BETTER_AUTH_SECRET`, `GITHUB_CLIENT_ID` e `GITHUB_CLIENT_SECRET` próprios de cada ambiente; manifesto de projetos e manifesto de administradores fornecidos pelo operador. Nenhum domínio, ID/segredo OAuth ou ID de administrador é embutido na especificação. O boot rejeita credenciais ausentes ou `BETTER_AUTH_URL` inválida e deriva dela o callback esperado; `trustedOrigins` aceita somente origens autorizadas daquele ambiente. O teste de implantação confere o callback registrado no GitHub. O deploy deve executar migrações e importação antes de aceitar login; provisionamento pode anteceder o primeiro login.

## Monitoramento e observabilidade

Registrar `requestId`, `userId` interno, `projectId`, procedimento, resultado e duração, sem tokens, cookies, email ou payload sensível. Eventos: tentativa OAuth negada/falha, sessão expirada, autorização de projeto negada, atribuição criada/removida, designação alterada e importação concluída. Métricas: taxa de falha OAuth, 401/403/404 por procedimento, falha de banco, duração p95 das consultas de acesso e contagem de erros de importação. Alertar se autenticações ou operações protegidas falharem continuamente por cinco minutos; revisar logs e disponibilidade GitHub/PostgreSQL antes de repetir operações. A CLI imprime IDs resolvidos e diferença do conjunto de administradores para auditoria.

## Considerações técnicas

### Decisões

- Better Auth com sessão em banco e PostgreSQL: revogação local imediata, identidade estável e expiração após sete dias sem uso; custo de leitura e renovação da sessão em cada ação, conforme [ADR-004](adrs/adr-004.md).
- Catálogo importado com chave estável e projeto explícito por ação: preserva integridade e duas abas independentes; muda a rota atual, conforme [ADR-005](adrs/adr-005.md).
- Designação separada da conta: permite provisionar antes do primeiro login e retirar papel sem alterar cookie, conforme [ADR-003](adrs/adr-003.md).

### Riscos conhecidos

- O Better Auth não detecta instantaneamente revogação no GitHub depois de emitir sessão local. A história US-002.EC-9 é atendida quando uma nova autorização detecta a revogação; expiração e logout encerram a sessão anterior. Se o produto exigir revogação remota imediata, será necessária uma extensão explícita.
- `users.name` é um rótulo mutável. Toda permissão e designação usa o ID GitHub de `accounts`; atualizar o rótulo num novo login não muda autorização.
- Uma preferência `last_project_id` pode ficar obsoleta. A resolução de `/` sempre revalida projeto e nunca devolve dado com base só nela.
- O catálogo demonstrativo atual tem ID aleatório; a migração cria uma entrada estável nova. Links antigos com ID efêmero falham de forma segura.

## Architecture Decision Records

- [ADR-001: GitHub identity and application session](adrs/adr-001.md) — identidade e sessão sem acesso a repositórios.
- [ADR-002: Project-scoped access with administrator assignments](adrs/adr-002.md) — isolamento e atribuições.
- [ADR-003: Explicit initial administrator provisioning](adrs/adr-003.md) — provisionamento sem promoção do primeiro login.
- [ADR-004: PostgreSQL, Better Auth e sessões revogáveis](adrs/adr-004.md) — armazenamento e mecanismo de autenticação.
- [ADR-005: Catálogo durável e escopo explícito por projeto](adrs/adr-005.md) — carga inicial e isolamento por ação.
