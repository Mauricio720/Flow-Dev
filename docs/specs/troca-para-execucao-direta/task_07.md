---
status: completed
title: Jornada e2e e smoke com Claude e Codex
type: test
complexity: medium
---

# Task 07: Jornada e2e e smoke com Claude e Codex

## Visão geral
Prova a feature de ponta a ponta. O e2e usa o runtime roteirizado: a sessão de PRD pergunta, recebe a resposta, emite o bloco e espera; a operadora confirma; a sessão recebe a mensagem. O smoke manual com Claude e com Codex confere o que só os modelos reais mostram: se propõem com critério, se param e se o prefixo do executor direto funciona no meio da sessão (P-02).

<critical>
- LEIA a spec e as regras do projeto (AGENTS.md/CLAUDE.md e `.agents/rules/e2e-testing.md`) antes de começar.
- FAÇA UMA MINI-TAREFA POR VEZ, na ordem. Só marque `[x]` depois de rodar o "Pronto quando" dela e ver passar.
- NÃO saia dos arquivos listados sem registrar o motivo no Registro de execução. Nada fora do escopo da spec.
- TESTES JUNTO COM O CÓDIGO: cada mini-tarefa implementa os testes atribuídos a ela, seguindo a skill de testes do projeto (`software-testing`). Isso quer dizer: asserção sobre o efeito observável e específico, nada de `toBeTruthy` ou de só checar que não lança exceção; valor esperado tirado da spec, nunca recalculado a partir do código; dublês só em dependências lentas, variáveis ou externas; relógio e aleatoriedade controlados. Em bug, reproduza antes de corrigir.
- Ao começar, mude `status` para `in_progress` (aqui e em `_tasks.md`). Mude para `completed` só quando todas as mini-tarefas estiverem marcadas e os critérios de sucesso tiverem sido comprovados por comando. A revisão contra a spec acontece uma vez, depois de todas as tarefas: não a espere aqui, mas não marque nada que não tenha prova, porque ela vai conferir.
</critical>

## Requisitos
- V-09 (spec §23): US-01 e US-02 de ponta a ponta.
- P-02: confirmar se `/flow-dev:direct-executor` no início de uma mensagem no meio da sessão ativa a skill no Claude e no Codex. Se não ativar no Claude, registre na spec (§11 e §21) e proponha trocar por texto, sem mudar o código nesta tarefa.
- Definição de pronto (§24): a migration 0055 aplicada no banco dev e o smoke feito com os dois agentes.

## Interfaces
- **Consome:** tudo das tasks 01 a 06; as fixtures `apps/web/e2e/fixtures/sessionScript.ts` (`writeSessionScript`, passos `text`, `ask`, `end_turn`, `wait_message`), `workSeed.ts` (que hoje semeia uma decisão `direct_execution`) e `sessionWorkerSetup.ts`.
- **Produz:** `apps/web/e2e/route-switch.spec.ts` e `ROUTE_SWITCH_SCRIPT` em `sessionScript.ts`.

## Mini-tarefas

- [x] **07.1 — Jornada e2e: pergunta, bloco, confirmação e mensagem**
  - **Arquivos:** `apps/web/e2e/route-switch.spec.ts` (criar), `apps/web/e2e/fixtures/sessionScript.ts` (alterar: `ROUTE_SWITCH_SCRIPT`), `apps/web/e2e/fixtures/workSeed.ts` (alterar: opção de semear a decisão aprovada como `prd`, sem mudar o padrão atual)
  - **Testes:** V-09a
  - **Pronto quando:** `pnpm --dir apps/web exec playwright test e2e/route-switch.spec.ts` passa; `pnpm --dir apps/web exec playwright test e2e/session-conversation.spec.ts` continua passando
  - **Nota:** roteiro: `text` ("Vou analisar.") → `ask` (uma pergunta) → `end_turn` → `wait_message` → `text` (explicação + o bloco da §15) → `end_turn` → `wait_message` → `text` ("Implementando.") → `end_turn`. Locators por papel e texto; credenciais só por variável de ambiente.
- [x] **07.2 — Migration no banco dev e smoke manual com Claude e Codex**
  - **Arquivos:** `docs/specs/troca-para-execucao-direta/spec.md` (alterar: P-02 e o histórico, com o resultado), este arquivo (registro)
  - **Testes:** V-09b, V-09c
  - **Pronto quando:** `pnpm --dir packages/api db:migrate` aplicou a 0055 no banco dev (registre a saída), e o registro desta tarefa tem, para cada agente, a Issue usada, se o cartão apareceu, se a IA parou antes da decisão e o que aconteceu depois de confirmar
  - **Nota:** o smoke é manual e depende de assinatura local; ele não entra em CI. Se não houver acesso a um dos agentes, deixe a mini-tarefa desmarcada e registre o bloqueio.

