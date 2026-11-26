---
name: e2e-environment
description: 'Prepara e roda o ambiente de testes Playwright do Flow Dev: banco descartável migrado, apps/web/.env.e2e, servidor dedicado na porta 3100, GitHub falso e worker de sessões. Use sempre que for criar, rodar, depurar ou destravar um teste end-to-end (apps/web/e2e), quando um spec "pula" com a mensagem de ambiente não preparado, quando o teste cai na tela de login, quando a tela do trabalho diz que só a operadora pode agir, ou quando uma tarefa manda deixar um e2e como test.fixme por "verificação do GitHub". Também use para escrever seeds de e2e que precisam de uma operadora com acesso ao repositório.'
---

# Ambiente E2E do Flow Dev

O Playwright do `apps/web` roda isolado do seu ambiente de desenvolvimento: banco próprio, servidor próprio, GitHub falso. Nada aqui toca o banco de dev nem o GitHub real.

## Preparar (uma vez, e de novo depois de cada migration nova)

```bash
pnpm --dir apps/web e2e:prepare
```

O script (`packages/api/test/e2e/prepareE2eEnvironment.ts`):

1. recria o banco `flow_dev_e2e` no Postgres do docker (`flow_dev_db`, credenciais do `.env` da raiz) com `DROP ... WITH (FORCE)`;
2. aplica as migrations na ordem de `packages/api/test/databaseMigrations.ts` (a mesma dos testes de integração; `db:migrate` falha num banco vazio);
3. escreve `apps/web/.env.e2e` (gitignored) com `E2E_DATABASE_URL`, `E2E_AUTH_SECRET`, `E2E_REPOSITORY_TOKEN_KEY`, `E2E_BASE_URL` e `E2E_FAKE_GITHUB_PORT`, mantendo os segredos de execuções anteriores.

Pré-requisito: `docker compose up -d` na raiz. Para outro servidor, defina `E2E_DATABASE_SERVER_URL` (URL de um banco de manutenção, por exemplo `.../postgres`); para outro nome, `E2E_DATABASE_NAME`.

Quando uma migration nova entrar, acrescente-a em `FEATURE_MIGRATIONS` de `packages/api/test/databaseMigrations.ts` (os testes de integração também precisam dela) e rode `e2e:prepare` de novo.

## Rodar

```bash
pnpm --dir apps/web test:e2e e2e/<arquivo>.spec.ts
```

O `playwright.config.ts` carrega `.env.e2e` e sobe sozinho:

- `next dev` em `http://127.0.0.1:3100` com `distDir` `.next-e2e`. Ele convive com o `next dev` da porta 3000; o lock do Next 16 é por `distDir`. O servidor recebe `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` e `GITHUB_REPOSITORY_TOKEN_KEY` do E2E, que têm precedência sobre o `.env.local`.
- No global setup (`e2e/globalSetup.ts`): o GitHub falso em `127.0.0.1:3199`, o worker de sessões (`terminalSessionsWorker` com o banco E2E) e o aquecimento das rotas (`e2e/warmUpServer.ts`), porque o dev frio leva mais de 5 s para compilar uma rota e estoura as asserções.

Sem `.env.e2e`, os specs com fixtures pulam com "Ambiente E2E não preparado". Um spec pulado não é um spec que passou: confira a contagem `skipped` e diga no relatório quantos pularam.

## Login: como o teste entra

Não existe login pela interface. `seed.user()` cria usuário, conta GitHub e sessão no banco E2E; `signInAs(page, user)` grava o cookie `better-auth.session_token` assinado com `E2E_AUTH_SECRET`. Se o teste cair em `/login`, o servidor está lendo outro banco ou outro segredo: confira se não há um servidor velho na porta 3100 (`ss -ltnp | grep 3100`). O `reuseExistingServer` reaproveita o que estiver de pé ali.

## Operadora: a "verificação do GitHub"

A tela do trabalho só libera ações para quem passa em `WorkAuthorization.requireOperate`. Isso exige credencial de repositório do usuário, conta GitHub igual à da credencial, claim `claimed` dele e o item do quadro em "In Progress" com a Issue atribuída a ele. No E2E, tudo isso sai de:

- `seed.operator()` (ou `seed.user({ repositoryAccess: true })`): grava em `github_repository_authorizations` o token `e2e-token-<githubId>` cifrado com `E2E_REPOSITORY_TOKEN_KEY`;
- `workSeed.approvedWork(project, operator)`: Issue publicada, snapshot atual (`current_snapshot_id`), claim no quadro falso (`FAKE_BOARD`, opção `IN_PROGRESS_OPTION_ID`) e planejamento aprovado, com o hash do conteúdo igual ao que o GitHub falso devolve.

Use `seed.user()` sem acesso quando o teste for justamente sobre falta de autorização.

## GitHub falso

O código de produção lê a URL da API em `githubApiBase()` (`packages/api/src/infra/github/githubRequest.ts`). Fora de `NODE_ENV=production`, `FLOW_DEV_GITHUB_API_URL` troca `https://api.github.com` pelo servidor falso. Em produção a variável é ignorada.

O servidor (`apps/web/e2e/fakeGithub/`) responde a partir do próprio banco E2E: repositório (REST e GraphQL), `/user` pelo token, quadro, item do quadro, responsáveis, inspeção e exclusão de Issue, mutações de status. Sem estado próprio: o que estiver semeado é o que o "GitHub" tem.

- Rota desconhecida: responde 501 e escreve `[fake-github] rota não implementada: ...` no stderr do Playwright. Acrescente a rota em `graphqlRoutes.ts` (casando por um trecho estável da query) ou em `fakeGithubServer.ts` (REST), com os dados em `fakeGithubData.ts`.
- Para ver todas as chamadas: `E2E_FAKE_GITHUB_LOG=1 pnpm --dir apps/web test:e2e ...`.
- O token OAuth não é trocado nem renovado: a credencial semeada não expira, e `oauthClient()` continua apontando para o GitHub real.

## Depurar uma falha

1. Leia `test-results/<teste>/error-context.md`: o snapshot da página mostra o que a tela exibia.
2. `DEBUG=pw:webserver` mostra o log do `next dev` com status e tempo de cada requisição tRPC.
3. A tela diz "Este trabalho não existe neste projeto ou não está disponível para você": falta linha na seed (por exemplo `current_snapshot_id`) ou o GitHub falso devolveu algo que a regra recusa. Rode com `E2E_FAKE_GITHUB_LOG=1`.
4. A resposta passa de 5 s só na primeira vez: rota fria. Acrescente-a em `warmUpServer.ts` em vez de aumentar timeout.

## Ao terminar uma tarefa com e2e

- Rode só o spec afetado. O e2e completo pertence aos gates de feature e release.
- Um `test.fixme` com o motivo "verificação do GitHub" não vale mais por esse motivo: troque o usuário por `seed.operator()` e rode. Se falhar por outro motivo, mantenha o `fixme` com o motivo real e verificado (anotação nova, não a antiga).
- Registre no log da tarefa: comando, contagem de passed/failed/skipped e qualquer rota que precisou entrar no GitHub falso.
