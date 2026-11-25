# Spec: Trocar para execução direta depois das perguntas da spec

> **Status:** Em revisão · **Data:** 2026-11-25 · **Nível:** L3 spec-first · **Origem:** Issue #14 (rota PRD, complexidade Alta)
> **Contexto lido:**
> - **Rotas e prompt da sessão:** `terminalPromptCopy.ts`, `terminalPromptBuilder.ts`, `terminalPromptSource.ts`.
> - **Planejamento:** `planningContracts.ts`, `planningTransitions.ts`, `planningReplanRules.ts`, schema `tasks/planning.ts`, régua do agente em `resources/agents/planning/SKILL.md`.
> - **Sessão:** `sessionLauncher.ts`, `sessionPurpose.ts`, `sessionRecorder.ts`, `assistantTextFilter.ts`, `systemMessageSender.ts`, `sessionControlAuthorization.ts`, `terminalSessionStatus.ts`, schema `tasks/sessionInteraction.ts`, `routers/session.ts`.
> - **Padrão de aviso vindo da sessão:** `review/reviewStageReader.ts`, que lê `reviews/etapa.md`.
> - **Tela:** `OperatorStages.tsx`, `PlanningDecisionView.tsx`, `ExecutionHistory.tsx`, `ActiveRow.tsx`, `workProgressReads.ts`.
> - **Skills:** `.claude/skills/spec-writer/SKILL.md` e `.claude/skills/direct-executor/SKILL.md`.

## Resumo para revisão

- **O que muda:** numa sessão aberta pela rota PRD ou Tech Spec, a IA pode concluir, depois das perguntas, que o trabalho é simples. Nesse caso ela propõe trocar para execução direta. A pessoa operadora confirma ou recusa num cartão da conversa. Se confirmar, a mesma sessão implementa, sem spec e sem tarefas, e a troca fica registrada no planejamento.
- **Por quê:** quase todo trabalho é planejado como PRD. Hoje, quando o spec-writer percebe que bastava executar, ele entrega um prompt no chat e para, e o Flow Dev não tem como seguir dali.
- **Decisões principais:**
  - **DEC-01:** a IA propõe com um bloco marcado no fim da mensagem, e o Flow Dev mostra um cartão próprio.
  - **DEC-02:** uma tabela nova guarda as propostas. A decisão de planejamento aprovada não é alterada, e os leitores passam a usar a "rota efetiva".
  - **DEC-03:** a regra vai no prompt da rota, não na skill.
  - **DEC-04:** a resposta volta para a sessão pelo canal de mensagens que já existe, gravada na mesma transação da decisão.
- **Riscos principais:**
  - A IA não seguir o formato do bloco. Mitigação: a proposta malformada é descartada com uma mensagem à sessão (REQ-009).
  - O texto da Issue tentar forçar uma proposta. Mitigação: nada muda sem o clique humano (NFR-02).
- **Como vamos verificar:** regras e parser em teste rápido; proposta, decisão e rota efetiva no Postgres de teste; tela com Testing Library; um e2e com o runtime roteirizado e um smoke com Claude e Codex.
- **Pendências:** nenhuma. A Q-01 foi respondida: a primeira proposta não exige pergunta respondida.

---

# Parte 1 — Produto

## 1. Contexto e problema

Depois que a pessoa operadora aprova o planejamento, ela abre a sessão da rota. As rotas PRD e Tech Spec abrem a mesma sessão, que escreve a spec, faz perguntas à operadora em cartões e para para revisão. A rota Execução direta abre uma sessão que implementa direto.

A queixa da Issue é que quase todo trabalho é aprovado como PRD. A sessão da spec já sabe concluir que a mudança é trivial ou pequena, mas hoje só consegue avisar isso no chat. Ir para a execução direta exige um replan, que só fica disponível quando a Issue mudou, ou abrir outra sessão com o prompt reescrito à mão. Nos dois casos, o planejamento continua dizendo PRD.

## 2. Usuários e papéis

- **Pessoa operadora (dona da sessão):** quem abriu a sessão da rota e pode operar o trabalho. Responde às perguntas e decide a troca.
- **Leitores do trabalho:** quem pode ver o trabalho sem operá-lo. Veem a proposta e o registro, sem ações.
- **IA da sessão da spec:** avalia e propõe, mas não decide.

## 3. Objetivos

1. Uma sessão de PRD ou Tech Spec pode virar execução direta sem perder as perguntas e as respostas já dadas.
2. A troca nunca acontece sem a confirmação da pessoa operadora.
3. Depois da troca, a rota do trabalho é a mesma em todos os lugares: lista, planejamento, histórico e sessões novas. A origem da troca fica visível.

## 4. Fora de escopo

