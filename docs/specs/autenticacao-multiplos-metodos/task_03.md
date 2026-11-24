---
status: pending
title: Google, política OAuth, rota e limites
type: backend
complexity: high
---

# Task 03: Google, política OAuth, rota e limites

## Visão geral
Liga o provedor Google no Better Auth, aceita `github` e `google` na rota e na política OAuth, define limites de tentativa para todos os endpoints de entrada e divide a configuração de auth em módulos pequenos. É a base das tarefas 04, 05 e 06.

<critical>
- LEIA a spec e as regras do projeto (AGENTS.md, `.agents/rules/code-standards.md`) antes de começar. Leia também o guia relevante em `apps/web/node_modules/next/dist/docs/` antes de mexer na rota.
- FAÇA UMA MINI-TAREFA POR VEZ, na ordem. Só marque `[x]` depois de rodar o "Pronto quando" dela e ver passar.
- NÃO saia dos arquivos listados sem registrar o motivo no Registro de execução. Nada fora do escopo da spec.
- TESTES JUNTO COM O CÓDIGO, seguindo `software-testing`: Better Auth e Postgres reais; Google por perfil fixo, nunca rede real.
- Consulte a documentação do Better Auth v1.7.7 (Context7 `/better-auth/better-auth/v1.7.7`) para as opções de `socialProviders.google`.
- Ao começar, mude `status` para `in_progress` (aqui e em `_tasks.md`). Só mude para `completed` com todos os critérios comprovados por comando.
</critical>

## Requisitos
- REQ-005: Google com email verificado de usuário novo cria o usuário (nome, foto, email do Google) e abre sessão.
- REQ-007: Google com email não verificado, ou negado, é recusado sem criar usuário.
- REQ-008: pedir só `openid`, `email`, `profile`.
- REQ-004 e B-07: destino pedido preservado; destino malicioso cai em `/projects`.
- NFR-03: no máximo 10 tentativas por 60 s por IP em entrada social, entrada por email, cadastro, recuperação e reenvio de verificação.
- NFR-04: login social aceita só `github` e `google`, sem escopo ou parâmetro do cliente.
- B-04: 11ª tentativa → 429; B-08: perfil Google sem nome usa a parte local do email.
- Não muda (spec §9): GitHub pede só `read:user`, email sintético, nome = login, texto do botão; `/get-access-token`, `/refresh-token`, `/account-info` seguem desativados; sessão de 7 dias, cookie igual.

## Interfaces
- **Consome:** `apps/web/src/lib/auth/auth.ts` (76 linhas), `apps/web/src/app/api/auth/[...all]/route.ts`, `packages/api/src/application/auth/oauthPolicy.ts` (`validateSocialRequest`), `destination.ts`.
- **Produz:**
  - `createAuth(config: AuthConfig)` em `apps/web/src/lib/auth/createAuth.ts` (fábrica testável); `auth.ts` continua exportando `auth` e `validateAuthEnvironment`.
  - `validateSocialRequest({ provider, scopes, additionalParams })` aceitando `github` e `google`.
  - Variáveis obrigatórias novas na validação: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.

## Mini-tarefas

- [ ] **03.1 — Dividir a configuração do Better Auth em módulos**
  - **Arquivos:** `apps/web/src/lib/auth/auth.ts` (reduzir), `environment.ts`, `githubProvider.ts`, `accountOptions.ts`, `createAuth.ts` (criar; mover o código existente sem mudar comportamento), `packages/api/test/auth-github-profile.test.ts` (criar)
  - **Testes:** V-08a, V-08c
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/auth-github-profile.test.ts` passa; `pnpm --dir apps/web typecheck` sem erros
  - **Nota:** nada de comportamento novo aqui; cada arquivo com até 100 linhas.
- [ ] **03.2 — Provedor Google e variáveis**
  - **Arquivos:** `apps/web/src/lib/auth/googleProvider.ts` (criar: `clientId`, `clientSecret`, escopos `openid email profile`, `requireEmailVerification: true`, nome de fallback), `environment.ts` (alterar), `createAuth.ts` (alterar), `apps/web/.env.example` ou arquivo de exemplo equivalente se existir (alterar)
  - **Testes:** V-01d, V-01e
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/auth-google.test.ts` passa nos dois casos
- [ ] **03.3 — Criação e reentrada de usuário Google, recusa de email não verificado**
  - **Arquivos:** `packages/api/test/auth-google.test.ts` (estender; perfil fixo entregue ao fluxo do provedor)
  - **Testes:** V-01a, V-01b, V-01c
  - **Pronto quando:** mesmo teste passa com os três casos
  - **Nota:** se o Better Auth não permitir injetar o perfil por configuração, exercitar o caminho de ID token ou o `getUserInfo` do provedor; registrar a escolha no log.
