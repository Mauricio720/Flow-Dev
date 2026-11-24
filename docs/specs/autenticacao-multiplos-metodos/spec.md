# Spec: Autenticação com vários métodos de entrada (GitHub, Google, email e senha)

> **Status:** Aprovada para tarefas (aguardando seu ok final) · **Data:** 2026-11-23 · **Nível:** L3 spec completa (risco de autenticação e permissões = alto; contratos e vários consumidores)
> **Contexto lido:** Issue #5; `apps/web/src/lib/auth/auth.ts`, `client.ts`, `session.ts`; `apps/web/src/app/api/auth/[...all]/route.ts`; `apps/web/src/features/auth/login/`; `packages/api/src/infra/database/dao/drizzleAccessDao.ts`; `packages/api/src/controllers/accessController.ts`; `packages/api/src/application/github/repositoryAuthorizationService.ts`; `packages/api/src/application/services/projects/repositoryAccessService.ts`; `packages/api/src/application/auth/*`; `packages/api/src/cli/adminsProvision.ts`; `apps/web/e2e/private-routes.spec.ts`; docs do Better Auth v1.7.7.

## Resumo para revisão

- **O que muda:** a tela de login passa a oferecer "Continuar com GitHub" (como hoje), "Continuar com Google" e um formulário de email e senha (cadastro, verificação de email, recuperação de senha). Quem entra sem GitHub usa o produto dentro dos projetos que o admin atribuiu e vincula o GitHub quando precisar de repositórios. Usuário logado pode vincular GitHub ou Google à própria conta.
- **Por quê:** hoje só quem tem GitHub entra. O Better Auth já é a base (só o provedor GitHub está ligado), então a Issue é ampliar métodos, não migrar.
- **Decisões principais:** DEC-01 usar o email/senha embutido do Better Auth; DEC-02 vínculo entre métodos só explícito, nunca por email (o email do GitHub é sintético); DEC-03 envio de email por uma porta `EmailSender` com provedor a definir (Q-04); DEC-04 usuário sem GitHub passa a existir de verdade no acesso a dados (hoje as consultas exigem GitHub); DEC-05 admin continua designado por GitHub.
- **Riscos principais:** (1) todo o código de acesso assume conta GitHub, então Google e email/senha quebrariam em silêncio, mitigado por REQ-016 a REQ-019 e testes com banco real; (2) tomada de conta por email igual, mitigada por DEC-02; (3) não há serviço de email no projeto (Q-04).
- **Como vamos verificar:** testes de serviço e DAO com Postgres real (`test:integration`), caso de rota/política, e dois fluxos ponta a ponta (login com todos os métodos visíveis; cadastro com email, verificação e entrada). Google real só em smoke manual opt-in.
- **Pendências:** nenhuma; Q-01 a Q-08 decididas em 2026-11-23.

---

# Parte 1 — Produto

## 1. Contexto e problema

O Flow Dev só deixa entrar quem tem conta no GitHub. O sistema guarda um email falso (`github-<id>@flowdev.invalid`) para esses usuários, designa admins pelo identificador GitHub e usa a conta GitHub para ler repositórios e publicar issues. Quem não tem GitHub, ou prefere outro jeito de entrar, não consegue usar o produto. A tela de login e suas mensagens de erro falam só do GitHub.

## 2. Usuários e papéis

- **Pessoa com GitHub:** entra como hoje; nada muda.
- **Pessoa sem GitHub (Google ou email/senha):** precisa entrar, ver os projetos que lhe foram atribuídos e, quando necessário, vincular o GitHub.
- **Admin:** continua designado por GitHub; precisa encontrar e atribuir projetos a usuários de qualquer método.

## 3. Objetivos

1. Entrar com Google, com email e senha ou com GitHub, na mesma tela.
2. Cadastro, verificação de email e recuperação de senha para o email/senha.
3. Um usuário ter vários métodos na mesma conta, adicionados por ele mesmo depois de entrar.
4. Mensagens de erro que citam o provedor certo.

## 4. Fora de escopo

- **Unir contas duplicadas já existentes:** exige regra de merge de dados (projetos, atribuições); fica para outra Issue.
- **Desvincular método e trocar senha estando logado:** não pedido; o risco de ficar sem forma de entrar pede regra própria.
- **Designar admin por email ou Google:** admin segue por GitHub (DEC-05).
- **Login por link mágico, passkey, 2FA, outros provedores.**
- **Fornecedor de email e templates visuais elaborados:** só o necessário para verificação e recuperação (Q-04).

