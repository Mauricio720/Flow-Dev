# Especificação de testes: projetos vinculados ao GitHub

Contrato canônico de verificação para [_techspec.md](_techspec.md), derivado das [histórias](_user_stories.md). IDs são permanentes. `task-required` acompanha a tarefa que implementa o comportamento; `feature-gate` roda após as fatias dependentes; `qa-release` usa ambiente de QA/staging e nenhuma credencial de produção.

## Estratégia

- **Harness:** Vitest para API e funções de interface, Testing Library para componentes React; fake apenas em HTTP GitHub, relógio e armazenamento de teste. Integração usa PostgreSQL descartável com migrações, tRPC `createCaller` e Route Handlers HTTP contra servidor GitHub controlado. Playwright usa usuários/dados isolados por teste e locators por papel/rótulo.
- **Execução:** adicionar scripts de teste nos pacotes quando implementados; executar testes unitários e integração focados na tarefa, `pnpm lint`, `pnpm typecheck` e `pnpm build`. Rodar E2E do fluxo completo em `feature-gate`; consentimento GitHub real, organização, rename/transfer e matriz de navegadores em `qa-release`.
- **Convenções:** fixtures explícitas `adminA`, `adminB`, `memberA`, `unassigned`, projeto `p1→acme/private` (privado, ID `202`) e projeto `p2→octo/docs` (público, ID `101`); tokens e cookies somente no ambiente de teste. Cada caso prepara seu estado e limpa o que criar. Códigos tRPC são os da TechSpec; `404` GitHub privado permanece ambíguo. Testes de componentes verificam texto/estado acessível, sem classes CSS ou detalhes internos.

## Matriz de cobertura

Cada linha de história e cada `EC` aponta para pelo menos um caso. As linhas de componente e API cobrem seus contratos, inclusive erros.

