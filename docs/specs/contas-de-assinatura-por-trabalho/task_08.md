---
status: completed
title: Contas na tela do trabalho
type: frontend
complexity: medium
---

# Task 08: Contas na tela do trabalho

## Visão geral
Na tela do trabalho, entrega a seção "Contas deste trabalho", com um seletor para o Claude e outro para o Codex, visível e editável só pela pessoa operadora. Mostra a conta no diálogo de abertura, no cartão de cada sessão do plano e no histórico das sessões, e prova a jornada com Playwright. Fecha a US-02 na interface.

<critical>
- LEIA a spec (`spec.md`) e as regras do projeto (AGENTS.md/CLAUDE.md, `.agents/rules/code-standards.md`) antes de começar.
- FAÇA UMA MINI-TAREFA POR VEZ, na ordem. Só marque `[x]` depois de rodar o "Pronto quando" dela e ver passar.
- NÃO saia dos arquivos listados sem registrar o motivo no Registro de execução. Nada fora do escopo da spec.
- TESTES JUNTO COM O CÓDIGO: cada mini-tarefa implementa os testes atribuídos a ela, seguindo a skill de testes do projeto (`software-testing`). Isso quer dizer: asserção sobre o efeito observável e específico, nada de `toBeTruthy` ou de só checar que não lança exceção; valor esperado tirado da spec, nunca recalculado a partir do código; dublês só em dependências lentas, variáveis ou externas; relógio e aleatoriedade controlados. Em bug, reproduza antes de corrigir.
- Ao começar, mude `status` para `in_progress` (aqui e em `_tasks.md`). Mude para `completed` só quando todas as mini-tarefas estiverem marcadas e os critérios de sucesso tiverem sido comprovados por comando. A revisão contra a spec acontece uma vez, depois de todas as tarefas: não a espere aqui, mas não marque nada que não tenha prova, porque ela vai conferir.
</critical>

## Requisitos
- REQ-012: a pessoa operadora escolhe, por provedor, uma das próprias contas ou "Login padrão desta máquina".
- US-02 cen. 4: quem só lê não vê nem altera as contas escolhidas (a seção não aparece).
- B-01: sem contas, o seletor mostra só "Login padrão desta máquina" e um link "Cadastrar contas" (`AI_ACCOUNTS_PATH`).
- B-03: conflito de versão → mensagem "A escolha mudou; recarregue" e nova leitura.
- REQ-015: o diálogo de abertura (`LaunchChoiceSection`) e o `PlanSessionCard` mostram "Conta: <nome>" (ou "Conta: Login padrão desta máquina") conforme o agente escolhido, com um atalho "Trocar conta" que leva à seção do trabalho.
- REQ-018 / Q-02: o histórico mostra o nome da conta para a dona, "Conta pessoal da pessoa operadora" para as demais pessoas, "Login padrão" quando não houve conta, e o sufixo "(removida)" quando a conta foi removida (REQ-009).
- NFR-05: seletores com rótulo visível ("Conta do Claude Code", "Conta do Codex"), operáveis pelo teclado; estado da conta em texto, não só por cor.
- Atualizar `apps/web/PRODUCT.md` com as contas por trabalho (Definição de pronto).

## Interfaces
- **Consome:** `tasks.workAccounts.get/set` e `WorkAccountChoice` (task 04); `account` na visão do histórico (`TerminalExecutionReader.read`, task 04.3); `AI_ACCOUNTS_PATH` (task 07; se ainda não existir, use a string `/settings/ai-accounts` e registre); componentes atuais `LaunchChoiceSection.tsx`, `PlanSessionCard.tsx`, `ExecutionHistory.tsx`, `WorkDetail.tsx`/`OperatorStages.tsx`.
- **Produz:**
  - `apps/web/src/features/issues/assigned-work/components/WorkAccountsSection.tsx`, `WorkAccountSelect.tsx`, `SessionAccountLabel.tsx`.
  - Hook `useWorkAccounts(taskId)` em `apps/web/src/features/issues/assigned-work/hooks/`.
  - `apps/web/e2e/work-accounts.spec.ts`.

## Mini-tarefas

