---
status: completed
title: Página Contas de IA
type: frontend
complexity: medium
---

# Task 07: Página Contas de IA

## Visão geral
Entrega a página pessoal `/settings/ai-accounts`, ligada pelo cabeçalho do shell. Nela a pessoa cadastra contas do Claude Code e do Codex, copia o comando de login, verifica o login, renomeia e remove. Fecha a US-01 e a US-05 na interface, com um e2e real.

<critical>
- LEIA a spec (`spec.md`) e as regras do projeto (AGENTS.md/CLAUDE.md, `.agents/rules/code-standards.md`) antes de começar.
- FAÇA UMA MINI-TAREFA POR VEZ, na ordem. Só marque `[x]` depois de rodar o "Pronto quando" dela e ver passar.
- NÃO saia dos arquivos listados sem registrar o motivo no Registro de execução. Nada fora do escopo da spec.
- TESTES JUNTO COM O CÓDIGO: cada mini-tarefa implementa os testes atribuídos a ela, seguindo a skill de testes do projeto (`software-testing`). Isso quer dizer: asserção sobre o efeito observável e específico, nada de `toBeTruthy` ou de só checar que não lança exceção; valor esperado tirado da spec, nunca recalculado a partir do código; dublês só em dependências lentas, variáveis ou externas; relógio e aleatoriedade controlados. Em bug, reproduza antes de corrigir.
- Ao começar, mude `status` para `in_progress` (aqui e em `_tasks.md`). Mude para `completed` só quando todas as mini-tarefas estiverem marcadas e os critérios de sucesso tiverem sido comprovados por comando. A revisão contra a spec acontece uma vez, depois de todas as tarefas: não a espere aqui, mas não marque nada que não tenha prova, porque ela vai conferir.
</critical>

## Requisitos
- DEC-07: rota `/settings/ai-accounts` (`apps/web/src/app/settings/ai-accounts/page.tsx`, entrada fina) e módulo `apps/web/src/features/agent-accounts/`; link "Contas de IA" no `ShellHeader.tsx`.
- REQ-002: para contas "Aguardando login" ou "Deslogada", mostrar o `loginCommand` com botão "Copiar comando".
- REQ-005/REQ-006: botão "Verificar login"; contas logadas do Claude mostram e-mail e plano.
- REQ-007: a página mostra de imediato o último estado (`agentAccounts.list`) e, depois da reverificação em segundo plano, atualiza a lista (nova leitura).
- REQ-004: o formulário mostra a mensagem do erro do servidor (`label_invalid`, `label_taken`).
- REQ-008/REQ-009/REQ-010: renomear e remover; a recusa de remoção mostra a mensagem do servidor.
- Estados com texto: "Aguardando login", "Logada", "Deslogada", "Falha na verificação" (§7), nunca só por cor (NFR-05).
- `apps/web/DESIGN.md` orienta o visual. Interface em pt-BR.

## Interfaces
- **Consome:** router `agentAccounts` (`list`, `create`, `rename`, `verify`, `remove`) e `AgentAccountView` (task 03); cliente tRPC de `apps/web` (veja `trpc-nextjs`).
- **Produz:**
  - `apps/web/src/features/agent-accounts/components/AgentAccountsPage.tsx`, `AgentAccountList.tsx`, `AgentAccountRow.tsx`, `AgentAccountCreateForm.tsx`, `LoginCommandField.tsx`, `AgentAccountRename.tsx`, `AgentAccountRemoveConfirm.tsx`.
  - Constante `AI_ACCOUNTS_PATH = "/settings/ai-accounts"`, usada também pelo link "Cadastrar contas" da task 08.
  - `apps/web/e2e/ai-accounts.spec.ts`.

## Mini-tarefas

- [x] **07.1 — Rota, lista com estados em texto e link no cabeçalho**
  - **Arquivos:** `apps/web/src/app/settings/ai-accounts/page.tsx` (criar), `apps/web/src/features/agent-accounts/components/AgentAccountsPage.tsx`, `AgentAccountList.tsx`, `AgentAccountRow.tsx` (criar), `apps/web/src/features/agent-accounts/agentAccountStatusCopy.ts` (criar), `apps/web/src/features/agent-accounts/paths.ts` (criar), `apps/web/src/features/projects/project-shell/components/ShellHeader.tsx`, `apps/web/src/features/agent-accounts/components/AgentAccountList.test.tsx` (criar)
  - **Testes:** V-11a
  - **Pronto quando:** `pnpm --dir apps/web exec vitest run src/features/agent-accounts` passa; `pnpm --dir apps/web typecheck` sem erros
  - **Nota:** leia o guia de rotas em `node_modules/next/dist/docs/` antes de criar a página (AGENTS.md: "This is NOT the Next.js you know").
