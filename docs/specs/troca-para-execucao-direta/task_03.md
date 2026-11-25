---
status: pending
title: "Proposta: detector no recorder e RouteSwitchService.propose"
type: backend
complexity: high
---

# Task 03: Proposta: detector no recorder e RouteSwitchService.propose

## Visão geral
Liga o texto da IA à proposta. Depois de gravar a mensagem da IA, o `SessionRecorder` passa o texto ao detector. O `RouteSwitchService.propose` aplica as regras e então grava a pendente ou manda à sessão a mensagem de descarte. É o fluxo 1 da spec §16.

<critical>
- LEIA a spec e as regras do projeto (AGENTS.md/CLAUDE.md) antes de começar.
- FAÇA UMA MINI-TAREFA POR VEZ, na ordem. Só marque `[x]` depois de rodar o "Pronto quando" dela e ver passar.
- NÃO saia dos arquivos listados sem registrar o motivo no Registro de execução. Nada fora do escopo da spec.
- TESTES JUNTO COM O CÓDIGO: cada mini-tarefa implementa os testes atribuídos a ela, seguindo a skill de testes do projeto (`software-testing`). Isso quer dizer: asserção sobre o efeito observável e específico, nada de `toBeTruthy` ou de só checar que não lança exceção; valor esperado tirado da spec, nunca recalculado a partir do código; dublês só em dependências lentas, variáveis ou externas; relógio e aleatoriedade controlados. Em bug, reproduza antes de corrigir.
- Ao começar, mude `status` para `in_progress` (aqui e em `_tasks.md`). Mude para `completed` só quando todas as mini-tarefas estiverem marcadas e os critérios de sucesso tiverem sido comprovados por comando. A revisão contra a spec acontece uma vez, depois de todas as tarefas: não a espere aqui, mas não marque nada que não tenha prova, porque ela vai conferir.
</critical>

## Requisitos
- REQ-001: uma sessão de PRD ou Tech Spec sem spec propõe, com resumo e de 1 a 8 motivos; a primeira proposta não exige pergunta (Q-01).
- REQ-007: uma nova proposta depois de uma recusa, sem pergunta respondida desde então, é descartada sem cartão e com a mensagem "a troca já foi recusada e não houve resposta nova".
- REQ-008: uma pergunta respondida depois da recusa libera a próxima proposta.
- REQ-009: uma proposta fora do formato ou que não cumpre RN-02 é descartada com a mensagem do motivo (`routeSwitchDiscardMessage`).
- NFR-02 e B-07: só o texto principal da IA, que chega por `onAssistantText` e já passou por `mainAssistantText`, é lido. Mensagens da operadora, saídas de ferramenta e subagentes nunca são.
- Risco §21: o detector roda depois do insert, com try/catch próprio; uma falha dele não derruba a gravação do texto.
- §19: logs `route_switch_proposed` (`sessionId`, `taskId`, `proposalId`) e `route_switch_discarded` (`sessionId`, `reason`).

## Interfaces
- **Consome:**
  - da task 01: `parseRouteSwitchBlock`, `RouteSwitchBlock`, `evaluateProposal`, `ProposalFacts`, `routeSwitchDiscardMessage`;
  - da task 02: `RouteSwitchDao.readProposalContext`, `RouteSwitchDao.insertPending`;
  - `SessionMessageDao.insertUserMessage` e `insertAssistantMessage`, que devolve o registro com `id` (`application/terminal/sessionInteractionPorts.ts`);
  - `SessionLog` (`application/services/terminal/sessionLog.ts`).
- **Produz:**
  - `RouteSwitchService` em `packages/api/src/application/services/terminal/routeSwitchService.ts`, com `propose(input: { sessionId: string; assistantMessageId: string; block: RouteSwitchBlock }): Promise<ProposeOutcome>` e `ProposeOutcome = { kind: "proposed"; proposalId: string } | { kind: "ignored" } | { kind: "discarded"; reason: RouteSwitchDiscardReason }`;
  - `RecorderDeps` ganha `routeSwitches?: Pick<RouteSwitchService, "propose">`.

## Mini-tarefas