| Fonte | Comportamento | Task-required | Feature-gate | QA/release |
| --- | --- | --- | --- | --- |
| US-001 | Catálogo permitido | UT-035, IT-046 | E2E-001 | — |
| US-001.EC-1 | Sem descrição | UT-001 | — | — |
| US-001.EC-2 | Zero projetos | — | E2E-001 | — |
| US-001.EC-3 | Carregamento repetido | UT-002 | — | — |
| US-001.EC-4 | Sessão expira | — | IT-001 | — |
| US-001.EC-5 | Atribuição removida | — | IT-002 | — |
| US-001.EC-6 | Lista interrompida | — | IT-003 | — |
| US-001.EC-7 | Nome especial/longo | UT-003 | — | — |
| US-001.EC-8 | Muitas páginas | — | IT-004 | — |
| US-002 | Entrar e trocar projeto | UT-043, IT-049 | E2E-002 | — |
| US-002.EC-1 | ID inválido/desconhecido | — | IT-005 | — |
| US-002.EC-2 | Revogação de atribuição | — | IT-006 | — |
| US-002.EC-3 | Seleção repetida | UT-004 | — | — |
| US-002.EC-4 | Seleção concorrente na UI | UT-005 | — | — |
| US-002.EC-5 | Interrupção ao selecionar | — | IT-007 | — |
| US-002.EC-6 | Aba antiga | — | IT-008 | — |
| US-002.EC-7 | Repositório desconectado | — | IT-009 | — |
| US-002.EC-8 | Voltar ao catálogo | — | E2E-002 | — |
| US-003 | Escolher repositório | UT-037, IT-050 | E2E-003 | — |
| US-003.EC-1 | URL ou busca inválida | UT-006 | — | — |
| US-003.EC-2 | Lista vazia/sem matches | UT-007 | — | — |
| US-003.EC-3 | Muitos repositórios | — | IT-010 | — |
| US-003.EC-4 | Consentimento negado | — | IT-011 | E2E-003 |
| US-003.EC-5 | Acesso removido antes da revisão | — | IT-012 | — |
| US-003.EC-6 | Duas abas no mesmo repositório | — | IT-013 | — |
| US-003.EC-7 | Rate limit/queda GitHub | — | IT-014 | — |
| US-003.EC-8 | Cancelar autorização | — | IT-015 | — |
| US-003.EC-9 | Rename durante picker | — | IT-016 | — |
| US-004 | Criar projeto | UT-013, IT-052 | E2E-004 | — |
| US-004.EC-1 | Nome inválido | UT-008 | — | — |
| US-004.EC-2 | Descrição opcional/longa | UT-009 | — | — |
| US-004.EC-3 | Repositório ausente/inacessível | — | IT-017 | — |
| US-004.EC-4 | Criação concorrente | — | IT-018 | — |
| US-004.EC-5 | Envio duplo | — | IT-019 | — |
| US-004.EC-6 | Sessão/papel expira | — | IT-020 | — |
| US-004.EC-7 | Resposta incerta | — | IT-021 | — |
| US-004.EC-8 | Criar sem login | — | IT-022 | — |
| US-004.EC-9 | Catálogo grande após criar | — | IT-023 | — |
| US-005 | Editar detalhes | UT-041, IT-053 | E2E-005 | — |
| US-005.EC-1 | Nome inválido/duplicado | UT-010 | — | — |
| US-005.EC-2 | Limpar descrição | UT-011 | — | — |
| US-005.EC-3 | Edição forjada | — | IT-024 | — |
| US-005.EC-4 | Duas edições obsoletas | — | IT-025 | — |
| US-005.EC-5 | Salvar interrompido | — | IT-026 | — |
| US-005.EC-6 | Repetir save | — | IT-027 | — |
| US-005.EC-7 | Substituir repositório | — | IT-028 | — |
| US-005.EC-8 | Detalhe longo no card | UT-012 | — | — |
| US-006 | Autorização dupla e conteúdo público | UT-028, IT-055 | E2E-006, IT-069 | — |
| US-006.EC-1 | GitHub revogado | — | IT-029 | — |
| US-006.EC-2 | Assignment revogado | — | IT-030 | — |
| US-006.EC-3 | Token expira | — | IT-031 | — |
| US-006.EC-4 | Falha temporária | — | IT-032 | — |
| US-006.EC-5 | Repetir autorização | — | IT-033 | — |
| US-006.EC-6 | Aba de outro projeto | — | IT-034 | — |
| US-006.EC-7 | Conteúdo grande | — | IT-035 | — |
| US-006.EC-8 | Designado sem GitHub | — | IT-036 | — |
| US-007 | Continuidade e estados | UT-032, IT-054 | E2E-007 | — |
| US-007.EC-1 | URL antiga após rename | — | IT-037 | — |
| US-007.EC-2 | Transferência bloqueada | — | IT-038 | E2E-008 |
| US-007.EC-3 | Repositório excluído/indisponível | — | IT-039 | — |
| US-007.EC-4 | Dois usuários consultam | — | IT-040 | — |
| US-007.EC-5 | Reparo interrompido | — | IT-041 | — |
| US-007.EC-6 | Outage recupera | — | IT-042 | — |
| US-007.EC-7 | Deep link desconectado | — | IT-043 | — |
| US-007.EC-8 | Muitos estados antigos | — | IT-044 | — |
| US-007.EC-9 | Repositório arquivado | — | IT-045 | — |
| `ProjectDao` | Consulta, inserção, CAS, erro DB | UT-049, UT-050 | IT-018, IT-025, IT-066, IT-068 | — |
| `ProjectCatalogService` | Regras de criação/edição | UT-013–UT-015 | IT-052, IT-053 | — |
| `ProjectsController` | DTOs e tradução de erros | UT-016, UT-017 | IT-052, IT-061 | — |
| `GitHubRepositoryGateway` | REST/GraphQL, IDs e falhas | UT-018–UT-020 | IT-010, IT-039, IT-061 | E2E-008 |
| `RepositoryAuthorizationService` | OAuth, identidade e renovação | UT-021–UT-025 | IT-057, IT-065 | E2E-009 |
| `github_repository_authorizations`/cripto | Token cifrado, falha de chave | UT-026, UT-027 | IT-031, IT-067 | — |
| `RepositoryAccessService` | Duas permissões e arquivo | UT-028–UT-031 | IT-029, IT-030, IT-055 | — |
| `ConnectionStateService` | Lote e estado pessoal | UT-032–UT-034 | IT-040, IT-054 | — |
| Catálogo React | Lista, erro, vazio | UT-035, UT-036 | E2E-001 | — |
| Picker React | Busca e recuperação | UT-037, UT-038 | E2E-003 | — |
| Formulário de criação | Validação e draft | UT-039, UT-040 | E2E-004 | — |
| Formulário de edição | Versão e conflito | UT-041, UT-042 | E2E-005 | — |
| Shell de projeto | Contexto e revogação | UT-043, UT-044 | E2E-002, E2E-006 | — |
| Callbacks OAuth HTTP | Estado, PKCE e falhas | UT-045, UT-046 | IT-056–IT-058, IT-064 | E2E-009 |
| Router tRPC | Middleware e schemas | UT-047, UT-048 | IT-059–IT-063 | — |
| `projects.list` | Página e falhas | UT-035 | IT-001, IT-003, IT-046, IT-047, IT-059, IT-063 | — |
| `projects.byId` | Detalhe permitido e falhas | UT-016 | IT-005, IT-048, IT-059, IT-063 | — |
| `projects.select` | Preferência validada e falhas | UT-004 | IT-006, IT-049, IT-059, IT-063 | — |
| `projects.repositoryCandidates` | Lista GitHub e falhas | UT-018 | IT-010, IT-014, IT-050, IT-060–IT-063 | — |
| `projects.repositoryPreview` | Revisão e falhas | UT-019 | IT-012, IT-016, IT-051, IT-060–IT-063 | — |
| `projects.create` | Criação e falhas | UT-013 | IT-017–IT-022, IT-052, IT-060–IT-063, IT-071 | — |
| `projects.updateDetails` | CAS e falhas | UT-014 | IT-024–IT-028, IT-053, IT-059, IT-063, IT-071 | — |
| `projects.connectionStates` | Lote e falhas | UT-032 | IT-040, IT-054, IT-059, IT-063 | — |
| `projects.repositoryContext` | Metadado autorizado e falhas | UT-028 | IT-029–IT-032, IT-055, IT-059–IT-062 | — |
| `POST /api/github-repositories/connect` | Início e falhas | UT-045 | IT-056, IT-058, IT-064, IT-070 | — |
| `GET /api/github-repositories/callback` | Sucesso/erro seguro | UT-046 | IT-011, IT-057, IT-065 | E2E-009 |