## 5. Histórias de usuário

### US-01 — Entrar com Google (P1)
Como pessoa com conta Google, quero entrar com ela, para usar o Flow Dev sem ter GitHub.
- **Teste independente:** com credenciais Google de teste, a pessoa chega à lista de projetos.
- **Cenários:**
  1. **Dado** Ana sem conta no Flow Dev, **quando** conclui o Google com `ana@gmail.com` verificado, **então** a conta é criada com nome e foto do Google e ela cai em `/projects`.
  2. **Dado** Ana com conta Google já criada, **quando** entra de novo, **então** a mesma conta é aberta (sem duplicar).
  3. **Dado** o Google negando a permissão, **quando** Ana volta ao login, **então** vê "O Google não concedeu acesso…" e todas as opções continuam disponíveis.
  4. **Dado** Bia com conta de email/senha `bia@x.com`, **quando** entra com Google usando `bia@x.com` sem ter vinculado, **então** a entrada é recusada com orientação (REQ-006).

### US-02 — Criar conta e entrar com email e senha (P1)
Como pessoa sem GitHub nem Google, quero me cadastrar com email e senha, para acessar o produto.
- **Teste independente:** cadastro, abertura do link de verificação e entrada, só com o formulário.
- **Cenários:**
  1. **Dado** Caio sem conta, **quando** envia nome, `caio@x.com` e senha de 12 caracteres, **então** vê "Enviamos um link de verificação para caio@x.com" e não está logado.
  2. **Dado** Caio com email não verificado, **quando** tenta entrar, **então** é recusado e um novo link é enviado.
  3. **Dado** o link de verificação válido, **quando** Caio o abre, **então** o email fica verificado e ele entra.
  4. **Dado** senha de 7 caracteres, **quando** Caio se cadastra, **então** vê a regra "A senha deve ter de 8 a 128 caracteres".
  5. **Dado** senha errada, **quando** Caio tenta entrar, **então** vê "Email ou senha incorretos", a mesma mensagem usada para email inexistente.

### US-03 — Usar o produto sem GitHub vinculado (P1)
Como pessoa que entrou por Google ou email/senha, quero ver meus projetos e saber o que preciso fazer para usar repositórios, para não ficar presa numa tela de erro.
- **Teste independente:** usuário só Google, sem GitHub, atribuído a um projeto.
- **Cenários:**
  1. **Dado** Ana atribuída ao projeto Alfa pelo admin, **quando** abre `/projects`, **então** vê Alfa.
  2. **Dado** Ana sem GitHub vinculado, **quando** abre uma ação que lê o repositório de Alfa, **então** vê "Vincule sua conta do GitHub para continuar" com botão de vincular.
  3. **Dado** o admin buscando "Ana" na atribuição, **quando** pesquisa, **então** Ana (Google) aparece e pode ser atribuída.

### US-04 — Vincular outro método à minha conta (P2)
Como usuário logado, quero vincular GitHub ou Google à minha conta, para entrar por mais de um caminho e usar repositórios.
- **Cenários:**
  1. **Dado** Ana (Google) logada, **quando** vincula o GitHub `ana-dev`, **então** a conta passa a listar Google e GitHub, e as ações de repositório ficam disponíveis.
  2. **Dado** o GitHub `ana-dev` já vinculado ao usuário Zé, **quando** Ana tenta vincular, **então** vê "Esta conta do GitHub já está vinculada a outro usuário" e nada muda.
  3. **Dado** usuário criado pelo GitHub, **quando** vincula Google com email diferente do sintético, **então** o vínculo é aceito.

### US-05 — Recuperar a senha (P2)
Como usuário de email/senha, quero redefinir a senha por email, para voltar a entrar.
- **Cenários:**
  1. **Dado** `caio@x.com` cadastrado, **quando** pede recuperação, **então** recebe link válido por 1 hora e vê "Se o email existir, enviamos um link".
  2. **Dado** `ninguem@x.com` sem conta, **quando** pede recuperação, **então** vê a mesma mensagem e nada é enviado.
  3. **Dado** o link válido, **quando** Caio define nova senha, **então** consegue entrar com ela e sessões antigas são encerradas.
  4. **Dado** link expirado, **quando** aberto, **então** vê "Link expirado" com opção de pedir outro.

