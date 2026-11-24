---
status: pending
title: Conta: métodos vinculados e aviso de GitHub
type: frontend
complexity: medium
---

# Task 08: Conta: métodos vinculados e aviso de GitHub

## Visão geral
Entrega a tela onde o usuário vê os métodos de entrada vinculados e vincula os que faltam, e o aviso "Vincule sua conta do GitHub para continuar" nas ações que dependem de repositório. Sem isso, quem entrou por Google não tem como usar repositórios.

<critical>
- LEIA a spec e as regras do projeto (AGENTS.md, `.agents/rules/code-standards.md`, `apps/web/AGENTS.md`, `apps/web/DESIGN.md`) antes de começar. Leia o guia relevante em `apps/web/node_modules/next/dist/docs/` e as skills `nextjs-folder-structure` e `trpc-nextjs`.
- FAÇA UMA MINI-TAREFA POR VEZ, na ordem. Só marque `[x]` depois de rodar o "Pronto quando" dela e ver passar.
- NÃO saia dos arquivos listados sem registrar o motivo no Registro de execução. Nada fora do escopo da spec.
- TESTES JUNTO COM O CÓDIGO, seguindo `software-testing`: componentes reais; `authClient` e tRPC por dublê.
- Ao começar, mude `status` para `in_progress` (aqui e em `_tasks.md`). Só mude para `completed` com todos os critérios comprovados por comando.
</critical>

## Requisitos
- REQ-025: exibir ao usuário logado os métodos vinculados e permitir vincular os que faltam.
- REQ-020 (interface): quando uma ação responder `github_link_required`, mostrar "Vincule sua conta do GitHub para continuar" com ação de vincular.
- REQ-024 (mensagem): "Esta conta do GitHub já está vinculada a outro usuário" (idem para Google).
- NFR-05: acessível por teclado, rótulos e `alert`.
- Fora de escopo (spec §4): desvincular e trocar senha.

## Interfaces
- **Consome:** `access.me` com `methods` (tarefa 01); erro `github_link_required` (tarefa 02); `authClient.linkSocial` (tarefa 04); `apps/web/src/lib/trpc/error.ts` (`trpcCode`).
- **Produz:** rota de conta (proposta: `/account`), componente `LinkedMethods`, componente `GithubLinkRequired` reutilizável pelos pontos de uso.

## Mini-tarefas

- [ ] **08.1 — Tela de conta com métodos vinculados**
  - **Arquivos:** `apps/web/src/app/account/page.tsx` (criar; rota privada, conferir proteção), `apps/web/src/features/auth/account/index.tsx` e `components/LinkedMethods.tsx` (criar), `apps/web/src/features/auth/account/components/LinkedMethods.test.tsx` (criar)
  - **Testes:** V-12 (lista Google e GitHub vinculados; botão para o que falta)
  - **Pronto quando:** `pnpm --dir apps/web exec vitest run src/features/auth/account` passa
- [ ] **08.2 — Vincular a partir da conta**
  - **Arquivos:** `apps/web/src/features/auth/account/components/LinkProviderButton.tsx` (criar), teste (criar)
  - **Testes:** V-12 (clique chama `linkSocial` com o provedor e `callbackURL` da conta; erro de identidade já vinculada mostra a mensagem)
  - **Pronto quando:** `pnpm --dir apps/web exec vitest run src/features/auth/account` passa
- [ ] **08.3 — Aviso de GitHub ausente nos pontos de uso**
  - **Arquivos:** `apps/web/src/features/auth/account/components/GithubLinkRequired.tsx` (criar), pontos de uso encontrados por `grep -rn RepositoryAuthorizationNeeded apps/web/src` (alterar para mostrar o aviso quando o código for `github_link_required`), `apps/web/src/lib/projects/contract.ts` (alterar se existir o código de erro), teste (criar)
  - **Testes:** V-12 (aviso com ação de vincular)
  - **Pronto quando:** `pnpm --dir apps/web exec vitest run src/features/auth/account` passa; `pnpm --dir apps/web typecheck` e `lint` sem erros

## Detalhes de implementação
Procure onde a interface já trata a necessidade de reautorizar o repositório e trate o novo erro no mesmo ponto, em vez de espalhar tratamento novo. O link de acesso à conta pode ficar no menu do usuário existente (localizar o componente do menu).

### Arquivos relevantes
- `apps/web/src/lib/trpc/error.ts`, `apps/web/src/lib/trpc/server.ts`.
- `apps/web/src/features/access/`: padrão de feature com tRPC.

### Arquivos afetados
- Os da lista de mini-tarefas.

### Decisões relacionadas
- DEC-02, DEC-04.

## Premissas
Rota `/account` proposta; confirmar o local final com `nextjs-folder-structure`.

## Testes atribuídos
- [ ] V-12: usuário só Google vê Google vinculado e botão para vincular o GitHub; clicar chama `linkSocial("github")`; erro de identidade alheia mostra "Esta conta do GitHub já está vinculada a outro usuário"; resposta `github_link_required` mostra "Vincule sua conta do GitHub para continuar" com a ação · componentes reais, `authClient` e tRPC por dublê

## Critérios de sucesso
- Todas as mini-tarefas marcadas, cada uma com o "Pronto quando" executado.
- O teste atribuído implementado e passando.
- Typecheck e lint de `apps/web` sem erros.

## Registro de execução