- **Mudar a régua do agente de planejamento** para classificar menos trabalhos como PRD. Ataca a causa da queixa, mas é outra mudança (veja Sugestões).
- **Trocar de PRD para Tech Spec.** As duas rotas abrem a mesma sessão, então essa troca não mudaria nada no Flow Dev.
- **Desfazer a troca confirmada.** Decisão do usuário: a sessão já começa a implementar logo depois.
- **Abrir uma sessão nova para a execução.** Decisão do usuário: a mesma sessão continua, aproveitando o contexto e o cache.
- **Trocar no sentido contrário** (de execução direta para spec). A Issue não pede, e o executor direto já para com `ROUTING_MISMATCH` quando encontra dúvida de spec.

## 5. Histórias de usuário

### US-01 — Confirmar a troca e seguir na mesma sessão (P1)
Como pessoa operadora, quero confirmar a troca proposta pela IA, para que a mesma sessão implemente o trabalho simples sem escrever spec nem tarefas.
- **Por que P1:** é o pedido da Issue.
- **Teste independente:** com uma sessão de PRD que faz uma pergunta, responder e confirmar a troca. A sessão recebe a instrução de executar direto, e a rota do trabalho passa a ser Execução direta.
- **Cenários de aceite:**
  1. **Dado** a sessão de PRD de Ana na Issue #14, com uma pergunta respondida e nenhuma spec escrita, **quando** a IA propõe a troca com o resumo "Mudança de texto em uma tela, sem regra nova" e dois motivos, **então** a conversa mostra o cartão com esse resumo, os dois motivos, "Trocar para execução direta" e "Continuar com a spec".
  2. **Dado** esse cartão pendente, **quando** Ana clica em "Trocar para execução direta", **então** o cartão passa a "Troca confirmada por Ana", a sessão recebe a mensagem de execução direta e o chip do trabalho na lista passa a mostrar "Execução direta".
  3. **Dado** a troca confirmada, **quando** Ana abre uma nova sessão da rota no mesmo trabalho, **então** o prompt começa com a instrução do executor direto e traz "Rota aprovada: PRD · trocada para Execução direta".
  4. **Dado** um cartão pendente numa sessão que foi encerrada, **quando** Ana abre a conversa, **então** o cartão aparece como "Proposta expirada: a sessão terminou antes da decisão", sem ações, e a rota continua PRD.

### US-02 — Recusar e continuar com a spec (P1)
Como pessoa operadora, quero recusar a troca e continuar com a spec, e quero que a IA só proponha de novo se eu der respostas novas.
- **Por que P1:** sem a recusa, a confirmação não seria uma escolha de verdade.
- **Teste independente:** recusar uma proposta e conferir a mensagem enviada à sessão e o descarte de uma segunda proposta feita sem perguntas novas.
- **Cenários de aceite:**
  1. **Dado** um cartão pendente, **quando** Ana clica em "Continuar com a spec", **então** o cartão passa a "Troca recusada por Ana", a sessão recebe a mensagem para seguir com a spec e a rota continua PRD.
  2. **Dado** uma recusa às 10:00 e nenhuma pergunta respondida depois, **quando** a IA propõe de novo às 10:05, **então** nenhum cartão novo aparece e a sessão recebe "A troca já foi recusada…".
  3. **Dado** uma recusa às 10:00 e uma pergunta respondida às 10:03, **quando** a IA propõe de novo às 10:05, **então** aparece um cartão novo, pendente.

### US-03 — Ver de onde veio a rota (P2)
Como pessoa operadora ou leitora, quero ver que a rota foi trocada, por quem, quando e por quê, para entender por que um trabalho planejado como PRD não tem spec.
- **Por que P2:** a troca funciona sem isso, mas fica opaca para quem chega depois.
- **Teste independente:** com uma troca confirmada no banco, abrir o trabalho como leitor.
- **Cenários de aceite:**
  1. **Dado** a troca confirmada por Ana em 25/11 às 10:06, **quando** Bruno, leitor, abre a aba Planejamento, **então** ele vê "Rota recomendada: PRD", "Rota aprovada: PRD", "Trocada para Execução direta após as perguntas, confirmada por Ana em 25/11 10:06" e os motivos da IA.
  2. **Dado** a mesma troca, **quando** Bruno abre o histórico de sessões, **então** a sessão de Ana aparece como "PRD → Execução direta".
  3. **Dado** um cartão pendente, **quando** Bruno abre a conversa, **então** ele vê o cartão sem botões, com "Aguardando a pessoa operadora decidir a troca de rota".

## 6. Requisitos funcionais

**Proposta**
- **REQ-001** (US-01): ENQUANTO uma sessão aberta pela rota PRD ou Tech Spec ainda não tiver produzido uma spec, QUANDO a IA concluir que o trabalho cumpre RN-01, com ou sem perguntas já respondidas (Q-01), a sessão DEVE propor a troca com um resumo e de 1 a 8 motivos, e depois parar e esperar a decisão.
- **REQ-002** (US-01): QUANDO a sessão propuser a troca e a proposta for aceita (RN-02), o sistema DEVE mostrar na conversa um cartão com o resumo, os motivos, "Trocar para execução direta" e "Continuar com a spec".
- **REQ-003** (US-01): O sistema DEVE mostrar o texto da mensagem da IA sem o bloco da proposta. O cartão ocupa o lugar do bloco.