- [x] **07.2 — Cadastro, comando de login e verificação**
  - **Arquivos:** `apps/web/src/features/agent-accounts/components/AgentAccountCreateForm.tsx`, `LoginCommandField.tsx` (criar), `AgentAccountRow.tsx`, `apps/web/src/features/agent-accounts/components/AgentAccountCreateForm.test.tsx` (criar)
  - **Testes:** V-11b
  - **Pronto quando:** `pnpm --dir apps/web exec vitest run src/features/agent-accounts` passa
- [x] **07.3 — Renomear, remover e e2e da página**
  - **Arquivos:** `apps/web/src/features/agent-accounts/components/AgentAccountRename.tsx`, `AgentAccountRemoveConfirm.tsx` (criar), `apps/web/e2e/ai-accounts.spec.ts` (criar), `apps/web/e2e/fixtures/serverEnvironment.ts` (`FLOW_DEV_AGENT_LOGIN_FAKE`), e o worker do e2e se a reverificação depender dele
  - **Testes:** V-12a
  - **Pronto quando:** `pnpm --dir apps/web e2e:prepare` e depois `pnpm --dir apps/web test:e2e e2e/ai-accounts.spec.ts` passam (o spec não pode ficar pulado); `pnpm --dir apps/web exec vitest run src/features/agent-accounts` passa
  - **Nota:** leia a skill `e2e-environment` antes. O inspetor do e2e é o dublê `FLOW_DEV_AGENT_LOGIN_FAKE` da task 02.3. O `XDG_STATE_HOME` do e2e já aponta para um diretório descartável.

## Detalhes de implementação
Siga `nextjs-folder-structure`: a página só monta `AgentAccountsPage`; componentes, cópia e hooks ficam em `features/agent-accounts/`. Espelhe a tela de clone local nas Configurações do projeto para formulários e mensagens de erro tRPC. O botão de copiar usa `navigator.clipboard.writeText` e mostra "Comando copiado". O `loginCommand` vem pronto do servidor; a tela não monta caminhos.

### Arquivos relevantes
- `apps/web/src/features/projects/project-shell/components/ShellHeader.tsx`: onde entra o link.
- `apps/web/src/app/projects/[projectId]/settings/page.tsx` e a feature de configurações: padrão de formulário.
- `apps/web/e2e/project-agents.spec.ts`: e2e de uma página de configurações.
- `apps/web/DESIGN.md`.

### Arquivos afetados
- `ShellHeader.tsx`: link "Contas de IA".

### Decisões relacionadas
- DEC-07: página pessoal nova; rota nova entra no build e no e2e.

## Premissas
Nenhuma.

## Testes atribuídos
- [x] V-11a: lista com uma conta de cada estado → cada linha mostra o nome, o provedor e o estado em texto ("Aguardando login", "Logada", "Deslogada", "Falha na verificação"); a logada do Claude mostra "ana@exemplo.com" e o plano; o cabeçalho tem o link "Contas de IA" para `/settings/ai-accounts` · RTL com tRPC falso.
- [x] V-11b: cadastrar "Pessoal" no Claude → a conta aparece em "Aguardando login" com o comando e o botão "Copiar comando", que grava o comando exato na área de transferência; erro `label_taken` → a mensagem "Você já tem uma conta do Claude Code com esse nome" aparece junto ao campo; "Verificar login" chama `verify` e mostra o estado novo · RTL com tRPC falso.
- [x] V-12a: pessoa logada abre "Contas de IA" pelo cabeçalho, cadastra "Pessoal" no Claude Code → vê "Aguardando login" e o comando `CLAUDE_CONFIG_DIR='…' claude auth login`; com o dublê em `logged_in`, clica "Verificar login" → vê "Logada"; remove a conta → ela some da lista (US-01 cen. 1–2, US-05 cen. 1) · Playwright, app real + banco de teste, inspetor falso por ambiente.

## Critérios de sucesso
- Todas as mini-tarefas marcadas, cada uma com o "Pronto quando" executado.
- Todos os testes atribuídos implementados e passando; o e2e rodou, não pulou.
- `pnpm --dir apps/web test` completo, `pnpm --dir apps/web typecheck`, `pnpm lint` e `pnpm build` passam ao fechar a tarefa (rota nova).

## Registro de execução

