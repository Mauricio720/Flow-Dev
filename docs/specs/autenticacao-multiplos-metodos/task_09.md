---
status: pending
title: Jornadas ponta a ponta e smoke
type: test
complexity: medium
---

# Task 09: Jornadas ponta a ponta e smoke

## Visão geral
Prova as duas jornadas P1 pela interface e prepara o smoke manual com o Google real. Também atualiza o spec e2e existente, que depende do texto do botão de login.

<critical>
- LEIA a spec, as regras do projeto (AGENTS.md, `.agents/rules/e2e-testing.md`) e a skill `software-testing` antes de começar.
- FAÇA UMA MINI-TAREFA POR VEZ, na ordem. Só marque `[x]` depois de rodar o "Pronto quando" dela e ver passar.
- NÃO saia dos arquivos listados sem registrar o motivo no Registro de execução. Nada fora do escopo da spec.
- E2E nunca usa produção; credenciais só por variáveis de ambiente (`E2E_*`), nada fixo no código. Locators por papel, rótulo e texto; nada de classes CSS.
- Rode apenas os specs afetados, não o e2e completo.
- Ao começar, mude `status` para `in_progress` (aqui e em `_tasks.md`). Só mude para `completed` com todos os critérios comprovados por comando.
</critical>

## Requisitos
- US-06 e US-02 ponta a ponta (spec §23, V-10).
- V-11: smoke manual opt-in com Google real.

## Interfaces
- **Consome:** tela de login e telas de email/senha (tarefas 06 e 07); `apps/web/e2e/fixtures/`; `apps/web/playwright.config.ts`; `EmailSender` e configuração do Resend (tarefa 05).
- **Produz:** `apps/web/e2e/auth-login-methods.spec.ts`, `apps/web/e2e/auth-email-signup.spec.ts`, servidor falso do Resend em `apps/web/e2e/fixtures/resendServer.ts`, procedimento do smoke em `docs/specs/autenticacao-multiplos-metodos/smoke-google.md`.

## Mini-tarefas

- [ ] **09.1 — Login com os três métodos visíveis**
  - **Arquivos:** `apps/web/e2e/private-routes.spec.ts` (alterar se algum teste quebrar; o botão "Continuar com GitHub" continua), `apps/web/e2e/auth-login-methods.spec.ts` (criar)
  - **Testes:** V-10a
  - **Pronto quando:** `pnpm --dir apps/web exec playwright test e2e/private-routes.spec.ts e2e/auth-login-methods.spec.ts` passa
- [ ] **09.2 — Cadastro, verificação e entrada**
  - **Arquivos:** `apps/web/e2e/fixtures/resendServer.ts` (criar: servidor HTTP local que recebe o envio do Resend e guarda o link), `apps/web/playwright.config.ts` (alterar: apontar o SDK para ele via variável de ambiente; confirmar na documentação do SDK `resend` o nome da variável), `apps/web/e2e/auth-email-signup.spec.ts` (criar), `apps/web/e2e/fixtures/index.ts` (alterar se necessário)
  - **Testes:** V-10b
  - **Pronto quando:** `pnpm --dir apps/web exec playwright test e2e/auth-email-signup.spec.ts` passa
  - **Nota:** o teste cria o usuário e limpa o que criou; se o SDK não aceitar URL base, usar o transporte em memória exposto por uma rota de teste desligada fora do e2e e registrar a decisão.
- [ ] **09.3 — Procedimento do smoke com Google real**
  - **Arquivos:** `docs/specs/autenticacao-multiplos-metodos/smoke-google.md` (criar: passos e variáveis, opt-in, nunca em CI)
  - **Testes:** V-11
  - **Pronto quando:** o documento existe e o smoke foi executado manualmente com o resultado anotado no registro (entrar com Google, vincular GitHub, criar conta por email com Resend real)

## Detalhes de implementação
Seguir o padrão dos specs existentes (`e2e/fixtures/seed.ts`, `session.ts`, `e2eConfigured` e `E2E_SKIP_REASON` para pular sem ambiente). Para a jornada de cadastro, ler a mensagem enviada pelo servidor falso, abrir o link de verificação e confirmar que `/projects` abre.

### Arquivos relevantes
- `apps/web/e2e/private-routes.spec.ts`, `apps/web/e2e/fixtures/environment.ts`.

### Arquivos afetados
- Os da lista de mini-tarefas.

### Decisões relacionadas
- Spec §22 (poucas jornadas P1; Google real só em smoke).

## Premissas
Nome da variável de URL base do SDK `resend` a confirmar; ambiente de e2e precisa de `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` com valores de teste (spec §20).

## Testes atribuídos
- [ ] V-10a: visitante abre `/projects` sem sessão → vai ao login e vê "Continuar com GitHub", "Continuar com Google" e o formulário de email e senha · UI + API + banco de teste
- [ ] V-10b: visitante cria conta com nome, email e senha → vê o aviso de verificação → abre o link recebido → chega a `/projects` sem projetos atribuídos · UI + API + banco de teste, Resend por servidor falso
- [ ] V-11: smoke manual com Google real: entrar com Google, vincular GitHub, ver repositórios · manual opt-in

## Critérios de sucesso
- Todas as mini-tarefas marcadas, cada uma com o "Pronto quando" executado.
- Os specs afetados passam; sem credenciais fixas no código.
- Suíte completa de cada pacote alterado executada uma vez ao final do trabalho (`pnpm --dir packages/api test`, `test:integration`, `pnpm --dir apps/web test`, `pnpm lint`, `pnpm typecheck`) e `pnpm build`, porque rotas foram criadas.

## Registro de execução
