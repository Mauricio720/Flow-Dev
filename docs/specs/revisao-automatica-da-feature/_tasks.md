---
schema_version: "compozy.tasks/v2"
workflow: revisao-automatica-da-feature
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
    - id: task_08
      file: task_08.md
  edges:
    - from: task_01
      to: task_03
    - from: task_01
      to: task_04
    - from: task_02
      to: task_04
    - from: task_02
      to: task_05
    - from: task_03
      to: task_05
    - from: task_04
      to: task_05
    - from: task_05
      to: task_06
    - from: task_04
      to: task_07
    - from: task_06
      to: task_08
    - from: task_07
      to: task_08
---

# Tarefas: Revisão automática da feature

> **Spec:** [spec.md](spec.md) · **Data:** 2026-11-25 · **Total:** 8 tarefas, 30 mini-tarefas · **Gerado sem a confirmação prévia do plano**, a pedido do usuário ("salve os arquivos e pare para minha revisão"). A revisão da quebra está pendente.

## Objetivo
Com as tarefas de um trabalho concluídas, a operadora escolhe revisão e execução na etapa "Revisão" e inicia um ciclo. O serviço de sessões conduz as rodadas pelas mesmas duas sessões, lendo `reviews/etapa.md`, até Aprovada, Ressalvas aceitas, Parada ou Parada por falha. A tela mostra cada mudança em até 5 s sem recarregar.

## Estado
<!-- Keep this table in sync with each task file's frontmatter `status`. The implementer updates it when starting and finishing a task. -->
| Tarefa | Tipo | Complexidade | Depende de | Mini-tarefas | Status |
|---|---|---|---|---|---|
| [01 — Migration dos ciclos de revisão](task_01.md) | backend | high | — | 2/2 | completed |
| [02 — Regras puras: estados, documento de etapa e prompts](task_02.md) | backend | medium | — | 3/3 | completed |
| [03 — Abertura e mensagem sem requisição HTTP](task_03.md) | backend | critical | 01 | 4/4 | completed |
| [04 — Início, leitura e pedidos do ciclo](task_04.md) | backend | high | 01, 02 | 4/4 | completed |
| [05 — Passo do ciclo: condução das rodadas](task_05.md) | backend | critical | 02, 03, 04 | 4/4 | completed |
| [06 — Passo do ciclo: falhas, paradas e retomada](task_06.md) | backend | critical | 05 | 5/5 | completed |
| [07 — Tela: etapa Revisão](task_07.md) | frontend | high | 04 | 5/5 | completed |
| [08 — Ponta a ponta, smoke e entrega](task_08.md) | test | medium | 06, 07 | 0/3 | pending |

**Ondas:**
1. 01 ‖ 02. Migration e schema contra funções puras em `application/services/review/` (arquivos disjuntos).
2. 03 ‖ 04. A extração da abertura (`application/services/terminal/`, `terminalSessionController.ts`, runtime roteirizado) contra o controller, o serviço, os DAOs e os routers do ciclo (`review/`, `routers/review.ts`).
3. 05 ‖ 07. O passo do ciclo em `packages/api` contra a tela em `apps/web`, que só consome o contrato de 04.
4. 06.
5. 08.

## Como executar (controle)
Veja o progresso e a próxima mini-tarefa liberada a qualquer momento: `python3 -I .claude/skills/spec-to-tasks/scripts/tasks_status.py docs/specs/revisao-automatica-da-feature`.

1. **Escolha** a próxima tarefa liberada: `pending`, e todas as de que ela depende estão `completed`.
2. **Implemente** numa sessão nova: "implemente a mini-tarefa 05.1 de `task_05.md`" (ou a tarefa inteira). O implementador:
   - muda o `status` para `in_progress`;
   - marca `[x]` em cada mini-tarefa só depois de rodar o "Pronto quando" dela;
   - anota no "Registro de execução" os comandos e o resultado.
3. **Feche a tarefa:** ela passa a `completed` quando todas as mini-tarefas estão marcadas e os critérios de sucesso foram comprovados por comando. Repita a partir do passo 1 até todas as tarefas estarem `completed`.
4. **Revisão final, uma vez, depois de todas as tarefas:** "revise a feature contra a spec" com **spec-conformance**. Ela revisa tudo de uma vez: requisitos, regras do projeto, testes e o que os registros de execução afirmam. O veredito vai para `reviews/` e para a seção "Revisão final" abaixo.
5. **Se REPROVADO:** o prompt de correção do relatório vira uma rodada de correções; depois, nova revisão final. A feature está pronta quando a revisão final estiver APROVADO (ou APROVADO COM RESSALVAS aceito por você).

