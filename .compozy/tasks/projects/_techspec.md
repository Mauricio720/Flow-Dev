# Especificação técnica: projetos vinculados ao GitHub

## Resumo executivo

Esta especificação cobre todas as metas do [PRD](_prd.md) e as histórias [US-001 a US-007](_user_stories.md). O catálogo e as permissões Flow Dev partem da arquitetura definida pela [especificação de autenticação](../github-authentication/_techspec.md): PostgreSQL, Drizzle, Better Auth, sessões persistidas, atribuições e contexto explícito por `projectId`. O código atual ainda é um protótipo com projetos em memória e login simulado; esses recursos de autenticação são dependências de implementação, não capacidades já disponíveis.

O usuário escolheu um **segundo GitHub OAuth App** com escopo `repo` para a conexão de repositórios. O login de identidade mantém apenas `read:user`. O projeto persiste o ID estável do repositório; cada usuário autoriza separadamente o segundo aplicativo e toda consulta privada usa seu próprio token. O escopo `repo` é amplo por limitação do OAuth App e exige proteção rigorosa do token. O catálogo é servido pelo banco sem esperar GitHub; estados pessoais são consultados em lotes e cada operação que devolve conteúdo de repositório revalida ambas as permissões.

## Arquitetura do sistema

### Componentes e fluxo

| Componente | Responsabilidade e fronteira |
| --- | --- |
| `ProjectDao` e esquema Drizzle (`packages/api`) | Persistir projetos e vínculo imutável, consultar catálogo por atribuição, garantir unicidade e edição com versão. Não chama GitHub. |
| `ProjectCatalogService` e `ProjectsController` (`packages/api`) | Validar regras, verificar repositório antes de criar, coordenar transação e mapear erros/DTOs. O controller usa o predicado atual de acesso da autenticação. |
| `GitHubRepositoryGateway` (`packages/api/infra`) | Encapsular REST/GraphQL GitHub, paginação, timeout, classificação de 401/403/404/429/5xx e comparação de IDs. Não decide acesso Flow Dev. |
| `RepositoryAuthorizationService` e armazenamento (`packages/api`) | Consumir o código OAuth, conferir o ID da pessoa, criptografar/renovar/revogar credenciais e devolver token apenas a código servidor. |
| `RepositoryAccessService` (`packages/api`) | Exigir projeto autorizado e acesso GitHub atual antes de devolver metadados ou executar operações futuras de código. |
| `ConnectionStateService` (`packages/api`) | Resolver estados pessoais de até 50 projetos por chamada, mantendo a última identidade conhecida quando GitHub falha. Nunca usa o resultado como autorização de uma ação futura. |
| Router tRPC e callbacks OAuth | Validar sessão e input; chamar um controller. `GET/POST /api/trpc` permanece sem cache privado. Callbacks HTTP ficam em `apps/web/src/app/api/github-repositories/`. |
| Catálogo, seleção, criação e shell (`apps/web/src/features/projects/`) | Mostrar projetos autorizados, estados e ações; rotas App Router finas. O workspace de issues demonstrativo fica sob o `projectId` da rota e continua marcado como simulação. |

Fluxo: sessão Better Auth → `projects.list` SQL filtrado → `projects.connectionStates` opcional para a página → rota `/projects/[projectId]` com `projects.byId` → ação de repositório com `RepositoryAccessService.requireRead` → GitHub com token da própria pessoa. O ID de usuário vem da sessão; nenhum `userId` do cliente concede acesso. As metas “catálogo antes dos menus”, “projeto ativo reconhecível” e “persistência após reinício” são atendidas por rota explícita, `last_project_id` apenas como preferência revalidada e PostgreSQL, respectivamente.

### Mapeamento do escopo

| Fonte do PRD | Componentes responsáveis |
| --- | --- |
| Metas: catálogo permitido, escolha e contexto | `ProjectDao.listVisible`, rotas `/` e `/projects`, shell por `projectId`, `projects.select`. |
| Metas: criação durável, identidade única e continuidade | `ProjectCatalogService`, `ProjectDao`, migração, `GitHubRepositoryGateway`. |
| Metas: estado compreensível e acesso duplo | `ConnectionStateService`, `RepositoryAccessService`, estados de interface. |
| US-001 | Catálogo paginado, busca SQL, estado vazio/erro e consulta de conexão por página. |
| US-002 | Rota explícita, seleção da autenticação, proteção de deep link e reset de estado do workspace. |
| US-003 | OAuth de repositórios, lista paginada GitHub, busca incremental e revisão do repositório. |
| US-004 | Criação transacional com verificação GitHub, unicidade e retorno recuperável. |
| US-005 | Edição por versão otimista; repositório ausente do contrato de edição. |
| US-006 | Predicado Flow Dev + token pessoal + checagem GitHub por ação; nenhuma resposta privada compartilhada em cache. |
| US-007 | ID GitHub imutável, refresh de rótulo confirmado, estado por usuário, arquivo e recuperação sem recriação. |