### US-06 — Tela de login com vários métodos (P1)
Como visitante, quero ver os métodos disponíveis e entender erros, para escolher e tentar de novo.
- **Cenários:**
  1. **Dado** um visitante em `/projects`, **quando** é levado a `/login`, **então** vê os botões GitHub e Google e o formulário de email/senha, sem perder o destino pedido.
  2. **Dado** erro vindo do Google, **quando** volta ao login, **então** a mensagem cita o Google, nunca o GitHub.

## 6. Requisitos funcionais

**Tela de login**
- **REQ-001** (US-06): QUANDO um visitante abrir o login, o sistema DEVE exibir "Continuar com GitHub", "Continuar com Google" e o formulário de email e senha com alternância entre "Entrar" e "Criar conta".
- **REQ-002** (US-06): SE a entrada falhar por erro de um provedor, ENTÃO o sistema DEVE exibir mensagem que cita aquele provedor e manter todos os métodos disponíveis.
- **REQ-003** (US-06): ONDE o envio de email não estiver configurado, o sistema DEVE ocultar o formulário de email e senha e manter GitHub e Google.
- **REQ-004** (US-06): QUANDO a entrada for concluída, o sistema DEVE levar a pessoa ao destino pedido, mantendo a sanitização atual de destinos.

**Google**
- **REQ-005** (US-01): QUANDO o Google confirmar identidade com email verificado de um usuário novo, o sistema DEVE criar o usuário com nome, foto e email do Google e abrir sessão.
- **REQ-006** (US-01): SE o email verificado do Google for igual ao de um usuário existente que não tem o Google vinculado, ENTÃO o sistema DEVE recusar sem abrir sessão nem vincular, orientando a entrar pelo método original e vincular o Google depois.
- **REQ-007** (US-01): SE o Google devolver email não verificado ou negar acesso, ENTÃO o sistema DEVE recusar sem criar usuário.
- **REQ-008** (US-01): QUANDO o Google pedir permissões, o sistema DEVE solicitar somente identidade (`openid`, `email`, `profile`).

**Email e senha**
- **REQ-009** (US-02): QUANDO um visitante enviar nome, email e senha válidos, o sistema DEVE criar a conta sem abrir sessão e enviar link de verificação válido por 1 hora.
- **REQ-010** (US-02): SE a senha tiver menos de 8 ou mais de 128 caracteres, ENTÃO o sistema DEVE recusar com a regra de senha.
- **REQ-011** (US-02): ENQUANTO o email não estiver verificado, QUANDO a pessoa tentar entrar, o sistema DEVE recusar e reenviar o link de verificação.
- **REQ-012** (US-02): QUANDO o link de verificação válido for aberto, o sistema DEVE marcar o email como verificado e abrir sessão.
- **REQ-013** (US-02): SE o link de verificação estiver expirado ou já usado, ENTÃO o sistema DEVE informar e oferecer novo envio.
- **REQ-014** (US-02): SE email ou senha estiverem incorretos, ENTÃO o sistema DEVE responder "Email ou senha incorretos", igual para email inexistente.
- **REQ-015** (US-02): SE o email do cadastro já existir, ENTÃO o sistema DEVE mostrar a mesma resposta de um cadastro novo, sem revelar a existência da conta.

**Recuperação**
- **REQ-016** (US-05): QUANDO uma pessoa pedir recuperação de senha, o sistema DEVE responder igual para email existente e inexistente e, se existir conta com senha, enviar link válido por 1 hora.
- **REQ-017** (US-05): QUANDO uma nova senha for definida por link válido, o sistema DEVE trocar a senha e encerrar todas as sessões da conta.

**Acesso de quem não tem GitHub**
- **REQ-018** (US-03): O sistema DEVE tratar usuários de qualquer método como usuários completos: identificá-los na sessão, listar seus projetos atribuídos e permitir atribuí-los.
- **REQ-019** (US-03): QUANDO o admin buscar usuários para atribuição, o sistema DEVE incluir usuários sem GitHub, identificados pelo nome e, para eles, pelo email.
- **REQ-020** (US-03): ENQUANTO o usuário não tiver GitHub vinculado, QUANDO executar ação que lê repositório ou publica issue, o sistema DEVE responder "Vincule sua conta do GitHub para continuar" com ação de vincular.
- **REQ-021** (US-03): SE um usuário sem GitHub vinculado iniciar a autorização de repositório, ENTÃO o sistema DEVE exigir o vínculo do GitHub antes de aceitar qualquer credencial de repositório.
- **REQ-022** (US-03): ENQUANTO o usuário não tiver GitHub vinculado, o sistema DEVE tratá-lo como não admin.