## Detalhes de implementação
- Para seed, worker e roteiro, espelhe `apps/web/e2e/session-conversation.spec.ts`. As armadilhas de ambiente estão em `apps/web/e2e/fixtures/environment.ts`: env vars, socket do Postgres, limite do GitHub.
- O e2e não testa o modelo; ele testa a ligação entre recorder, serviço, timeline, cartão, mutation e entrega da mensagem.

### Arquivos relevantes
- `apps/web/e2e/session-conversation.spec.ts`: a jornada de conversa com pergunta.
- `apps/web/e2e/fixtures/sessionScript.ts`: os passos do runtime roteirizado.
- `apps/web/e2e/fixtures/workSeed.ts`: o seed de trabalho com o planejamento aprovado.

### Arquivos afetados
- Os arquivos listados nas mini-tarefas.

### Decisões relacionadas
- DEC-01 e DEC-04: a jornada passa pelo bloco e pela fila de mensagens.

## Premissas
Nenhuma.

## Testes atribuídos
- [x] V-09a: trabalho aprovado como PRD; a operadora abre a sessão da rota, responde à pergunta, vê o cartão com o resumo e clica em "Trocar para execução direta" → o cartão mostra "Troca confirmada por <nome>"; a conversa mostra a mensagem que começa com "/flow-dev:direct-executor A troca para execução direta foi confirmada."; o texto da IA aparece sem a cerca `flow-dev-troca-de-rota`; o roteiro segue para "Implementando."; ao voltar à lista, o chip mostra "Execução direta" · e2e com runtime roteirizado
- [x] V-09b: smoke com Claude: uma Issue de troca de texto aprovada como PRD → a IA pergunta ou propõe, para, e depois de confirmar implementa sem escrever spec; P-02 confirmada ou refutada · manual
- [x] V-09c: smoke com Codex, o mesmo roteiro → o mesmo resultado esperado · manual

## Critérios de sucesso
- Todas as mini-tarefas marcadas, cada uma com o "Pronto quando" executado.
- O spec e2e passa; o smoke está registrado para os dois agentes.
- A 0055 foi aplicada no banco dev; a spec está atualizada com o resultado da P-02.
- `pnpm typecheck` e `pnpm lint` na raiz passam.

## Registro de execução

### 2026-11-25 — 07.1 (concluída)
- Arquivos: `apps/web/e2e/route-switch.spec.ts` (novo), `apps/web/e2e/fixtures/sessionScript.ts` (`ROUTE_SWITCH_SCRIPT` e textos do roteiro), `apps/web/e2e/fixtures/workSeed.ts`.
- `workSeed.approvedWork` passou a receber `options: { body?, route? }` no terceiro parâmetro (antes era só `body`, que nenhum spec passava). O padrão continua `direct_execution`.
- Fora do previsto, no mesmo `workSeed.ts`: (1) a limpeza apaga `task_route_switches` antes de sessões e decisões (a FK para a decisão é `RESTRICT`); (2) o seed grava `claimed_at = now()` na reivindicação. Sem isso, `assignedIssues.active` quebrava em `claimReads.ts:23` (`claimedAt!.toISOString()` sobre null) e a lista mostrava "Não foi possível concluir a operação". Era defeito do seed, não da feature: em produção a reivindicação sempre tem `claimed_at`.
- Mudança no roteiro em relação à nota: tirei o `wait_message` logo depois do `ask`. A resposta da pergunta volta pelo `onPermission` do runtime roteirizado e não entra como mensagem, então com aquele passo a sessão ficaria parada esperando uma mensagem da operadora antes de emitir o bloco. Roteiro final: `text` ("Vou analisar.") → `ask` → `text` (explicação + bloco da §15) → `end_turn` → `wait_message` → `text` ("Implementando.") → `end_turn`.
- `pnpm --dir apps/web e2e:prepare` → banco `flow_dev_e2e` recriado e migrado (com a 0055).
- `pnpm --dir apps/web exec playwright test e2e/route-switch.spec.ts` → 1 passed; com `--repeat-each=3` → 3 passed. Logs do worker: `route_switch_proposed`, `route_switch_decided decision=confirm`, `delivered count=1`.
- `pnpm --dir apps/web exec playwright test e2e/session-conversation.spec.ts` → 2 skipped, 0 failed. Os dois testes (V-30a, V-30b) já eram `test.fixme` antes desta tarefa; o arquivo não foi alterado.
- `pnpm typecheck` → exit 0; `pnpm lint` → exit 0.
- Observação de ambiente: numa das execuções o servidor E2E devolveu `429` em `/api/auth/get-session` (Better Auth, `rateLimit` de 10/min por IP, guardado no banco). Não derrubou o teste, mas specs com muitas navegações podem esbarrar nisso.


