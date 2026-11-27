---
status: completed
title: Catálogo do Codex por conta
type: backend
complexity: medium
---

# Task 06: Catálogo do Codex por conta

## Visão geral
Hoje o catálogo do Codex (disponibilidade e modelos) é um só por máquina. Esta tarefa consulta também cada conta do Codex logada nesta máquina, guarda o resultado em `agent_accounts.codex_catalog` e faz a abertura e a prévia oferecerem o catálogo da conta escolhida no trabalho (REQ-021).

<critical>
- LEIA a spec (`spec.md`) e as regras do projeto (AGENTS.md/CLAUDE.md, `.agents/rules/code-standards.md`) antes de começar.
- FAÇA UMA MINI-TAREFA POR VEZ, na ordem. Só marque `[x]` depois de rodar o "Pronto quando" dela e ver passar.
- NÃO saia dos arquivos listados sem registrar o motivo no Registro de execução. Nada fora do escopo da spec.
- TESTES JUNTO COM O CÓDIGO: cada mini-tarefa implementa os testes atribuídos a ela, seguindo a skill de testes do projeto (`software-testing`). Isso quer dizer: asserção sobre o efeito observável e específico, nada de `toBeTruthy` ou de só checar que não lança exceção; valor esperado tirado da spec, nunca recalculado a partir do código; dublês só em dependências lentas, variáveis ou externas; relógio e aleatoriedade controlados. Em bug, reproduza antes de corrigir.
- Ao começar, mude `status` para `in_progress` (aqui e em `_tasks.md`). Mude para `completed` só quando todas as mini-tarefas estiverem marcadas e os critérios de sucesso tiverem sido comprovados por comando. A revisão contra a spec acontece uma vez, depois de todas as tarefas: não a espere aqui, mas não marque nada que não tenha prova, porque ela vai conferir.
</critical>

## Requisitos
- REQ-021: quando a pessoa operadora escolher o agente Codex na abertura ou no plano, o sistema oferece a disponibilidade e os modelos do Codex da conta escolhida no trabalho.
- Sem conta do Codex escolhida → catálogo atual da máquina (login padrão), sem mudança (§9).
- Conta escolhida sem login → Codex indisponível com o motivo da conta ("A conta <nome> (Codex) não está logada. Rode `<loginCommand>`.").
- Risco 4 (§21): consultar só as contas logadas, em sequência, no mesmo ciclo do publicador (`CODEX_CATALOG_REFRESH_MS`).
- §9: as condições atuais de disponibilidade do Codex (CLI instalado, versão aceita, serviço rodando) continuam valendo.

## Interfaces
- **Consome:** `CodexCatalogPublisher` (`application/services/terminal/codexCatalogPublisher.ts`), `CodexCatalogProbe` (`application/terminal/codexCatalogProbe.ts`) e `LocalCodexCatalogProbe` (`infra/terminal/codex/codexCatalogProbe.ts`), `CodexStatus`; `AgentAccountDao.saveCheck` com `codexCatalog` (task 01); `AgentAccountHome.pathOf` (task 02); `WorkAccountService`/`TaskAgentAccountDao.choicesOf` (task 04); `SessionPurposeResolver.preview/validateChoice` e `SessionCatalogStatus` (`sessionServiceStatus.ts`).
- **Produz:**
  - `CodexCatalogProbe.read(input?: { codexHome?: string })`.
  - `AgentAccountDao.listLoggedInCodex(hostId)` (novo método na porta e no DAO).
  - `SessionCatalogStatus.codexStatus(taskId?: string)`: devolve o `codex_catalog` da conta do Codex escolhida no trabalho, ou o catálogo da máquina.

## Mini-tarefas

- [x] **06.1 — Publicador consulta as contas do Codex logadas**
  - **Arquivos:** `packages/api/src/application/services/terminal/codexCatalogPublisher.ts`, `codexAccountCatalogs.ts` (criar), `packages/api/src/application/terminal/codexCatalogProbe.ts`, `packages/api/src/infra/terminal/codex/codexCatalogProbe.ts`, `codexCatalogTransport.ts`, `packages/api/src/application/agent-accounts/agentAccountDao.ts` e o DAO Drizzle, `packages/api/test/codex-catalog-publisher.test.ts`
  - **Testes:** V-08a
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/codex-catalog-publisher.test.ts` passa
- [x] **06.2 — Prévia e validação usam o catálogo da conta escolhida**
  - **Arquivos:** `packages/api/src/application/services/terminal/sessionServiceStatus.ts`, `sessionPurpose.ts`, `publishedCodexCatalog.ts`, composição em `packages/api/src/infra/terminalComposition.ts`, `packages/api/test/codex-account-catalog.test.ts` (criar)
  - **Testes:** V-08b
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/codex-account-catalog.test.ts test/codex-open-availability.test.ts test/codex-catalog-read.test.ts` passa; `pnpm --dir packages/api typecheck` sem erros