**Vínculo de métodos**
- **REQ-023** (US-04): QUANDO um usuário logado vincular GitHub ou Google e concluir o provedor, o sistema DEVE registrar o método na mesma conta, mesmo que o email do provedor seja diferente.
- **REQ-024** (US-04): SE a identidade do provedor já pertencer a outro usuário, ENTÃO o sistema DEVE recusar sem alterar nenhuma conta.
- **REQ-025** (US-04): O sistema DEVE exibir ao usuário logado os métodos vinculados à conta e permitir vincular os que faltam.
- **REQ-026** (US-04): O sistema DEVE aceitar vínculo apenas de usuário autenticado; nunca vincular pela coincidência de emails.

## 7. Regras de negócio

- Um usuário tem de zero a um método de cada tipo: GitHub, Google, email/senha. Uma identidade externa pertence a um só usuário.
- Cadastro é aberto (como hoje com GitHub); acesso a projetos continua só por atribuição do admin.
- Sessão dura 7 dias, igual para todos os métodos.
- Política de senha: 8 a 128 caracteres, sem outra regra de composição [PRECISA ESCLARECER: Q-05].
- Links de verificação e de recuperação valem 1 hora e são de uso único.
- Admin = identificador GitHub na lista de admins; só vale com o GitHub vinculado.
- "Usa GitHub" significa: ler repositório, publicar issue, resolver login do GitHub. Essas ações exigem GitHub vinculado e credencial de repositório válida, como hoje.

## 8. Casos de borda e erros

| ID | Situação | Comportamento esperado | Ref. |
|---|---|---|---|
| B-01 | Duplo clique em "Continuar com Google" ou no envio do cadastro | Um único fluxo; botão ocupado enquanto pendente | REQ-001 |
| B-02 | Falha ao enviar o email de verificação | Conta criada; mensagem "Não conseguimos enviar o email" e opção de reenviar | REQ-009 |
| B-03 | Link de verificação aberto em outro navegador | Email fica verificado e a pessoa entra naquele navegador | REQ-012 |
| B-04 | Mais de 10 tentativas em 60 s de um mesmo IP | Resposta 429 com "Muitas tentativas. Aguarde um minuto e tente novamente." | NFR-03 |
| B-05 | Duas abas vinculam a mesma identidade ao mesmo tempo | Uma conclui; a outra recebe REQ-024; sem duplicata | REQ-024 |
| B-06 | Usuário só GitHub cadastra email/senha com email real | Conta separada; nenhum vínculo por email; mesclar fica fora de escopo | REQ-026 |
| B-07 | Destino malicioso no parâmetro de retorno | Cai em `/projects` como hoje | REQ-004 |
| B-08 | Google devolve perfil sem nome | Usa a parte local do email como nome | REQ-005 |
| B-09 | Usuário com senha esquece o método original (só Google, tenta senha) | "Email ou senha incorretos" (REQ-014); recuperação cria a senha | REQ-014 |

## 9. Comportamento que não muda

- QUANDO uma pessoa entrar com GitHub, o sistema DEVE CONTINUAR A pedir só `read:user`, usar o email sintético, nomear o usuário pelo login e exibir "Continuar com GitHub".
- Usuários e dados existentes (atribuições, admins, credenciais de repositório criptografadas, sessões) DEVEM CONTINUAR A funcionar sem ação do usuário.
- A autorização de repositório continua separada do login e com o mesmo conjunto de escopos.
- Caminhos do Better Auth hoje desativados (`/get-access-token`, `/refresh-token`, `/account-info`) DEVEM CONTINUAR desativados.
- Rotas privadas continuam redirecionando visitantes ao login com o destino preservado; tokens OAuth continuam criptografados em repouso.
- O cookie e o formato de sessão não mudam (os e2e criam sessão assinada diretamente).

## 10. Requisitos não funcionais

- **NFR-01** (segurança): nenhuma resposta de cadastro, entrada ou recuperação revela se um email tem conta (REQ-014, 015, 016); o tempo de resposta não pode depender disso (envio de email não aguardado).
- **NFR-02** (segurança): senhas guardadas só com hash do Better Auth; nunca em log, erro ou resposta.
- **NFR-03** (segurança): no máximo 10 tentativas por 60 s por IP em cada endpoint de entrada social, entrada por email, cadastro, recuperação e reenvio de verificação.
- **NFR-04** (segurança): login social aceita só os provedores `github` e `google` e nenhum escopo ou parâmetro vindo do cliente.
- **NFR-05** (acessibilidade): campos com rótulo, erros em região `alert`, tudo operável por teclado, foco visível; WCAG 2.1 AA.
- **NFR-06** (confiabilidade): SE o envio de email falhar, ENTÃO o sistema DEVE registrar a falha com o tipo da mensagem, sem o email do destinatário em claro nem o token.