- [x] **08.1 — Seção "Contas deste trabalho" com os dois seletores**
  - **Arquivos:** `apps/web/src/features/issues/assigned-work/components/WorkAccountsSection.tsx`, `WorkAccountSelect.tsx` (criar), `apps/web/src/features/issues/assigned-work/hooks/useWorkAccounts.ts` (criar), `WorkDetail.tsx` (ou o componente da área da operadora), `apps/web/src/features/issues/assigned-work/components/WorkAccountsSection.test.tsx` (criar)
  - **Testes:** V-11c
  - **Pronto quando:** `pnpm --dir apps/web exec vitest run src/features/issues/assigned-work/components/WorkAccountsSection.test.tsx` passa
- [x] **08.2 — Gravar a escolha e tratar o conflito de versão**
  - **Arquivos:** `WorkAccountSelect.tsx`, `useWorkAccounts.ts`, `WorkAccountsSection.test.tsx`
  - **Testes:** V-11d
  - **Pronto quando:** o teste acima passa
- [x] **08.3 — "Conta: …" no diálogo de abertura e no cartão do plano**
  - **Arquivos:** `apps/web/src/features/issues/assigned-work/components/LaunchChoiceSection.tsx`, `PlanSessionCard.tsx`, `SessionAccountLabel.tsx` (criar), `TerminalLaunchChoice.test.tsx`, `PlanSessionCard.test.tsx`
  - **Testes:** V-11e
  - **Pronto quando:** `pnpm --dir apps/web exec vitest run src/features/issues/assigned-work/components/TerminalLaunchChoice.test.tsx src/features/issues/assigned-work/components/PlanSessionCard.test.tsx` passa
- [x] **08.4 — Conta no histórico, e2e da jornada e `PRODUCT.md`**
  - **Arquivos:** `apps/web/src/features/issues/assigned-work/components/ExecutionHistory.tsx` (ou a linha de sessão que ele usa), `ExecutionHistory.test.tsx`, `apps/web/e2e/work-accounts.spec.ts` (criar), `apps/web/PRODUCT.md`
  - **Testes:** V-11f, V-12b
  - **Pronto quando:** `pnpm --dir apps/web exec vitest run src/features/issues/assigned-work/components/ExecutionHistory.test.tsx` passa; `pnpm --dir apps/web e2e:prepare` e `pnpm --dir apps/web test:e2e e2e/work-accounts.spec.ts` passam sem pular; `pnpm --dir apps/web typecheck` sem erros
  - **Nota:** leia a skill `e2e-environment`; use o GitHub falso e a seed de operadora com acesso ao repositório. Espelhe `apps/web/e2e/route-switch.spec.ts` para abrir uma sessão roteirizada na tela do trabalho.

## Detalhes de implementação
Siga `nextjs-folder-structure` e `trpc-nextjs`. A seção só renderiza quando a tela já sabe que a pessoa é a operadora (o mesmo critério que habilita abrir sessões). O rótulo da conta no diálogo depende do agente escolhido no momento (Claude → escolha `claude`; Codex → `codex`), lido de `tasks.workAccounts.get`. O atalho "Trocar conta" rola ou navega até a seção, sem abrir outro diálogo.

### Arquivos relevantes
- `apps/web/src/features/issues/assigned-work/components/LaunchChoiceSection.tsx`, `AgentChoiceField.tsx`: escolha de agente atual.
- `PlanSessionCard.tsx`, `PlanSessionFooter.tsx`: cartão do plano.
- `ExecutionHistory.tsx`: histórico das sessões.
- `apps/web/e2e/route-switch.spec.ts`, `apps/web/e2e/fixtures/`: e2e na tela do trabalho com GitHub falso.

### Arquivos afetados
- `LaunchChoiceSection.tsx`, `PlanSessionCard.tsx`, `ExecutionHistory.tsx`, `WorkDetail.tsx`, `apps/web/PRODUCT.md`.

### Decisões relacionadas
- DEC-02: a conta não fica no plano; o cartão mostra a conta vigente do trabalho.
- DEC-04: "Login padrão desta máquina" é a opção sem linha.

## Premissas
- V-12b roda ativo (decisão do usuário em 2026-11-25), sem `test.fixme`.