## Testes unitários

### Catálogo, validação e apresentação

- **UT-001** (`task-required`, `boundary`): card de catálogo recebe `description:null` para `octo/docs` e exibe nome e `octo/docs` sem texto de descrição inventado.
- **UT-002** (`task-required`, `idempotency`): merge de páginas recebe duas entradas com `id=p1` e mantém uma opção com destino `/projects/p1`.
- **UT-003** (`task-required`, `boundary`): card com nome de 60 caracteres e `owner/repo` com caracteres especiais preserva ambos em nomes acessíveis e não executa HTML fornecido.
- **UT-004** (`task-required`, `idempotency`): seleção de `p1` quando `p1` já é ativo mantém `lastProjectId=p1` e não reinicia o workspace.
- **UT-005** (`task-required`, `ordering`): respostas assíncronas de `p1` e depois `p2` chegam na ordem inversa; o shell mantém `p2` como atual.
- **UT-006** (`task-required`, `error`): parser de entrada direta rejeita `https://evil.example/acme/private` e `acme/`, retornando erro de campo sem chamar GitHub.
- **UT-007** (`task-required`, `state`): picker distingue `items=[]` com `nextCursor` de `items=[]` sem cursor; mostra “Continuar busca” no primeiro e “Nenhum resultado” no segundo.
- **UT-008** (`task-required`, `boundary`): schema de criação rejeita `" "` e 61 caracteres, aceita 2 e 60 após trim e não chama controller nas rejeições.
- **UT-009** (`task-required`, `boundary`): schema aceita `description` ausente e 280 caracteres, rejeita 281 com erro no campo.
- **UT-010** (`task-required`, `error`): serviço de edição normaliza `" Projeto "` e identifica conflito com `"projeto"` de outro ID, preservando a versão anterior.
- **UT-011** (`task-required`, `state`): edição com `description:""` envia `null` e conserva `githubRepositoryId=202`.
- **UT-012** (`task-required`, `boundary`): card compacto com nome de 60 e descrição de 280 caracteres mantém nome do projeto e `acme/private` acessíveis sem ocultar o destino.

### Camadas de projeto

- **UT-013** (`task-required`, `happy`): `ProjectCatalogService.create` com nome `" Alpha "`, descrição ausente e repositório verificado ID `202` envia ao DAO `name:"Alpha",description:null,githubRepositoryId:"202"`.
- **UT-014** (`task-required`, `error`): `ProjectCatalogService.updateDetails` recebe `expectedVersion:2` para versão atual `3` e lança `StaleProjectVersion` sem gravar.
- **UT-015** (`task-required`, `error`): `ProjectCatalogService.create` recebe identidade GitHub `202` já vinculada e lança `ProjectConflict` com referência ao projeto existente.
- **UT-016** (`task-required`, `happy`): `ProjectsController.byId` mapeia registro permitido `p1` para DTO sem token ou campo cifrado.
- **UT-017** (`task-required`, `error`): controller traduz `RepositoryUnavailable` em `SERVICE_UNAVAILABLE` com mensagem portuguesa e `cause` preservada para logs.
### GitHub, OAuth e acesso