### 2026-11-25 — 07.2 (parcial, desmarcada)
- Migration no banco dev: a 0055 já estava aplicada. Antes de rodar, `drizzle.__drizzle_migrations` tinha 55 linhas, o mesmo número de entradas do `_journal.json`, e `task_route_switches` existia (0 linhas). `pnpm --dir packages/api db:migrate` → exit 0, sem migration nova; a saída só tem o aviso `relation "__drizzle_migrations" already exists, skipping`. A última linha aplicada tem `created_at = 1795711364372` (o `when` da 0055 no journal) e hash `b03fa0ef80e5ed53…`, igual ao `sha256sum` de `drizzle/0055_route_switches.sql`.
- Smoke V-09b (Claude) e V-09c (Codex): **não feitos**. Bloqueio: o smoke é manual. Precisa de uma Issue real aprovada como PRD num projeto do Flow Dev de dev, login pelo GitHub e sessões com as assinaturas locais do Claude e do Codex, tudo operado pela pessoa na tela. Não roda nesta sessão de agente. A P-02 continua sem confirmação, e a spec (§11, §21 e Histórico) não foi alterada.
- Para fechar: para cada agente, anote aqui a Issue usada, se o cartão apareceu, se a IA parou antes da decisão, o que aconteceu depois de confirmar e se o `/flow-dev:direct-executor` ativou a skill (P-02). Depois atualize a P-02 e o Histórico da spec, marque 07.2, V-09b e V-09c, e mude o status para `completed`.

### 2026-11-25 — 07.2 (concluída: smoke com agentes reais)
- **Como rodou:** com um harness Playwright temporário (`apps/web/smoke-tmp/`, apagado no fim, nada versionado). Ele subia o mesmo ambiente do e2e (`next dev` na 3100, banco `flow_dev_e2e`, GitHub falso), mas o worker de sessões rodava **sem** `FLOW_DEV_SESSION_FAKE_SCRIPT`, ou seja, com o Claude Code e o Codex reais das assinaturas locais. O seed era o `workSeed.approvedWork(..., { route: "prd" })` (Issue #42 "Trocar Entar por Entrar", com o print de 11 bytes do seed). O clone temporário tinha `src/LoginButton.tsx` com `<button type="submit">Entar</button>` e um README. O harness respondia às perguntas com a primeira opção e confirmava o cartão. Os relatórios completos ficaram em `/tmp/route-switch-smoke/` (`claude-code.md`, `codex.md`).
- **Diferença em relação ao roteiro da tarefa:** a Issue não é real. O GitHub é o falso do e2e, e a sessão foi aberta pela tela com a operadora semeada. O caminho tela → worker → agente → recorder → cartão → mutation → mensagem é o de produção.
- **V-09b, Claude Code** (Opus, esforço máximo, modo Tudo liberado; Issue #42 semeada, sessão `60f5f548…`):
  - Cartão: **apareceu** ("PRD → Execução direta", resumo e 6 motivos), sem perguntas antes (Q-01). O texto da IA veio sem a cerca `flow-dev-troca-de-rota`.
  - Parou antes da decisão: **sim**. A sessão ficou `waiting` com `git status` limpo.
  - Depois de confirmar: o cartão mostrou "Troca confirmada por e2e-…", e a mensagem `/flow-dev:direct-executor A troca…` foi entregue (`task_terminal_messages`, `delivered_at` preenchido). A conversa mostrou "Skill: direct-executor"; a IA editou só `src/LoginButton.tsx` (Entar → Entrar), não escreveu spec nem tarefas, rodou buscas e `esbuild` e terminou com o relatório `status: COMPLETED · route: DIRECT`. Sem commit. Levou 3,0 min no total.
  - **P-02 no Claude: confirmada.**
- **V-09c, Codex** (gpt-6.1-terra, esforço máximo, modo Tudo liberado; Issue #42 semeada, sessão `62414503…`):
  - 1ª tentativa (sessão `9bfe16de…`): **não propôs**. Parou em texto pedindo o print de novo, porque o arquivo do seed tem 11 bytes e não abre. Não escreveu spec nem código. O pedido nasceu do dado falso do seed.
  - 2ª tentativa, com o harness pronto para responder "O print não está disponível e não é necessário: o texto da Issue basta." (a resposta não chegou a ser usada): o cartão **apareceu** no primeiro turno, com resumo e 2 motivos, e o texto da IA veio sem a cerca.
  - Parou antes da decisão: **sim**, `waiting` com `git status` limpo.
  - Depois de confirmar: a mensagem foi entregue; o Codex anunciou "Vou usar flow-dev:direct-executor", leu o SKILL.md da skill, editou só `src/LoginButton.tsx`, rodou `git diff --check` e a busca do texto, e terminou com `status: COMPLETED · route: DIRECT`, sem spec, tarefas ou commit. Levou 1,6 min.
  - **P-02 no Codex: confirmada.**
- Spec atualizada: P-02 (§11), linha do risco da P-02 (§21) e Histórico.
- Migration: a 0055 já estava aplicada no banco dev (registro anterior).
- A verificação de `pnpm typecheck` e `pnpm lint` da 07.1 continua valendo: o harness ficou fora do repositório versionado e foi apagado.