## Desenho de implementação

### Interfaces centrais

Contratos em `packages/api/src/application/`; implementações em `infra/`. Os tipos abaixo são contratos principais, não DTOs de banco:

```ts
type RepositoryIdentity = {
  githubId: string;
  nodeId: string;
  owner: string;
  name: string;
  visibility: "public" | "private" | "internal";
  archived: boolean;
};
type RepositoryPage = { items: RepositoryIdentity[]; nextCursor: string | null };
interface GitHubRepositoryGateway {
  listAccessible(token: string, cursor?: string): Promise<RepositoryPage>;
  resolve(token: string, nodeId: string): Promise<RepositoryIdentity>;
  resolvePath(token: string, owner: string, name: string): Promise<RepositoryIdentity>;
}
```

```ts
interface ProjectDao {
  listVisible(actor: SessionPrincipal, query: CatalogQuery): Promise<ProjectPage>;
  findVisible(actor: SessionPrincipal, projectId: string): Promise<ProjectRecord | null>;
  insertVerified(input: VerifiedProjectInput): Promise<ProjectRecord>;
  updateDetails(input: VersionedProjectEdit): Promise<ProjectRecord>;
  updateRepositoryLabel(input: RepositoryIdentity): Promise<void>;
}
```

`CatalogQuery` contém `search?` e cursor `(createdAt,id)`; `ProjectPage` contém `ProjectRecord[]` e `nextCursor: string | null`, mapeados pelo controller para DTOs. `VerifiedProjectInput` contém detalhes validados e `RepositoryIdentity` confirmada; `VersionedProjectEdit` contém `projectId`, detalhes e `expectedVersion`. `ProjectRecord` é a linha interna persistida. O router exporta somente tipos para o cliente, sem importar runtime de banco ou token.

```ts
interface RepositoryAccessService {
  requireRead(actor: SessionPrincipal, projectId: string): Promise<RepositoryIdentity>;
  requireWrite(actor: SessionPrincipal, projectId: string): Promise<RepositoryIdentity>;
}
interface ConnectionStateService {
  forVisibleProjects(actor: SessionPrincipal, ids: string[]): Promise<ConnectionState[]>;
}
```

`SessionPrincipal` e o predicado de acesso vêm da autenticação. Serviços lançam erros nomeados (`ProjectNotFound`, `RepositoryAuthorizationNeeded`, `RepositoryUnavailable`, `RepositoryIdentityMismatch`, `ProjectConflict`, `StaleProjectVersion`); controllers traduzem para `TRPCError`. `requireWrite` recusa repositório arquivado e verifica a permissão GitHub apropriada no momento da futura escrita; nenhuma escrita GitHub nova é criada nesta funcionalidade.

### Modelos de dados

| Tabela ou tipo | Campos e invariantes |
| --- | --- |
| `projects` | Preservar `id uuid`, `external_key text UNIQUE NOT NULL` legado, `is_demo boolean NOT NULL`, `name`, `description`, timestamps. Nova criação usa `external_key='project-'+id` e `is_demo=false`. Acrescentar `github_repository_id text NOT NULL UNIQUE` (decimal), `github_node_id text NOT NULL UNIQUE`, `repository_owner text NOT NULL`, `repository_name text NOT NULL`, `repository_visibility` (`public`/`private`/`internal`), `repository_archived boolean`, `repository_verified_at timestamptz`, `details_version integer NOT NULL DEFAULT 1`. Índice único em `lower(name)`; nome 2–60 caracteres após trim, descrição nula ou até 280. Trigger recusa alteração de `github_repository_id` após o backfill; `node_id` pode ser atualizado somente após confirmar o mesmo ID numérico. |
| `github_repository_authorizations` | `user_id uuid PK/FK users ON DELETE CASCADE`, `github_user_id text`, `access_token_ciphertext`, `refresh_token_ciphertext NULL`, `access_expires_at NULL`, `refresh_expires_at NULL`, `granted_scopes text[]`, `key_version`, `updated_at`. Token só é liberado em memória do servidor; substituir/renovar atomicamente. |
| `github_repository_oauth_states` | `state_hash text PK`, `user_id`, `session_id_hash`, `code_verifier_ciphertext`, `return_to`, `expires_at` (10 minutos), `consumed_at NULL`; consumo atômico uma vez. Limpeza de expirados. |
| `ProjectDto` | `id`, `name`, `description`, `repository:{githubId,owner,name,visibility,archived,verifiedAt}`, `detailsVersion`, `isDemo`; sem token, sem URL livre editável. `isDemo` identifica só o workspace simulado, não uma origem de código fictícia. |
| `ConnectionState` | `projectId`, `kind` (`checking`, `available`, `authorization_needed`, `access_denied_or_missing`, `temporarily_unavailable`, `archived`), `checkedAt?`, `reason?`. Um 404 ambíguo usa `access_denied_or_missing`; a UI não afirma exclusão. |