- **UT-018** (`task-required`, `happy`): gateway converte `GET /user/repos` com `id:202,node_id:"R_202"` e `Link: rel="next"` em item `acme/private` e cursor seguinte.
- **UT-019** (`task-required`, `error`): `resolvePath` recebe resposta `id:303` para caminho antigo de projeto `202` e lança `RepositoryIdentityMismatch`; não atualiza rótulo.
- **UT-020** (`task-required`, `error`): gateway recebe 429 com `Retry-After:60` e retorna `RepositoryRateLimited(60)` sem tentar páginas seguintes.
- **UT-021** (`task-required`, `happy`): `RepositoryAuthorizationService.complete` recebe `GET /user.id=77`, igual à conta da sessão, `scope=repo` e persiste só credencial cifrada para `userId=u1`.
- **UT-022** (`task-required`, `error`): callback recebe `GET /user.id=88` enquanto sessão é GitHub ID `77`; descarta token e retorna `AccountMismatch`.
- **UT-023** (`task-required`, `idempotency`): segundo consumo do mesmo `state` OAuth produz `InvalidOAuthState` e não troca novamente o código.
- **UT-024** (`task-required`, `state`): token expirado com refresh válido renova uma vez sob bloqueio e troca ambos os ciphertexts atomicamente.
- **UT-025** (`task-required`, `error`): refresh revogado retorna `RepositoryAuthorizationNeeded` e não expõe o refresh token em mensagem/log.
- **UT-026** (`task-required`, `happy`): armazenamento grava token `gho_test` com AES-GCM e leitura autorizada recupera o mesmo valor; consulta direta à linha não contém texto do token.
- **UT-027** (`task-required`, `error`): ciphertext adulterado ou chave de versão desconhecida falha fechado com `CredentialUnavailable`, sem retornar bytes parciais.
- **UT-028** (`task-required`, `happy`): `requireRead(u1,p1)` com atribuição válida e `node.databaseId=202` devolve identidade `202` e não outro projeto.
- **UT-029** (`task-required`, `error`): `requireRead(u1,p1)` sem atribuição lança `ProjectNotFound` antes de chamar gateway GitHub.
- **UT-030** (`task-required`, `error`): gateway devolve `databaseId=303` para `p1` vinculado a `202`; `requireRead` lança `RepositoryIdentityMismatch` sem devolver metadados.
- **UT-031** (`task-required`, `state`): `requireWrite` de repositório `archived:true` recusa ação com `RepositoryArchived`; `requireRead` permite leitura.
- **UT-032** (`task-required`, `happy`): `forVisibleProjects(u1,[p1,p2])` devolve `available` para público `101` e `authorization_needed` para privado `202` sem token.
- **UT-033** (`task-required`, `error`): GraphQL retorna `node:null` para privado `202`; estado é `access_denied_or_missing`, nunca `deleted`.
- **UT-034** (`task-required`, `boundary`): lista de 51 IDs é rejeitada com `BAD_REQUEST`; 50 IDs geram lote limitado e 50 respostas indexadas por ID.

### Componentes e fronteiras