## 11. Premissas e dependências

- Better Auth 1.7.x (já instalado) cobre Google, email/senha, verificação, recuperação e vínculo explícito. Confirmado na documentação da v1.7.7.
- Existe um app OAuth do Google a ser criado pelo dono do projeto (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`), com URL de retorno `<BETTER_AUTH_URL>/api/auth/callback/google`.
- Não há hoje serviço de email no repositório; o Resend será adicionado (DEC-03) e precisa de conta, chave de API e domínio remetente verificado, providenciados pelo dono do projeto.
- Tabelas existentes já comportam os novos métodos (campo de senha na conta, tabela de verificação, email verificado no usuário); nenhuma migração é esperada. A conferir na implementação.
- Premissas assumidas sem confirmação: cadastro aberto; vincular GitHub não exige confirmar por email; admin vê o email de usuários sem GitHub (Q-07).

---

# Parte 2 — Técnica

## 12. Visão geral da solução

Estender a configuração atual do Better Auth: ligar o provedor Google, o email/senha embutido (com verificação obrigatória e recuperação) e o vínculo explícito autenticado, mantendo o vínculo implícito desativado (DEC-02). Em paralelo, corrigir o que assume GitHub em toda conta: o acesso a dados (usuário, lista, admin) e a autorização de repositório. A tela de login ganha a lista de métodos e as mensagens por provedor. O envio de email fica atrás de uma porta com uma implementação por variáveis de ambiente (DEC-03).

## 13. Componentes e responsabilidades

| Componente | Responsabilidade | Local | Novo/Alterado |
|---|---|---|---|
| Configuração de auth | Provedores, email/senha, vínculo, limites; dividir em módulos pequenos (o arquivo atual já tem 76 linhas e vai passar de 100) | `apps/web/src/lib/auth/` | Alterado e dividido |
| Rota de auth | Aceitar `github` e `google` no `sign-in/social` e no vínculo, sem escopo do cliente | `apps/web/src/app/api/auth/[...all]/route.ts` | Alterado |
| Política OAuth | Lista de provedores permitidos | `packages/api/src/application/auth/oauthPolicy.ts` | Alterado |
| `EmailSender` | Porta e implementação por ambiente; mensagens de verificação e recuperação | `packages/api/src/application/` e `infra/` | Novo |
| DAO de acesso | Trocar `innerJoin` de GitHub por `leftJoin`; `githubLogin` e `githubId` anuláveis; busca de admin inclui todos os métodos | `drizzleAccessDao.ts`, `accessInMemoryDao.ts`, `accessDao.ts` | Alterado |
| Controller de acesso | `me` devolve `methods` e `githubLogin` anulável | `accessController.ts` | Alterado |
| Autorização de repositório | Exigir vínculo do GitHub (REQ-020, 021) | `repositoryAuthorizationService.ts`, `repositoryOAuthController.ts`, `repositoryAccessService.ts` | Alterado |
| Login | Botões, formulário, mensagens por provedor | `apps/web/src/features/auth/login/` | Alterado (`GitHubSignIn` ganha irmãos) |
| Conta | Tela "Métodos de entrada" (REQ-025) e aviso de "vincule o GitHub" | `apps/web/src/features/auth/` (local final conforme `nextjs-folder-structure`) | Novo |
| Tela de redefinição e verificação | Destinos dos links dos emails | `apps/web/src/app/` | Novo |

## 14. Modelo de dados

Sem tabelas novas esperadas: a conta de email/senha usa o campo de senha da tabela de contas, a verificação usa a tabela existente, e `users.email_verified` já existe. Usuários existentes não mudam. Para quem não é GitHub, `users.name` guarda o nome de exibição, e o login do GitHub passa a ser conhecido só para usuários criados pelo GitHub (Q-08). A unicidade (provedor, identidade) na tabela de contas já impede REQ-024 no banco (B-05).

## 15. Interfaces e contratos

```ts
// access.me (tRPC)
{ id: string; githubLogin: string | null; isAdmin: boolean; lastProjectId: string | null;
  methods: { github: boolean; google: boolean; password: boolean } }
// erro novo para ações de GitHub sem vínculo
TRPCError { code: "PRECONDITION_FAILED", message: "github_link_required" }
```

- Login social: `authClient.signIn.social({ provider: "github" | "google", callbackURL, errorCallbackURL })`. O `errorCallbackURL` passa `provedor=github|google` para a tela escolher a mensagem (DEC-06).
- Vínculo: `authClient.linkSocial({ provider, callbackURL })`, habilitado só para sessão ativa; `allowDifferentEmails: true`.
- Email/senha: `authClient.signUp.email`, `signIn.email`, `requestPasswordReset`, `resetPassword`, `sendVerificationEmail`. Configuração: `requireEmailVerification: true`, `sendOnSignIn: true`, `minPasswordLength: 8`, `maxPasswordLength: 128`, `revokeSessionsOnPasswordReset: true`, verificação e reset com 3600 s.
- `EmailSender`: `send({ to, kind: "verification" | "password-reset", url }): Promise<void>`.
- Variáveis novas: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`.

## 16. Fluxos principais

1. **Google:** botão → `signIn.social(google)` → callback do Better Auth → se email igual ao de usuário existente sem vínculo, erro `account_not_linked` vira REQ-006; se novo, cria; abre sessão → destino.
2. **Email e senha:** cadastro → conta sem sessão + email → link → verificação + sessão. Entrada antes de verificar → recusa + reenvio.
3. **Ação de repositório sem GitHub:** serviço detecta que não há conta GitHub e responde `github_link_required`; a UI oferece `linkSocial(github)`; depois a autorização de repositório segue o fluxo existente com `expectedGithubUserId` agora sempre definido.

## 17. Decisões técnicas

### DEC-01 — Email e senha embutido do Better Auth
- **Decisão:** habilitar o recurso nativo (hash, verificação, reset, rate limit).
- **Alternativas:** plugin de magic link, mais simples para o usuário mas não pedido; implementação própria de senha, mais risco sem ganho.
- **Consequências:** exige um enviador de email; a regra de senha segue o que a biblioteca expõe.

### DEC-02 — Vínculo só explícito, sem vínculo por email
- **Decisão:** manter `disableImplicitLinking: true`; vincular só por `linkSocial` com sessão ativa e `allowDifferentEmails`.
- **Alternativas:** vínculo implícito do Google por email verificado: é seguro para Google, mas o email do GitHub é sintético e a regra ficaria diferente por provedor; vínculo por email de qualquer provedor: abre tomada de conta.
- **Consequências:** quem usa dois métodos com o mesmo email recebe a orientação de REQ-006; duas contas podem ser criadas por engano (B-06), aceito e fora de escopo.

### DEC-03 — Envio de email atrás de uma porta
- **Decisão (Q-04):** `EmailSender` com implementação no Resend, configurada por `RESEND_API_KEY` e `EMAIL_FROM`; sem essas variáveis, o formulário de email some (REQ-003) e Google/GitHub seguem funcionando.
- **Alternativas:** SMTP genérico: o Resend foi a escolha do dono do projeto; email obrigatório para subir qualquer método: bloqueia o que não depende dele.
- **Consequências:** nova dependência (`resend`), justificada pela entrega de verificação e recuperação; permite entregar Google antes do email; testes usam um enviador em memória e o Resend real só entra no smoke manual. O domínio remetente precisa estar verificado no Resend.

### DEC-04 — Usuário sem GitHub é cidadão pleno nas consultas
- **Decisão:** `leftJoin` na conta GitHub; campos de GitHub anuláveis; rótulo = nome (e email para admin).
- **Alternativas:** exigir GitHub no cadastro de Google/senha: contradiz o objetivo; criar tabela de perfis separada: mais camadas sem necessidade.
- **Consequências:** revisar todo consumidor de `githubLogin`/`githubId` (lista em Q-08).

### DEC-05 — Admin continua por identificador GitHub
- **Decisão:** sem mudança na lista de admins nem no CLI `admins:provision`.
- **Alternativa:** admin por usuário/email: amplia escopo e a superfície de risco.
- **Consequências:** admin precisa vincular o GitHub (REQ-022).

### DEC-06 — Provedor do erro vem na URL de retorno
- **Decisão:** o login social passa `provedor` no `errorCallbackURL`; os códigos de erro do Better Auth ficam genéricos e a mensagem usa o nome do provedor.
- **Alternativa:** códigos por provedor: duplica a tabela de erros.
- **Consequências:** erro sem `provedor` usa mensagem genérica sem citar provedor.

## 18. Segurança, privacidade e permissões

- Autorização no servidor: `github_link_required` sai do serviço, não só da UI (REQ-020, 021). A callback de autorização de repositório não aceita credencial quando não há conta GitHub vinculada.
- Hoje, sem identidade GitHub, `expectedGithubUserId` fica indefinido e qualquer conta GitHub poderia ser autorizada para ler repositórios; REQ-021 fecha isso.
- Dados sensíveis: senha (hash), tokens (criptografados como hoje), email do usuário. Admin vê o email só de usuários sem GitHub.
- Abuso: enumeração (NFR-01), força bruta (NFR-03), redirecionamento aberto (B-07), tokens de link com uso único.

## 19. Observabilidade

Registrar, sem dados pessoais: provedor e resultado de cada entrada, falha de envio de email por tipo (NFR-06) e recusas por limite de tentativas.

## 20. Migração, rollout e reversão

- **Dados:** sem migração esperada. Usuários existentes inalterados.
- **Ordem:** 1) ajustes de acesso a dados e de repositório (inofensivos para quem já tem GitHub); 2) Google; 3) email e vínculo; 4) tela de login. Variáveis do Google entram em todos os ambientes, inclusive no ambiente de e2e, antes do deploy, porque a configuração falha ao subir se faltarem.
- **Reversão:** reverter o código. Usuários criados por Google ou email/senha permanecem no banco e ficam sem acesso (consultas antigas exigem GitHub) até a reaplicação; nenhum dado é corrompido.

