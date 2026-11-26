---
schema_version: "compozy.tasks/v2"
workflow: troca-para-execucao-direta
graph:
  nodes:
    - id: task_01
      file: task_01.md
    - id: task_02
      file: task_02.md
    - id: task_03
      file: task_03.md
    - id: task_04
      file: task_04.md
    - id: task_05
      file: task_05.md
    - id: task_06
      file: task_06.md
    - id: task_07
      file: task_07.md
  edges:
    - from: task_01
      to: task_02
    - from: task_02
      to: task_03
    - from: task_02
      to: task_04
    - from: task_02
      to: task_05
    - from: task_04
      to: task_06
    - from: task_05
      to: task_06
    - from: task_03
      to: task_07
    - from: task_06
      to: task_07
---

# Tarefas: Trocar para execução direta depois das perguntas da spec

> **Spec:** [spec.md](spec.md) · **Data:** 2026-11-25 · **Total:** 7 tarefas, 19 mini-tarefas

## Objetivo
Numa sessão de PRD ou Tech Spec, a IA propõe a troca com o bloco `flow-dev-troca-de-rota`. A operadora confirma ou recusa num cartão. A mesma sessão recebe a mensagem e segue, e a rota efetiva aparece na lista, no Planejamento, no histórico e nas sessões novas.

## Estado
<!-- Keep this table in sync with each task file's frontmatter `status`. The implementer updates it when starting and finishing a task. -->
| Tarefa | Tipo | Complexidade | Depende de | Mini-tarefas | Status |
|---|---|---|---|---|---|
| [01 — Contrato puro da troca: tipos, parser do bloco, regras e textos](task_01.md) | backend | medium | — | 3/3 | completed |
| [02 — Migration 0055 e RouteSwitchDao](task_02.md) | backend | high | 01 | 3/3 | completed |
| [03 — Proposta: detector no recorder e RouteSwitchService.propose](task_03.md) | backend | high | 02 | 2/2 | completed |
| [04 — Decisão: decideRouteSwitch, autorização e mensagem à sessão](task_04.md) | backend | high | 02 | 2/2 | completed |
| [05 — Rota efetiva nas leituras, timeline e exclusão](task_05.md) | backend | medium | 02 | 4/4 | completed |
| [06 — Cartão da troca, registro no Planejamento e seta no histórico](task_06.md) | frontend | medium | 04, 05 | 3/3 | completed |
| [07 — Jornada e2e e smoke com Claude e Codex](task_07.md) | test | medium | 03, 06 | 2/2 | completed |

**Podem rodar em paralelo:** 03, 04 e 05, depois de 02. Os arquivos não se cruzam: 03 mexe no recorder e no worker, 04 no router e no controller, 05 nos leitores e na timeline. Os textos que as três usam saem prontos da 01.

**Ondas:** {01} → {02} → {03, 04, 05} → {06} → {07}.

> Gerado sem parar para aprovar o plano, porque o pedido foi "salve os arquivos e pare para minha revisão". A revisão do plano acontece agora, sobre os arquivos.

## Como executar (controle)
Veja o progresso e a próxima mini-tarefa liberada a qualquer momento: `python3 -I .claude/skills/spec-to-tasks/scripts/tasks_status.py docs/specs/troca-para-execucao-direta`.

1. **Escolha** a próxima tarefa liberada: `pending`, e todas as de que ela depende estão `completed`.
2. **Implemente** numa sessão nova: "implemente a mini-tarefa 02.1 de `task_02.md`" (ou a tarefa inteira). O implementador:
   - muda o `status` para `in_progress`;
   - marca `[x]` em cada mini-tarefa só depois de rodar o "Pronto quando" dela;
   - anota no "Registro de execução" os comandos e o resultado.
3. **Feche a tarefa:** ela passa a `completed` quando todas as mini-tarefas estão marcadas e os critérios de sucesso foram comprovados por comando. Repita a partir do passo 1 até todas as tarefas estarem `completed`.
4. **Revisão final, uma vez, depois de todas as tarefas:** "revise a feature contra a spec" com **spec-conformance**. Ela revisa tudo de uma vez: requisitos, regras do projeto, testes e o que os registros de execução afirmam. O veredito vai para `reviews/` e para a seção "Revisão final" abaixo.
5. **Se REPROVADO:** o prompt de correção do relatório vira uma rodada de correções; depois, nova revisão final. A feature está pronta quando a revisão final estiver APROVADO (ou APROVADO COM RESSALVAS aceito por você).