- **UT-035** (`task-required`, `happy`): catálogo recebe projeto `p1` e estado `checking`; mostra nome, `acme/private` e rótulo “Verificando acesso”.
- **UT-036** (`task-required`, `error`): catálogo recebe erro de `projects.list`; mostra ação “Tentar novamente” e não mostra estado “Sem projetos”.
- **UT-037** (`task-required`, `happy`): picker recebe candidato `202` com `linkedProjectId=p1`; mostra “Já vinculado” e desativa seleção.
- **UT-038** (`task-required`, `error`): picker recebe `TOO_MANY_REQUESTS` após busca; mantém termo/draft e mostra retry.
- **UT-039** (`task-required`, `happy`): formulário de criação com `Alpha`, `nodeId:R_202` e descrição vazia chama `projects.create` uma vez com `description:null`.
- **UT-040** (`task-required`, `error`): criação recebe `CONFLICT` de repositório `202`; mostra link para projeto existente `p1` e mantém campos preenchidos.
- **UT-041** (`task-required`, `happy`): formulário de edição de `p1` versão `3` envia somente `projectId,name,description,expectedVersion`; repositório aparece apenas como leitura.
- **UT-042** (`task-required`, `error`): edição recebe `CONFLICT` versão `4`; mostra dados atuais e exige revisão antes de novo envio.
- **UT-043** (`task-required`, `happy`): shell recebe `p2` após `p1`; cabeçalho mostra `p2`/`acme/private` e workspace anterior não aparece como atual.
- **UT-044** (`task-required`, `error`): shell recebe `NOT_FOUND` para `p1` revogado; oculta menus e mostra retorno ao catálogo.
- **UT-045** (`task-required`, `happy`): início OAuth gera `state` único, PKCE S256 e URL com `scope=repo offline_access` e callback fixo.
- **UT-046** (`task-required`, `error`): callback com `state` ausente/expirado não troca `code` e redireciona com `falha_autorizacao`.
- **UT-047** (`task-required`, `happy`): router `projects.create` com principal admin e input `{name:"Alpha",nodeId:"R_202"}` passa `actor` da sessão ao controller, sem aceitar identidade do cliente.
- **UT-048** (`task-required`, `error`): router `projects.updateDetails` rejeita `githubRepositoryId`, `repositoryUrl` ou `userId` no input com `BAD_REQUEST` antes do controller.
- **UT-049** (`task-required`, `happy`): `ProjectDao.listVisible` com ator membro de `p1` e `p2` e página de 1 retorna só `p1` e cursor `(created_at,id)` válido.
- **UT-050** (`task-required`, `error`): `ProjectDao.insertVerified` diante de erro único `github_repository_id` produz conflito de repositório; erro SQL bruto não entra no DTO.

## Testes de integração

### Catálogo e contexto

- **IT-001** (`feature-gate`): `projects.list` com sessão expirada após catálogo aberto devolve `UNAUTHORIZED`; a página limpa nomes privados e envia ao login.
- **IT-002** (`feature-gate`): remover atribuição `u1→p1` no banco entre página e seleção; `projects.select(p1)` devolve `NOT_FOUND` e novo `projects.list` omite `p1`.
- **IT-003** (`feature-gate`): banco indisponível em `projects.list` devolve `INTERNAL_SERVER_ERROR`; UI oferece retry e não estado vazio.
- **IT-004** (`feature-gate`): criar 121 projetos atribuídos a `u1`; três páginas de 50/50/21 retornam 121 IDs distintos e cursor final `null`.
- **IT-005** (`feature-gate`): `projects.byId` com UUID malformado devolve `BAD_REQUEST`; UUID desconhecido devolve `NOT_FOUND`, sem outro projeto no corpo.
- **IT-006** (`feature-gate`): remover acesso `u1→p1` após seleção; `projects.byId(p1)` e menu protegido devolvem `NOT_FOUND`.
- **IT-007** (`feature-gate`): interromper resposta de `projects.select(p2)`; novo `/` revalida `last_project_id` e abre `p1` válido ou catálogo, sem misturar dados.
- **IT-008** (`feature-gate`): aba antiga de `p1` após revogação recebe `NOT_FOUND` em próxima chamada de projeto, mesmo com token GitHub válido.
- **IT-009** (`feature-gate`): `p1` ainda permitido com GitHub 503 abre shell com identidade salva e `temporarily_unavailable`, sem conteúdo de código.

### Picker e OAuth

- **IT-010** (`feature-gate`): GitHub simula 230 repositórios e busca por `repo-229`; `repositoryCandidates` percorre páginas/cursor até devolver o item, sem truncar em 100.
- **IT-011** (`feature-gate`): callback GitHub com `error=access_denied` consome estado e redireciona com `acesso_negado`; tabela de credenciais permanece sem nova linha.
- **IT-012** (`feature-gate`): preview de `R_202` após GitHub revogar acesso retorna `NOT_FOUND`; criação subsequente não insere projeto.
- **IT-013** (`feature-gate`): duas sessões admin tentam criar `R_202`; uma transação insere `github_repository_id=202`, outra recebe `CONFLICT` com `existingProjectId`.
- **IT-014** (`feature-gate`): `repositoryCandidates` recebe GitHub 429 e devolve `TOO_MANY_REQUESTS`; formulário preserva nome/descrição ao retry.
- **IT-015** (`feature-gate`): iniciar OAuth e cancelar no GitHub; nenhuma linha de `projects` ou credencial é criada pela visualização do picker.
- **IT-016** (`feature-gate`): picker mostra `acme/old` para ID `202`, GitHub renomeia para `acme/new`; `repositoryPreview(R_202)` confirma `202` e mostra `acme/new` antes de criar.

