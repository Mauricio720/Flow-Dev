---
status: pending
title: Email e senha com Resend
type: backend
complexity: high
---

# Task 05: Email e senha com Resend

## Visão geral
Liga o email/senha do Better Auth com verificação obrigatória e recuperação de senha, enviando os emails por uma porta `EmailSender` implementada com o Resend. Sem as variáveis do Resend, o recurso fica desligado e os demais métodos seguem funcionando.

<critical>
- LEIA a spec e as regras do projeto (AGENTS.md, `.agents/rules/code-standards.md`) antes de começar.
- FAÇA UMA MINI-TAREFA POR VEZ, na ordem. Só marque `[x]` depois de rodar o "Pronto quando" dela e ver passar.
- NÃO saia dos arquivos listados sem registrar o motivo no Registro de execução. Nada fora do escopo da spec.
- TESTES JUNTO COM O CÓDIGO, seguindo `software-testing`: Better Auth e Postgres reais; `EmailSender` em memória, nunca o Resend real.
- Consulte a documentação do Better Auth v1.7.7 e do SDK `resend` (Context7) antes de configurar.
- Ao começar, mude `status` para `in_progress` (aqui e em `_tasks.md`). Só mude para `completed` com todos os critérios comprovados por comando.
</critical>

## Requisitos
- REQ-009: cadastro válido cria conta sem sessão e envia link de verificação válido por 1 hora.
- REQ-010: senha com menos de 8 ou mais de 128 caracteres é recusada com a regra de senha.
- REQ-011: email não verificado que tenta entrar é recusado e recebe novo link.
- REQ-012: link válido marca o email como verificado e abre sessão.
- REQ-013: link expirado ou já usado informa e oferece novo envio.
- REQ-014: email ou senha incorretos → "Email ou senha incorretos", igual para email inexistente.
- REQ-015: cadastro com email existente → mesma resposta de um cadastro novo.
- REQ-016: recuperação responde igual para email existente e inexistente; se existir, envia link de 1 hora.
- REQ-017: nova senha por link válido troca a senha e encerra todas as sessões da conta.
- NFR-01: nenhuma resposta revela se um email tem conta; o envio não é aguardado.
- NFR-02: senha só com hash do Better Auth; nunca em log, erro ou resposta.
- NFR-06: falha de envio é registrada por tipo, sem email em claro nem token. B-02: a conta é criada e a resposta orienta reenviar.
- REQ-003 (servidor): ONDE `RESEND_API_KEY`/`EMAIL_FROM` não existirem, email/senha fica desativado e a interface precisa saber disso (flag `emailPasswordEnabled`).
- B-03: link aberto em outro navegador verifica e abre sessão naquele navegador. B-06: email real igual ao de usuário GitHub (sintético) cria conta separada. B-09: usuário só Google tenta senha → "Email ou senha incorretos".

## Interfaces
- **Consome:** `createAuth` e módulos da tarefa 03; `/sign-in/email` e `/sign-up/email` hoje em `disabledPaths`.
- **Produz:**
  - `EmailSender`: `send({ to: string; kind: "verification" | "password-reset"; url: string }): Promise<void>` em `packages/api/src/application/email/emailSender.ts`.
  - `ResendEmailSender` em `packages/api/src/infra/email/resendEmailSender.ts`; `InMemoryEmailSender` em `packages/api/src/infra/email/inMemoryEmailSender.ts` (guarda as mensagens para os testes).
  - Configuração: `requireEmailVerification: true`, `sendOnSignIn: true`, `minPasswordLength: 8`, `maxPasswordLength: 128`, `revokeSessionsOnPasswordReset: true`, verificação e reset com 3600 s.
  - `emailPasswordEnabled: boolean` disponível ao login (via valor passado pela página `/login`).

## Mini-tarefas

- [ ] **05.1 — Porta `EmailSender`, implementação Resend e em memória**
  - **Arquivos:** `packages/api/src/application/email/emailSender.ts` (criar), `packages/api/src/infra/email/resendEmailSender.ts` (criar), `packages/api/src/infra/email/inMemoryEmailSender.ts` (criar), `packages/api/src/infra/email/emailMessages.ts` (criar: assunto e texto em português para cada `kind`), `packages/api/package.json` (adicionar `resend`), `packages/api/src/infra/email/resendEmailSender.test.ts` (criar), `packages/api/src/server.ts` (exportar o que a web usa)
  - **Testes:** V-05f (parte: a falha do Resend é registrada sem email em claro nem token)
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run src/infra/email` passa; `pnpm --dir packages/api typecheck` sem erros
- [ ] **05.2 — Cadastro e entrada por email e senha**
  - **Arquivos:** `apps/web/src/lib/auth/emailPassword.ts` (criar: opções), `createAuth.ts` (alterar: ligar quando houver `EmailSender`; remover `/sign-up/email` e `/sign-in/email` de `disabledPaths`), `environment.ts` (alterar: `RESEND_API_KEY` e `EMAIL_FROM` opcionais, ligam o recurso), `packages/api/test/auth-email-password.test.ts` (criar)
  - **Testes:** V-05a, V-05g, V-02f, B-09
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/auth-email-password.test.ts` passa
  - **Nota:** confirmar na documentação do Better Auth o nome exato das opções e, aqui, que não há migração (campo de senha na conta e `verification` já existem).
