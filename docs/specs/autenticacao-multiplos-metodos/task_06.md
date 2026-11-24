---
status: pending
title: Tela de login: métodos e erros por provedor
type: frontend
complexity: medium
---

# Task 06: Tela de login: métodos e erros por provedor

## Visão geral
A tela de login passa a oferecer "Continuar com GitHub" e "Continuar com Google" e a explicar erros citando o provedor certo. O espaço do formulário de email/senha fica pronto para a tarefa 07 e só aparece quando o servidor informa que o email está configurado.

<critical>
- LEIA a spec e as regras do projeto (AGENTS.md, `.agents/rules/code-standards.md`, `apps/web/AGENTS.md`, `apps/web/DESIGN.md`) antes de começar. Leia o guia relevante em `apps/web/node_modules/next/dist/docs/` e a skill `nextjs-folder-structure`.
- FAÇA UMA MINI-TAREFA POR VEZ, na ordem. Só marque `[x]` depois de rodar o "Pronto quando" dela e ver passar.
- NÃO saia dos arquivos listados sem registrar o motivo no Registro de execução. Nada fora do escopo da spec.
- TESTES JUNTO COM O CÓDIGO, seguindo `software-testing`: componentes reais; `authClient` por dublê.
- Ao começar, mude `status` para `in_progress` (aqui e em `_tasks.md`). Só mude para `completed` com todos os critérios comprovados por comando.
</critical>

## Requisitos
- REQ-001: exibir "Continuar com GitHub", "Continuar com Google" e o formulário de email/senha.
- REQ-002: erro de provedor cita aquele provedor e mantém todos os métodos disponíveis. Erro sem `provedor` na URL usa mensagem genérica que não cita provedor.
- REQ-003: ONDE o email não estiver configurado, o formulário fica oculto.
- B-01: duplo clique abre um único fluxo; botão ocupado enquanto pendente.
- REQ-006 (mensagem): erro `account_not_linked` mostra "Já existe uma conta com este email. Entre pelo método original e vincule o Google na página da conta."
- Não muda: botão "Continuar com GitHub" com o mesmo nome acessível; texto "O GitHub não concedeu acesso…" para erros do GitHub.

## Interfaces
- **Consome:** `authClient.signIn.social({ provider, callbackURL, errorCallbackURL })` (`apps/web/src/lib/auth/client.ts`); `LoginScreen` (`apps/web/src/features/auth/login/index.tsx`); `GitHubSignIn.tsx`; ambiente de e-mail via `emailPasswordEnabled` (tarefa 05).
- **Produz:**
  - `SocialSignIn` com `provider: "github" | "google"` (substitui `GitHubSignIn`, que passa a ser um uso dela).
  - `LoginScreen({ error, provedor, destination, emailPasswordEnabled })`.
  - `errorCallbackURL` com `?next=<destino>&provedor=<github|google>`.

## Mini-tarefas

- [ ] **06.1 — Botões sociais genéricos**
  - **Arquivos:** `apps/web/src/features/auth/login/components/SocialSignIn.tsx` (criar a partir de `GitHubSignIn.tsx`), `apps/web/src/features/auth/login/components/socialProviders.ts` (criar: nome, texto e ícone por provedor), `apps/web/src/components/icons.tsx` (alterar: `GoogleMark`), `GitHubSignIn.tsx` (remover ou reduzir), `apps/web/src/features/auth/login/components/SocialSignIn.test.tsx` (criar)
  - **Testes:** V-09e, B-01
  - **Pronto quando:** `pnpm --dir apps/web exec vitest run src/features/auth/login/components/SocialSignIn.test.tsx` passa
- [ ] **06.2 — Mensagens de erro por provedor**
  - **Arquivos:** `apps/web/src/features/auth/login/loginErrors.ts` (criar: tabela por código e provedor, mensagem genérica), `apps/web/src/features/auth/login/index.tsx` (alterar), `apps/web/src/app/login/page.tsx` (alterar: ler `provedor` e passar), `apps/web/src/features/auth/login/loginErrors.test.ts` (criar)
  - **Testes:** V-09a, V-09b
  - **Pronto quando:** `pnpm --dir apps/web exec vitest run src/features/auth/login` passa
- [ ] **06.3 — Composição da tela e área do formulário**
  - **Arquivos:** `apps/web/src/features/auth/login/index.tsx` (alterar: os dois botões, texto de apoio sobre o que o GitHub pede sem excluir quem usa Google), `apps/web/src/app/login/page.tsx` (alterar: passar `emailPasswordEnabled`), `apps/web/src/features/auth/login/index.test.tsx` (criar)
  - **Testes:** V-09c
  - **Pronto quando:** `pnpm --dir apps/web exec vitest run src/features/auth/login` passa; `pnpm --dir apps/web typecheck` e `pnpm --dir apps/web lint` sem erros

## Detalhes de implementação
Cada arquivo com até 100 linhas; `index.tsx` hoje tem 89 e vai crescer, então a tabela de erros sai para `loginErrors.ts`. Manter o visual existente (`DESIGN.md`).

### Arquivos relevantes
- `apps/web/src/features/auth/login/index.tsx`, `components/GitHubSignIn.tsx`.
- `apps/web/e2e/private-routes.spec.ts`: depende do nome "Continuar com GitHub" (atualizado na tarefa 09).

### Arquivos afetados
- Os da lista de mini-tarefas.

### Decisões relacionadas
- DEC-06 (provedor na URL de retorno).

## Premissas
Nenhuma.

## Testes atribuídos
- [ ] V-09a: erro `access_denied` com `provedor=google` → mensagem cita o Google e nunca o GitHub · componente real
- [ ] V-09b: erro sem `provedor` → mensagem genérica sem citar provedor · componente real
- [ ] V-09c: `emailPasswordEnabled` falso → sem formulário e com os dois botões · componente real
- [ ] V-09e: os botões "Continuar com GitHub" e "Continuar com Google" visíveis; clique chama `signIn.social` com o provedor e o `errorCallbackURL` certos; segundo clique é ignorado · componente real, `authClient` por dublê
- [ ] B-01: duplo clique → uma chamada · idem

## Critérios de sucesso
- Todas as mini-tarefas marcadas, cada uma com o "Pronto quando" executado.
- Todos os testes atribuídos implementados e passando.
- Typecheck e lint de `apps/web` sem erros; nenhuma regra do AGENTS.md violada.

## Registro de execução