## Testes atribuídos
- [x] V-11c: operadora com "Pessoal" e "Trabalho" no Claude → o seletor rotulado "Conta do Claude Code" lista "Login padrão desta máquina", "Pessoal" e "Trabalho" com o estado em texto e é operável por teclado (foco e seta); sem contas → só "Login padrão desta máquina" e o link "Cadastrar contas" para `/settings/ai-accounts` (B-01); pessoa que só lê → a seção não aparece (US-02 cen. 4) · RTL com tRPC falso.
- [x] V-11d: escolher "Trabalho" → `set` chamado com `{ provider: "claude", accountId: <id>, version }`; resposta `CONFLICT stale` → a mensagem "A escolha mudou; recarregue" aparece e a escolha é relida (B-03) · RTL com tRPC falso.
- [x] V-11e: diálogo de abertura com Claude e "Trabalho" escolhida → "Conta: Trabalho" e o atalho "Trocar conta"; trocar o agente para Codex sem escolha → "Conta: Login padrão desta máquina"; `PlanSessionCard` de um item Codex com "Codex B" → "Conta: Codex B" (US-02 cen. 1–2) · RTL.
- [x] V-11f: histórico com sessão `{ kind: "own", label: "Codex A", removed: true }` → "Codex A (removida)"; `{ kind: "other" }` → "Conta pessoal da pessoa operadora"; `{ kind: "default" }` → "Login padrão" · RTL.
- [x] V-12b: operadora (seed com GitHub falso) escolhe "Trabalho" em "Conta do Claude Code" na tela do trabalho, abre uma sessão roteirizada → o diálogo mostra "Conta: Trabalho" e o histórico da sessão mostra "Trabalho" (US-02 cen. 1) · Playwright, app real + banco de teste + worker roteirizado; a conta é criada pela seed com o dublê `FLOW_DEV_AGENT_LOGIN_FAKE=logged_in`.

## Critérios de sucesso
- Todas as mini-tarefas marcadas, cada uma com o "Pronto quando" executado.
- Todos os testes atribuídos implementados e passando; o e2e rodou, não pulou.
- `apps/web/PRODUCT.md` menciona as contas de IA e a escolha por trabalho.
- `pnpm --dir apps/web test` completo, `pnpm --dir apps/web typecheck` e `pnpm lint` passam ao fechar a tarefa.

## Registro de execução

### 08.1 — 2026-11-26
- Feito: `WorkAccountsSection` e `WorkAccountSelect` (`<select>` nativo com rótulo visível "Conta do Claude Code"/"Conta do Codex", opção "Login padrão desta máquina", contas com o estado em texto, link "Cadastrar contas" para `AI_ACCOUNTS_PATH` quando o provedor não tem contas); hook `useWorkAccounts(taskId, enabled)`. Para o diálogo e o cartão do plano lerem a mesma escolha sem repassar props por várias camadas, a escolha vive num contexto: `workAccountsContext.ts` e `components/WorkAccountsScope.tsx` (arquivos novos fora da lista). O `WorkDetail.tsx` envolve a seção e o `OperatorStages` com o escopo, e o contexto só tem valor para a operadora (`viewerCanOperate` e claim `claimed`, o mesmo critério do `OperatorStages`). Para quem só lê, o `get` nem é chamado.
- Arquivos de apoio: `workAccountsContract.ts`, `workAccountsCopy.ts`, `src/test/workAccounts.ts`. `PROVIDER_LABEL` e `STATUS_LABEL` foram promovidos para `src/lib/agentAccounts/accountLabels.ts`, porque as duas features usam os rótulos e uma feature não importa a outra. O `agentAccountStatusCopy.ts` da task 07 reexporta de lá.
- Teclado: o RTL prova o foco por Tab. A seta é comportamento nativo do `<select>`, que o jsdom não simula, e é provada no Playwright da 08.4.
- `pnpm --dir apps/web exec vitest run src/features/issues/assigned-work/components/WorkAccountsSection.test.tsx` → 5 testes passando.

### 08.2 — 2026-11-26
- Feito: `useWorkAccounts.choose` chama `tasks.workAccounts.set` com `{ taskId, provider, accountId, version }` (a versão lida no `get`) e relê a escolha depois, com sucesso ou não, porque o `set` não devolve a versão nova. `CONFLICT` mostra "A escolha mudou; recarregue". Outros erros do tRPC mostram a mensagem do servidor, e um erro sem código mostra a mensagem genérica. O seletor fica desabilitado enquanto salva.
- `pnpm --dir apps/web exec vitest run src/features/issues/assigned-work/components/WorkAccountsSection.test.tsx` → 8 testes passando (V-11d: gravação com a versão e releitura, conflito com a mensagem e nova leitura, volta ao login padrão com `accountId: null`).