## 21. Riscos técnicos

| Risco | Prob. | Impacto | Mitigação |
|---|---|---|---|
| Consumidor esquecido continua assumindo GitHub e falha para Google | Alta | Alto | Mapear todos os usos de `githubLogin`/`githubId`/`githubIdentity`; V-03 e V-04 com banco real |
| Tomada de conta por email igual | Média | Alto | DEC-02, REQ-006, V-02 |
| Resend sem domínio verificado ou chave ausente | Média | Médio | DEC-03: formulário oculto sem configuração; checar no smoke |
| Limites de tamanho (100 linhas por arquivo, 30 por função) e config de auth crescendo | Alta | Baixo | Dividir em módulos (seção 13) |

---

# Parte 3 — Verificação

## 22. Estratégia de testes

Seguindo `software-testing`: o risco dominante está em SQL (junções, unicidade) e em regras de acesso, então esses testes rodam em Postgres real efêmero (`pnpm --dir packages/api test:integration`, sem `TEST_DATABASE_URL`). Regras puras (política OAuth, mensagens por provedor) ficam em testes rápidos de `vitest`. Google e o provedor de email são substituídos: Google por perfis fixos no nível do serviço de vínculo/criação, email por um `EmailSender` em memória que captura os links. Um check de contrato não é possível sem rede, então a compatibilidade com o Google real é um smoke manual opt-in (como o smoke de sessão já existente). Poucas jornadas Playwright: login com os três métodos visíveis e cadastro com verificação. Sem prova automática: entrega real de email e consentimento real do Google.