## Revisão final
<!-- spec-conformance acrescenta uma linha por revisão final: data · review-NNN · veredito · caminho do relatório. -->
- 2026-11-25 · review-001 · APROVADO COM RESSALVAS (0 bloqueantes, 0 importantes, 5 menores, 3 de spec a discutir) · reviews/review-001.md
- 2026-11-25 · review-002 · APROVADO COM RESSALVAS (0 bloqueantes, 0 importantes, 2 menores, 2 de spec a discutir; as 5 correções de código da review-001 foram conferidas) · reviews/review-002.md

## Restrições globais
- Regras de `.agents/rules/code-standards.md`: sem comentários, arquivo `.ts` com no máximo 100 linhas, função com no máximo 30, até 3 parâmetros, sem linha em branco dentro de função, constantes nomeadas para números e textos.
- Skills obrigatórias: `layered-backend` (01–05), `trpc-nextjs` (04 e consumo em 06), `nextjs-folder-structure` (06), `software-testing` (todas). E2E segue `.agents/rules/e2e-testing.md`.
- Textos de tela e mensagens em pt-BR, exatamente como na spec §5 e §15.
- A decisão de planejamento aprovada, suas regras e o trigger `task_planning_decision_immutable` não mudam (DEC-02, §9).
- A skill `spec-writer` não muda; o parágrafo da troca fica só em `terminalPromptCopy.ts` (DEC-03).
- Migration **0055** (0052, 0053 e 0054 já estão reservadas). Registre no `_journal.json` e em `packages/api/test/databaseMigrations.ts`, com o `_rollback.sql`. Confirme que 0055 continua livre antes de criar.
- Relógio injetado (`now`) em todo código e teste novo; nada de `Date.now()` nas regras (a Issue #9 ficou intermitente por isso).
- Verificação proporcional: durante a tarefa, rode só os arquivos de teste afetados e o typecheck do pacote. Integração: `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/<arquivo>`, sem `TEST_DATABASE_URL`. Suítes completas só no fim de cada tarefa que mexe no pacote.
- Nada de commit, push ou PR sem pedido.

## Premissas e bloqueios
- **P-01 (spec §11, confirmada pelo usuário em 2026-11-25):** a troca só vale sem spec capturada. Seguida em 01 (RN-02) e 03 (V-04a).
- **PT-01 (confirmada em 2026-11-25; texto com dois blocos):** é tratado como fora do formato (REQ-009). Está em 01.1.
- **PT-02 (confirmada em 2026-11-25; bloco que não está no fim):** é reconhecido do mesmo jeito. O texto antes e depois dele é mantido. Está em 01.1.
- **PT-03 (confirmada em 2026-11-25; bloco vindo de sessão não elegível):** numa sessão que não é de rota, ou que é de rota direta, o bloco é ignorado. Só gera log, sem cartão e sem mensagem, porque a spec só lista quatro motivos de descarte. Está em 01.2 e 03.1.
- **PT-04 (onde entra a linha da troca):** a linha fica "Rota aprovada: PRD · trocada para Execução direta · Complexidade: Baixa", ou seja, mantém a complexidade no fim. Está em 05.1.
- **B-05** (`ROUTING_MISMATCH` depois da troca) não pede código nem caso de teste (spec §23).

## Matriz de cobertura
| ID da spec | Descrição curta | Tarefa · mini-tarefa |
|---|---|---|
| REQ-001 | sessão PRD/Tech Spec propõe com resumo e 1–8 motivos, e espera | 03 · 03.1 |
| REQ-002 | cartão com resumo, motivos e os dois botões | 06 · 06.1 |
| REQ-003 | texto da IA sem o bloco | 05 · 05.3 |
| REQ-004 | registrar a troca confirmada | 04 · 04.1 |
| REQ-005 | mensagem de execução direta à mesma sessão | 04 · 04.1 |
| REQ-006 | registrar a recusa e mandar a mensagem de seguir com a spec | 04 · 04.1 |
| REQ-007 | nova proposta sem resposta depois da recusa → descarte com mensagem | 03 · 03.1 |
| REQ-008 | resposta depois da recusa libera a próxima proposta | 03 · 03.1 |
| REQ-009 | proposta inválida ou fora do formato → descarte com motivo | 03 · 03.1 |
| REQ-010 | repetição com pendente → um cartão só, sem mensagem | 02 · 02.2 |
| REQ-011 | quem não é dona → session_control_denied | 04 · 04.2 |
| REQ-012 | segunda decisão → "Essa proposta já foi decidida."; replay devolve o original | 02 · 02.3 |
| REQ-013 | sessão encerrada → expirada, sem ações | 04 · 04.2 |
| REQ-014 | chip da lista com a rota efetiva | 05 · 05.2 |
| REQ-015 | registro da troca na aba Planejamento | 06 · 06.3 |
| REQ-016 | "PRD → Execução direta" no histórico | 06 · 06.3 |
| REQ-017 | sessão nova com o executor direto e a linha "trocada para" | 05 · 05.1 |
| REQ-018 | troca vale até o replan, sem desfazer | 05 · 05.2 |
| RN-01 | régua do DIRECT no prompt | 01 · 01.3 |
| RN-02 | condições de aceite da proposta | 01 · 01.2 |
| RN-03 | estados e unicidade | 01 · 01.2 |
| RN-04 | nova proposta só com resposta posterior à recusa | 01 · 01.2 |
| RN-05 | rota efetiva | 01 · 01.2 |
| RN-06 | permissão de quem decide | 04 · 04.2 |
| NFR-01 | decisão, registro e mensagem numa transação; cartão no mesmo ciclo de leitura | 02 · 02.3 |
| NFR-02 | só o texto principal da IA; só o clique muda a rota | 03 · 03.2 |
| NFR-03 | acessibilidade do cartão | 06 · 06.1 |
| NFR-04 | limites de resumo e motivos | 01 · 01.1 |
| B-01 | sessão interrompida aceita a decisão | 04 · 04.1 |
| B-02 | duas abas decidem | 02 · 02.3 |
| B-03 | parágrafo apagado → sem proposta | 01 · 01.3 |
| B-04 | replan depois da troca | 05 · 05.2 |
| B-06 | exclusão apaga as propostas | 05 · 05.4 |
| B-07 | bloco na Issue ou na resposta da operadora é ignorado | 03 · 03.2 |
| §9 | comportamento que não muda | 05 · 05.4 |
| §19 | logs route_switch_proposed/discarded | 03 · 03.1 |
| §19 | log route_switch_decided | 04 · 04.1 |
| §20 | migration 0055, rollback e registro | 02 · 02.1 |
| P-02 | prefixo `/flow-dev:direct-executor` no meio da sessão | 07 · 07.2 |
| V-01a–V-01h | parser do bloco | 01 · 01.1 |
| V-02a–V-02k | regras puras | 01 · 01.2 |
| V-03e | parágrafo do prompt só nas rotas de spec | 01 · 01.3 |
| V-10c | migration aplica, rollback derruba | 02 · 02.1 |
| V-03b, V-02l | repetição absorvida pelo índice parcial; mapeamento da view | 02 · 02.2 |
| V-05d, V-06b, V-06c | atomicidade, corrida, replay no DAO | 02 · 02.3 |
| V-03a, V-04a–V-04e | serviço de proposta | 03 · 03.1 |
| V-03c, V-03d, V-03f | detector no recorder | 03 · 03.2 |
| V-05a–V-05c | decidir confirma, recusa, interrompida | 04 · 04.1 |
| V-06a, V-06d–V-06f | erros de decisão | 04 · 04.2 |
| V-07a–V-07j | rota efetiva e leituras | 05 · 05.1–05.3 |
| V-10a, V-10b | suítes existentes e exclusão | 05 · 05.4 |
| V-08a–V-08j | tela | 06 · 06.1–06.3 |
| V-09a | e2e roteirizado | 07 · 07.1 |
| V-09b, V-09c | smoke Claude e Codex | 07 · 07.2 |

## Foco de revisão
1. A mesma mensagem da IA é gravada duas vezes (reenvio do runtime) → uma única mensagem de descarte, por causa da `requestKey` derivada do id da mensagem → teste em 03.1 (V-04e).
2. O detector lança erro → o texto da IA continua gravado, e o erro vira log → teste em 03.2 (V-03f).
3. A troca confirmada é de uma decisão antiga, anterior ao replan → a rota efetiva volta a ser a aprovada → testes em 01.2 (V-02k) e 05.2 (V-07e).
4. A mensagem falha dentro da transação da decisão → a proposta continua `pending` → teste em 02.3 (V-05d).
5. A sessão é interrompida com um cartão pendente → o estado continua pendente, não expirado, e a decisão é aceita → testes em 01.2 (V-02h) e 04.1 (V-05c).
