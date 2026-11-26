---
status: completed
title: "Contrato puro da troca: tipos, parser do bloco, regras e textos"
type: backend
complexity: medium
---

# Task 01: Contrato puro da troca: tipos, parser do bloco, regras e textos

## Visão geral
Entrega o núcleo sem banco de dados: os tipos da proposta, o parser do bloco `flow-dev-troca-de-rota`, as regras RN-02 a RN-05 como funções puras e todos os textos da troca (o parágrafo do prompt e as mensagens à sessão). Todas as tarefas seguintes consomem estes nomes. Por isso eles saem prontos aqui, e 03, 04 e 05 podem rodar em paralelo sem tocar nos mesmos arquivos.

<critical>
- LEIA a spec e as regras do projeto (AGENTS.md/CLAUDE.md) antes de começar.
- FAÇA UMA MINI-TAREFA POR VEZ, na ordem. Só marque `[x]` depois de rodar o "Pronto quando" dela e ver passar.
- NÃO saia dos arquivos listados sem registrar o motivo no Registro de execução. Nada fora do escopo da spec.
- TESTES JUNTO COM O CÓDIGO: cada mini-tarefa implementa os testes atribuídos a ela, seguindo a skill de testes do projeto (`software-testing`). Isso quer dizer: asserção sobre o efeito observável e específico, nada de `toBeTruthy` ou de só checar que não lança exceção; valor esperado tirado da spec, nunca recalculado a partir do código; dublês só em dependências lentas, variáveis ou externas; relógio e aleatoriedade controlados. Em bug, reproduza antes de corrigir.
- Ao começar, mude `status` para `in_progress` (aqui e em `_tasks.md`). Mude para `completed` só quando todas as mini-tarefas estiverem marcadas e os critérios de sucesso tiverem sido comprovados por comando. A revisão contra a spec acontece uma vez, depois de todas as tarefas: não a espere aqui, mas não marque nada que não tenha prova, porque ela vai conferir.
</critical>

## Requisitos
- NFR-04: resumo com até 500 caracteres; de 1 a 8 motivos, cada um com até 300. Fora disso, o bloco está fora do formato (spec §10).
- RN-02: a proposta só é aceita se todas as condições valem: sessão de rota, PRD ou Tech Spec, ativa; rota nova `direct_execution`; sem troca confirmada para a decisão vigente; sem spec capturada; sem pendente; RN-04 cumprida (spec §7).
- RN-03: estados `pending`, `confirmed`, `declined` e `expired`. Expirada é calculada: pendente com a sessão `ended` ou `launch_failed` (spec §7).
- RN-04: depois de uma recusa, só aceita se houve pergunta respondida depois dela. A sessão `interrupted` conta como ativa. A primeira proposta não exige pergunta (Q-01) (spec §7).
- RN-05: a rota efetiva é a da troca confirmada **da decisão vigente**; sem ela, é a aprovada (spec §7).
- RN-01 e B-03: o parágrafo da troca vai em `SPEC_INSTRUCTION`, com a régua do DIRECT e o formato do bloco. Sem o parágrafo, nada é proposto (spec §15, DEC-03).

## Interfaces
- **Consome:** `PlanningRoute` (`application/services/tasks/planningContracts.ts`); `TerminalSessionStatus` e `isActiveSession` (`application/terminal/terminalSessionStatus.ts`); `SessionPurposeKind` (`application/terminal/sessionPurposeKind.ts`); `SKILLS_PLUGIN_NAME`, `ROUTE_INSTRUCTION` e `ROUTE_LABEL` (`terminalPromptCopy.ts`).
- **Produz** (nomes exatos, usados por 02–06):
  - `packages/api/src/application/terminal/routeSwitch.ts`:
    - `RouteSwitchStatus = "pending" | "confirmed" | "declined"`
    - `RouteSwitchState = RouteSwitchStatus | "expired"`
    - `RouteSwitchFromRoute = "prd" | "tech_spec"`
    - `RouteSwitchDecision = "confirm" | "decline"`
    - `RouteSwitchDiscardReason = "declined_without_answer" | "spec_exists" | "already_switched" | "malformed"`
    - `RouteSwitchView` exatamente como na spec §15
    - limites `ROUTE_SWITCH_SUMMARY_LIMIT = 500`, `ROUTE_SWITCH_MAX_REASONS = 8`, `ROUTE_SWITCH_REASON_LIMIT = 300`
  - `packages/api/src/application/services/terminal/routeSwitchBlock.ts`:
    - `ROUTE_SWITCH_FENCE = "flow-dev-troca-de-rota"`
    - `parseRouteSwitchBlock(text: string): ParsedAssistantText`, com `ParsedAssistantText = { text: string; block: RouteSwitchBlock | null }` e `RouteSwitchBlock = { valid: true; summary: string; reasons: string[] } | { valid: false }`
  - `packages/api/src/application/services/tasks/routeSwitchRules.ts`:
    - `evaluateProposal(facts: ProposalFacts): ProposalVerdict`
    - `ProposalFacts = { purpose: SessionPurposeKind; sessionRoute: PlanningRoute; sessionStatus: TerminalSessionStatus; hasConfirmedSwitch: boolean; hasCapturedSpec: boolean; hasPendingProposal: boolean; lastDeclinedAt: Date | null; lastAnsweredAt: Date | null }`
    - `ProposalVerdict = { kind: "accept" } | { kind: "ignore" } | { kind: "discard"; reason: RouteSwitchDiscardReason }`
    - `routeSwitchState(status: RouteSwitchStatus, sessionStatus: TerminalSessionStatus): RouteSwitchState`
    - `effectiveRoute(input: { approvedRoute: PlanningRoute; currentDecisionId: string; confirmedSwitch: { planningDecisionId: string } | null }): PlanningRoute`
  - Em `terminalPromptCopy.ts`: o parágrafo da troca dentro de `SPEC_INSTRUCTION`; `ROUTE_SWITCH_CONFIRMED_MESSAGE`, `ROUTE_SWITCH_DECLINED_MESSAGE`, `routeSwitchDiscardMessage(reason: RouteSwitchDiscardReason): string`, `ROUTE_SWITCHED_SUFFIX = "trocada para Execução direta"`, com os textos literais da spec §15.

