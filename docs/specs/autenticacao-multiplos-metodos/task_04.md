---
status: pending
title: Vínculo explícito de métodos
type: backend
complexity: medium
---

# Task 04: Vínculo explícito de métodos

## Visão geral
Permite que o usuário já logado vincule GitHub ou Google à própria conta, mesmo com email diferente, e garante que nunca haja vínculo por coincidência de email nem por identidade que pertença a outro usuário. É o que torna possível o "vincule seu GitHub" da tarefa 08.

<critical>
- LEIA a spec e as regras do projeto (AGENTS.md, `.agents/rules/code-standards.md`) antes de começar.
- FAÇA UMA MINI-TAREFA POR VEZ, na ordem. Só marque `[x]` depois de rodar o "Pronto quando" dela e ver passar.
- NÃO saia dos arquivos listados sem registrar o motivo no Registro de execução. Nada fora do escopo da spec.
- TESTES JUNTO COM O CÓDIGO, seguindo `software-testing`: Better Auth e Postgres reais; provedores por perfil fixo.
- Ao começar, mude `status` para `in_progress` (aqui e em `_tasks.md`). Só mude para `completed` com todos os critérios comprovados por comando.
</critical>

## Requisitos
- REQ-006: Google com email igual ao de usuário existente sem Google vinculado → recusa sem sessão nem vínculo, com orientação.
- REQ-023: usuário logado que conclui o provedor tem o método registrado na mesma conta, mesmo com email diferente.
- REQ-024: identidade já pertencente a outro usuário → recusa sem alterar nenhuma conta.
- REQ-026: vínculo só de usuário autenticado; nunca por coincidência de emails.
- B-05: duas abas vinculando a mesma identidade → uma conclui, a outra recebe REQ-024, sem duplicata.
- DEC-02 (spec §17).

## Interfaces
- **Consome:** `createAuth` e módulos de `apps/web/src/lib/auth/` (tarefa 03); `authClient` em `apps/web/src/lib/auth/client.ts`.
- **Produz:** endpoint de vínculo do Better Auth habilitado (`/link-social`) com `accountLinking: { disableImplicitLinking: true, allowDifferentEmails: true }`; `authClient.linkSocial({ provider, callbackURL })` utilizável pela UI; código de erro `account_not_linked` mantido para REQ-006; erro de vínculo duplicado devolvido com `provedor` na URL de retorno.

## Mini-tarefas

- [ ] **04.1 — Habilitar o vínculo explícito e recusar vínculo implícito**
  - **Arquivos:** `apps/web/src/lib/auth/accountOptions.ts` (alterar), `apps/web/src/lib/auth/createAuth.ts` (alterar: remover `/link-social` de `disabledPaths`), `apps/web/src/app/api/auth/[...all]/route.ts` (alterar: aplicar a política de provedores também ao vínculo), `packages/api/test/auth-linking.test.ts` (criar)
  - **Testes:** V-02a, V-02e
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/auth-linking.test.ts` passa; `pnpm --dir apps/web typecheck` sem erros
- [ ] **04.2 — Vínculo com email diferente**
  - **Arquivos:** `packages/api/test/auth-linking.test.ts` (estender)
  - **Testes:** V-02b
  - **Pronto quando:** teste passa; o usuário criado pelo GitHub (email sintético) ganha a conta Google com `users.id` inalterado
- [ ] **04.3 — Identidade alheia e corrida entre abas**
  - **Arquivos:** `packages/api/test/auth-linking.test.ts` (estender); ajustar a configuração só se o teste mostrar comportamento diferente do esperado
  - **Testes:** V-02c, V-02d
  - **Pronto quando:** teste passa; `pnpm --dir apps/web typecheck` e `pnpm --dir packages/api typecheck` sem erros

## Detalhes de implementação
A unicidade `(provider_id, account_id)` em `accounts` já protege o banco (spec §14); o teste de corrida dispara dois vínculos concorrentes e espera exatamente uma linha e um erro. O erro `account_not_linked` do Better Auth deve chegar à tela de login na tarefa 06 como a orientação de REQ-006.

### Arquivos relevantes
- `apps/web/src/lib/auth/accountOptions.ts` e `createAuth.ts`: criados na tarefa 03.
- `packages/api/test/fixture.ts`: criação de usuários.

### Arquivos afetados
- Os da lista de mini-tarefas.

### Decisões relacionadas
- DEC-02.

## Premissas
Nenhuma.

## Testes atribuídos
- [ ] V-02a: usuário com `bia@x.com` sem Google vinculado; Google devolve `bia@x.com` verificado → recusado, sem sessão, nenhuma conta Google criada · Better Auth + Postgres real
- [ ] V-02b: usuário GitHub (email sintético) logado vincula Google `ana@gmail.com` → conta registrada no mesmo usuário · idem
- [ ] V-02c: identidade Google já vinculada ao usuário Zé; Ana tenta vincular → recusado, nenhuma conta alterada · idem
- [ ] V-02d: duas tentativas simultâneas de vincular a mesma identidade → uma linha em `accounts`, uma recusa · idem
- [ ] V-02e: chamada de vínculo sem sessão → recusada · idem

## Critérios de sucesso
- Todas as mini-tarefas marcadas, cada uma com o "Pronto quando" executado.
- Todos os testes atribuídos implementados e passando.
- Nenhum vínculo é criado por coincidência de email.
- Typecheck e lint dos pacotes alterados sem erros.

## Registro de execução