### Criação e edição

- **IT-017** (`feature-gate`): `projects.create` com `nodeId:R_404` sem acesso GitHub devolve `PRECONDITION_FAILED` e contagem de projetos não muda.
- **IT-018** (`feature-gate`): dois administradores criam nome `Alpha`/`alpha` com repositórios diferentes em paralelo; um commit vence e o outro recebe `CONFLICT` de nome.
- **IT-019** (`feature-gate`): enviar duas vezes `projects.create` para ID GitHub `202`; banco contém uma linha e segunda resposta aponta `existingProjectId`.
- **IT-020** (`feature-gate`): remover designação admin antes de `projects.create`; chamada retorna `FORBIDDEN` e nenhuma linha aparece.
- **IT-021** (`feature-gate`): perder resposta após commit de `projects.create(R_202)` e repetir; retry recebe `CONFLICT(existingProjectId=p1)`, sem duplicata.
- **IT-022** (`feature-gate`): `GET /projects/new` e `projects.create` sem sessão exigem login/`UNAUTHORIZED`; picker não devolve repositórios privados.
- **IT-023** (`feature-gate`): com 120 projetos, criar `p121`; busca SQL e paginação retornam o novo projeto e preservam os 120 antigos.
- **IT-024** (`feature-gate`): membro não administrador envia `projects.updateDetails(p1)`; recebe `FORBIDDEN` e versão/nome permanecem iguais.
- **IT-025** (`feature-gate`): duas edições de `p1` versão `3`; primeira grava versão `4`, segunda recebe `CONFLICT` com detalhes atuais.
- **IT-026** (`feature-gate`): interromper resposta após commit de edição; leitura seguinte mostra nome e descrição ambos da versão `4`, não mistura `3/4`.
- **IT-027** (`feature-gate`): repetir save com `expectedVersion:3` após versão `4`; recebe `CONFLICT` e nenhuma versão `5` é criada.
- **IT-028** (`feature-gate`): payload direto de edição inclui `githubRepositoryId:303`; Zod devolve `BAD_REQUEST` e banco mantém `202`.

### Permissões e continuidade

- **IT-029** (`feature-gate`): usuário `u1` perde acesso GitHub a privado `202`; próxima `projects.repositoryContext(p1)` devolve `FORBIDDEN`, sem metadados privados em cache HTTP.
- **IT-030** (`feature-gate`): remover atribuição `u1→p1` mantendo GitHub válido; `repositoryContext(p1)` devolve `NOT_FOUND` antes de chamar GitHub.
- **IT-031** (`feature-gate`): token expirado renova uma vez e a leitura prossegue; refresh expirado devolve `PRECONDITION_FAILED` e mantém projeto visível.
- **IT-032** (`feature-gate`): GitHub retorna 503 para `repositoryContext(p1)`; tRPC devolve `SERVICE_UNAVAILABLE`, sem conteúdo antigo como atual.
- **IT-033** (`feature-gate`): duas tentativas de consentimento para `u1` terminam; só a última credencial válida é armazenada e nenhuma atribuição/projeto é criada.
- **IT-034** (`feature-gate`): aba com `/projects/p1/issues` envia `projectId=p2` forjado sem atribuição; operação devolve `NOT_FOUND` e não retorna repositório `p2`.
- **IT-035** (`feature-gate`): GitHub simula repositório com milhares de arquivos; `/projects/p1` renderiza shell após metadados mínimos sem baixar árvore ou conteúdo completo.
- **IT-036** (`feature-gate`): admin atribui `p1` a `u1` sem OAuth de repositório; `projects.list` mostra `p1`, `connectionStates` retorna `authorization_needed` e `repositoryContext` retorna `PRECONDITION_FAILED`.
- **IT-037** (`feature-gate`): caminho antigo `acme/old` resolve ID `202` renomeado; projeto `p1` preserva ID `202` e rótulo passa a `acme/new`.
- **IT-038** (`feature-gate`): transferência de ID `202` para organização que nega OAuth mantém `p1` no catálogo; estado pessoal vira `access_denied_or_missing`.
- **IT-039** (`feature-gate`): GitHub retorna `node:null` para ID `202` removido; `p1` continua no banco, sem substituição por ID `303`, e estado é `access_denied_or_missing`.
- **IT-040** (`feature-gate`): `u1` e `u2` consultam `p1` simultaneamente; `u1` recebe `available`, `u2` recebe `authorization_needed`, ambos com ID GitHub `202`.
- **IT-041** (`feature-gate`): callback de reparo falha antes de salvar token; nova consulta mantém `authorization_needed` até callback válido posterior.
- **IT-042** (`feature-gate`): GitHub 503 seguido de sucesso para ID `202`; primeiro estado é `temporarily_unavailable`, segundo `available`, com mesmo `projectId`.
- **IT-043** (`feature-gate`): abrir diretamente `/projects/p1` com GitHub 503 mostra shell e estado temporário após guarda Flow Dev, sem catálogo prévio.
- **IT-044** (`feature-gate`): 150 projetos com verificação antiga geram catálogo SQL em três páginas; `connectionStates` verifica apenas os 50 IDs pedidos por lote.
- **IT-045** (`feature-gate`): GitHub marca ID `202` como arquivado; estado é `archived`, `requireRead` aceita e `requireWrite` recusa.