## Revisão final
<!-- spec-conformance acrescenta aqui uma linha por revisão final: data · review-NNN · veredito · caminho do relatório. -->
- 2026-11-25 · review-001 · REPROVADO (2 bloqueantes, 2 importantes, 3 menores; parcial, sem a task_08) · reviews/review-001.md
- 2026-11-25 · review-002 · REPROVADO (1 bloqueante fora do código da #9: integração intermitente em codex-secret-answer; 1 importante, 3 menores; parcial, sem a task_08) · reviews/review-002.md
- 2026-11-25 · review-003 · REPROVADO (1 bloqueante fora do código da #9: V-54a de codex-service-flow intermitente; 1 importante: 2 arquivos acima de 100 linhas; 2 menores; parcial, sem a task_08) · reviews/review-003.md
- 2026-11-25 · review-004 · APROVADO COM RESSALVAS (0 bloqueantes, 0 importantes, 2 menores: confirmar o risco residual de REQ-021 e corrigir a nota sobre codex-runtime-requests; parcial, sem a task_08) · reviews/review-004.md
- 2026-11-25 · correção da review-004: nota sobre `codex-runtime-requests` corrigida e risco residual de REQ-021 aceito pela operadora; sem mudança de código

## Restrições globais
- `.agents/rules/code-standards.md` em todo código novo ou alterado: no máximo 100 linhas por `.ts`, 30 por função, 3 parâmetros, sem comentários, sem linha em branco dentro de função, constantes nomeadas para textos e números.
- Skills por camada: `layered-backend` (controller, serviço, DAO), `trpc-nextjs` (procedures `tasks.review.*`), `nextjs-folder-structure` (tela). Em `apps/web`, leia também `apps/web/AGENTS.md` e o guia do Next em `node_modules/next/dist/docs/`.
- Testes seguem `.claude/skills/software-testing/SKILL.md`; e2e seguem `.agents/rules/e2e-testing.md`.
- Textos de tela, prompts e mensagens são os de §7.4 e §7.5 da spec, caractere por caractere, em pt-BR.
- Sem WebSocket, sem dependência nova, sem porta nova e sem variável de ambiente nova (DEC-03, §20).
- O Flow Dev só lê `reviews/etapa.md` e os relatórios; não escreve no checkout nem no GitHub (§9).
- As tabelas legadas `task_execution_*` da migration 0041 não mudam (DEC-05).
- Integração: `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts <arquivo>`, sem `TEST_DATABASE_URL`. Unitário: `pnpm --dir <pacote> exec vitest run <arquivo>`. Typecheck: `pnpm --dir <pacote> typecheck`, uma vez por mini-tarefa. Suítes completas só no fim de cada tarefa e na 08.

## Premissas e bloqueios
- **Spec em revisão:** o status da spec é "Em revisão", sem pendências registradas. As tarefas seguem o texto de 2026-11-24. Se a spec mudar, ajuste as tarefas afetadas antes de implementá-las.
- **Número da migration (decidido em 2026-11-25):** 0053. A 0052 fica para a Issue #6; se ela não entrar antes do merge, o buraco no journal precisa ser fechado.
- **Papel da vez (decidido em 2026-11-25):** `task_review_cycles.step_role` (`review|execute`), acrescentado à §14 da spec e criado na 01.
- **Mensagem de continuação não recuperada após queda (aceito pela operadora em 2026-11-25):** se o serviço cair exatamente entre a gravação da transição e o envio da mensagem à outra sessão (`reviewStepTurn.ts`), a sessão da vez não recebe a mensagem e o ciclo fica parado sem falha. A saída é "Parar revisão" e iniciar outro ciclo. Reenviar sozinho exigiria uma chave de mensagem estável e distinguir a abertura da continuação, com risco de mensagem duplicada; fica para uma spec própria.
- **Testes de integração sensíveis a carga fora da #9:** `codex-secret-answer` (confirmação de 100 ms), `codex-service-flow` V-54a e `codex-runtime-requests` falharam de forma intermitente sob a suíte completa. Os dois primeiros foram ajustados nesta feature para não depender de prazo curto. `codex-runtime-requests` ("adds a denial reason…") falhou uma vez e não foi alterado; outros testes da base com a mesma forma podem existir.
- **Contas por trabalho (Issue #6):** fora destas tarefas. Quando entrar, as sessões do ciclo passam a seguir a conta do trabalho (§11).

## Matriz de cobertura
| ID da spec | Descrição curta | Tarefa · mini-tarefa |
|---|---|---|
| REQ-001 | aba Revisão depois de Tarefas | 07 · 07.5 |
| REQ-002 | campos Revisão e Execução e "Iniciar revisão" | 07 · 07.3 |
| REQ-003 | padrões do último ciclo ou Opus · Máximo | 04 · 04.2 |
| REQ-004 | criar ciclo na rodada 1 | 04 · 04.3 |
| REQ-005 | desabilitar com tarefas faltando | 07 · 07.3 |
| REQ-006 | ciclo parcial e frase parcial | 04 · 04.3 (ciclo), 02 · 02.3 (frase) |
| REQ-007 | pré-condições recusam sem criar ciclo | 04 · 04.3 |
| REQ-008 | recusa com ciclo não final | 04 · 04.3 |
| REQ-009 | mesmo pedido, mesmo ciclo | 04 · 04.3 |
| REQ-010 | confirmação com sessões abertas | 04 · 04.3 (API), 07 · 07.3 (tela) |
| REQ-011 | escolhas inalteradas no ciclo | 04 · 04.4 |
| REQ-012 | ler etapa no fim do turno | 05 · 05.2 |
| REQ-013 | transições da revisão | 02 · 02.1 (regra), 05 · 05.2 (passo) |
| REQ-014 | `review` manda a rodada seguinte | 05 · 05.3 |
| REQ-015 | nova rodada sem limite | 02 · 02.1 |
| REQ-016 | pendência mantém a etapa | 05 · 05.4 |
| REQ-017 | prompts iniciais e continuações | 02 · 02.3 (texto), 05 · 05.3 (envio) |
| REQ-018 | captura das edições `.md` da execução | 03 · 03.3 |
| REQ-019 | registro por rodada | 05 · 05.2 |
| REQ-020 | no máximo duas sessões, mesmo após reinício | 06 · 06.4 |
| REQ-021 | retomar ciclos após reinício | 06 · 06.4 |
| REQ-022 | Parar revisão | 06 · 06.1 |
| REQ-023 | falha de sessão da vez | 06 · 06.2 |
| REQ-024 | etapa não atualizada ou inválida | 06 · 06.1 |
| REQ-025 | Tentar de novo | 06 · 06.1 |
| REQ-026 | posse, planejamento e conjunto | 06 · 06.3 |
| REQ-027 | exclusão da Issue | 06 · 06.5 |
| REQ-028 | aceitar ressalvas | 05 · 05.4 |
| REQ-029 | pedir correção das ressalvas | 05 · 05.4 |
| REQ-030 | ações por estado | 02 · 02.1 (regra), 07 · 07.4 (tela) |
| REQ-031 | só a operadora age | 04 · 04.4 |
| REQ-032 | ação sobre estado mudado | 04 · 04.4 |
| REQ-033 | estado, rodada, escolhas, rodadas | 07 · 07.4 |
| REQ-034 | conversa da sessão da vez | 07 · 07.4 |
| REQ-035 | mudança sem recarregar | 07 · 07.2 |
| REQ-037 | conduz sem tela aberta | 05 · 05.3 |
| REQ-038 | abrir na aba Revisão | 07 · 07.5 |
| REQ-039 | estado da aba (§7.2) | 07 · 07.1 |
| REQ-040 | encerrar as duas no fim | 05 · 05.3 |
| REQ-041 | a outra fica aguardando | 05 · 05.3 |
| REQ-042 | turno fora da vez ignorado | 06 · 06.3 |
| REQ-043 | substituta ao Tentar de novo | 06 · 06.2 |
| REQ-044 | gravação válida destrava Parada por falha | 02 · 02.1 (regra), 06 · 06.1 (passo) |
| NFR-01 | até 5 s na tela | 07 · 07.2 |
| NFR-02 | etapa seguinte no mesmo tick | 05 · 05.3 |
| NFR-04 | duas sessões, sem tentativa automática | 05 · 05.3, 06 · 06.1 |
| NFR-05 | acessibilidade | 07 · 07.4 |
| NFR-06 | logs `[review]` | 05 · 05.1 |
| §7.1 | estados, ações e transições | 02 · 02.1 |
| §7.2 | estado da aba | 07 · 07.1 |
| §7.3 | documento de etapa | 02 · 02.2 |
| §7.4 | textos exatos | 07 · 07.1 |
| §7.5 | prompts exatos | 02 · 02.3 |
| §9 | comportamento que não muda | 01 · 01.2, 03 · 03.2, 06 · 06.5, 07 · 07.5 |
| §14 | modelo de dados | 01 · 01.1 |
| §20 | migração e rollback | 01 · 01.2 |
| DEC-05 | legadas intactas | 01 · 01.2 |
| B-01 | pergunta escrita sem etapa | 06 · 06.1 |
| B-02 | dois relatórios na mesma vez | 02 · 02.2 |
| B-03 | relatório antigo | 02 · 02.2 |
| B-04 | tarefa volta a em andamento | 06 · 06.1 |
| B-05 | duas abas ao mesmo tempo | 04 · 04.4 |
| B-06 | modelo sai do catálogo | 06 · 06.2 |
| B-07 | sessão manual durante o ciclo | 06 · 06.5 |
| B-09 | reinício do serviço | 06 · 06.4 |
| B-10 | interrompida pela operadora | 06 · 06.2 |
| B-11 | conversa com a sessão que aguarda | 06 · 06.3 |
| B-12 | `etapa.md` de ciclo anterior | 02 · 02.2 |
| V-01a–V-01h | leitor do documento de etapa | 02 · 02.2 |
| V-02a–V-02f | regras do ciclo | 02 · 02.1 |
| V-03a–V-03f | prompts e mensagens | 02 · 02.3 |
| V-04a–V-04f | início e leitura | 04 · 04.2, 04.3 |
| V-04g–V-04h | autorização e escolhas fixas | 04 · 04.4 |
| V-05a–V-05b, V-05e | rodadas nas mesmas sessões | 05 · 05.3 |
| V-05c–V-05d | ressalvas | 05 · 05.4 |
| V-05f | captura da execução | 03 · 03.3 |
| V-05i–V-05k | runtime por sessão, abertura e mensagem sem HTTP | 03 · 03.1, 03.2, 03.4 |
| V-05g | logs | 05 · 05.1 |
| V-05h | leitura da etapa e registro da rodada | 05 · 05.2 |
| V-06a–V-06m | falhas, paradas e retomada | 06 · 06.1–06.5 |
| V-07a–V-07b | pergunta e permissão pendentes | 05 · 05.4 |
| V-08a–V-08b | concorrência dos pedidos | 04 · 04.4 |
| V-09a–V-09d | leitura periódica da tela | 07 · 07.2 |
| V-11a–V-11h | componentes da etapa | 07 · 07.1, 07.3, 07.4 |
| V-12a–V-12c | abas | 07 · 07.1, 07.5 |
| V-13a–V-13b | legadas e rollback | 01 · 01.2 |
| V-04i | constraints do ciclo e das rodadas | 01 · 01.2 |
| V-13c | rota e plano abrem como antes | 03 · 03.2 |
| V-13d–V-13e | exclusão e sessão manual | 06 · 06.5 |
| V-13f | sessões do ciclo no histórico de Execução | 07 · 07.5 |
| V-14 | jornada e2e | 08 · 08.1 |
| V-15 | smoke com o Claude real | 08 · 08.2 |
| §24 | definição de pronto | 08 · 08.3 |

Itens retirados da spec, sem dono: REQ-036, NFR-03, B-08, DEC-04, DEC-06, V-10.

## Foco de revisão
1. Um `file_edit` de `reviews/etapa.md` feito pela sessão da vez **antes** de `step_started_at` (sobra da vez anterior) → deve ser ignorado e dar "etapa não atualizada" → teste V-01d em 02.2.
2. O serviço cai entre criar a sessão de um papel e gravar `review_session_id` → o reinício não pode abrir uma segunda sessão → teste V-06h em 06.4.
3. O fim de turno de uma conversa da operadora com a sessão que **não** é a da vez → não conduz o ciclo → teste V-06i em 06.3.
4. A mensagem de continuação gravada duas vezes por ticks seguidos (o tick não terminou de atualizar o ciclo) → a `requestKey` derivada impede mensagem duplicada → teste V-05e em 05.3.
5. Duas transições concorrentes (tick e pedido da web) sobre a mesma `revision` → só uma vale, a outra recebe `review_cycle_changed` → teste V-08b em 04.4.
