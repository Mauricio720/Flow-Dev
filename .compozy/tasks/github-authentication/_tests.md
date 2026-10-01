# Especificação de testes: autenticação GitHub e acesso a projetos

Contrato canônico para o TechSpec, derivado das histórias US-001–US-011.

## Estratégia

- Fixtures: Alice (usuário 11111111-1111-4111-8111-111111111111, GitHub 1001), Bruno (22222222-2222-4222-8222-222222222222, GitHub 1002), admin Carla (33333333-3333-4333-8333-333333333333, GitHub 1003), pA (aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa) e pB (bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb). sAlice e sBruno são sessões distintas. Nomes curtos nos casos referem-se a esses IDs.
- Vitest para unidade e integração; PostgreSQL efêmero com migrações reais; createCaller tRPC e requisições HTTP aos Route Handlers. GitHub é simulado apenas na fronteira HTTP local. Playwright usa UI pública, fixture independente por teste e ambiente sem dados de produção; OAuth real usa contas de staging.
- Criar scripts test:unit, test:integration e test:e2e nos pacotes pertinentes. Executar pnpm lint, pnpm typecheck e pnpm build no gate. Casos task-required correm na tarefa correspondente, feature-gate após integração e qa-release em staging.
- Testes E2E usam getByRole/getByLabel e preparam/limpam seus próprios dados. Nenhum teste depende de ordem. Respostas tRPC são verificadas por código e ausência de dados privados.
- Concorrência usa barreiras de commit. Ação iniciada após revogação confirmada sempre nega; ação anterior pode concluir antes dela. US-002.EC-9 verifica nova autorização que detecta revogação; sessão local anterior segue ADR-004 até logout/expiração.

## Matriz de cobertura