### 08.3 — 2026-11-26
- Feito: `SessionAccountLabel` lê o contexto e mostra "Conta: <nome da escolha>" do provedor do agente, com o atalho "Trocar conta". O atalho foca o seletor da seção, que rola até ela, e no diálogo fecha o diálogo antes. Fora do escopo da operadora (quem só lê, ou sem escolha carregada), não mostra nada. O `LaunchChoiceSection` mostra a linha nos três propósitos (rota, Gerar tarefas, item do plano), conforme o agente escolhido no momento. O `PlanSessionCard` mostra a conta vigente do trabalho para o agente do item (DEC-02). Para o atalho fechar o diálogo, `TerminalLaunchBody` ganhou o `onClose` vindo do `TerminalLaunchDialog` (arquivos fora da lista, só repassam o callback).
- `pnpm --dir apps/web exec vitest run src/features/issues/assigned-work/components/TerminalLaunchChoice.test.tsx src/features/issues/assigned-work/components/PlanSessionCard.test.tsx` → 2 arquivos, 13 testes passando (V-11e: "Conta: Trabalho" com o atalho, troca para Codex → "Conta: Login padrão desta máquina", "Trocar conta" fecha o diálogo e foca "Conta do Claude Code", cartão Codex → "Conta: Codex B", nenhuma linha para quem só lê).

### 08.4 e fechamento — 2026-11-26
- Feito: `ExecutionHistory.tsx` mostra a conta no fim da linha de cada sessão anterior (`historyAccountText` em `workAccountsCopy.ts`: nome da conta, "Conta pessoal da pessoa operadora", "Login padrão", sufixo " (removida)"). A sessão mais recente não entra em "Sessões anteriores", então `ExecutionStage.tsx` ganhou a linha "Conta: <nome>" no topo (fora da lista de arquivos, necessário para o V-12b). `PRODUCT.md` ganhou o item "Contas de IA". `seed.agentAccount` (em `e2e/fixtures/seed.ts`) semeia a conta logada com o `host_id` da máquina. O spec `e2e/work-accounts.spec.ts` (V-12b): escolhe "Trabalho" em "Conta do Claude Code", prova a seta do teclado no seletor, abre o diálogo ("Conta: Trabalho"), roda a sessão roteirizada e confere "Conta: Trabalho" na etapa de execução. O log do worker mostrou `account=<id>`, sem e-mail.
- Ajuste de lint: `useWorkAccounts` lê num `async` interno e atribui o estado no `.then` do efeito (regra `react-hooks/set-state-in-effect`).
- `pnpm --dir apps/web exec vitest run …ExecutionHistory.test.tsx` → 8 passando (V-11f).
- `pnpm --dir apps/web e2e:prepare` e `pnpm --dir apps/web test:e2e e2e/work-accounts.spec.ts` → 1 passed, 0 failed, 0 skipped. `e2e/ai-accounts.spec.ts` rodado de novo → 1 passed.
- Fechamento: `pnpm --dir apps/web test` → 123 arquivos, 675 testes passando; `pnpm --dir apps/web typecheck` sem erros; `rtk proxy pnpm lint` → código de saída 0.
- Observação: `ExecutionHistory.test.tsx` e `PlanSessionCard.test.tsx` passaram de 97 e 88 para 113 linhas com os testes novos (os arquivos já existiam, e os testes dessas tarefas precisam estar neles). A regra de 100 linhas fala de `.ts` e classes; fica registrado para a revisão final.

### Correções da review-001 (2026-11-26)
- I-3: os testes de conta saíram de `ExecutionHistory.test.tsx` e `PlanSessionCard.test.tsx` (113 linhas cada) para `ExecutionHistoryAccount.test.tsx` e `PlanSessionCardAccount.test.tsx`, sem mudar asserções.
- M-4: spec atualizada (seções 15, 17 DEC-06, 22, Questões Q-03 a Q-07 e Histórico).