### 07.1 — 2026-11-26
- Feito: rota `app/settings/ai-accounts/page.tsx` (entrada fina, carrega `agentAccounts.list` no servidor por `server/loadAgentAccounts.ts`, que manda para o login com a sessão expirada); `AgentAccountsPage`, `AgentAccountList`, `AgentAccountRow`, `agentAccountStatusCopy.ts`, `types.ts` e o hook `useAgentAccounts`, que relê a lista uma vez 4 s depois de abrir a página (REQ-007: a leitura inicial dispara a reverificação no servidor); link "Contas de IA" no `ShellHeader.tsx`; mocks de `agentAccounts` e `tasks.workAccounts` em `src/test/setup.ts`; fixture `src/test/agentAccounts.ts`.
- Desvio registrado: `AI_ACCOUNTS_PATH` ficou em `src/lib/navigation/accountRoutes.ts`, e não em `features/agent-accounts/paths.ts`. O `ShellHeader` (feature `projects`) e a task 08 (feature `issues`) usam a constante, e a skill `nextjs-folder-structure` proíbe import entre features irmãs.
- Fora da lista, por necessidade: `src/test/execution.ts` ganhou `account: { kind: "default", … }` em `sessionOf`. Sem isso o `typecheck` do pacote já falhava antes desta tarefa, por causa do campo `account` da task 04.3.
- `pnpm --dir apps/web exec vitest run src/features/agent-accounts` → 1 arquivo, 5 testes passando (V-11a: estados em texto, e-mail e plano, releitura depois da verificação, lista vazia, link do cabeçalho).
- `pnpm --dir apps/web typecheck` → sem erros.

### 07.2 — 2026-11-26
- Feito: `AgentAccountCreateForm` (provedor e nome; a recusa do servidor aparece em `role="alert"` ligado ao campo por `aria-describedby`); `LoginCommandField` (comando em mono, "Copiar comando" com `navigator.clipboard.writeText` e "Comando copiado"), mostrado só em "Aguardando login" e "Deslogada"; botão "Verificar login" na linha. Arquivos de apoio dentro da feature: `agentAccountsClient.ts` (mostra a mensagem do servidor em BAD_REQUEST, CONFLICT e NOT_FOUND e manda para o login em UNAUTHORIZED), `agentAccountActionCopy.ts` e os hooks `useCreateAccount`, `useVerifyAccount` e `useSessionExpiry`.
- `pnpm --dir apps/web exec vitest run src/features/agent-accounts` → 2 arquivos, 9 testes passando (V-11b: cadastro com comando e cópia exata, `label_taken` junto ao campo, verificação com estado novo, comando mantido em "Deslogada").

### 07.3 — 2026-11-26
- Feito: `AgentAccountRename` (nome novo com a `version` da conta), `AgentAccountRemoveConfirm` (confirmação; a recusa `has_open_sessions` aparece com a mensagem do servidor) e `AgentAccountActions` (verificar, renomear e remover; arquivo novo para manter a linha pequena). O hook `useAccountRequest` substituiu o `useVerifyAccount`. A releitura da lista não desfaz um estado verificado mais novo (`checkedAt`). RTL extra em `AgentAccountManage.test.tsx` (renomear, recusa com sessão aberta, remoção).
- E2E: `apps/web/e2e/ai-accounts.spec.ts` (V-12a). `serverEnvironment.ts` passa `FLOW_DEV_AGENT_LOGIN_FAKE=logged_in` ao servidor e ao worker. `seed.ts` apaga as contas das pessoas semeadas antes de apagar os usuários (FK `restrict`). `warmUpServer.ts` aquece `/settings/ai-accounts`.
- Bloqueio encontrado e decisão do usuário (2026-11-26): o servidor do e2e é `next dev` (`NODE_ENV=development`), e o dublê da 02.3 só valia com `NODE_ENV=test`. Na primeira execução o `verify` deu 500 (`[accounts] verify_failed`). O usuário escolheu recusar o dublê só em produção, como o `FLOW_DEV_GITHUB_API_URL`. Mudou `packages/api/src/infra/agents/cliAgentLoginInspector.ts`, e o V-03f em `packages/api/test/agent-login-inspector.test.ts` passou a provar que development aceita e production recusa (`pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/agent-login-inspector.test.ts` → 6 testes passando).
- `pnpm --dir apps/web e2e:prepare` → banco recriado. `pnpm --dir apps/web test:e2e e2e/ai-accounts.spec.ts` → 1 passed, 0 failed, 0 skipped (antes da decisão: 1 failed, pelo motivo acima).
- `pnpm --dir apps/web exec vitest run src/features/agent-accounts` → 3 arquivos, 12 testes passando.
- Fechamento: `pnpm --dir apps/web test` → 122 arquivos, 661 testes passando; `pnpm --dir apps/web typecheck` e `pnpm --dir packages/api typecheck` sem erros; `rtk proxy pnpm lint` → código de saída 0; `rtk proxy pnpm build` → código de saída 0, com a rota `ƒ /settings/ai-accounts`.