| Fonte | Comportamento | Task-required | Feature-gate | QA/release |
| --- | --- | --- | --- | --- |
| US-001 | Entrar com GitHub | IT-001 | E2E-001 | E2E-012–E2E-013 |
| US-001.EC-1 | Callback OAuth com state trocado retorna falha_autorizacao e zero sessões. | IT-001 | — | — |
| US-001.EC-2 | Callback de GitHub 1001 sem email nem avatar cria uma conta de Alice com email técnico e sessão. | IT-002 | — | — |
| US-001.EC-3 | Décimo primeiro início OAuth da mesma origem em 60 s retorna 429 sem usuário novo. | IT-003 | — | — |
| US-001.EC-4 | Callback com access_denied retorna acesso_negado e zero sessões. | IT-004 | — | — |
| US-001.EC-5 | Duas tentativas no mesmo navegador, uma expirada e uma válida, deixam só a sessão válida. | — | IT-005 | — |
| US-001.EC-6 | Interrupção antes do callback deixa zero sessões; uma nova tentativa recebe state novo. | — | IT-006 | — |
| US-001.EC-7 | Repetir o mesmo code OAuth devolve falha e mantém uma conta e uma sessão. | IT-007 | — | — |
| US-001.EC-8 | Deep link para pA volta a pA se Alice ainda tem acesso; sem acesso vai a /projects. | — | IT-008 | — |
| US-001.EC-9 | GitHub /user responde 401 no callback; sessão não é criada. | — | IT-009 | — |
| US-001.EC-10 | Cinquenta callbacks concorrentes para 1001 e 1002 mantêm uma conta por ID e sessões isoladas. | — | IT-010 | — |
| US-002 | Retomar sessão | IT-011 | E2E-002 | — |
| US-002.EC-1 | projects.byId(pA) com cookie adulterado retorna UNAUTHORIZED sem ProjectDto. | IT-011 | — | — |
| US-002.EC-2 | GET /projects/pA sem cookie redireciona a /login sem payload privado. | IT-012 | — | — |
| US-002.EC-3 | Sessão com expiresAt igual ao instante atual retorna UNAUTHORIZED na próxima projects.list. | IT-013 | — | — |
| US-002.EC-4 | Cookie de Bruno para pA só de Alice recebe NOT_FOUND, sem dados de pA. | IT-014 | — | — |
| US-002.EC-5 | Duas abas requisitam pA após expiresAt; ambas recebem UNAUTHORIZED. | — | IT-015 | — |
| US-002.EC-6 | Falha de PostgreSQL ao validar sessão mostra erro temporário, sem DTO nem vazio falso. | — | IT-016 | — |
| US-002.EC-7 | Dez refreshes com sAlice retornam a mesma conta, sem usuário duplicado. | — | IT-017 | — |
| US-002.EC-8 | Deep link pA é restaurado após login somente se Alice ainda tem atribuição. | — | IT-018 | — |
| US-002.EC-9 | Nova autorização GitHub revogada falha sem criar sessão; sessão antiga segue política do ADR-004. | — | IT-019 | — |
| US-002.EC-10 | Cem chamadas privadas com cookies de Alice e Bruno mantêm identidade isolada. | — | IT-020 | — |
| US-003 | Sair | IT-021 | E2E-003 | — |
| US-003.EC-1 | POST de logout com `Origin` inválido não remove sBruno. | IT-021 | — | — |
| US-003.EC-2 | Logout sem cookie retorna a /login sem remover sessão alheia. | IT-022 | — | — |
| US-003.EC-3 | Dez pedidos de logout de sAlice deixam zero sessões com esse token. | — | IT-023 | — |
| US-003.EC-4 | Logout com cookie de Alice não remove sBruno. | IT-024 | — | — |
| US-003.EC-5 | Logout simultâneo em duas abas deixa ambas sem sessão válida. | — | IT-025 | — |
| US-003.EC-6 | Falha de banco ao excluir sessão não mostra confirmação de saída e permite retry. | — | IT-026 | — |
| US-003.EC-7 | Segundo logout de sAlice permanece seguro e acesso privado segue negado. | IT-027 | — | — |
| US-003.EC-8 | Voltar à página pA em histórico após logout não entrega dados nem permite ação. | — | IT-028 | — |
| US-003.EC-9 | Autorização GitHub ainda existente não autentica Flow Dev após logout local. | — | IT-029 | — |
| US-003.EC-10 | Cem projects.list após exclusão de sAlice retornam UNAUTHORIZED. | — | IT-030 | — |
| US-004 | Estado sem projeto | IT-031 | E2E-004 | — |
| US-004.EC-1 | GET /projects/invalid sem atribuições mostra projeto indisponível, sem dados. | IT-031 | — | — |
| US-004.EC-2 | projects.list de Alice sem atribuições retorna items vazio e cursor nulo. | IT-032 | — | — |
| US-004.EC-3 | Dez visitas sem atribuições não entram em loop nem criam atribuição. | — | IT-033 | — |
| US-004.EC-4 | projects.byId(pB) sem acesso responde igual ao ID inexistente, sem revelar existência. | IT-034 | — | — |
| US-004.EC-5 | Após atribuir pA, refresh do estado vazio mostra apenas pA. | — | IT-035 | — |
| US-004.EC-6 | Falha de banco em projects.list mostra retry e não estado vazio definitivo. | — | IT-036 | — |
| US-004.EC-7 | Três visitas ao estado vazio mantêm zero linhas de atribuição. | — | IT-037 | — |
| US-004.EC-8 | Bookmark de pA antes da atribuição leva à seleção sem revelar pA. | — | IT-038 | — |
| US-004.EC-9 | Remover último acesso de Alice faz próximo byId(pA) negar e /projects ficar vazio. | — | IT-039 | — |
| US-004.EC-10 | Cem usuários sem atribuição recebem cada um lista vazia sem dados alheios. | — | IT-040 | — |
| US-005 | Selecionar projeto | IT-041 | E2E-005 | — |
| US-005.EC-1 | projects.select com projectId invalid retorna BAD_REQUEST e preserva lastProjectId pA. | IT-041 | — | — |
| US-005.EC-2 | projects.list sem atribuições retorna vazio e seletor não aparece. | IT-042 | — | — |
| US-005.EC-3 | Com 121 projetos atribuídos, três páginas alcançam todos os IDs sem repetição. | — | IT-043 | — |
| US-005.EC-4 | projects.select(pB) sem atribuição retorna NOT_FOUND e mantém preferência pA. | IT-044 | — | — |
| US-005.EC-5 | Abas pA e pB enviam IDs explícitos; cada resposta conserva seu projeto após troca na outra aba. | — | IT-045 | — |
| US-005.EC-6 | Falha antes da confirmação de select(pB) preserva preferência pA. | — | IT-046 | — |
| US-005.EC-7 | Duas chamadas select(pA) conservam uma preferência e zero estados duplicados. | IT-047 | — | — |
| US-005.EC-8 | Deep link pA atribuído abre pA; pB não atribuído não entrega dados. | — | IT-048 | — |
| US-005.EC-9 | Excluir pA após seleção faz byId(pA) negar e / voltar ao seletor. | — | IT-049 | — |
| US-005.EC-10 | Com 501 atribuições, busca e cursores alcançam o último projeto. | — | IT-050 | — |
| US-006 | Isolamento de projeto | IT-051 | E2E-006 | — |
| US-006.EC-1 | projects.byId com projectId invalid retorna BAD_REQUEST sem consultar outro projeto. | IT-051 | — | — |
| US-006.EC-2 | Operação sem projectId retorna BAD_REQUEST sem usar preferência como alvo. | IT-052 | — | — |
| US-006.EC-3 | Cem byId(pA) consultam atribuição em cada pedido, inclusive após revogação. | — | IT-053 | — |
| US-006.EC-4 | byId(pB) por Alice sem atribuição retorna NOT_FOUND sem descrição de pB. | IT-054 | — | — |
| US-006.EC-5 | Mutação iniciada após commit de remoção de pA não grava dados em pA. | — | IT-055 | — |
| US-006.EC-6 | Retry de ação para pA após select(pB) nunca toca pB. | — | IT-056 | — |
| US-006.EC-7 | Repetir mutação negada em pB mantém NOT_FOUND e nenhum dado alterado. | IT-057 | — | — |
| US-006.EC-8 | POST tRPC direto para select(pB) sem seletor retorna NOT_FOUND. | IT-058 | — | — |
| US-006.EC-9 | Projeto excluído ou sessão expirada nega a próxima operação com NOT_FOUND ou UNAUTHORIZED. | — | IT-059 | — |
| US-006.EC-10 | Paginar 501 registros sob pA nunca retorna linha de pB. | — | IT-060 | — |
| US-007 | Diretório de usuários | IT-061 | E2E-007 | — |
| US-007.EC-1 | access.users com busca de 201 caracteres retorna BAD_REQUEST. | IT-061 | — | — |
| US-007.EC-2 | access.users sem contas retorna items vazio e cursor nulo. | IT-062 | — | — |
| US-007.EC-3 | Com 121 contas, três páginas alcançam todas sem duplicação. | — | IT-063 | — |
| US-007.EC-4 | access.users por Alice não admin retorna FORBIDDEN sem nomes. | IT-064 | — | — |
| US-007.EC-5 | Login de Bruno durante diretório aberto aparece uma vez após refresh. | — | IT-065 | — |
| US-007.EC-6 | Falha de banco em access.users mostra retry, não vazio falso. | — | IT-066 | — |
| US-007.EC-7 | Cinco refreshes mostram uma linha por conta e atribuições atuais. | — | IT-067 | — |
| US-007.EC-8 | Busca alice antes de qualquer login retorna vazio sem criar conta. | IT-068 | — | — |
| US-007.EC-9 | Conta 1002 indisponível no GitHub continua listada localmente com atribuições. | — | IT-069 | — |
| US-007.EC-10 | Com 1001 contas, busca por login encontra a última e navegação alcança todas. | — | IT-070 | — |
| US-008 | Atribuir projeto | IT-071 | E2E-008 | — |
| US-008.EC-1 | access.assign com userId inexistente e pA retorna NOT_FOUND sem inserção. | IT-071 | — | — |
| US-008.EC-2 | Admin sem usuário ou projeto vê ação atribuir indisponível. | IT-072 | — | — |
| US-008.EC-3 | Com 121 projetos, seletor administrativo alcança o último por paginação. | — | IT-073 | — |
| US-008.EC-4 | access.assign(Alice,pA) por Bruno retorna FORBIDDEN sem escrita. | IT-074 | — | — |
| US-008.EC-5 | Dois admins atribuem pA a Alice simultaneamente e fica uma linha. | — | IT-075 | — |
| US-008.EC-6 | Timeout do cliente após assign é resolvido consultando userAssignments antes de retry. | — | IT-076 | — |
| US-008.EC-7 | Repetir assign(Alice,pA) retorna assigned true com uma linha. | IT-077 | — | — |
| US-008.EC-8 | Assign para GitHub 1004 ainda sem usuário retorna NOT_FOUND sem criar conta. | IT-078 | — | — |
| US-008.EC-9 | Excluir pA durante assign causa rollback, sem atribuição órfã. | — | IT-079 | — |
| US-008.EC-10 | Inserir par Alice pA entre mil pares preserva os demais. | — | IT-080 | — |
| US-009 | Remover atribuição | IT-081 | E2E-009 | — |
| US-009.EC-1 | access.remove com userId invalid retorna BAD_REQUEST sem exclusão. | IT-081 | — | — |
| US-009.EC-2 | Alice sem atribuições tem userAssignments vazio e ação remover indisponível. | IT-082 | — | — |
| US-009.EC-3 | Com 121 pares de Alice, remover pA exclui só pA. | — | IT-083 | — |
| US-009.EC-4 | access.remove(Alice,pA) por Bruno retorna FORBIDDEN e conserva par. | IT-084 | — | — |
| US-009.EC-5 | Dois admins removem Alice pA juntos; par termina ausente e ambos recebem assigned false. | — | IT-085 | — |
| US-009.EC-6 | Timeout após remove é resolvido por consulta de userAssignments antes de retry. | — | IT-086 | — |
| US-009.EC-7 | Repetir remove(Alice,pA) retorna assigned false e preserva pB. | IT-087 | — | — |
| US-009.EC-8 | Depois de remove(Alice,pA), próximo byId(pA) retorna NOT_FOUND. | — | IT-088 | — |
| US-009.EC-9 | Remover usuário ou projeto já excluído retorna NOT_FOUND e preserva outros pares. | — | IT-089 | — |
| US-009.EC-10 | Remover Alice pA mantém Bruno pA entre cem usuários do projeto. | — | IT-090 | — |
| US-010 | Administração global | IT-091 | E2E-010 | — |
| US-010.EC-1 | Admin pede byId de UUID inexistente e recebe NOT_FOUND sem projeto fabricado. | IT-091 | — | — |
| US-010.EC-2 | Admin sem projetos recebe projects.list com items vazio. | IT-092 | — | — |
| US-010.EC-3 | Com 121 projetos, admin navega três páginas e alcança todos sem atribuição. | — | IT-093 | — |
| US-010.EC-4 | Alice não admin pede pB com payload fingindo admin e recebe NOT_FOUND. | IT-094 | — | — |
| US-010.EC-5 | Abas admin pA e pB conservam IDs explícitos durante trocas. | — | IT-095 | — |
| US-010.EC-6 | Timeout em select(pB) não muda alvo de ação enviada com pA. | — | IT-096 | — |
| US-010.EC-7 | Repetir select(pA) como admin não cria atribuição. | IT-097 | — | — |
| US-010.EC-8 | GET direto /projects/pA como admin sem atribuição abre pA. | — | IT-098 | — |
| US-010.EC-9 | Excluir pA faz próximo GET admin mostrar indisponível. | — | IT-099 | — |
| US-010.EC-10 | Com 1001 projetos, busca por externalKey encontra o último e cursores alcançam todos. | — | IT-100 | — |
| US-011 | Provisionar administrador | IT-101 | E2E-011 | — |
| US-011.EC-1 | admins:provision com login vazio ou GitHub 404 falha sem mudar designações. | IT-101 | — | — |
| US-011.EC-2 | Sem designações, Alice entra mas access.users retorna FORBIDDEN. | IT-102 | — | — |
| US-011.EC-3 | Manifesto de 121 logins resolvidos dá isAdmin true a todos. | — | IT-103 | — |
| US-011.EC-4 | POST tRPC para provisionamento inexistente retorna NOT_FOUND e não altera papéis. | IT-104 | — | — |
| US-011.EC-5 | Remoção de designação concorrente com assign usa papel corrente na operação serializada. | — | IT-105 | — |
| US-011.EC-6 | Interromper provisionamento antes do commit mantém conjunto anterior. | — | IT-106 | — |
| US-011.EC-7 | Aplicar manifesto [alice] duas vezes deixa uma designação GitHub 1001. | IT-107 | — | — |
| US-011.EC-8 | Provisionar Alice antes do login faz primeiro access.me dela retornar isAdmin true. | IT-108 | — | — |
| US-011.EC-9 | Remover Alice do manifesto faz próximo access.users dela retornar FORBIDDEN. | IT-109 | — | — |
| US-011.EC-10 | Com 1001 usuários e manifesto [alice], somente ID 1001 é admin. | — | IT-110 | — |
| Entrada OAuth e sessão | Responsabilidade e erros | UT-001–UT-006, UT-034, UT-037–UT-038 | IT-005–IT-006, IT-008–IT-010, IT-129, IT-140–IT-142 | E2E-012–E2E-013 |
| Ponte de sessão / SessionPrincipal | Responsabilidade e erros | UT-007–UT-008 | IT-015–IT-020, IT-143–IT-144 | — |
| ProjectAccessService | Responsabilidade e erros | UT-009–UT-013 | — | — |
| AssignmentService | Responsabilidade e erros | UT-014–UT-021 | — | — |
| ProjectDao | Responsabilidade e erros | UT-022–UT-024 | — | — |
| CatalogImporter | Responsabilidade e erros | UT-025–UT-027, IT-114–IT-115 | — | — |
| Provisionador | Responsabilidade e erros | UT-028–UT-030, IT-101, IT-107–IT-109 | IT-105–IT-106, IT-110 | — |
| Controllers | Responsabilidade e erros | UT-031–UT-032, IT-044, IT-074 | — | — |
| Paginação | Responsabilidade e erros | UT-033 | IT-043, IT-063 | — |
| Rotas e interface | Responsabilidade e erros | UT-004–UT-005, UT-035–UT-036 | E2E-001–E2E-011 | E2E-014 |
| Better Auth GET/POST | Sucesso e falhas | IT-001–IT-004, IT-007, IT-021–IT-022, IT-140–IT-142 | IT-005–IT-006, IT-009, IT-026, IT-129 | E2E-012–E2E-013 |
| Configuração OAuth por ambiente | Origem, callback e isolamento de credenciais | IT-145 | — | E2E-015 |
| health.check | Sucesso e falhas | IT-111, IT-119 | — | — |
| access.me | Sucesso e falhas | IT-112–IT-113, IT-108, IT-120, IT-123 | IT-124 | — |
| projects.list | Sucesso e falhas | IT-032, IT-042, IT-116, IT-123 | IT-043, IT-053, IT-124 | — |
| projects.byId | Sucesso e falhas | IT-034, IT-051, IT-054, IT-091, IT-123, IT-127, IT-135 | IT-048, IT-098, IT-124 | — |
| projects.select | Sucesso e falhas | IT-041, IT-044, IT-047, IT-123, IT-127, IT-134 | IT-045, IT-046, IT-124 | — |
| access.users | Sucesso e falhas | IT-061–IT-062, IT-064, IT-123, IT-125, IT-136 | IT-063, IT-066, IT-124 | — |
| access.userAssignments | Sucesso e falhas | IT-121, IT-123, IT-125, IT-128, IT-137 | IT-066, IT-124 | — |
| access.assign | Sucesso e falhas | IT-071, IT-074, IT-077–IT-078, IT-117, IT-123, IT-125–IT-126, IT-128, IT-138 | IT-075, IT-079, IT-124 | — |
| access.remove | Sucesso e falhas | IT-081–IT-082, IT-084, IT-087, IT-122–IT-123, IT-125–IT-126, IT-128, IT-139 | IT-085, IT-088, IT-124 | — |
| catalog:import | Sucesso e falhas | IT-114–IT-115, IT-132–IT-133 | — | — |
| admins:provision | Sucesso e falhas | IT-101–IT-102, IT-107–IT-109, IT-130 | IT-103, IT-106, IT-110, IT-131 | — |
| projects.create removido | Chamada antiga negada | — | IT-118 | — |

