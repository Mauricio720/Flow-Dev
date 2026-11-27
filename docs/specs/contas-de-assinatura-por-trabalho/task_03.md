---
status: completed
title: Serviço e router de contas de IA
type: backend
complexity: high
---

# Task 03: Serviço e router de contas de IA

## Visão geral
Entrega o `AgentAccountService` (cadastrar, listar, renomear, verificar, reverificar e remover) e o router tRPC `agentAccounts`. Com esta tarefa, a US-01 e a US-05 funcionam pela API, e a página da task 07 pode ser construída.

<critical>
- LEIA a spec (`spec.md`) e as regras do projeto (AGENTS.md/CLAUDE.md, `.agents/rules/code-standards.md`) antes de começar.
- FAÇA UMA MINI-TAREFA POR VEZ, na ordem. Só marque `[x]` depois de rodar o "Pronto quando" dela e ver passar.
- NÃO saia dos arquivos listados sem registrar o motivo no Registro de execução. Nada fora do escopo da spec.
- TESTES JUNTO COM O CÓDIGO: cada mini-tarefa implementa os testes atribuídos a ela, seguindo a skill de testes do projeto (`software-testing`). Isso quer dizer: asserção sobre o efeito observável e específico, nada de `toBeTruthy` ou de só checar que não lança exceção; valor esperado tirado da spec, nunca recalculado a partir do código; dublês só em dependências lentas, variáveis ou externas; relógio e aleatoriedade controlados. Em bug, reproduza antes de corrigir.
- Ao começar, mude `status` para `in_progress` (aqui e em `_tasks.md`). Mude para `completed` só quando todas as mini-tarefas estiverem marcadas e os critérios de sucesso tiverem sido comprovados por comando. A revisão contra a spec acontece uma vez, depois de todas as tarefas: não a espere aqui, mas não marque nada que não tenha prova, porque ela vai conferir.
</critical>

## Requisitos
- REQ-001: criar conta pessoal da pessoa nesta máquina (`host_id` do servidor) em `pending_login`, e chamar `AgentAccountHome.ensure`.
- REQ-002: `AgentAccountView.loginCommand` sempre preenchido para a dona.
- REQ-003: sem limite de quantidade.
- REQ-004: nome sem espaços nas pontas, de 1 a 40 caracteres, único sem diferenciar maiúsculas entre as não removidas da mesma dona e provedor. Mensagens:
  - vazio → "Informe um nome para a conta." (`BAD_REQUEST label_invalid`);
  - mais de 40 → "O nome da conta pode ter até 40 caracteres." (`BAD_REQUEST label_invalid`);
  - repetido → "Você já tem uma conta do Claude Code com esse nome" / "… do Codex com esse nome" (`CONFLICT label_taken`).
- REQ-005: `verify` chama `ensure` + `inspect` e grava `status`, `identity`, `plan`, `checkedAt`. Transições da tabela §7: sem login encontrado, `pending_login` continua `pending_login`; `logged_in` vira `logged_out`.
- REQ-006: `identity`/`plan` só do Claude.
- REQ-007 / NFR-03: `list` devolve o último estado do banco sem esperar o CLI e dispara a reverificação de todas em segundo plano, com no máximo 4 consultas ao mesmo tempo.
- REQ-008: `rename` com versão (`CONFLICT stale` se velha).
- REQ-009 / B-07: `remove` marca `removed_at`, chama `logoutAndDelete` e registra `[accounts] removed logout=ok|failed`; a remoção conclui mesmo com logout falho.
- REQ-010: com sessão não encerrada → `CONFLICT has_open_sessions` com "Esta conta tem 1 sessão não encerrada. Encerre-a antes de remover a conta." (plural para N > 1). A contagem e a marcação ficam na mesma transação (risco 5 da §21).
- REQ-011 / NFR-02: só a dona lista e age; para outra pessoa, `NOT_FOUND`.
- B-05: duas contas com a mesma assinatura são aceitas e independentes.
- Logs `[accounts] created`, `verified status=…` (spec §19), sem e-mail.

## Interfaces
- **Consome:** `AgentAccountDao` e `AgentAccountRecord` (task 01); `AgentAccountHome`, `AgentLoginInspector`, `loginCommandOf` (task 02); `protectedProcedure`/`router` de `packages/api/src/trpc`; `machineIdentity.ts` para o `hostId`.
- **Produz:**
  - `packages/api/src/application/services/agent-accounts/agentAccountService.ts`: `AgentAccountService` com `list(ownerId)`, `create(ownerId, { provider, label })`, `rename(ownerId, { id, label, version })`, `verify(ownerId, { id })`, `remove(ownerId, { id })`, e `requireOwned(ownerId, id)` para a task 04.
  - `AgentAccountView` (spec §15) com `version: number` a mais, para o `rename`.
  - `AgentAccountError` com razões `label_invalid | label_taken | stale | not_found | has_open_sessions` e o mapeador tRPC.
  - Router `agentAccounts` no `appRouter` (`packages/api/src/routers/index.ts`): `list` (query), `create`, `rename`, `verify`, `remove` (mutations), com schemas Zod em `packages/api/src/schemas/agentAccounts.ts`.
  - `createProductionAgentAccountService` em `packages/api/src/infra/agentAccountComposition.ts`.