O OAuth do repositório usa `scope=repo offline_access`, `state` imprevisível e PKCE S256. `POST /connect` valida a origem da requisição. O callback rejeita token sem `repo`, outro ID GitHub, sessão diferente, estado expirado ou já consumido. A chave `GITHUB_REPOSITORY_TOKEN_KEY` é independente de `BETTER_AUTH_SECRET`; AES-256-GCM com IV aleatório e versão permite rotação. O aplicativo de identidade não recebe nem recupera estes tokens. As expirações são lidas da resposta GitHub, sem presumir que todo token tem refresh token. Renovação recebe bloqueio por linha para não gastar o mesmo refresh token duas vezes; falha definitiva exige nova autorização. [O GitHub documenta PKCE e tokens expiráveis no fluxo OAuth](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps).

A migração do catálogo legado é um pré-requisito de deploy: inventariar linhas, fornecer mapeamento `externalKey → owner/name`, autenticar uma conta administradora para resolver cada repositório e confirmar IDs distintos. A migração aborta sem alterar o catálogo se qualquer linha permanecer sem associação verificada. `flow-dev-demo` só permanece se receber um repositório real; sua UI pode continuar demonstrativa. Após o backfill, ativar `NOT NULL` e índices únicos. A importação da autenticação deve passar a exigir vínculo verificado, inclusive para novas entradas, ou ficar desativada. O protótipo em memória não é fonte migrável; dados ali desaparecem no reinício.

### Endpoints e rotas

Procedimentos tRPC trafegam por `/api/trpc`; queries usam GET e mutações POST. O erro tRPC conserva os códigos abaixo e uma mensagem portuguesa segura; validação Zod devolve `BAD_REQUEST` com campos. `NOT_FOUND` cobre tanto projeto inexistente quanto projeto sem permissão Flow Dev.