## Testes unitários

- **UT-001** (task-required, happy): Mapeador GitHub: id 1001, login alice, email e avatar ausentes geram accountId 1001, name alice e email técnico github-1001@flowdev.invalid.
- **UT-002** (task-required, error): Mapeador GitHub rejeita perfil sem id numérico antes de criar usuário.
- **UT-003** (task-required, boundary): Mapeador GitHub usa login alice quando nome e avatar estão ausentes.
- **UT-004** (task-required, error): Normalizador de destino troca https://evil.example e //evil.example por /projects.
- **UT-005** (task-required, happy): Normalizador preserva /projects/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa como destino interno.
- **UT-006** (task-required, boundary): Limitador aceita dez tentativas em 60 s da mesma origem e rejeita a 11ª com TOO_MANY_REQUESTS.
- **UT-007** (task-required, error): Ponte de sessão com `getSession` nulo lança SessionRequiredError.
- **UT-008** (task-required, happy): Ponte de sessão com `getSession` de Alice retorna somente userId de Alice, sem papel estático.
- **UT-009** (task-required, happy): ProjectAccessService.listVisible para Alice atribuída só a pA devolve somente pA.
- **UT-010** (task-required, error): ProjectAccessService.requireProject para Alice e pB lança ProjectUnavailableError.
- **UT-011** (task-required, boundary): ProjectAccessService.listVisible de admin com 51 projetos devolve 50 e nextCursor.
- **UT-012** (task-required, state): ProjectAccessService.select(pA) grava preferência só após autorização.
- **UT-013** (task-required, error): ProjectAccessService.select(pB) negado não chama setLastSelected.
- **UT-014** (task-required, happy): AssignmentService.listUsers como admin retorna login e contagem, sem email técnico.
- **UT-015** (task-required, error): AssignmentService.listUsers como Alice não admin lança AdminRequiredError.
- **UT-016** (task-required, happy): AssignmentService.listAssignments de Bruno como admin retorna só atribuições de Bruno.
- **UT-017** (task-required, error): AssignmentService.listAssignments para usuário inexistente lança TargetUserUnavailableError.
- **UT-018** (task-required, idempotency): AssignmentService.assign(Alice,pA) duas vezes retorna assigned true e mantém um par.
- **UT-019** (task-required, error): AssignmentService.assign para projeto ausente lança ProjectUnavailableError sem escrita.
- **UT-020** (task-required, idempotency): AssignmentService.remove(Alice,pA) duas vezes retorna assigned false e preserva pB.
- **UT-021** (task-required, error): AssignmentService.remove por Alice não admin lança AdminRequiredError sem escrita.
- **UT-022** (task-required, happy): ProjectDao.listVisible usa predicado por ator e cursor posterior a pA.
- **UT-023** (task-required, error): ProjectDao.findAuthorized(Alice,pB) retorna null mesmo quando pB existe.
- **UT-024** (task-required, error): ProjectDao.setLastSelected(pB) sem autorização não altera users.
- **UT-025** (task-required, idempotency): CatalogImporter.import de flow-dev-demo duas vezes mantém UUID e informa updated 1 na segunda.
- **UT-026** (task-required, error): CatalogImporter.import com externalKey duplicada rejeita manifesto inteiro.
- **UT-027** (task-required, error): CatalogImporter.import com nome vazio rejeita manifesto sem escrita parcial.
- **UT-028** (task-required, happy): Provisionador resolve login alice para GitHub 1001 e prepara designação 1001.
- **UT-029** (task-required, error): Provisionador rejeita resposta GitHub com login diferente do solicitado antes da transação.
- **UT-030** (task-required, idempotency): Provisionador aplica conjunto [1001] duas vezes e mantém uma designação.
- **UT-031** (task-required, error): Controller traduz ProjectUnavailableError em NOT_FOUND igual para proibido e inexistente.
- **UT-032** (task-required, error): Controller traduz falha SQL inesperada em INTERNAL_SERVER_ERROR sem mensagem SQL.
- **UT-033** (task-required, boundary): Validador de cursor rejeita base64 malformado com BAD_REQUEST e aceita posição após 50 itens.
- **UT-034** (task-required, error): Mapeador de erro OAuth converte access_denied em acesso_negado e erro desconhecido em falha_autorizacao, sem mensagem técnica.
- **UT-035** (task-required, state): Resolvedor de / com lastProjectId pA revogado devolve /projects, sem abrir workspace.
- **UT-036** (task-required, error): Estado de revogação recebe NOT_FOUND para pA e apaga dados exibidos de pA antes de oferecer /projects.
- **UT-037** (task-required, boundary): `getUserInfo` personalizado de GitHub com perfil sem email consulta apenas `/user`, usa ID 1001, não consulta `/user/emails` e produz email técnico sem tratar email real como identidade.
- **UT-038** (task-required, error): Hook de `/sign-in/social` rejeita provedor diferente de GitHub e qualquer `scopes` ou `additionalParams` enviado pelo cliente, inclusive `repo` e `user:email`, antes de criar URL OAuth.