### Contratos de endpoint, migração e fronteiras

- **IT-046** (`task-required`): `projects.list` como admin retorna todos os projetos; como `u1` atribuído só a `p1`, retorna `{items:[p1],nextCursor:null}`.
- **IT-047** (`task-required`): `projects.list({cursor:"quebrado"})` e busca de 121 caracteres devolvem `BAD_REQUEST`, sem consulta GitHub.
- **IT-048** (`task-required`): `projects.byId({projectId:p1})` para `u1` devolve `ProjectDto` com `repository.githubId:"202"`, sem ciphertext.
- **IT-049** (`task-required`): `projects.select(p1)` para `u1` grava `last_project_id=p1` e retorna o DTO de `p1`.
- **IT-050** (`task-required`): `repositoryCandidates` como admin conectado retorna página com `R_202`, `linkedProjectId:p1` e `nextCursor:null`; candidato sem vínculo tem `linkedProjectId` ausente.
- **IT-051** (`task-required`): `repositoryPreview({owner:"acme",name:"private"})` com token autorizado retorna identidade GitHub `202` e indica `p1` vinculado.
- **IT-052** (`task-required`): `projects.create({name:"Alpha",nodeId:"R_202"})` com admin autorizado retorna DTO e linha PostgreSQL com ID `202`, `external_key='project-'+id` e `is_demo=false`.
- **IT-053** (`task-required`): `updateDetails({projectId:p1,name:"Beta",description:null,expectedVersion:1})` retorna versão `2` e preserva ID `202`.
- **IT-054** (`task-required`): `connectionStates({projectIds:[p1]})` retorna uma entrada `{projectId:p1,kind:"available"}` para `u1` autorizado.
- **IT-055** (`task-required`): `repositoryContext({projectId:p1})` com ambas permissões retorna `{repository.githubId:"202",defaultBranch:"main"}` sem token.
- **IT-056** (`task-required`): `POST /api/github-repositories/connect` com sessão `u1` responde 303 para GitHub com `scope=repo offline_access`, `state` e PKCE; cria estado de 10 minutos.
- **IT-057** (`task-required`): callback com código válido, `state` da sessão `u1` e perfil GitHub ID `77` responde 303 para `/projects/new` e guarda token cifrado de `u1`.
- **IT-058** (`task-required`): início OAuth com `returnTo=https://evil.example` responde 400; callback com estado inválido redireciona para destino local seguro sem token.
- **IT-059** (`feature-gate`): tabela de chamadas sem sessão para `list`, `byId`, `select`, `candidates`, `preview`, `create`, `updateDetails`, `connectionStates`, `repositoryContext` devolve `UNAUTHORIZED` em cada uma.
- **IT-060** (`feature-gate`): tabela admin-only com ator `u1` não admin para `candidates`, `preview`, `create`, `updateDetails` devolve `FORBIDDEN` e nenhuma alteração.
- **IT-061** (`feature-gate`): gateway simula 429 e depois 503 para `candidates`, `preview`, `create` e `repositoryContext`; cada chamada devolve respectivamente `TOO_MANY_REQUESTS` e `SERVICE_UNAVAILABLE`, sem inserir projeto.
- **IT-062** (`feature-gate`): sem autorização OAuth de repositório, `candidates`, `preview`, `create` e `repositoryContext` devolvem `PRECONDITION_FAILED`; preview de repo inacessível com token devolve `NOT_FOUND`, contexto negado devolve `FORBIDDEN`.
- **IT-063** (`feature-gate`): tabela de entrada/DB: IDs inválidos em `byId`, `select`, `connectionStates`, `repositoryContext`, cursor inválido em `repositoryCandidates` e forma dupla em `repositoryPreview` dão `BAD_REQUEST`; IDs não visíveis dão `NOT_FOUND`; queda DB em `byId`, `select`, `create`, `updateDetails`, `connectionStates` dá `INTERNAL_SERVER_ERROR`.
- **IT-064** (`feature-gate`): `POST /connect` sem sessão dá 401; banco indisponível ao gravar estado dá 500, sem redirect GitHub.
- **IT-065** (`feature-gate`): callback com `access_denied`, conta GitHub divergente, código inválido e GitHub 503 gera, respectivamente, `acesso_negado`, `conta_diferente`, `falha_autorizacao`, `falha_temporaria`; nenhum caso persiste token novo.
- **IT-066** (`feature-gate`): migração com duas linhas legadas e mapeamento só de uma aborta sem `NOT NULL` parcial; com ambos IDs verificados `101/202`, aplica índices e mantém dois projetos.
- **IT-067** (`feature-gate`): armazenamento criptografado persiste token, reinicia serviço e recupera credencial válida; banco/logs/DTO nunca contêm o token em claro.
- **IT-068** (`feature-gate`): após backfill, tentativa SQL direta de alterar `github_repository_id` de `202` para `303` falha no trigger e `p1` permanece vinculado a `202`.
- **IT-069** (`feature-gate`): projeto salvo como privado `202` passa a público; usuário atribuído sem token OAuth recebe `available` após `GET /repos/acme/private` público com ID `202`, mas resposta pública com ID `303` não concede acesso a `p1`.
- **IT-070** (`task-required`): `POST /api/github-repositories/connect` com sessão válida e `Origin:https://evil.example` retorna 403, sem gravar estado OAuth.
- **IT-071** (`task-required`): `projects.create({name:" ",nodeId:"R_202"})` e `projects.updateDetails({projectId:p1,name:" ",expectedVersion:1})` devolvem `BAD_REQUEST` com erro no campo `name`, sem escrita SQL.

