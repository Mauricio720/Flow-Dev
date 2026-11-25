---
status: pending
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

- [ ] **07.1 — Jornada e2e: pergunta, bloco, confirmação e mensagem**
  - **Arquivos:** `apps/web/e2e/route-switch.spec.ts` (criar), `apps/web/e2e/fixtures/sessionScript.ts` (alterar: `ROUTE_SWITCH_SCRIPT`), `apps/web/e2e/fixtures/workSeed.ts` (alterar: opção de semear a decisão aprovada como `prd`, sem mudar o padrão atual)
  - **Testes:** V-09a
  - **Pronto quando:** `pnpm --dir apps/web exec playwright test e2e/route-switch.spec.ts` passa; `pnpm --dir apps/web exec playwright test e2e/session-conversation.spec.ts` continua passando
  - **Nota:** roteiro: `text` ("Vou analisar.") → `ask` (uma pergunta) → `end_turn` → `wait_message` → `text` (explicação + o bloco da §15) → `end_turn` → `wait_message` → `text` ("Implementando.") → `end_turn`. Locators por papel e texto; credenciais só por variável de ambiente.
- [ ] **07.2 — Migration no banco dev e smoke manual com Claude e Codex**
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
- [ ] V-09a: trabalho aprovado como PRD; a operadora abre a sessão da rota, responde à pergunta, vê o cartão com o resumo e clica em "Trocar para execução direta" → o cartão mostra "Troca confirmada por <nome>"; a conversa mostra a mensagem que começa com "/flow-dev:direct-executor A troca para execução direta foi confirmada."; o texto da IA aparece sem a cerca `flow-dev-troca-de-rota`; o roteiro segue para "Implementando."; ao voltar à lista, o chip mostra "Execução direta" · e2e com runtime roteirizado
- [ ] V-09b: smoke com Claude: uma Issue de troca de texto aprovada como PRD → a IA pergunta ou propõe, para, e depois de confirmar implementa sem escrever spec; P-02 confirmada ou refutada · manual
- [ ] V-09c: smoke com Codex, o mesmo roteiro → o mesmo resultado esperado · manual

## Critérios de sucesso
- Todas as mini-tarefas marcadas, cada uma com o "Pronto quando" executado.
- O spec e2e passa; o smoke está registrado para os dois agentes.
- A 0055 foi aplicada no banco dev; a spec está atualizada com o resultado da P-02.
- `pnpm typecheck` e `pnpm lint` na raiz passam.

## Registro de execução