## Testes de integração

IT-001–IT-110 seguem EC-1–EC-10 de cada US em ordem. Cada caso exercita a superfície nomeada, o controller e PostgreSQL; GitHub é substituído só na fronteira de rede.

### US-001: Entrar com GitHub

- **IT-001** (task-required): Callback OAuth com state trocado retorna falha_autorizacao e zero sessões.
- **IT-002** (task-required): Callback de GitHub 1001 sem email nem avatar cria uma conta de Alice com email técnico e sessão.
- **IT-003** (task-required): Décimo primeiro início OAuth da mesma origem em 60 s retorna 429 sem usuário novo.
- **IT-004** (task-required): Callback com access_denied retorna acesso_negado e zero sessões.
- **IT-005** (feature-gate): Duas tentativas no mesmo navegador, uma expirada e uma válida, deixam só a sessão válida.
- **IT-006** (feature-gate): Interrupção antes do callback deixa zero sessões; uma nova tentativa recebe state novo.
- **IT-007** (task-required): Repetir o mesmo code OAuth devolve falha e mantém uma conta e uma sessão.
- **IT-008** (feature-gate): Deep link para pA volta a pA se Alice ainda tem acesso; sem acesso vai a /projects.
- **IT-009** (feature-gate): GitHub /user responde 401 no callback; sessão não é criada.
- **IT-010** (feature-gate): Cinquenta callbacks concorrentes para 1001 e 1002 mantêm uma conta por ID e sessões isoladas.