## Mini-tarefas

- [x] **03.1 — Criar, listar e renomear, com as regras de nome**
  - **Arquivos:** `packages/api/src/application/services/agent-accounts/agentAccountService.ts` (criar), `agentAccountLabel.ts` (criar: normalização e validação), `agentAccountErrors.ts` (criar), `agentAccountView.ts` (criar), `packages/api/test/agent-account-service.test.ts` (criar)
  - **Testes:** V-02a, V-02b, V-02c, V-02d, V-02e
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/agent-account-service.test.ts` passa
- [x] **03.2 — Verificar e reverificar em segundo plano**
  - **Arquivos:** `packages/api/src/application/services/agent-accounts/agentAccountVerification.ts` (criar: transição de estado + limite de 4), `agentAccountService.ts`, `packages/api/src/application/services/agent-accounts/agentAccountVerification.test.ts` (criar), `packages/api/test/agent-account-service.test.ts`
  - **Testes:** V-02i, V-02j, V-02k, V-15a, V-15b
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run src/application/services/agent-accounts/agentAccountVerification.test.ts` e o teste de integração acima passam
- [x] **03.3 — Remover**
  - **Arquivos:** `packages/api/src/application/services/agent-accounts/agentAccountRemoval.ts` (criar), `agentAccountService.ts`, `packages/api/test/agent-account-removal.test.ts` (criar)
  - **Testes:** V-02f, V-02g, V-02h
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/agent-account-removal.test.ts` passa
- [x] **03.4 — Router `agentAccounts`, composição e isolamento entre pessoas**
  - **Arquivos:** `packages/api/src/routers/agentAccounts.ts` (criar), `packages/api/src/routers/index.ts`, `packages/api/src/schemas/agentAccounts.ts` (criar), `packages/api/src/controllers/agentAccountErrorMapper.ts` (criar), `packages/api/src/infra/agentAccountComposition.ts` (criar), `packages/api/test/agent-accounts-router.test.ts` (criar)
  - **Testes:** V-09a, V-09b
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/agent-accounts-router.test.ts` passa; `pnpm --dir packages/api typecheck` sem erros

## Detalhes de implementação
Siga `layered-backend`: procedure fina → serviço → DAO/portas. Espelhe `LocalCheckoutController`/`localCheckoutService.ts` (pessoal por máquina) e `localCheckoutErrorMapper.ts`. A reverificação em segundo plano não pode segurar a resposta do `list`: dispare sem `await` e capture erros no log. Use um limitador simples de concorrência (4) em vez de dependência nova. Relógio injetado (`now`).

### Arquivos relevantes
- `packages/api/src/application/services/projects/localCheckoutService.ts` e `controllers/localCheckoutController.ts`: padrão pessoal.
- `packages/api/src/routers/projects.ts`: como o router recebe controllers por composição.
- `packages/api/test/` testes de router com caller (ex.: `access-dao-methods.test.ts`, `authorization.test.ts`): como montar duas pessoas.

### Arquivos afetados
- `packages/api/src/routers/index.ts`: `agentAccounts` no `appRouter`.

### Decisões relacionadas
- DEC-05: contas pessoais e por máquina.
- DEC-06: o e-mail só existe no Claude.

## Premissas
- As mensagens de nome vazio e de nome longo não estão na spec além de "dizer qual regra falhou" (REQ-004). Use os textos de "Requisitos" acima.