- [ ] **03.4 — Limites de tentativa para todos os endpoints de entrada**
  - **Arquivos:** `apps/web/src/lib/auth/rateLimit.ts` (criar: regras de 10 por 60 s para `/sign-in/social`, `/sign-in/email`, `/sign-up/email`, `/request-password-reset`, `/send-verification-email`), `createAuth.ts` (alterar), `packages/api/test/auth-rate-limit.test.ts` (criar)
  - **Testes:** V-07b
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/auth-rate-limit.test.ts` passa
- [ ] **03.5 — Política e rota aceitam GitHub e Google; destino**
  - **Arquivos:** `packages/api/src/application/auth/oauthPolicy.ts` (alterar), `apps/web/src/app/api/auth/[...all]/route.ts` (alterar para usar a política), `packages/api/src/application/auth/auth.test.ts` (alterar o teste que exige só GitHub), `packages/api/test/auth-route.test.ts` (criar)
  - **Testes:** V-07a, V-07c
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run src/application/auth` e o teste de integração `auth-route.test.ts` passam; `pnpm --dir apps/web typecheck` sem erros

## Detalhes de implementação
Os testes de integração em `packages/api/test/` já resolvem `@/` para `apps/web/src` e `@flow-dev/api/server`; por isso podem importar `createAuth`. A configuração atual valida o ambiente na importação; a fábrica deve receber a configuração pronta para o teste não depender de variáveis reais. Manter `disableImplicitLinking: true` (DEC-02) e `/link-social` ainda desativado: a tarefa 04 o liga.

### Arquivos relevantes
- `apps/web/src/lib/auth/auth.ts`: configuração atual a dividir.
- `packages/api/src/application/auth/auth.test.ts`: testes de contrato atuais (UT de sanitização de destino devem continuar).
- `apps/web/e2e/fixtures/session.ts`: cookie `better-auth.session_token` não pode mudar.

### Arquivos afetados
- Os da lista de mini-tarefas.

### Decisões relacionadas
- DEC-02 (sem vínculo implícito), DEC-06 (provedor na URL de retorno: tratado na tarefa 06).

## Premissas
Google exige variáveis em todos os ambientes, inclusive no e2e (spec §20); registrar em `_tasks.md` se o ambiente local precisar de valores de teste.

## Testes atribuídos
- [ ] V-01a: usuário novo com email `ana@gmail.com` verificado → usuário criado com nome, foto e email do Google, sessão aberta · Better Auth + Postgres real, Google por perfil fixo
- [ ] V-01b: mesma conta Google entra de novo → mesma conta, nenhum usuário duplicado · idem
- [ ] V-01c: Google devolve email não verificado → recusado, nenhum usuário criado · idem
- [ ] V-01d: configuração do provedor pede só `openid`, `email`, `profile` · Better Auth real
- [ ] V-01e: perfil sem nome → nome é a parte local do email · idem
- [ ] V-07a: `sign-in/social` com `google` passa; `gitlab`, `scopes` e `additionalParams` → 400 · rota real + política
- [ ] V-07b: 11ª tentativa em 60 s no mesmo IP → 429, e as regras cobrem os cinco endpoints · Better Auth + Postgres real
- [ ] V-07c: destino `https://evil.example` e variações → `/projects`; destinos válidos preservados · política pura
- [ ] V-08a: perfil GitHub 1001/`alice` → email `github-1001@flowdev.invalid`, nome `alice`, escopo `read:user` · config real
- [ ] V-08c: `/get-access-token`, `/refresh-token`, `/account-info` seguem desativados · Better Auth real

## Critérios de sucesso
- Todas as mini-tarefas marcadas, cada uma com o "Pronto quando" executado.
- Todos os testes atribuídos implementados e passando; testes existentes de `auth.test.ts` verdes.
- Nenhum arquivo de auth com mais de 100 linhas.
- Typecheck e lint dos pacotes alterados sem erros.

## Registro de execução