### US-002: Retomar sessão

- **IT-011** (task-required): projects.byId(pA) com cookie adulterado retorna UNAUTHORIZED sem ProjectDto.
- **IT-012** (task-required): GET /projects/pA sem cookie redireciona a /login sem payload privado.
- **IT-013** (task-required): Sessão com expiresAt igual ao instante atual retorna UNAUTHORIZED na próxima projects.list.
- **IT-014** (task-required): Cookie de Bruno para pA só de Alice recebe NOT_FOUND, sem dados de pA.
- **IT-015** (feature-gate): Duas abas requisitam pA após expiresAt; ambas recebem UNAUTHORIZED.
- **IT-016** (feature-gate): Falha de PostgreSQL ao validar sessão mostra erro temporário, sem DTO nem vazio falso.
- **IT-017** (feature-gate): Dez refreshes com sAlice retornam a mesma conta, sem usuário duplicado.
- **IT-018** (feature-gate): Deep link pA é restaurado após login somente se Alice ainda tem atribuição.
- **IT-019** (feature-gate): Nova autorização GitHub revogada falha sem criar sessão; sessão antiga segue política do ADR-004.
- **IT-020** (feature-gate): Cem chamadas privadas com cookies de Alice e Bruno mantêm identidade isolada.

### US-003: Sair