- [ ] **03.1 — RouteSwitchService.propose com aceite, descarte idempotente e logs**
  - **Arquivos:** `packages/api/src/application/services/terminal/routeSwitchService.ts` (criar), `packages/api/src/application/services/terminal/routeSwitchDiscardKey.ts` (criar), `packages/api/test/route-switch-propose.test.ts` (criar)
  - **Testes:** V-03a, V-04a, V-04b, V-04c, V-04d, V-04e
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/route-switch-propose.test.ts` passa
  - **Nota:** para um bloco `{ valid: false }`, descarte `malformed` só se a sessão for elegível, isto é, se `evaluateProposal` não devolveria `ignore`. A `requestKey` do descarte é um UUID determinístico derivado de `assistantMessageId`, por exemplo um UUID v5 com namespace constante; ela fica em `routeSwitchDiscardKey.ts`. `propose` não tem a decisão e a lê do contexto (`currentDecisionId`); sem decisão aprovada, o resultado é `ignored`.
- [ ] **03.2 — Detector no SessionRecorder e ligação no worker**
  - **Arquivos:** `packages/api/src/application/services/terminal/sessionRecorder.ts` (alterar), `packages/api/src/infra/sessionWorkerParts.ts` (alterar), `packages/api/test/session-recorder.test.ts` (alterar)
  - **Testes:** V-03c, V-03d, V-03f
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/session-recorder.test.ts test/route-switch-propose.test.ts` passa; `pnpm --dir packages/api typecheck` sem erros
  - **Nota:** `text()` grava o texto completo, como hoje; quem o mostra sem o bloco é a timeline (task 05). Depois do insert, se `parseRouteSwitchBlock(text).block` existir, chame `propose`, num try/catch separado que loga `route_switch_detect_failed`. Para manter o arquivo com até 100 linhas e as funções com até 30, extraia o passo para um método privado.

## Detalhes de implementação
- `sessionHandlers.ts:20` já passa só o texto principal (`onAssistantText`), tanto no Claude quanto no Codex. Não leia texto de nenhum outro ponto.
- O serviço não fala com o runtime. A mensagem de descarte entra na fila (`insertUserMessage`) e é entregue pelos caminhos que já existem (`MessageDeliveryStep`, `SessionResumeStep`).

### Arquivos relevantes
- `packages/api/src/application/services/terminal/sessionHandlers.ts`: de onde vem o texto.
- `packages/api/src/application/services/terminal/assistantTextFilter.ts`: `mainAssistantText` (exclui subagentes).
- `packages/api/src/application/services/terminal/systemMessageSender.ts`: o padrão de mensagem `user` com `requestKey`.
- `packages/api/test/session-recorder.test.ts` e `test/session-worker-support.ts`: como montar o recorder com o banco de teste.

### Arquivos afetados
- Os arquivos listados nas mini-tarefas.

### Decisões relacionadas
- DEC-01: bloco no texto e cartão do Flow Dev. DEC-04: a resposta volta pela fila de mensagens.

## Premissas
- P-01 (via task 01): com spec capturada, o descarte é `spec_exists`.
- PT-03: um bloco de sessão não elegível é ignorado, sem mensagem e sem log de descarte; fica só um log `debug`/`info`, se o `SessionLog` tiver esse nível.

## Testes atribuídos
- [ ] V-03a: sessão de rota `prd`, `waiting`, com decisão aprovada, sem spec e sem perguntas; `propose` com bloco válido → existe uma linha `pending` com `from_route='prd'`, o resumo e os 2 motivos literais; resultado `proposed`; log `route_switch_proposed` com `sessionId`, `taskId` e `proposalId` · serviço + Postgres
- [ ] V-04a: o mesmo cenário, mas com spec capturada (versão de artefato da spec gravada) → nenhuma linha nova; mensagem `user` "A proposta de troca não foi aceita: já existe spec deste trabalho. Continue com a spec."; log `route_switch_discarded` com `reason: "spec_exists"` · serviço + Postgres
- [ ] V-04b: troca confirmada para a decisão vigente → mensagem com "este trabalho já foi trocado" · serviço + Postgres
- [ ] V-04c: recusa às 10:00 (relógio injetado) sem resposta depois, nova proposta às 10:05 → mensagem com "a troca já foi recusada e não houve resposta nova", nenhuma pendente; com uma pergunta respondida às 10:03 → `proposed` (US-02 cen. 2 e 3) · serviço + Postgres
- [ ] V-04d: bloco `{ valid: false }` em sessão elegível → mensagem com "o bloco veio fora do formato" · serviço + Postgres
- [ ] V-04e: `propose` duas vezes com o mesmo `assistantMessageId` e o mesmo motivo de descarte → uma única mensagem `user` · serviço + Postgres
- [ ] V-03c: `onAssistantText` disparado só para texto principal: o texto do subagente (`parentToolUseId` não nulo) com um bloco válido passa por `mainAssistantText` e não chega ao recorder → nenhuma proposta · recorder + Postgres
- [ ] V-03d: a operadora envia pelo `send` uma mensagem com um bloco válido → nenhuma linha em `task_route_switches` (B-07) · controller + Postgres
- [ ] V-03f: `routeSwitches.propose` que lança erro → a mensagem da IA está gravada em `task_terminal_messages` com o texto completo e o log `route_switch_detect_failed` é emitido · recorder + Postgres, com dublê só no serviço

## Critérios de sucesso
- Todas as mini-tarefas marcadas, cada uma com o "Pronto quando" executado.
- Todos os testes atribuídos implementados e passando.
- `pnpm --dir packages/api test` e `pnpm --dir packages/api test:integration` passam no fim da tarefa; `typecheck` sem erros.

## Registro de execução