## Testes de ponta a ponta

- **E2E-001** (`feature-gate`): entrar como `u1` sem seleção → abrir `/projects` → ver só `p1` e `acme/private` → buscar `p1`; em fixture separada, entrar sem atribuição mostra orientação sem nomes privados, e admin com catálogo vazio vê “Criar projeto”.
- **E2E-002** (`feature-gate`): entrar com acesso a `p1,p2` → selecionar `p1` → abrir menu de issues → voltar ao catálogo → selecionar `p2` → atualizar página; cabeçalho e rota continuam `p2`, sem conversa de `p1`.
- **E2E-003** (`feature-gate`): admin abre `/projects/new` sem OAuth de repositório → inicia consentimento controlado → busca `acme/private` → revisa owner/nome e estado “já vinculado” quando aplicável; uma negação preserva formulário e mostra recuperação.
- **E2E-004** (`feature-gate`): admin conectado escolhe `acme/private`, preenche `Alpha`, cria → catálogo mostra `Alpha` e `acme/private`; usuário sem atribuição não o vê; refresh mantém projeto.
- **E2E-005** (`feature-gate`): admin abre configurações de `p1`, vê repositório somente leitura, muda nome/descrição e salva → catálogo/shell exibem novos detalhes após refresh; membro vê detalhes sem controles de edição.
- **E2E-006** (`feature-gate`): membro atribuído a privado `p1` sem consentimento abre shell → vê falta de acesso e nenhum dado de código → autoriza conta GitHub correspondente → contexto de repositório aparece; usuário não atribuído recebe projeto indisponível mesmo com GitHub válido.
- **E2E-007** (`feature-gate`): projeto `p1` muda de `acme/old` para `acme/new` mantendo ID `202` → atualizar conexão mostra novo rótulo; simular outage mostra estado temporário e retry; retorno GitHub restabelece o mesmo projeto, enquanto arquivo bloqueia ação de escrita.
- **E2E-008** (`qa-release`): em staging, transferir repositório de teste para organização que requer aprovação OAuth; confirmar preservação do ID/projeto, mensagem de acesso ambíguo e recuperação após aprovação, sem credenciais produtivas.
- **E2E-009** (`qa-release`): em staging, autorizar o segundo OAuth App real com conta de teste, verificar callback/PKCE, renovação após expiração e recusa de outra conta GitHub; repetir a jornada em navegadores de suporte e verificar textos/acessibilidade.