**Decisão**
- **REQ-004** (US-01): QUANDO a pessoa operadora dona da sessão escolher "Trocar para execução direta", o sistema DEVE registrar a troca com a rota de origem, a rota nova, quem confirmou, quando, o resumo e os motivos.
- **REQ-005** (US-01): QUANDO a troca for confirmada, o sistema DEVE enviar à mesma sessão a mensagem que a manda implementar com o executor direto, usando as respostas já dadas como decisões e sem escrever spec nem tarefas.
- **REQ-006** (US-02): QUANDO a pessoa operadora dona da sessão escolher "Continuar com a spec", o sistema DEVE registrar a recusa, com quem recusou e quando, e enviar à sessão a mensagem para seguir com a spec.
- **REQ-007** (US-02): SE a sessão propuser de novo depois de uma recusa e nenhuma pergunta da sessão tiver sido respondida desde a recusa, ENTÃO o sistema DEVE descartar a proposta sem mostrar cartão e enviar à sessão a mensagem de que a troca já foi recusada.
- **REQ-008** (US-02): QUANDO uma pergunta da sessão for respondida depois da última recusa, o sistema DEVE aceitar a próxima proposta como no REQ-002.

**Propostas recusadas pelo sistema**
- **REQ-009** (US-01): SE a proposta não cumprir RN-02 ou vier fora do formato, ENTÃO o sistema DEVE descartá-la sem mostrar cartão e enviar à sessão uma mensagem com o motivo e a instrução de seguir com a spec.
- **REQ-010** (US-01): SE a sessão repetir a proposta enquanto já houver uma pendente nela, ENTÃO o sistema DEVE manter só o cartão pendente, sem criar outro nem enviar mensagem.

**Concorrência, permissão e fim de sessão**
- **REQ-011** (US-01): SE quem tentar decidir não for a dona da sessão com permissão de operar o trabalho, ENTÃO o sistema DEVE recusar com o erro de controle de sessão que já existe, sem alterar a proposta.
- **REQ-012** (US-01): SE uma proposta já decidida receber outra decisão, ENTÃO o sistema DEVE recusar com "Essa proposta já foi decidida." e a tela DEVE mostrar o estado atual. A mesma decisão repetida com a mesma chave de requisição DEVE devolver o resultado original.
- **REQ-013** (US-01): ENQUANTO a sessão estiver encerrada ou tiver falhado ao abrir, o sistema DEVE mostrar a proposta pendente como "Proposta expirada: a sessão terminou antes da decisão", sem ações e sem trocar a rota.

**Rota efetiva e registro**
- **REQ-014** (US-03): ENQUANTO existir troca confirmada para a decisão de planejamento vigente, o sistema DEVE mostrar "Execução direta" como rota do trabalho na lista de trabalhos.
- **REQ-015** (US-03): ENQUANTO existir troca confirmada para a decisão vigente, a aba Planejamento DEVE mostrar a rota recomendada e a aprovada como estavam, mais "Trocada para Execução direta após as perguntas, confirmada por <nome> em <data e hora>" e os motivos.
- **REQ-016** (US-03): O histórico de sessões DEVE mostrar "<rota de origem> → Execução direta" na sessão em que a troca foi confirmada.
- **REQ-017** (US-01): QUANDO uma nova sessão da rota for aberta depois da troca, o sistema DEVE montar o prompt com a instrução de execução direta e com a linha "Rota aprovada: <rota de origem> · trocada para Execução direta".
- **REQ-018** (US-01): Depois de confirmada, a troca DEVE continuar valendo até um novo planejamento (replan) do trabalho, sem ação de desfazer.

## 7. Regras de negócio

- **RN-01 — Régua da troca, a mesma do DIRECT:** com as respostas dadas, nada de O QUÊ continua em aberto (fluxo, escopo, permissões, ciclo de vida, aceite). O COMO segue padrões do repositório ou escolhas locais de baixo risco, e não sobra pendência bloqueante. Equivale aos níveis L0 e L1 do spec-writer. Tamanho e número de arquivos não decidem a troca.
- **RN-02 — Quando o sistema aceita uma proposta.** Todas as condições abaixo valem:
  - a sessão é de rota, foi aberta como PRD ou Tech Spec e está ativa;
  - a rota nova é Execução direta;
  - o trabalho não tem troca confirmada para a decisão vigente;
  - o trabalho não tem spec capturada;
  - a sessão não tem proposta pendente (veja REQ-010);
  - a regra de nova proposta (RN-04) é cumprida.