## Detalhes de implementação
O probe atual abre o app-server do Codex com o ambiente do processo. Passe `CODEX_HOME` da conta pela mesma via de ambiente da task 02 (`credentialEnvironment("codex", home)`). O publicador mantém o catálogo da máquina como hoje e, depois, percorre as contas logadas em sequência, gravando cada `codex_catalog`. Falha numa conta grava o status de falha só nela. A prévia (`preview`) e a validação (`validateChoice`) passam o `taskId` para obter o catálogo certo.

### Arquivos relevantes
- `packages/api/test/codex-catalog-publisher.test.ts`, `codex-catalog-read.test.ts`, `codex-open-availability.test.ts`: padrões atuais.
- `packages/api/src/application/services/terminal/publishedCodexCatalog.ts`: leitura do catálogo publicado.

### Arquivos afetados
- `codexCatalogPublisher.ts`, `sessionServiceStatus.ts`, `sessionPurpose.ts`.

### Decisões relacionadas
- DEC-06: o catálogo por conta é gravado em `agent_accounts.codex_catalog`.

## Premissas
Nenhuma.

## Testes atribuídos
- [ ] V-08a: máquina com "Codex B" (`logged_out`) e "Codex C" (`logged_in`), probe falso que responde por `codexHome` (C → modelos `["gpt-c-1"]`) → depois do `refresh`, só "Codex C" foi consultada, e o `codex_catalog` dela tem `gpt-c-1`; o catálogo da máquina continua publicado como antes · publicador + Postgres real, probe falso por conta.
- [ ] V-08b: trabalho com "Codex B" escolhida (deslogada) → prévia de abertura com Codex indisponível e o motivo da conta B; trocar para "Codex C" → disponível com os modelos `gpt-c-1`, e abrir com modelo `gpt-c-1` passa na validação; trabalho sem escolha → catálogo da máquina, igual a hoje · `SessionPurposeResolver` + Postgres real.

## Critérios de sucesso
- Todas as mini-tarefas marcadas, cada uma com o "Pronto quando" executado.
- Todos os testes atribuídos implementados e passando.
- Suítes atuais do catálogo do Codex continuam verdes.
- `pnpm --dir packages/api test` e `test:integration` completos passam ao fechar a tarefa; typecheck e lint sem erros.

## Registro de execução
- 06.1 — `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/codex-catalog-publisher.test.ts` passou (2 testes). Publica o catálogo da máquina e consulta sequencialmente apenas a conta Codex logada, persistindo o catálogo na conta e mantendo a deslogada intacta.
- 06.2 — `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/codex-account-catalog.test.ts test/codex-open-availability.test.ts test/codex-catalog-read.test.ts` passou (3 arquivos, 6 testes); `pnpm --dir packages/api typecheck` passou. O catálogo selecionado governa prévia, opções do plano e validação de abertura; sem escolha, usa o catálogo da máquina. Também passaram os testes de probe/transporte que verificam CODEX_HOME por conta.
- Arquivos fora da lista: `TerminalOpenGuard`, `TerminalSessionController`, `SessionLauncher`, `ExecutionPlanController`, `PlanSaveService`, `ReviewStartChecks`/`ReviewCycleService` e as composições de terminal/revisão agora passam o `taskId` até a leitura do catálogo. Isso é necessário para evitar que a validação posterior troque de volta para o catálogo da máquina e rejeite o modelo da conta escolhida. O transporte e startup do Codex recebem o `codexHome` para consultar o processo correto.
- Verificação final: `pnpm --dir packages/api test` passou (146 arquivos, 908 testes); `pnpm --dir packages/api test:integration` passou (211 arquivos, 940 testes; 2 arquivos e 5 testes pulados); `pnpm --dir packages/api typecheck` e `pnpm lint` passaram.
- Regressões encontradas ao fechar: o fixture de `work-account-journey.test.ts` agora grava catálogos logados para as contas B/C selecionadas; `CodexSession` marca o turno iniciado ao receber `turn/failed`, evitando classificar uma falha de uso como falha de inicialização quando a notificação chega antes da resposta RPC de `turn/start`. O teste focado `codex-runtime-start.test.ts` passou (5 testes), seguido da suíte completa de integração.
- Arquivo fora da lista da tarefa: `packages/api/src/infra/terminal/codex/codexSession.ts` foi ajustado para corrigir a corrida comprovada pelo teste V-07d durante a verificação completa.

### Correções da review-001 (2026-11-26)
- I-1 (06.2): a verificação de uma conta do Codex logada pela primeira vez, ou sem catálogo, lê o catálogo com o `CODEX_HOME` dela e o grava (`agentAccountVerification.ts`, `codexProbe` na composição). Verificações seguintes não abrem o app-server de novo. Teste: `test/agent-account-codex-catalog.test.ts` (prévia indisponível antes, disponível com `gpt-c-1` logo depois de "Verificar login", uma única leitura). A semeadura de catálogo em `work-account-journey.test.ts` ficou, porque ali as contas são criadas direto pelo DAO, sem verificação.