## 23. Matriz de verificação

| ID | Cobre | Falha que detecta | Fronteira real | Casos (resumo) |
|---|---|---|---|---|
| V-01 | US-01, REQ-005, 007, 008, B-08 | usuário duplicado a cada login; email não verificado aceito; escopos extras | Better Auth + Postgres real; Google por perfil fixo | cria; reentra sem duplicar; recusa não verificado; escopos |
| V-02 | US-01 cen. 4, REQ-006, 023, 024, 026, B-05, B-06 | vínculo automático por email; vínculo de identidade alheia | Better Auth + Postgres real | recusa email igual sem vínculo; vincula logado com email diferente; recusa identidade de outro usuário; corrida de duas abas |
| V-03 | US-03, REQ-018, 019, 022 | `me` NOT_FOUND para quem não tem GitHub; busca de admin sem eles | DAO + controller + Postgres real | `me` de usuário só Google; atribuição e lista de projetos; busca de admin; não admin sem GitHub |
| V-04 | REQ-020, 021, 023 | credencial de qualquer GitHub aceita sem vínculo; ação de repositório sem aviso | serviço de repositório + Postgres real; GitHub por dublê | `github_link_required`; autorização bloqueada sem vínculo; funciona após vincular |
| V-05 | US-02, REQ-009 a 015, NFR-01, B-02, B-03 | sessão aberta sem verificar; mensagem que revela existência; link reutilizável | Better Auth + Postgres real; `EmailSender` em memória | cadastro sem sessão; entrada bloqueada e reenvio; verificação abre sessão; link expirado e reuso; mensagem igual para existente e inexistente; falha de envio |
| V-06 | US-05, REQ-016, 017 | resposta que enumera; sessões antigas sobrevivem | Better Auth + Postgres real; `EmailSender` em memória | resposta igual; troca de senha; sessões encerradas; link expirado |
| V-07 | NFR-03, NFR-04, REQ-004, B-04, B-07 | provedor ou escopo do cliente aceitos; sem limite | rota real + política | `sign-in/social` com `google` ok, `gitlab` e escopo recusados; 11ª tentativa em 429; destino malicioso |
| V-08 | Comportamento que não muda (GitHub) | regressão do login GitHub e dos admins | Postgres real | mapeamento do perfil GitHub inalterado; admin por GitHub segue; caminhos desativados seguem desativados |
| V-09 | US-06, REQ-001 a 003, NFR-05 | mensagem do GitHub em erro do Google; formulário visível sem email configurado | componentes de login (testes de UI) | mensagem por provedor; erro sem provedor é genérico; formulário oculto sem enviador; rótulos e foco |
| V-10 | US-06 e US-02 ponta a ponta (P1) | partes desconectadas | UI + API + banco de teste; enviador em memória | `/projects` sem sessão mostra os três métodos; cadastro, verificação e entrada; atualização do spec `private-routes` |
| V-12 | US-04 cen. 1, REQ-020 (interface), REQ-025 | tela de conta sem os métodos vinculados; aviso de vínculo ausente | componentes (testes de UI); API por dublê | lista Google e GitHub vinculados; botão para vincular o que falta; aviso "Vincule sua conta do GitHub" com ação |
| V-11 | US-01 com Google real | divergência do provedor real | Google real, manual opt-in | entrar e vincular |