## Mini-tarefas

- [x] **01.1 — Tipos e parser do bloco com limites**
  - **Arquivos:** `packages/api/src/application/terminal/routeSwitch.ts` (criar), `packages/api/src/application/services/terminal/routeSwitchBlock.ts` (criar), `packages/api/src/application/services/terminal/routeSwitchBlock.test.ts` (criar)
  - **Testes:** V-01a, V-01b, V-01c, V-01d, V-01e, V-01f, V-01g, V-01h
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run src/application/services/terminal/routeSwitchBlock.test.ts` passa
  - **Nota:** se a validação passar de 30 linhas, separe-a em `routeSwitchBlockFields.ts`. Formato aceito: a cerca ` ```flow-dev-troca-de-rota `, a linha `rota: execucao_direta`, a linha `resumo: …` e os motivos em linhas `- …`.
- [x] **01.2 — Regras puras: aceite, estado calculado e rota efetiva**
  - **Arquivos:** `packages/api/src/application/services/tasks/routeSwitchRules.ts` (criar), `packages/api/src/application/services/tasks/routeSwitchRules.test.ts` (criar)
  - **Testes:** V-02a, V-02b, V-02c, V-02d, V-02e, V-02f, V-02g, V-02h, V-02i, V-02j, V-02k
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run src/application/services/tasks/routeSwitchRules.test.ts` passa
  - **Nota:** na ordem das guardas, sessão não elegível → `ignore` (PT-03); pendente → `ignore` (REQ-010); depois `already_switched`, `spec_exists`, `declined_without_answer`.
- [x] **01.3 — Parágrafo da troca e mensagens à sessão**
  - **Arquivos:** `packages/api/src/application/services/terminal/terminalPromptCopy.ts` (alterar; se passar de 100 linhas, crie `routeSwitchCopy.ts` ao lado e reexporte), `packages/api/src/application/services/terminal/terminalPromptBuilder.test.ts` (alterar)
  - **Testes:** V-03e
  - **Pronto quando:** `pnpm --dir packages/api exec vitest run src/application/services/terminal/terminalPromptBuilder.test.ts` passa; `pnpm --dir packages/api typecheck` sem erros
  - **Nota:** o parágrafo (cerca de 150 palavras) diz: depois das perguntas, se RN-01 for cumprida e nenhuma spec tiver sido escrita, não escreva a spec; explique em uma ou duas frases, termine a mensagem com o bloco (mostre o exemplo da §15, usando `ROUTE_SWITCH_FENCE`) e espere a resposta do Flow Dev sem implementar. A régua: nada de O QUÊ em aberto; o COMO segue padrões do repositório; tamanho não decide.

## Detalhes de implementação
O padrão de funções puras com testes rápidos está em `planningTransitions.ts` e `planningReplanRules.ts`. Os textos ficam ao lado de `ROUTE_INSTRUCTION`, para o formato do bloco e o parser não morarem longe (DEC-03). O parser recebe o texto principal da IA, já sem subagentes. Ele não sabe de sessão nem de banco.

### Arquivos relevantes
- `packages/api/src/application/services/terminal/terminalPromptCopy.ts`: `SPEC_INSTRUCTION` e `DIRECT_EXECUTION_INSTRUCTION`.
- `packages/api/src/application/terminal/terminalSessionStatus.ts`: `isActiveSession` e os status (`interrupted` conta como ativa).
- `packages/api/src/application/services/tasks/planningContracts.ts`: `PlanningRoute`.

### Arquivos afetados
- Os três arquivos novos acima e `terminalPromptCopy.ts`.

### Decisões relacionadas
- DEC-01: formato do bloco. DEC-03: a regra fica no prompt, não na skill.

## Premissas
- P-01: a regra "sem spec capturada" entra em RN-02 (`spec_exists`).
- PT-01: um texto com dois blocos é `{ valid: false }`.
- PT-02: um bloco no meio do texto é reconhecido; o `text` devolvido junta o que vinha antes e depois.
- PT-03: sessão com `purpose !== "route"` ou `sessionRoute === "direct_execution"` → `ignore`.

## Testes atribuídos
- [ ] V-01a: texto "Explicação.\n\n" + bloco válido da §15 no fim → `text` = "Explicação." (sem a cerca); `block` = `{ valid: true, summary: "Mudança de texto em uma tela, sem regra nova.", reasons: [2 itens literais] }` · parser puro
- [ ] V-01b: texto sem bloco → `text` idêntico à entrada, `block: null`
- [ ] V-01c: dois blocos válidos → `block: { valid: false }`; nenhum dos dois blocos aparece em `text`
- [ ] V-01d: 9 motivos → `{ valid: false }`; com 8 motivos → válido; com 0 motivos → `{ valid: false }`
- [ ] V-01e: resumo com 501 caracteres → `{ valid: false }`; com 500 → válido
- [ ] V-01f: `rota: tech_spec` (≠ `execucao_direta`) → `{ valid: false }`
- [ ] V-01g: motivo com 301 caracteres → `{ valid: false }`; com 300 → válido
- [ ] V-01h: bloco no meio ("Antes." + bloco + "Depois.") → válido; `text` contém "Antes." e "Depois." e não contém `flow-dev-troca-de-rota`
- [ ] V-02a: fatos elegíveis (purpose `route`, rota `prd`, status `waiting`, tudo falso, sem recusa) → `accept`; o mesmo com `tech_spec` → `accept`
- [ ] V-02b: `hasConfirmedSwitch: true` → `discard` / `already_switched`
- [ ] V-02c: `hasCapturedSpec: true` → `discard` / `spec_exists`
- [ ] V-02d: `hasPendingProposal: true` → `ignore` (REQ-010)
- [ ] V-02e: purpose `generate_tasks` → `ignore`; rota `direct_execution` → `ignore`; status `ended` → `ignore`
- [ ] V-02f: primeira proposta, `lastAnsweredAt: null`, `lastDeclinedAt: null` → `accept` (Q-01)
- [ ] V-02g: recusa às 10:00 e `lastAnsweredAt` 09:55 ou nulo → `discard` / `declined_without_answer`; recusa às 10:00 e resposta às 10:03 → `accept`
- [ ] V-02h: status `interrupted`, elegível → `accept`; `routeSwitchState("pending", "interrupted")` → `pending`
- [ ] V-02i: `routeSwitchState("pending", "ended")` → `expired`; `("pending", "launch_failed")` → `expired`; `("confirmed", "ended")` → `confirmed`; `("declined", "ended")` → `declined`
- [ ] V-02j: `effectiveRoute` sem troca → `approvedRoute` (`prd`); com troca da decisão vigente → `direct_execution`
- [ ] V-02k: `effectiveRoute` com troca de outra decisão (antiga) → `approvedRoute`
- [ ] V-03e: `buildDefaultPrompt` com rota `prd` e com `tech_spec` → contém `flow-dev-troca-de-rota` e o trecho da régua; com `direct_execution` → não contém `flow-dev-troca-de-rota` (§9)

## Critérios de sucesso
- Todas as mini-tarefas marcadas, cada uma com o "Pronto quando" executado.
- Todos os testes atribuídos implementados e passando.
- `pnpm --dir packages/api test` passa no fim da tarefa; `pnpm --dir packages/api typecheck` sem erros.
- Nenhum arquivo novo com mais de 100 linhas nem função com mais de 30.

## Registro de execução
- 01.1 — `pnpm --dir packages/api exec vitest run src/application/services/terminal/routeSwitchBlock.test.ts` → passou (12 testes).
- 01.2 — `pnpm --dir packages/api exec vitest run src/application/services/tasks/routeSwitchRules.test.ts` → passou (19 testes).
- 01.3 — `pnpm --dir packages/api exec vitest run src/application/services/terminal/terminalPromptBuilder.test.ts` → passou (11 testes); `pnpm --dir packages/api typecheck` → passou.
- Fechamento da tarefa 01 — `pnpm --dir packages/api test` → passou (139 arquivos, 885 testes).