## Testes atribuídos
- [ ] V-02a: Ana sem contas cria "Pessoal" no Claude → conta `pending_login` listada com `loginCommand` `CLAUDE_CONFIG_DIR='<dir>' claude auth login`, e `ensure` foi chamado com o id dela (US-01 cen. 1) · serviço + Postgres real; home e inspetor falsos.
- [ ] V-02b: Ana com "Pessoal" e "Trabalho" no Claude e três no Codex cria mais uma no Claude → aceita; lista com 6 contas (US-01 cen. 3) · Postgres real.
- [ ] V-02c: nome "   " → `label_invalid` com "Informe um nome para a conta."; nome com 41 caracteres → `label_invalid` com o texto de limite; nome com 40 → aceito; " Pessoal " é gravado como "Pessoal" · Postgres real.
- [ ] V-02d: com "Pessoal" no Claude, criar "pessoal" no Claude → `label_taken` com "Você já tem uma conta do Claude Code com esse nome" (US-01 cen. 4); renomear outra conta para "PESSOAL" → mesmo erro · Postgres real.
- [ ] V-02e: renomear "Codex A" para "Codex Principal" com a versão atual → a lista e a visão do histórico (`AgentAccountRecord` lido pelo id) mostram o nome novo; versão velha → `stale` · Postgres real.
- [ ] V-02f: remover "Codex A" sem sessões → some do `list`, `removed_at` gravado, `logoutAndDelete` chamado, e `findById` ainda devolve o nome para o histórico (US-05 cen. 1) · Postgres real.
- [ ] V-02g: "Codex B" com uma sessão interrompida → `has_open_sessions` com "Esta conta tem 1 sessão não encerrada. Encerre-a antes de remover a conta." e a conta continua ativa (US-05 cen. 2) · Postgres real.
- [ ] V-02h: home falso devolve `{ logout: "failed" }` → conta removida mesmo assim e log `[accounts] removed logout=failed` (B-07) · Postgres real, log capturado.
- [ ] V-02i: duas contas do Claude cujo inspetor devolve o mesmo e-mail → ambas `logged_in`, cada uma com seu `checkedAt` (B-05) · Postgres real.
- [ ] V-02j: `verify` com inspetor `logged_in`, "ana@exemplo.com", "max" e relógio fixo → visão com `status: "logged_in"`, `identity`, `plan` e `checkedAt` igual ao relógio; para uma conta do Codex `identity` e `plan` ficam `null` (REQ-005, REQ-006, US-01 cen. 2) · Postgres real.
- [ ] V-02k: transições: `pending_login` + inspeção `logged_out` → continua `pending_login`; `logged_in` + `logged_out` → `logged_out`; qualquer estado + `check_failed` → `check_failed` · unitário da regra de transição.
- [ ] V-15a: 20 contas no banco e inspetor que só responde depois de liberado → `list` devolve as 20 com o último estado antes de qualquer inspeção terminar (REQ-007, NFR-03) · Postgres real.
- [ ] V-15b: 10 contas reverificadas com inspetor que registra chamadas simultâneas → o máximo observado é 4 e todas são verificadas · unitário com inspetor controlado.
- [ ] V-09a: Bruno chama `agentAccounts.list` → não vê as contas de Ana (lista vazia) · caller tRPC com duas sessões + Postgres real.
- [ ] V-09b: Bruno chama `verify`, `rename` e `remove` com o id de uma conta de Ana → `NOT_FOUND` nas três, e a conta de Ana não muda (REQ-011) · caller tRPC + Postgres real.

## Critérios de sucesso
- Todas as mini-tarefas marcadas, cada uma com o "Pronto quando" executado.
- Todos os testes atribuídos implementados e passando.
- Nenhuma resposta da API ou log contém conteúdo de credencial; o caminho do diretório só aparece no `loginCommand` da dona.
- `pnpm --dir packages/api test` e `test:integration` completos passam ao fechar a tarefa; typecheck e lint sem erros.

## Registro de execução
- 03.1 — `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/agent-account-service.test.ts` — passou (5 cenários de criação, regras de nome, quantidade, duplicatas e versão).
- 03.2 — `pnpm --dir packages/api exec vitest run src/application/services/agent-accounts/agentAccountVerification.test.ts` e `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/agent-account-service.test.ts` — passaram (transições, concorrência máxima 4, lista de 20 sem aguardar inspeções, verificação e identidade do Codex nula).
- 03.3 — `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/agent-account-removal.test.ts` passou; junto da regressão `test/agent-account-dao.test.ts` e `pnpm --dir packages/api typecheck` — passaram. A porta/DAO ganhou `markRemovedIfIdle` transacional e a contagem usa estados finais atuais para satisfazer REQ-010 atomicamente.
- 03.4 — `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/agent-accounts-router.test.ts` e `pnpm --dir packages/api typecheck` — passaram; cobrem lista sem exposição entre pessoas e `NOT_FOUND` em verify, rename e remove por outro usuário.
- Fechamento — `pnpm --dir packages/api test` — 145 arquivos e 904 testes passaram; `pnpm --dir packages/api test:integration` — 203 arquivos passaram, 2 pulados; 918 testes passaram, 5 pulados. `pnpm lint` passou (API sem script próprio).

### Correções da review-001 (2026-11-26)
- I-3: `agent-account-service.test.ts` (101 linhas) dividido em `agent-account-service.test.ts` (criar e renomear), `agent-account-verify.test.ts` (V-02i/j, V-15a) e o apoio `agent-account-service-support.ts`, sem mudar asserções.
- M-2: `ACCOUNT_NOT_FOUND_MESSAGE` em `agentAccountErrors.ts`, usada nos quatro serviços.