| Superfície | Entrada | Sucesso | Falhas previstas |
| --- | --- | --- | --- |
| `projects.list` query | `{search?:string,cursor?:string}`; busca até 120 caracteres | `{items:ProjectDto[],nextCursor:string|null}` com 50 por página | `UNAUTHORIZED`, `BAD_REQUEST` cursor/busca, `INTERNAL_SERVER_ERROR` banco. |
| `projects.byId` query | `{projectId:uuid}` | `ProjectDto` visível | `UNAUTHORIZED`, `BAD_REQUEST`, `NOT_FOUND`, `INTERNAL_SERVER_ERROR`. |
| `projects.select` mutation | `{projectId:uuid}` | `ProjectDto`; atualiza `last_project_id` | `UNAUTHORIZED`, `BAD_REQUEST`, `NOT_FOUND`, `INTERNAL_SERVER_ERROR`. |
| `projects.repositoryCandidates` query | `{search?:string,cursor?:string}`; busca até 120 caracteres | `{items:{repository:RepositoryIdentity,linkedProjectId?:uuid}[],nextCursor:string|null}`; até 100 itens por lote GitHub | `BAD_REQUEST` busca/cursor, `UNAUTHORIZED`, `FORBIDDEN` não admin, `PRECONDITION_FAILED` sem OAuth, `TOO_MANY_REQUESTS`, `SERVICE_UNAVAILABLE`. |
| `projects.repositoryPreview` query | `{nodeId?:string,owner?:string,name?:string}`; exatamente uma forma | Identidade atual verificada e vínculo existente, se houver | `BAD_REQUEST`, `UNAUTHORIZED`, `FORBIDDEN`, `PRECONDITION_FAILED`, `NOT_FOUND` inacessível, `TOO_MANY_REQUESTS`, `SERVICE_UNAVAILABLE`. |
| `projects.create` mutation | `{name:string,description?:string,nodeId:string}` | `ProjectDto` criado | `BAD_REQUEST`, `UNAUTHORIZED`, `FORBIDDEN`, `PRECONDITION_FAILED` sem acesso, `CONFLICT` nome/repositório, `TOO_MANY_REQUESTS`, `SERVICE_UNAVAILABLE`, `INTERNAL_SERVER_ERROR`. |
| `projects.updateDetails` mutation | `{projectId:uuid,name:string,description:string|null,expectedVersion:number}` | `ProjectDto` com versão incrementada | `BAD_REQUEST` inclusive campo de repositório desconhecido, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT` nome/versão, `INTERNAL_SERVER_ERROR`. |
| `projects.connectionStates` query | `{projectIds:uuid[]}`; 1–50 IDs | `ConnectionState[]` para os IDs visíveis | `BAD_REQUEST`, `UNAUTHORIZED`, `NOT_FOUND` se algum ID não for visível, `INTERNAL_SERVER_ERROR` banco; falha GitHub vira estado, não lista vazia. |
| `projects.repositoryContext` query | `{projectId:uuid}` | `{repository:RepositoryIdentity,defaultBranch:string}` após autorização dupla | `BAD_REQUEST`, `UNAUTHORIZED`, `NOT_FOUND` Flow Dev, `PRECONDITION_FAILED` consentimento, `FORBIDDEN` GitHub, `TOO_MANY_REQUESTS`, `SERVICE_UNAVAILABLE`. |
| `POST /api/github-repositories/connect` | Sessão/cookie; `returnTo` local permitido | 303 para consentimento GitHub, grava estado e PKCE | 400 destino inválido, 401 sem sessão, 403 origem externa, 500 banco/configuração. |
| `GET /api/github-repositories/callback` | `state`, `code` ou `error` GitHub | 303 para destino interno com resultado de conexão | 303 para destino interno com `acesso_negado`, `conta_diferente`, `falha_autorizacao` ou `falha_temporaria`; nenhum token persistido em falha. |

`projects.repositoryCandidates` percorre `GET /user/repos?affiliation=owner,collaborator,organization_member&per_page=100`, seguindo a paginação GitHub. Uma busca pode precisar varrer lotes subsequentes; o cursor guarda a continuação e o termo. A interface continua carregando até encontrar resultados ou terminar, sem confundir “nenhum resultado neste lote” com “nenhum repositório”. Entrada direta `owner/name` usa `repositoryPreview` e oferece acesso aos repositórios que a lista ainda não alcançou. O cursor não aceita URL GitHub arbitrária: somente página/continuador validado para `api.github.com`, com limite de trabalho por requisição. A busca do catálogo usa SQL nos nomes de projeto, proprietário e repositório; cursor `(created_at,id)` estável e filtro de acesso no próprio SQL. O vínculo existente é mostrado apenas a administradores.

Na criação, o servidor busca o `nodeId` de novo com o token do administrador, confirma o ID numérico e metadados atuais, e insere em uma transação. Índices únicos resolvem corrida por nome ou repositório. Repetir a criação do mesmo repositório retorna `CONFLICT` com `existingProjectId` seguro para administrador, inclusive após resposta perdida; não cria uma segunda linha. A edição executa `UPDATE ... WHERE id=? AND details_version=?`, incrementa a versão uma vez e não aceita campos de repositório. Uma repetição com versão antiga retorna `CONFLICT` e os detalhes atuais para revisão. Nenhuma operação deixa nome e descrição parcialmente salvos.

`/` segue a decisão da autenticação: restaura a última seleção somente se ainda for permitida; caso contrário abre `/projects`. `/projects` é o catálogo; `/projects/new` exige administrador; `/projects/[projectId]` é o shell; `/projects/[projectId]/settings` permite editar detalhes para administradores; `/projects/[projectId]/issues` contém o workspace demonstrativo já existente, contextualizado pelo ID da rota. A rota e cada procedimento revalidam acesso. Troca de projeto não altera outra aba; resposta assíncrona com ID antigo é descartada. O shell pode mostrar identidade salva durante falha GitHub, mas conteúdo privado e ações dependentes ficam bloqueados. As entradas de rota ficam em `app/`, comportamento em `features/projects/`; cliente tRPC existente em `lib/trpc/`. O layout segue [DESIGN.md](../../../apps/web/DESIGN.md), textos visíveis em português e estados de erro distintos.

## Integrações

| Serviço | Uso e autorização | Falhas e repetição |
| --- | --- | --- |
| GitHub OAuth App de repositórios | Segundo client ID/secret e callback por ambiente; escopos `repo offline_access`; OAuth code + PKCE + `state`; token sempre do usuário atual. | Negação não apaga credencial anterior válida; revogação/expiração exigem renovação ou consentimento. Organização pode exigir aprovação; não inferir que o login de identidade basta. |
| GitHub REST/GraphQL | `GET /user` valida identidade; `GET /user/repos` pagina candidatos; `GET /repos/{owner}/{repo}` valida entrada direta; GraphQL `node(id)` confere ID e acompanha rename/transfer. | 401: renovar ou reconectar; 403/429: respeitar `Retry-After`/rate limit e mostrar indisponibilidade; 5xx/timeout: retry curto só para leitura; 404/nó nulo: sem acesso ou ausente, nunca substituir por outro repositório. Comparar sempre `databaseId` com ID persistido antes de usar resposta. |
| PostgreSQL | Catálogo, atribuições da autenticação, credenciais criptografadas e estados OAuth. | Transações e índices são a autoridade para concorrência; falha DB mostra erro recuperável, nunca catálogo vazio falso. |

O [escopo `repo` concede acesso amplo a repositórios públicos e privados](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/scopes-for-oauth-apps); isto é consequência explícita da escolha B. A [API de paginação do GitHub](https://docs.github.com/en/rest/using-the-rest-api/using-pagination-in-the-rest-api) usa `Link`; nenhuma página única é tratada como lista completa. `node_id` permite resolver o mesmo objeto após mudança de URL ([guia GitHub](https://docs.github.com/en/graphql/guides/using-global-node-ids)). Sem token de repositório, a verificação tenta `GET /repos/{owner}/{name}` público e só considera o projeto disponível se a resposta pública tiver o mesmo ID; 404 pede autorização sem afirmar que o repositório continua privado. A resposta GitHub 404 é ambígua para recurso privado; `access_denied_or_missing` é uma inferência deliberadamente conservadora. Repositórios `internal` seguem o caminho de autorização privada.

## Análise de impacto

| Componente | Tipo | Alteração e risco | Ação |
| --- | --- | --- | --- |
| Esquema e importação `packages/api` | Modificado | Projetos legados não têm repositório; risco alto de migração | Backfill verificado, restrições `NOT NULL`/únicas, abortar sem mapeamento. |
| Camadas de projetos `packages/api` | Modificado | DAO em memória e criação pública não atendem acesso/concorrência | Substituir por DAO PostgreSQL, serviço e controller protegidos. |
| Integração GitHub e credenciais | Novo | Escopo amplo e renovação de token; risco alto | OAuth separado, criptografia, PKCE, checagem de identidade e logs redigidos. |
| Router tRPC | Modificado | Novos contratos e códigos de erro; risco médio | Procedimentos protegidos/admin e DTOs inferidos. |
| Rotas e features `apps/web` | Modificado/novo | Home e `/dev` hoje contornam projeto; risco médio | Catálogo inicial, shell, criação, edição e estados de conexão. |
| Workspace demonstrativo | Modificado | Estado local pode atravessar projetos; risco médio | Mover sob rota de projeto, chavear pelo ID, limpar em perda de acesso. |
| Implantação | Novo | Dois OAuth Apps e banco precisos; risco médio | Segredos por ambiente, callbacks exatos, migração antes do tráfego. |

## Abordagem de testes

O contrato completo está em [_tests.md](_tests.md). Instalar Vitest no pacote API e Testing Library para componentes React; fakes apenas em GitHub, relógio e criptografia/I/O nos testes unitários. Integração usa PostgreSQL descartável com migrações reais, `createCaller` tRPC, Route Handlers HTTP e servidor GitHub controlado, incluindo concorrência e falhas. E2E usa Playwright, dados independentes por teste, credenciais de teste e locators acessíveis conforme `.agents/rules/e2e-testing.md`. A verificação remota de consentimento, aprovação organizacional, rename/transfer e navegadores múltiplos fica em `qa-release`. Dados de produção não são usados em testes.

## Sequência de desenvolvimento

1. Confirmar que a autenticação implementada fornece sessão, `SessionPrincipal`, atribuições, catálogo durável e `last_project_id`; reconciliar importação legada e migrar esquema de projetos.
2. Criar armazenamento criptografado, estados OAuth, callbacks e cliente GitHub; verificar identidade e renovação.
3. Implementar `ProjectDao`, serviços de criação/edição, autorização dupla e estados; adicionar procedimentos tRPC.
4. Criar catálogo, seleção, picker paginado, criação e edição; mover shell e menus para rotas com `projectId`.
5. Executar contrato unitário e de integração, jornadas Playwright e verificações de implantação/consentimento.

### Dependências técnicas

PostgreSQL e migrações Drizzle da autenticação; Better Auth com sessão atual verificável; `GITHUB_REPOSITORY_CLIENT_ID`, `GITHUB_REPOSITORY_CLIENT_SECRET`, `GITHUB_REPOSITORY_TOKEN_KEY` de 32 bytes por ambiente e callback `${BETTER_AUTH_URL}/api/github-repositories/callback`; GitHub OAuth App separado do login; manifesto de backfill para todo projeto legado mantido. A implantação falha se faltar segredo, callback, migração, mapeamento legado ou autorização administrativa de verificação. Confirmar a implementação real da autenticação antes de codificar: ela ainda não existe no repositório analisado.

## Monitoramento e observabilidade

Registrar `requestId`, `userId` interno, `projectId`, ID GitHub, procedimento, resultado, duração e classe da falha; nunca token, código OAuth, cookie, URL completa de callback ou conteúdo privado. Métricas: falhas OAuth por tipo, 401/403/404/429/5xx GitHub, estados de conexão por classe, conflitos de nome/repositório, latência p95 de catálogo/preview/ação de repositório e falhas de renovação. Alertar para falha contínua de OAuth/DB por cinco minutos ou aumento sustentado de 429; reduzir lotes e seguir `Retry-After` antes de repetir chamadas GitHub. Auditar criação/edição com ator, projeto, versão e ID GitHub, sem segredo.

## Considerações técnicas

### Decisões

- OAuth de repositórios separado do login, conforme [ADR-004](adrs/adr-004.md): consentimento opcional, custo de escopo amplo e segundo aplicativo.
- ID numérico GitHub imutável mais `node_id` para resolução, conforme [ADR-005](adrs/adr-005.md): backfill obrigatório e nenhum projeto sem origem verificada.
- Estado pessoal em consulta separada e revalidação por ação, conforme [ADR-006](adrs/adr-006.md): catálogo rápido, sem prometer conexão saudável a partir de cache.

### Riscos conhecidos

- OAuth `repo` permite mais do que leitura; futura ação de escrita deve ter confirmação própria e checar permissão GitHub atual. Tokens são cifrados em repouso, mas uma credencial roubada ainda tem amplo alcance.
- GitHub 404 não prova exclusão. O estado mostrado é “acesso ou repositório indisponível” até haver evidência verificável; a identidade Flow Dev persiste.
- O repositório pode mudar entre pré-verificação e chamada futura. Toda ação compara ID retornado; rótulos só são atualizados após confirmação.
- Paginação da lista GitHub e busca incremental podem ser lentas em contas enormes; a UI mantém cursor visível/progresso e entrada direta `owner/name`, sem limite silencioso.
- A especificação de autenticação tem importação de projetos sem repositório. Sua implementação deve adotar o backfill/restrição aqui definidos antes de liberar este recurso.

## Architecture Decision Records

- [ADR-001: One GitHub repository is the project source of truth](adrs/adr-001.md) — uma origem de código por projeto.
- [ADR-002: Project membership and GitHub access both govern code use](adrs/adr-002.md) — autorização dupla.
- [ADR-003: Project catalog is the gateway to project menus](adrs/adr-003.md) — entrada orientada a projetos.
- [ADR-004: Autorizar repositórios com um segundo aplicativo OAuth GitHub](adrs/adr-004.md) — escolha de OAuth separado com `repo`.
- [ADR-005: Persistir identidade imutável do repositório e migrar o catálogo legado](adrs/adr-005.md) — ID estável e backfill obrigatório.
- [ADR-006: Resolver estado de conexão por usuário e revalidar ações de repositório](adrs/adr-006.md) — status pessoal e checagem por ação.