- **IT-021** (task-required): POST de logout com `Origin` inválido não remove sBruno.
- **IT-022** (task-required): Logout sem cookie retorna a /login sem remover sessão alheia.
- **IT-023** (feature-gate): Dez pedidos de logout de sAlice deixam zero sessões com esse token.
- **IT-024** (task-required): Logout com cookie de Alice não remove sBruno.
- **IT-025** (feature-gate): Logout simultâneo em duas abas deixa ambas sem sessão válida.
- **IT-026** (feature-gate): Falha de banco ao excluir sessão não mostra confirmação de saída e permite retry.
- **IT-027** (task-required): Segundo logout de sAlice permanece seguro e acesso privado segue negado.
- **IT-028** (feature-gate): Voltar à página pA em histórico após logout não entrega dados nem permite ação.
- **IT-029** (feature-gate): Autorização GitHub ainda existente não autentica Flow Dev após logout local.
- **IT-030** (feature-gate): Cem projects.list após exclusão de sAlice retornam UNAUTHORIZED.

### US-004: Estado sem projeto

- **IT-031** (task-required): GET /projects/invalid sem atribuições mostra projeto indisponível, sem dados.
- **IT-032** (task-required): projects.list de Alice sem atribuições retorna items vazio e cursor nulo.
- **IT-033** (feature-gate): Dez visitas sem atribuições não entram em loop nem criam atribuição.
- **IT-034** (task-required): projects.byId(pB) sem acesso responde igual ao ID inexistente, sem revelar existência.
- **IT-035** (feature-gate): Após atribuir pA, refresh do estado vazio mostra apenas pA.
- **IT-036** (feature-gate): Falha de banco em projects.list mostra retry e não estado vazio definitivo.
- **IT-037** (feature-gate): Três visitas ao estado vazio mantêm zero linhas de atribuição.
- **IT-038** (feature-gate): Bookmark de pA antes da atribuição leva à seleção sem revelar pA.
- **IT-039** (feature-gate): Remover último acesso de Alice faz próximo byId(pA) negar e /projects ficar vazio.
- **IT-040** (feature-gate): Cem usuários sem atribuição recebem cada um lista vazia sem dados alheios.

### US-005: Selecionar projeto

- **IT-041** (task-required): projects.select com projectId invalid retorna BAD_REQUEST e preserva lastProjectId pA.
- **IT-042** (task-required): projects.list sem atribuições retorna vazio e seletor não aparece.
- **IT-043** (feature-gate): Com 121 projetos atribuídos, três páginas alcançam todos os IDs sem repetição.
- **IT-044** (task-required): projects.select(pB) sem atribuição retorna NOT_FOUND e mantém preferência pA.
- **IT-045** (feature-gate): Abas pA e pB enviam IDs explícitos; cada resposta conserva seu projeto após troca na outra aba.
- **IT-046** (feature-gate): Falha antes da confirmação de select(pB) preserva preferência pA.
- **IT-047** (task-required): Duas chamadas select(pA) conservam uma preferência e zero estados duplicados.
- **IT-048** (feature-gate): Deep link pA atribuído abre pA; pB não atribuído não entrega dados.
- **IT-049** (feature-gate): Excluir pA após seleção faz byId(pA) negar e / voltar ao seletor.
- **IT-050** (feature-gate): Com 501 atribuições, busca e cursores alcançam o último projeto.

### US-006: Isolamento de projeto

- **IT-051** (task-required): projects.byId com projectId invalid retorna BAD_REQUEST sem consultar outro projeto.
- **IT-052** (task-required): Operação sem projectId retorna BAD_REQUEST sem usar preferência como alvo.
- **IT-053** (feature-gate): Cem byId(pA) consultam atribuição em cada pedido, inclusive após revogação.
- **IT-054** (task-required): byId(pB) por Alice sem atribuição retorna NOT_FOUND sem descrição de pB.
- **IT-055** (feature-gate): Mutação iniciada após commit de remoção de pA não grava dados em pA.
- **IT-056** (feature-gate): Retry de ação para pA após select(pB) nunca toca pB.
- **IT-057** (task-required): Repetir mutação negada em pB mantém NOT_FOUND e nenhum dado alterado.
- **IT-058** (task-required): POST tRPC direto para select(pB) sem seletor retorna NOT_FOUND.
- **IT-059** (feature-gate): Projeto excluído ou sessão expirada nega a próxima operação com NOT_FOUND ou UNAUTHORIZED.
- **IT-060** (feature-gate): Paginar 501 registros sob pA nunca retorna linha de pB.

### US-007: Diretório de usuários

- **IT-061** (task-required): access.users com busca de 201 caracteres retorna BAD_REQUEST.
- **IT-062** (task-required): access.users sem contas retorna items vazio e cursor nulo.
- **IT-063** (feature-gate): Com 121 contas, três páginas alcançam todas sem duplicação.
- **IT-064** (task-required): access.users por Alice não admin retorna FORBIDDEN sem nomes.
- **IT-065** (feature-gate): Login de Bruno durante diretório aberto aparece uma vez após refresh.
- **IT-066** (feature-gate): Falha de banco em access.users mostra retry, não vazio falso.
- **IT-067** (feature-gate): Cinco refreshes mostram uma linha por conta e atribuições atuais.
- **IT-068** (task-required): Busca alice antes de qualquer login retorna vazio sem criar conta.
- **IT-069** (feature-gate): Conta 1002 indisponível no GitHub continua listada localmente com atribuições.
- **IT-070** (feature-gate): Com 1001 contas, busca por login encontra a última e navegação alcança todas.

### US-008: Atribuir projeto