- **RN-03 — Estados da proposta:**

  | Estado | Como chega | Ações |
  |---|---|---|
  | Pendente | proposta aceita | Trocar · Continuar com a spec |
  | Confirmada | "Trocar" | nenhuma (final) |
  | Recusada | "Continuar com a spec" | nenhuma (final) |
  | Expirada | pendente com a sessão encerrada ou com falha ao abrir (estado calculado) | nenhuma |

  Cada sessão tem no máximo uma proposta pendente, e cada decisão de planejamento tem no máximo uma troca confirmada.
- **RN-04 — Nova proposta depois de recusa:** só é aceita se alguma pergunta da mesma sessão foi respondida depois da última recusa. Uma sessão interrompida conta como ativa, e a decisão a retoma.
- **RN-05 — Rota efetiva:** é a rota nova da troca confirmada da decisão vigente. Sem essa troca, é a rota aprovada. A rota recomendada e a aprovada nunca mudam por causa da troca.
- **RN-06 — Permissão:** só a dona da sessão, com permissão de operar o trabalho, decide. É a mesma regra de responder às perguntas da sessão.

## 8. Casos de borda e erros

| ID | Situação | Comportamento esperado | Ref. |
|---|---|---|---|
| B-01 | Sessão interrompida com cartão pendente | A decisão é aceita, e a mensagem retoma a sessão pelo caminho de retomada que já existe | RN-04, REQ-005 |
| B-02 | Duas abas decidem ao mesmo tempo | A primeira vale; a outra recebe REQ-012 | REQ-012 |
| B-03 | A operadora apagou do prompt o parágrafo da troca | A sessão não propõe nada, como hoje | DEC-03 |
| B-04 | Replan depois da troca | A nova decisão vale, a rota efetiva volta a ser a dela e a troca antiga só aparece no histórico da sessão | RN-05 |
| B-05 | Depois da troca, o executor direto para com `ROUTING_MISMATCH` | A sessão para e mostra o motivo; nada é automático. A operadora decide (replan ou manual) | REQ-018 |
| B-06 | Issue excluída | As propostas são apagadas junto com o trabalho | §14 |
| B-07 | Bloco da proposta no texto da Issue ou numa resposta da operadora | Ignorado: só o texto principal da IA na sessão é lido | NFR-02 |

## 9. Comportamento que não muda

- QUANDO a sessão de PRD ou Tech Spec não propuser troca, o sistema DEVE CONTINUAR A seguir o fluxo atual: spec, aba Spec, geração de tarefas, plano e revisão.
- QUANDO o planejamento for avaliado, selecionado, aprovado, refeito ou repetido, o sistema DEVE CONTINUAR A aplicar as mesmas regras e a mesma restrição entre rota recomendada, rota escolhida e origem da escolha.
- QUANDO a rota aprovada for Execução direta, o sistema DEVE CONTINUAR A abrir a sessão com o executor direto, sem cartão de troca.
- QUANDO a sessão fizer perguntas ou pedir permissões, o sistema DEVE CONTINUAR A mostrar os cartões de sempre.
- O replan DEVE CONTINUAR A exigir que a Issue tenha mudado.

## 10. Requisitos não funcionais

- **NFR-01** (latência): o cartão aparece no mesmo ciclo de leitura da conversa que traz a mensagem da IA, sem canal novo. A decisão, o registro e a mensagem à sessão são gravados numa única transação.
- **NFR-02** (segurança): uma proposta nunca muda a rota sozinha; só o clique da dona da sessão muda. O bloco só é reconhecido no texto principal da IA naquela sessão, nunca em mensagens da operadora, saídas de ferramentas ou subagentes.
- **NFR-03** (acessibilidade): os botões do cartão têm nome acessível igual ao texto visível e ficam desabilitados com `aria-busy` durante o envio. Mudanças de estado são anunciadas numa região `polite`, como nos cartões de pergunta.
- **NFR-04** (limites): resumo de até 500 caracteres; de 1 a 8 motivos, cada um com até 300 caracteres. Um bloco que passe disso é tratado como fora do formato (REQ-009).

## 11. Premissas e dependências