- [ ] **05.3 — Verificação obrigatória e reenvio**
  - **Arquivos:** `apps/web/src/lib/auth/emailPassword.ts` (alterar: `sendVerificationEmail`, `autoSignInAfterVerification`), `packages/api/test/auth-email-password.test.ts` (estender)
  - **Testes:** V-05b, V-05c
  - **Pronto quando:** teste passa com entrada bloqueada, reenvio e sessão aberta após o link
- [ ] **05.4 — Links expirados, uso único e respostas sem enumeração**
  - **Arquivos:** `packages/api/test/auth-email-password.test.ts` (estender; relógio controlado); ajustes de configuração se o teste mostrar divergência
  - **Testes:** V-05d, V-05e, V-05f
  - **Pronto quando:** teste passa; `pnpm --dir apps/web typecheck` sem erros
- [ ] **05.5 — Recuperação de senha**
  - **Arquivos:** `apps/web/src/lib/auth/emailPassword.ts` (alterar: `sendResetPassword`, `resetPasswordTokenExpiresIn`), `packages/api/test/auth-password-reset.test.ts` (criar)
  - **Testes:** V-06a, V-06b, V-06c, V-06d
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/auth-password-reset.test.ts` passa

## Detalhes de implementação
O envio não deve ser aguardado (`void sender.send(...)` dentro de um `.catch` que registra a falha), para o tempo de resposta não revelar se o email existe. Camadas conforme `layered-backend`: porta em `application/`, implementações em `infra/`. O `ResendEmailSender` recebe a chave e o remetente por construtor, lidos de variáveis de ambiente fora do código.

### Arquivos relevantes
- `apps/web/src/lib/auth/createAuth.ts`, `environment.ts`: tarefa 03.
- `packages/api/src/infra/database/schema.ts`: `accounts.password`, `verification`, `users.emailVerified`.

### Arquivos afetados
- Os da lista de mini-tarefas.

### Decisões relacionadas
- DEC-01 (email/senha embutido), DEC-03 (Resend atrás de uma porta).

## Premissas
Q-05 a Q-08 como sugeridas. O domínio remetente do Resend precisa estar verificado fora do código.

## Testes atribuídos
- [ ] V-05a: cadastro com nome, `caio@x.com` e senha de 12 caracteres → sem sessão e uma mensagem de verificação enviada · Better Auth + Postgres real, `EmailSender` em memória
- [ ] V-05b: entrada com email não verificado → recusada e novo link enviado · idem
- [ ] V-05c: abrir o link de verificação (em outro cliente) → email verificado e sessão aberta · idem
- [ ] V-05d: link expirado (relógio avançado 1 h) e link já usado → recusados · idem
- [ ] V-05e: cadastro de email existente e de email novo → mesma resposta; entrada com email inexistente e com senha errada → "Email ou senha incorretos" · idem
- [ ] V-05f: o envio falha → conta criada, falha registrada por tipo sem email nem token · idem
- [ ] V-05g: senha de 7 e de 129 caracteres → recusadas com a regra; 8 e 128 → aceitas · idem
- [ ] V-02f: usuário GitHub existente (email sintético) e cadastro com email real → duas contas separadas · idem
- [ ] V-06a: pedido de recuperação para email existente e inexistente → resposta idêntica; mensagem só para o existente · idem
- [ ] V-06b: nova senha por link válido → entrada com a nova senha funciona, a antiga não · idem
- [ ] V-06c: sessões abertas antes da troca → encerradas · idem
- [ ] V-06d: link de recuperação expirado → recusado · idem

## Critérios de sucesso
- Todas as mini-tarefas marcadas, cada uma com o "Pronto quando" executado.
- Todos os testes atribuídos implementados e passando.
- Sem as variáveis do Resend, Google e GitHub continuam funcionando e `emailPasswordEnabled` é falso.
- Nenhuma migração criada (ou, se necessária, justificada no registro).
- Typecheck e lint dos pacotes alterados sem erros.

## Registro de execução