- **IT-071** (task-required): access.assign com userId inexistente e pA retorna NOT_FOUND sem inserção.
- **IT-072** (task-required): Admin sem usuário ou projeto vê ação atribuir indisponível.
- **IT-073** (feature-gate): Com 121 projetos, seletor administrativo alcança o último por paginação.
- **IT-074** (task-required): access.assign(Alice,pA) por Bruno retorna FORBIDDEN sem escrita.
- **IT-075** (feature-gate): Dois admins atribuem pA a Alice simultaneamente e fica uma linha.
- **IT-076** (feature-gate): Timeout do cliente após assign é resolvido consultando userAssignments antes de retry.
- **IT-077** (task-required): Repetir assign(Alice,pA) retorna assigned true com uma linha.
- **IT-078** (task-required): Assign para GitHub 1004 ainda sem usuário retorna NOT_FOUND sem criar conta.
- **IT-079** (feature-gate): Excluir pA durante assign causa rollback, sem atribuição órfã.
- **IT-080** (feature-gate): Inserir par Alice pA entre mil pares preserva os demais.

### US-009: Remover atribuição

- **IT-081** (task-required): access.remove com userId invalid retorna BAD_REQUEST sem exclusão.
- **IT-082** (task-required): Alice sem atribuições tem userAssignments vazio e ação remover indisponível.
- **IT-083** (feature-gate): Com 121 pares de Alice, remover pA exclui só pA.
- **IT-084** (task-required): access.remove(Alice,pA) por Bruno retorna FORBIDDEN e conserva par.
- **IT-085** (feature-gate): Dois admins removem Alice pA juntos; par termina ausente e ambos recebem assigned false.
- **IT-086** (feature-gate): Timeout após remove é resolvido por consulta de userAssignments antes de retry.
- **IT-087** (task-required): Repetir remove(Alice,pA) retorna assigned false e preserva pB.
- **IT-088** (feature-gate): Depois de remove(Alice,pA), próximo byId(pA) retorna NOT_FOUND.
- **IT-089** (feature-gate): Remover usuário ou projeto já excluído retorna NOT_FOUND e preserva outros pares.
- **IT-090** (feature-gate): Remover Alice pA mantém Bruno pA entre cem usuários do projeto.

### US-010: Administração global

- **IT-091** (task-required): Admin pede byId de UUID inexistente e recebe NOT_FOUND sem projeto fabricado.
- **IT-092** (task-required): Admin sem projetos recebe projects.list com items vazio.
- **IT-093** (feature-gate): Com 121 projetos, admin navega três páginas e alcança todos sem atribuição.
- **IT-094** (task-required): Alice não admin pede pB com payload fingindo admin e recebe NOT_FOUND.
- **IT-095** (feature-gate): Abas admin pA e pB conservam IDs explícitos durante trocas.
- **IT-096** (feature-gate): Timeout em select(pB) não muda alvo de ação enviada com pA.
- **IT-097** (task-required): Repetir select(pA) como admin não cria atribuição.
- **IT-098** (feature-gate): GET direto /projects/pA como admin sem atribuição abre pA.
- **IT-099** (feature-gate): Excluir pA faz próximo GET admin mostrar indisponível.
- **IT-100** (feature-gate): Com 1001 projetos, busca por externalKey encontra o último e cursores alcançam todos.

### US-011: Provisionar administrador

- **IT-101** (task-required): admins:provision com login vazio ou GitHub 404 falha sem mudar designações.
- **IT-102** (task-required): Sem designações, Alice entra mas access.users retorna FORBIDDEN.
- **IT-103** (feature-gate): Manifesto de 121 logins resolvidos dá isAdmin true a todos.
- **IT-104** (task-required): POST tRPC para provisionamento inexistente retorna NOT_FOUND e não altera papéis.
- **IT-105** (feature-gate): Remoção de designação concorrente com assign usa papel corrente na operação serializada.
- **IT-106** (feature-gate): Interromper provisionamento antes do commit mantém conjunto anterior.
- **IT-107** (task-required): Aplicar manifesto [alice] duas vezes deixa uma designação GitHub 1001.
- **IT-108** (task-required): Provisionar Alice antes do login faz primeiro access.me dela retornar isAdmin true.
- **IT-109** (task-required): Remover Alice do manifesto faz próximo access.users dela retornar FORBIDDEN.
- **IT-110** (feature-gate): Com 1001 usuários e manifesto [alice], somente ID 1001 é admin.

### Contratos adicionais de endpoint e CLI