- **P-01 (confirmada em 2026-11-25):** a troca só vale enquanto o trabalho não tem spec capturada.
- **P-02:** a mensagem de continuação que começa com `/flow-dev:direct-executor` ativa a skill no meio da sessão, tanto no Claude quanto no Codex. O Codex já traduz esse prefixo em `codexTurnInput.ts`; no Claude isso precisa ser confirmado no smoke (V-09).
- **P-03:** a sessão continua com o agente, o modelo e o modo de permissão com que foi aberta.
- **Dependência:** a migration 0055. As 0052 (Issue #6), 0053 (Issue #9) e 0054 (Issue #10) já estão reservadas.

---

# Parte 2 — Técnica

## 12. Visão geral da solução

O prompt das rotas PRD e Tech Spec ganha a régua RN-01 e o formato do bloco (DEC-03). O texto da IA, que já passa por `SessionRecorder.text`, vai a um detector que entrega a proposta ao `RouteSwitchService` (fluxo 1 da §16). A timeline traz as propostas e a tela desenha o cartão. A decisão é uma mutation nova em `tasks.session` (fluxo 2). A entrega da mensagem fica com o `MessageDeliveryStep` e o `SessionResumeStep`, como em qualquer mensagem (DEC-04). Os leitores de rota passam por um único cálculo de rota efetiva (RN-05).

## 13. Componentes e responsabilidades

| Componente | Responsabilidade | Local | Novo/Alterado |
|---|---|---|---|
| Prompt da rota | Parágrafo da troca em `SPEC_INSTRUCTION`; linha "trocada para" | `terminalPromptCopy.ts`, `terminalPromptBuilder.ts` | Alterado |
| Parser do bloco | Separa o bloco do texto e valida o formato e os limites (NFR-04) | `application/services/terminal/routeSwitchBlock.ts` | Novo |
| Regras da troca | RN-02, RN-04 e o estado calculado (RN-03), funções puras | `application/services/tasks/routeSwitchRules.ts` | Novo |
| `RouteSwitchService` | `propose` (detecção) e `decide` (confirmar ou recusar) | `application/services/terminal/routeSwitchService.ts` | Novo |
| `RouteSwitchDao` | Contrato e implementação Drizzle; decisão e mensagem numa transação | `application/database/dao/`, `infra/database/dao/terminal/` | Novo |
| Recorder | Chama o detector depois de gravar o texto da IA, sem quebrar a gravação se o detector falhar | `sessionRecorder.ts` | Alterado |
| Rota efetiva | Leitura com a troca confirmada da decisão vigente | `terminalPromptSource.ts`, `workProgressReads.ts`, projeção do planejamento, leitura das sessões | Alterado |
| Procedure | `tasks.session.decideRouteSwitch` + schema Zod + controller | `routers/session.ts`, `schemas/session.ts`, controller de requests | Alterado |
| Timeline | Item `route_switch` na conversa; texto da IA sem o bloco | `sessionTimelineMerge.ts`, `useSessionTimeline.ts` | Alterado |
| Tela | Cartão da proposta; registro no Planejamento; "PRD → Execução direta" no histórico | `features/issues/assigned-work/components/` | Novo/Alterado |
| Exclusão | Apagar as propostas junto com o trabalho | `drizzleIssueDeletionDao.ts` | Alterado |

## 14. Modelo de dados

Tabela nova `task_route_switches` (migration `0055_route_switches.sql` + rollback):

| Coluna | Tipo | Regra |
|---|---|---|
| `id` | uuid PK | |
| `task_id` | uuid FK `tasks` | restrict |
| `planning_decision_id` | uuid FK `task_planning_decisions` | decisão vigente quando a proposta chegou |
| `session_id` | uuid FK `task_terminal_sessions` | cascade |
| `from_route` | text | `in ('prd','tech_spec')` |
| `to_route` | text | `= 'direct_execution'` |
| `summary` | text | 1–500 caracteres |
| `reasons` | jsonb | array com 1–8 itens |
| `status` | text | `in ('pending','confirmed','declined')` |
| `decided_by_user_id` | uuid FK `users` | nulo só se `pending` |
| `decided_at` | timestamptz | nulo só se `pending` |
| `decision_request_key` | uuid | nulo só se `pending` |
| `proposed_at` | timestamptz | default now |

- **Índices únicos parciais:** `(session_id) where status='pending'` (RN-03) e `(planning_decision_id) where status='confirmed'`.
- **Índice:** `(task_id, proposed_at)`, para a timeline e a leitura da rota efetiva.
- **"Expirada"** não é gravada: é calculada a partir do status da sessão (RN-03).
- **Dados existentes:** nenhum. A tabela nasce vazia e não há backfill; sem troca, a rota efetiva é a aprovada.

## 15. Interfaces e contratos

**Bloco da proposta** (fim da mensagem da IA; descrito no parágrafo do prompt):

````text
```flow-dev-troca-de-rota
rota: execucao_direta
resumo: Mudança de texto em uma tela, sem regra nova.
- As respostas fixaram o texto e a tela.
- Segue o padrão de planningCopy.ts.
```
````

**Procedure:**

```ts
decideRouteSwitch: protectedProcedure
  .input(z.object({ projectId: z.string().uuid(), taskId: z.string().uuid(), sessionId: z.string().uuid(),
    proposalId: z.string().uuid(), decision: z.enum(["confirm", "decline"]), requestKey: z.string().uuid() }).strict())
  .mutation(...) // → { proposal: RouteSwitchView }
// erros: session_control_denied (REQ-011) · session_not_active (REQ-013)
//        route_switch_decided → "Essa proposta já foi decidida." (REQ-012) · route_switch_not_found
type RouteSwitchView = { id: string; fromRoute: "prd" | "tech_spec"; toRoute: "direct_execution"; summary: string;
  reasons: string[]; state: "pending" | "confirmed" | "declined" | "expired"; decidedBy: string | null;
  decidedAt: string | null; proposedAt: string };
```

**Leituras:**
- A timeline ganha os itens `{ kind: "route_switch", proposal: RouteSwitchView }`.
- `PlanningDetail` ganha `routeSwitch: RouteSwitchView | null`, que traz só a troca confirmada da decisão vigente.
- O item de sessão do histórico ganha `switchedTo: "direct_execution" | null`.
- `WorkProgress.route` passa a ser a rota efetiva.

**Mensagens à sessão** (em `terminalPromptCopy.ts`):
- **Confirmação:** "`/flow-dev:direct-executor` A troca para execução direta foi confirmada. Implemente a Issue desta sessão usando as respostas já dadas como decisões. Não escreva spec nem tarefas. Rode as verificações do projeto antes de terminar e resuma o que mudou e o que foi verificado. Não faça commit, push nem PR sem eu pedir."
- **Recusa:** "A troca para execução direta foi recusada. Continue com a spec. Só proponha de novo depois de uma nova pergunta respondida."
- **Descarte:** "A proposta de troca não foi aceita: <motivo>. Continue com a spec." Os motivos são: "a troca já foi recusada e não houve resposta nova", "já existe spec deste trabalho", "este trabalho já foi trocado", "o bloco veio fora do formato".

**Parágrafo do prompt (DEC-03), em resumo:** depois das perguntas, se RN-01 for cumprida e nenhuma spec tiver sido escrita, a IA não escreve a spec. Ela explica em uma ou duas frases, termina a mensagem com o bloco e espera a resposta do Flow Dev, sem implementar antes disso.

## 16. Fluxos principais

1. **Propor:**
   - a IA envia texto e `SessionRecorder.text` grava a mensagem;
   - o detector encontra o bloco e chama `RouteSwitchService.propose(sessionId, block)`;
   - o serviço lê a sessão, a decisão vigente, a troca confirmada, as specs capturadas, a pendente e a última recusa com as respostas posteriores, e aplica RN-02 e RN-04;
   - se passar, insere a proposta `pending` (o índice parcial absorve a repetição, REQ-010);
   - se não passar, insere a mensagem de descarte com uma `requestKey` derivada do id da mensagem da IA, para ser idempotente.
2. **Decidir:**
   - o controller roda `requireOwnActive` (REQ-011, REQ-013);
   - numa transação, `update … where id = :id and status = 'pending'`;
   - 0 linhas: se a `decision_request_key` gravada é a mesma, devolve o estado atual (replay); se não, `route_switch_decided`;
   - 1 linha: insere a mensagem de confirmação ou de recusa com a `requestKey` da decisão;
   - a entrega e a retomada seguem os caminhos que já existem.
3. **Abrir sessão nova depois da troca:** `readApprovedPlanning` devolve a rota efetiva e a de origem; o builder usa `ROUTE_INSTRUCTION[efetiva]` e a linha do REQ-017; a coluna `route` da sessão nova é `direct_execution`.

## 17. Decisões técnicas

### DEC-01 — Proposta por bloco marcado no texto da IA e cartão do Flow Dev
- **Decisão:** a IA termina a mensagem com o bloco `flow-dev-troca-de-rota`. O Flow Dev reconhece o bloco, mostra um cartão próprio e só depois da decisão manda a sessão continuar.
- **Alternativas consideradas:**
  - *Pergunta comum (AskUserQuestion) com cabeçalho fixo:* a resposta vai direto à IA, que seguiria implementando mesmo que o sistema não casasse o texto e não registrasse a troca. Registro e comportamento poderiam divergir.
  - *Arquivo vigiado, como `reviews/etapa.md`:* ainda não existe pasta da spec, o arquivo sujaria o repositório, e o Codex em `workspace-write` não grava fora do checkout.
  - *Ferramenta MCP própria:* exige infraestrutura nova para um sinal só.
- **Consequências:** funciona igual no Claude e no Codex, porque os dois passam pelo `onAssistantText`. A IA só implementa depois da mensagem do Flow Dev, então registro e comportamento andam juntos. O risco é a IA errar o formato, o que REQ-009 cobre.

### DEC-02 — Tabela própria de propostas; decisão de planejamento intocada
- **Decisão:** `task_route_switches` guarda pendentes, confirmadas e recusadas. Os leitores calculam a rota efetiva (RN-05).
- **Alternativas consideradas:**
  - *Alterar `selected_route` e criar um `decision_source` novo:* exige mudar a restrição entre recomendada, escolhida e origem, mexe no replay da aprovação e apaga a rota que a pessoa aprovou.
  - *Coluna na sessão:* não guarda a recusa nem as várias propostas que RN-04 precisa.
- **Consequências:** quatro leitores passam a juntar uma tabela a mais. Em compensação, o planejamento e suas regras não mudam (§9). A sessão onde a troca acontece mantém `route` de origem, e o histórico deriva a seta (REQ-016).

### DEC-03 — Regra no prompt da rota, não na skill
- **Decisão:** o parágrafo da troca vai em `SPEC_INSTRUCTION`. A skill spec-writer não muda.
- **Alternativas consideradas:** uma seção "no Flow Dev" na `SKILL.md`. A skill é genérica, e acoplá-la ao formato do bloco faria o formato e o parser morarem em lugares diferentes.
- **Consequências:** o formato fica definido num só arquivo, ao lado das mensagens. A operadora pode apagar o parágrafo ao abrir a sessão (B-03). O prompt cresce cerca de 150 palavras, longe do limite de 20 000 caracteres.

### DEC-04 — Resposta pela fila de mensagens que já existe, na mesma transação
- **Decisão:** a confirmação e a recusa inserem uma mensagem `user` com `requestKey`, como faz o `SystemMessageSender`, na mesma transação da mudança de estado.
- **Alternativas consideradas:**
  - *Mandar o comando direto ao runtime:* fura a fila e perde a idempotência e a retomada de sessão interrompida.
  - *Abrir sessão nova:* recusada pelo usuário.
- **Consequências:** B-01 e o reenvio funcionam sem código novo de entrega. O ajuste é que o DAO da troca precisa escrever em `task_terminal_messages` dentro da própria transação.

## 18. Segurança, privacidade e permissões

- A autorização fica no controller, por `SessionControlAuthorization.requireOwnActive`, e a escrita confere `session_id`, `task_id` e `project_id` da proposta (RN-06).
- O detector só lê o texto principal da IA (`mainAssistantText`, sem subagentes) da própria sessão (NFR-02).
- O texto da Issue continua sendo dado não confiável: uma injeção que produza o bloco gera no máximo um cartão, e a rota só muda com o clique.
- Resumo e motivos são texto puro na tela, sem HTML.

## 19. Observabilidade

Logs estruturados no `SessionLog`:
- `route_switch_proposed` (`sessionId`, `taskId`, `proposalId`);
- `route_switch_discarded` (`sessionId`, `reason`);
- `route_switch_decided` (`proposalId`, `decision`, `actorId`).

Assim dá para medir quantas sessões de PRD viram execução direta, que é o efeito esperado pela Issue.

## 20. Migração, rollout e reversão

- A migration 0055 só acrescenta. A ordem é: migration, depois API e tela juntas. Não há flag; sem o parágrafo no prompt, nenhuma proposta chega.
- O rollback derruba a tabela. Trabalhos já trocados voltam a mostrar a rota aprovada (PRD), mas o código implementado continua no checkout, o que é aceitável.
- Registrar a 0055 em `drizzle/meta/_journal.json` e na lista de `test/databaseMigrations.ts`, com o `_rollback.sql` ao lado.

## 21. Riscos técnicos

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| A IA propõe sem cumprir RN-01 (por exemplo, com regra de permissão em aberto) | Média | Médio | O cartão mostra os motivos e a operadora recusa; régua explícita no prompt |
| A IA implementa antes da resposta | Baixa | Médio | Prompt explícito; smoke V-09 confere |
| O prefixo `/flow-dev:direct-executor` no meio da sessão não ativa a skill no Claude (P-02) | Média | Baixo | A mensagem também descreve o que fazer; o smoke V-09 decide se troca por texto |
| A detecção falha e derruba a gravação do texto | Baixa | Alto | O detector roda depois do insert, com try/catch próprio e log |

---

# Parte 3 — Verificação

## 22. Estratégia de testes

Baseada na skill `software-testing`.
- **Regras puras e parser:** Vitest, sem dublês. Cobrem RN-02 a RN-05, os limites da NFR-04 e o bloco no meio do texto, repetido ou malformado.
- **Postgres real** (o harness de integração, `test:integration`): é onde estão os riscos de índice parcial, de corrida entre duas decisões, da transação decisão + mensagem e da rota efetiva entre tabelas. O relógio é injetado (`now`). Não misturar com `Date.now()`, que já causou intermitência na Issue #9.
- **Tela:** Testing Library com API falsa nos estados pendente, confirmada, recusada, expirada, leitor, erro e enviando.
- **E2E:** uma jornada com o runtime roteirizado (`write_file` e `wait_message` já existem). A sessão de PRD pergunta, recebe a resposta, emite o bloco e espera; a operadora confirma, e a sessão recebe a mensagem.
- **Sem prova automática:** o comportamento real dos modelos, isto é, se propõem com critério, param e ativam o executor. Fica no smoke manual V-09.

## 23. Matriz de verificação

| ID | Cobre | Falha que detecta | Fronteira real | Casos (resumo) |
|---|---|---|---|---|
| V-01 | REQ-003, REQ-009 (formato), NFR-04 | bloco mal separado; texto da IA some; limites ignorados | parser puro | bloco no fim; sem bloco; dois blocos; 9 motivos; resumo com 501; rota ≠ execucao_direta |
| V-02 | RN-02–RN-05, REQ-001 (Q-01), REQ-007, REQ-008 | proposta aceita com spec ou já trocada; primeira proposta barrada por falta de pergunta; nova proposta sem resposta; expirada errada | regras puras | cada condição de RN-02; primeira proposta sem pergunta → aceita; recusa sem/com resposta posterior; interrompida conta como ativa |
| V-03 | US-01 cen. 1, REQ-001, REQ-002, REQ-010, B-07 | pendente não gravada; duplicada; bloco lido de subagente ou da operadora | serviço + Postgres; runtime fora | propõe → pendente; repete → uma só; texto de subagente → nada |
| V-04 | REQ-009, US-02 cen. 2 | descarte sem mensagem; mensagem duplicada | serviço + Postgres | com spec, já trocada, recusada sem resposta → mensagem com o motivo, idempotente |
| V-05 | US-01 cen. 2, US-02 cen. 1, REQ-004–REQ-006, B-01 | troca registrada sem mensagem (ou o contrário); sessão interrompida não recebe | controller + DAO + Postgres | confirma → confirmed + mensagem de execução; recusa → declined + mensagem; interrompida → mensagem enfileirada |
| V-06 | REQ-011–REQ-013, B-02 | outra pessoa decide; segunda decisão sobrescreve; encerrada aceita | controller + Postgres | leitor → session_control_denied; duas decisões em paralelo → uma vence; replay com a mesma chave → mesmo resultado; encerrada → session_not_active |
| V-07 | REQ-014, REQ-017, REQ-018, US-01 cen. 3, US-02 cen. 3, B-04 | chip ou prompt novo ainda em PRD; replan não zera | leituras + Postgres | chip efetivo; prompt de sessão nova com o executor direto e a linha "trocada para"; replan → rota da nova decisão |
| V-08 | US-01 cen. 4, US-03, REQ-013, REQ-015, REQ-016, NFR-03 | cartão com ações para leitor; registro ausente; estado não anunciado | componentes + API falsa | pendente (dona/leitor), confirmada, recusada, expirada, enviando, erro "já decidida"; Planejamento com o registro; histórico "PRD → Execução direta" |
| V-09 | US-01 e US-02 de ponta a ponta, P-02 | partes desconectadas; IA não para ou não ativa o executor | e2e com runtime roteirizado + smoke manual com Claude e Codex | e2e: pergunta → bloco → confirmar → mensagem na conversa; smoke: Issue de troca de texto aprovada como PRD vira execução direta |
| V-10 | §9, B-03, B-06 | fluxo da spec ou planejamento alterado; exclusão deixa linhas | suítes existentes + Postgres | suítes de planejamento, sessão e exclusão passam sem mudança de expectativa; exclusão apaga as propostas |

B-05 (`ROUTING_MISMATCH` depois da troca) não muda nada no Flow Dev e não tem caso próprio.

## 24. Definição de pronto

- `pnpm --dir packages/api test` e `pnpm --dir packages/api test:integration` passam (sem `TEST_DATABASE_URL`).
- `pnpm --dir apps/web test`, `pnpm typecheck` e `pnpm lint` passam.
- O spec e2e da V-09 passa e o smoke manual foi feito com Claude e com Codex.
- A migration 0055 foi aplicada no banco dev e está registrada no `_journal.json`.
- Não sobra `[PRECISA ESCLARECER]`; a spec foi atualizada com o que mudou na implementação.

---

## Questões em aberto

- **Q-01 (respondida em 2026-11-25: não exigir):** a primeira proposta exige ao menos uma pergunta respondida na sessão? A Issue diz "depois das perguntas", mas o spec-writer às vezes conclui que é L0 ou L1 antes de perguntar. — **Sugestão:** não exigir; se a IA já vê que é simples sem perguntar, propor logo economiza a sessão, e o cartão continua exigindo a confirmação. — **Impacto se ficar em aberto:** muda RN-02 e um caso da V-02.

## Sugestões fora do escopo

- **Revisar a régua do agente de planejamento** (`resources/agents/planning/SKILL.md`) com os logs `route_switch_*` em mãos. Se muitas sessões de PRD viram execução direta, o planejamento está inflando a rota, e é ali que a queixa da Issue nasce.
- **Corrigir o "Contexto relevante" do Issue Author,** que citou `task_execution_actions`/`direct_execute` (tabela legada da etapa CompozyOS removida) como base viva. Pela terceira vez isso inflou uma rota.

## Histórico

- 2026-11-25 — Criação da spec a partir da Issue #14. Decisões do usuário: IA propõe e a operadora confirma; a mesma sessão continua; régua do DIRECT; vale para PRD e Tech Spec; nova proposta só com respostas novas; sem desfazer; rota nova com registro visível. Q-01 respondida: a primeira proposta não exige pergunta respondida.
- 2026-11-25 — Tarefas geradas. P-01 confirmada. No parser: dois blocos são tratados como fora do formato; um bloco no meio do texto é reconhecido; um bloco de sessão não elegível é ignorado em silêncio.