## 24. Definição de pronto

- `pnpm --dir packages/api exec vitest run <arquivos afetados>` e `pnpm --dir packages/api typecheck` durante o trabalho; ao final, `pnpm --dir packages/api test`, `pnpm --dir packages/api test:integration`, `pnpm --dir apps/web test`, `pnpm lint`, `pnpm typecheck`.
- `pnpm --dir apps/web exec playwright test e2e/private-routes.spec.ts` e o novo spec de cadastro, rodando somente os afetados. `pnpm build` por mexer em rotas.
- Código segue `.agents/rules/code-standards.md` (sem comentários, arquivos até 100 linhas, funções até 30).
- Nenhum `[PRECISA ESCLARECER]` aberto; Q-04 decidida; spec atualizada com o que mudou.

---

## Questões em aberto

- **Q-03 (decidida 2026-11-23, opção A):** a mesma pessoa pode ter GitHub, Google e email/senha na mesma conta, só quando ela mesma, já logada, vincula o outro método numa tela de conta; o sistema nunca junta contas pelo email e não une contas duplicadas já existentes (DEC-02).
- **Q-01 (decidida 2026-11-23):** email e senha está no escopo. Sim.
- **Q-02 (decidida 2026-11-23):** quem entra sem GitHub vê os projetos atribuídos; o que usa repositório exige vincular o GitHub (REQ-020, 021). Sim. Depende de Q-03 para o "como vincular".
- **Q-04 (decidida 2026-11-23):** verificação e recuperação obrigatórias; envio pelo Resend (DEC-03).
- **Q-05 a Q-08 (aceitas conforme sugestão, 2026-11-23):** senha de 8 a 128 caracteres sem regra de composição; cadastro aberto; admin vê o email só de usuários sem GitHub; no lugar de `githubLogin` mostra-se o nome de exibição, confirmando cada uso na implementação.

## Sugestões fora do escopo

- Desvincular método, definir ou trocar senha logado — completa a gestão de conta, mas pede regra para nunca ficar sem entrada.
- Designar admin por email ou por usuário — hoje exige GitHub.
- Unir contas duplicadas (B-06) — evita duas contas da mesma pessoa.
- 2FA para email/senha.

## Histórico

- 2026-11-23 — Criação da spec (rascunho para revisão).
- 2026-11-23 — Respostas: Q-01 e Q-02 sim, Q-04 Resend, Q-05 a Q-08 como sugerido. Q-03 opção A (vínculo explícito). Sem pendências abertas.