- **IT-111** (task-required): health.check sem cookie devolve somente estado público, sem catálogo.
- **IT-112** (task-required): access.me com sAlice devolve id de Alice, githubLogin alice, isAdmin false e lastProjectId null, sem email técnico.
- **IT-113** (task-required): access.me sem cookie devolve UNAUTHORIZED sem identidade.
- **IT-114** (task-required): catalog:import com flow-dev-demo e pA insere dois projetos; segunda execução mantém IDs e informa updated 2.
- **IT-115** (task-required): catalog:import com externalKey duplicada sai com erro e nenhuma escrita parcial.
- **IT-116** (task-required): projects.list com cursor inválido devolve BAD_REQUEST.
- **IT-117** (task-required): access.assign com projeto ausente devolve NOT_FOUND sem criar atribuição.
- **IT-118** (feature-gate): POST ao antigo projects.create devolve NOT_FOUND e não cria projeto.
- **IT-119** (task-required): health.check com falha interna devolve erro genérico sem catálogo.
- **IT-120** (task-required): access.me com banco indisponível devolve INTERNAL_SERVER_ERROR sem identidade.
- **IT-121** (task-required): access.userAssignments com userId inexistente devolve NOT_FOUND sem lista.
- **IT-122** (task-required): access.remove com userId inexistente devolve NOT_FOUND sem alterar pares.
- **IT-123** (task-required): para cada procedimento protegido, requisição HTTP direta a `/api/trpc` sem cookie devolve UNAUTHORIZED e nenhum dado privado.
- **IT-124** (feature-gate): para cada procedimento protegido, banco indisponível devolve INTERNAL_SERVER_ERROR sem dados privados.
- **IT-125** (task-required): cada procedimento access.users, access.userAssignments, access.assign e access.remove devolve FORBIDDEN a Alice não designada.
- **IT-126** (task-required): cada procedimento que recebe userId ou projectId UUID rejeita a string invalid com BAD_REQUEST antes de escrever.
- **IT-127** (task-required): projects.byId e projects.select devolvem o mesmo NOT_FOUND para pB não atribuído e UUID inexistente.
- **IT-128** (task-required): access.userAssignments, access.assign e access.remove devolvem NOT_FOUND para usuário inexistente sem modificar pares.
- **IT-129** (feature-gate): callback OAuth com PostgreSQL indisponível vai a /login?erro=falha_temporaria e não confirma sessão.
- **IT-130** (task-required): admins:provision --dry-run com manifesto [alice] imprime ID 1001 e diferença proposta, exit 0, sem mudar admin_designations.
- **IT-131** (feature-gate): GitHub /users/alice responde 429 durante provisionamento; após retries limitados, CLI sai com erro e mantém o conjunto anterior.
- **IT-132** (task-required): catalog:import com manifesto sem pB preserva pB previamente importado.
- **IT-133** (task-required): reiniciar o processo após catalog:import conserva UUID de flow-dev-demo e atribuição vinculada.
- **IT-134** (task-required): projects.select(pA) por Alice atribuída devolve ProjectDto com id pA, name e isDemo corretos.
- **IT-135** (task-required): projects.byId(pA) por Alice atribuída devolve somente ProjectDto de pA.
- **IT-136** (task-required): access.users por Carla retorna Alice com githubLogin alice, contagem de projetos e nextCursor, sem email técnico.
- **IT-137** (task-required): access.userAssignments(Alice) por Carla retorna pA atribuído e nenhum pB não atribuído.
- **IT-138** (task-required): access.assign(Alice,pA) por Carla insere um par e devolve assigned true.
- **IT-139** (task-required): access.remove(Alice,pA) por Carla exclui o par e devolve assigned false.
- **IT-140** (task-required): POST direto em `/api/auth/sign-in/social` com `provider: "github"` e `scopes: ["repo"]` ou `additionalParams.scope: "repo"` é rejeitado antes do redirecionamento; nenhuma URL GitHub contém `repo` ou `user:email`.
- **IT-141** (task-required): Chamadas HTTP aos endpoints Better Auth de vínculo social, leitura/renovação de token e autenticação por senha são bloqueadas sem devolver token ou alterar conta.
- **IT-142** (task-required): Após callback GitHub, `accounts.access_token` está criptografado no PostgreSQL e não aparece no retorno de sessão, nos DTOs tRPC nem na página.
- **IT-143** (task-required): A chamada pelo server caller e a chamada HTTP direta a `/api/trpc` com a mesma sessão expirada ou excluída retornam UNAUTHORIZED; com sessão válida, `projects.byId(pB)` de Alice sem atribuição retorna NOT_FOUND em ambas as superfícies.
- **IT-144** (task-required): Após atividade autenticada perto do sétimo dia, `expiresAt` e o cookie são renovados pelo Route Handler para sete dias após essa atividade; sem nova atividade por sete dias, a próxima chamada protegida retorna UNAUTHORIZED.
- **IT-145** (task-required): Configuração de desenvolvimento, staging e produção exige `BETTER_AUTH_URL` como origem pública, Client ID/Secret e segredo Better Auth próprios; configurações ausentes ou `BETTER_AUTH_URL` inválida impedem iniciar OAuth; o callback gerado é `${BETTER_AUTH_URL}/api/auth/callback/github`.

## Testes de ponta a ponta

- **E2E-001** (feature-gate, US-001): Em /login, Alice clica Continuar com GitHub, conclui OAuth de teste e chega a /projects sem atribuição com sessão válida.
- **E2E-002** (feature-gate, US-002): Alice abre /projects/pA, atualiza, expira sessão no fixture e nova ação a leva a /login sem dados privados.
- **E2E-003** (feature-gate, US-003): Alice em pA escolhe Sair, chega a /login e o histórico não permite nova ação em pA.
- **E2E-004** (feature-gate, US-004): Alice sem atribuição vê orientação ao administrador; depois de atribuição pA, refresh mostra pA.
- **E2E-005** (feature-gate, US-005): Alice escolhe pA, atualiza e troca para pB; o workspace exibe pB sem conversas locais criadas em pA.
- **E2E-006** (feature-gate, US-006): Alice aberta em pA perde atribuição; próxima ação mostra aviso de mudança sem dados de pA.
- **E2E-007** (feature-gate, US-007): Admin busca Alice em /admin/access e vê atribuições; Bruno não admin recebe acesso negado.
- **E2E-008** (feature-gate, US-008): Admin atribui pA a Alice; Alice atualiza /projects e vê pA.
- **E2E-009** (feature-gate, US-009): Admin remove pA de Alice; aba de Alice oferece pB ou estado sem projeto.
- **E2E-010** (feature-gate, US-010): Admin sem atribuições escolhe pA e usa workspace; Alice não atribuída recebe indisponível.
- **E2E-011** (feature-gate, US-011): Operador provisiona Alice antes do login; Alice entra e acessa administração, Bruno que entrou primeiro não.
- **E2E-012** (qa-release, US-001): Em staging, conta GitHub de teste conclui autorização read:user sem pedir acesso a repositórios.
- **E2E-013** (qa-release, US-001): Em staging, conta GitHub nega consentimento e vê mensagem portuguesa sem sessão.
- **E2E-014** (qa-release, US-003, US-005, US-007): Percorrer seletor, administração e logout por teclado em desktop e móvel com foco visível.
- **E2E-015** (qa-release, US-001): Em cada ambiente implantado, conferir que a GitHub OAuth App tem Client ID distinto, callback naquele domínio e login real bem-sucedido; verificar separação dos segredos sem imprimi-los.
