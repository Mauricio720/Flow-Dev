---
schema_version: "compozy.tasks/v2"
workflow: sessoes-moldes-e-execucao-do-plano
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
    - from: task_03
      to: task_04
    - from: task_01
      to: task_05
    - from: task_03
      to: task_06
    - from: task_05
      to: task_06
    - from: task_04
      to: task_07
    - from: task_06
      to: task_07
---

# Tarefas: Sessões como moldes e execução automática do plano

> **Spec:** [spec.md](spec.md) · **Data:** 2026-11-26 · **Total:** 7 tarefas, 21 mini-tarefas

## Objetivo
A operadora monta o plano com sessões vazias, ordena e condiciona as sessões e aciona "Executar o plano"; o worker inicia as sessões sozinho, uma por vez, e pausa com o motivo quando algo não termina bem.

## Estado
<!-- Mantenha esta tabela igual ao `status` do frontmatter de cada tarefa. -->
| Tarefa | Tipo | Complexidade | Depende de | Mini-tarefas | Status |
|---|---|---|---|---|---|
| [01 — Regras do plano: sessões vazias, condições e espera por sessões](task_01.md) | backend | high | — | 3/3 | completed |
| [02 — Migration 0058 e gravação das sessões vazias e condições](task_02.md) | backend | high | 01 | 3/3 | completed |
| [03 — Execução do plano: registro, serviço e procedimentos run.*](task_03.md) | backend | high | 02 | 3/3 | completed |
| [04 — Passo do worker que inicia as sessões sozinho](task_04.md) | backend | critical | 03 | 5/5 | completed |
| [05 — Editor do plano com moldes, arrastar, ordem e condições](task_05.md) | frontend | medium | 01 | 3/3 | completed |
| [06 — Barra de execução do plano](task_06.md) | frontend | medium | 03, 05 | 2/2 | completed |
| [07 — Jornada e2e e verificação final](task_07.md) | test | high | 04, 06 | 2/2 | completed |

**Ondas:**
1. 01
2. 02 e 05 em paralelo (backend × web, arquivos disjuntos)
3. 03
4. 04 e 06 em paralelo (worker × web)
5. 07

> Gerado sem a etapa de aprovação do plano: a operadora pediu para salvar os arquivos e parar para revisão. Ajustes na quebra entram editando estes arquivos antes da primeira implementação.

## Como executar (controle)
Veja o progresso e a próxima mini-tarefa liberada a qualquer momento: `python3 -I .claude/skills/spec-to-tasks/scripts/tasks_status.py docs/specs/sessoes-moldes-e-execucao-do-plano`.

1. **Escolha** a próxima tarefa liberada: `pending`, e todas as de que ela depende estão `completed`.
2. **Implemente** numa sessão nova: "implemente a mini-tarefa 02.1 de `task_02.md`" (ou a tarefa inteira). O implementador:
   - muda o `status` para `in_progress`;
   - marca `[x]` em cada mini-tarefa só depois de rodar o "Pronto quando" dela;
   - anota no "Registro de execução" os comandos e o resultado.
3. **Feche a tarefa:** ela passa a `completed` quando todas as mini-tarefas estão marcadas e os critérios de sucesso foram comprovados por comando. Repita a partir do passo 1 até todas as tarefas estarem `completed`.
4. **Revisão final, uma vez, depois de todas as tarefas:** "revise a feature contra a spec" com **spec-conformance**. O veredito vai para `reviews/` e para a seção "Revisão final" abaixo.
5. **Se REPROVADO:** o prompt de correção do relatório vira uma rodada de correções; depois, nova revisão final. A feature está pronta quando a revisão final estiver APROVADO (ou APROVADO COM RESSALVAS aceito por você).

## Revisão final
<!-- spec-conformance acrescenta uma linha por revisão final. -->

## Restrições globais
- Leia `.agents/rules/code-standards.md`: sem comentários, arquivos `.ts`/`.tsx` com até 100 linhas, funções com até 30 linhas, até 3 parâmetros, sem linhas em branco dentro de funções, sem números ou textos mágicos.
- `packages/api/src/application/services/terminal/sessionLauncher.ts` (80 linhas) e `apps/web/.../components/ExecutionPlanEditor.tsx` (54 linhas, linhas longas) já estão perto do limite: extraia antes de crescer.
- Skills obrigatórias: `layered-backend` e `trpc-nextjs` (tarefas 01–04), `nextjs-folder-structure` (05–06), `e2e-environment` (07), `software-testing` em todas.
- Textos da tela e mensagens de erro em pt-BR, exatamente como na spec.
- A migration é a `0058` (a 0056 e a 0057 existem no checkout principal). Confira `ls packages/api/drizzle` antes de criar; se o número estiver ocupado, use o próximo livre e registre. Registre a migration em `packages/api/drizzle/meta/_journal.json` e em `packages/api/test/databaseMigrations.ts`, com o `_rollback.sql` ao lado.
- Testes de integração: `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts test/<arquivo>.test.ts`, sem `TEST_DATABASE_URL`. Unitários da API: `pnpm --dir packages/api exec vitest run src/<arquivo>.test.ts`. Web: `pnpm --dir apps/web exec vitest run src/<arquivo>.test.tsx`.
- Typecheck por pacote uma vez por mini-tarefa: `pnpm --dir packages/api typecheck`, `pnpm --dir apps/web typecheck`. Suítes completas só no fim (07.2).
- Nada de teste manual: a operadora faz o teste manual depois de todas as tarefas.
- Não encerre sozinho a sessão do agente, nem faça commit, push ou PR pelo produto (§9).

## Premissas e bloqueios
- A spec não tem questões em aberto.
- **REQ-024 × US-04 cen. 4:** decidido em 2026-11-26 que vale a REQ-024 (uma frase por sessão que falta, na ordem). O cenário da spec foi alinhado.
- **B-03 × US-04 cen. 2:** B-03 é o worker desta máquina parado (não há tick, a execução fica "Executando" e segue quando ele volta). US-04 cen. 2 é o `launch` recusado com `session_service_offline` durante um tick, que pausa pela REQ-023. Registrado na task_04.
- **Roteiro da sessão falsa no e2e:** o roteiro é um por clone (`apps/web/e2e/fixtures/sessionScript.ts`). A jornada V-10 precisa de comportamentos diferentes na Sessão 1 e na Sessão 2. A abordagem e a alternativa estão na task_07.
- A seção 22 da spec lista "Sem prova automática" (agente real marcando o `status`, permissão no meio de uma sessão automática). Isso fica fora das tarefas: não vira teste manual.

## Matriz de cobertura
| ID da spec | Descrição curta | Tarefa · mini-tarefa |
|---|---|---|
| REQ-001 | "Nova sessão" acrescenta sessão vazia sem diálogo | 05 · 05.1 |
| REQ-002 | Texto da sessão vazia | 05 · 05.2 |
| REQ-003 | Soltar tarefa numa sessão ou em "Sem sessão" | 05 · 05.2 |
| REQ-004 | "Adicionar tarefas" sem apagar a sessão vazia | 05 · 05.1 |
| REQ-005 | "Remover da sessão" | 05 · 05.2 |
| REQ-006 | "Remover sessão" limpa condições | 05 · 05.1 (rascunho), 02 · 02.2 (cascata) |
| REQ-007 | Seletor por tarefa e diálogo "nova sessão" saem | 05 · 05.2 |
| REQ-008 | Sessão vazia salva e mantida; manifesto não a apaga | 01 · 01.1–01.2, 02 · 02.2 |
| REQ-009 | Reordenar arrastando ou Subir/Descer | 05 · 05.1–05.2, 02 · 02.2 |
| REQ-010 | "Começa depois de" com sessões anteriores | 05 · 05.3 |
| REQ-011 | Recusa de `after` para frente | 01 · 01.1 |
| REQ-012 | Condições no cartão | 01 · 01.3 (visão), 05 · 05.3 (tela) |
| REQ-013 | Bloqueada por sessão; força lista as duas esperas | 01 · 01.2, 02 · 02.3, 05 · 05.3 |
| REQ-014 | Quando aparece "Executar o plano" | 06 · 06.2 |
| REQ-015 | Pré-voo do "Executar o plano" | 03 · 03.2 |
| REQ-016 | Recusa com sessão vazia | 03 · 03.2 |
| REQ-017 | Escolha da próxima sessão | 04 · 04.1, 04.4 |
| REQ-018 | Início automático com escolha, prompt, clone de quem executou | 04 · 04.2 |
| REQ-019 | Plano concluído | 04 · 04.1 |
| REQ-020 | Edição durante a execução usa o plano salvo | 04 · 04.4 |
| REQ-021 | "Iniciar" manual durante a execução | 04 · 04.1 |
| REQ-022 | Pausa por tarefa aberta ou falha ao abrir | 04 · 04.1 |
| REQ-023 | Pausa por início recusado | 04 · 04.4 |
| REQ-024 | Pausa "Nenhuma sessão pode começar." | 04 · 04.1 |
| REQ-025 | Pausa por sessão vazia na vez | 04 · 04.1 |
| REQ-026 | Guardas: operadora, planejamento, conjunto, pasta | 04 · 04.3 |
| REQ-027 | "Pausar" | 03 · 03.2, 04 · 04.5 |
| REQ-028 | "Retomar" | 03 · 03.2, 04 · 04.5 |
| REQ-029 | Estado para todos, botões só para a operadora | 03 · 03.3, 06 · 06.2 |
| 7.1–7.2 | Estados "Sem tarefas" e Pronta/Bloqueada | 01 · 01.2 |
| 7.3 | Máquina de estados da execução | 03 · 03.1–03.2 |
| 7.4 | Agente trabalhando | 04 · 04.1, 04.3 |
| 7.5 | Permissões | 03 · 03.3, 05 · 05.3, 06 · 06.2 |
| 7.6 | Limites 0–30 | 01 · 01.1, 02 · 02.1 |
| B-01 | Duas abas → uma execução | 03 · 03.2 |
| B-02 | Pausar durante o início | 04 · 04.5 |
| B-03 | Worker parado e de volta | 04 · 04.4 |
| B-04, B-06, B-07 | Pergunta pendente, conversa ociosa, revisão trabalhando | 04 · 04.1 |
| B-05 | Encerrada com tarefas concluídas | 04 · 04.1 |
| B-08 | Manifesto muda durante a execução | 04 · 04.4 |
| B-09 | Sessão da pausa removida | 04 · 04.5 |
| B-10 | Replanejamento desaprova | 04 · 04.3 |
| §9 | Regra de posição, iniciada imutável, atalhos, manual, 5 s | 01 · 01.1, 05 · 05.1, 02 · 02.3 (V-11a), 05 · 05.2 (V-11b) |
| NFR-01 | ≤ 10 s para começar, ≤ 5 s na tela | 07 · 07.1 |
| NFR-02 | Idempotência do início | 04 · 04.4 |
| NFR-03 | Teclado, alvos com nome, região `status` | 05 · 05.2, 06 · 06.2 |
| §14 | Migration e rollback | 02 · 02.1 |
| §19 | Eventos do `PlanLog` | 03 · 03.3, 04 · 04.4 |
| §20 | Rollout: migration antes do código | 02 · 02.1 |
| V-01a–f | Regras de validação | 01 · 01.1 |
| V-02a–f | Prontidão e visão | 01 · 01.2–01.3 |
| V-02g–h | Iniciar com espera por sessão | 02 · 02.3 |
| V-03a–g | Migration e gravação | 02 · 02.1–02.2 |
| V-04a–i | Serviço e procedimentos run.* | 03 · 03.1–03.3 |
| V-05a–n | Seleção pura | 04 · 04.1 |
| V-06a–n | Passo do worker com Postgres | 04 · 04.2–04.5 |
| V-07a–k | Modelo do rascunho | 05 · 05.1 |
| V-08a–k | Componentes do editor | 05 · 05.2–05.3 |
| V-09a–g | Barra de execução | 06 · 06.1–06.2 |
| V-10 | Jornada e2e | 07 · 07.1 |
| §24 | Definição de pronto: suítes completas | 07 · 07.2 |
| V-11a | Regressão API (Spec D) | 02 · 02.3 |
| V-11b | Regressão web (Spec D, Issue #8) | 05 · 05.2 |

## Foco de revisão
1. Sessão vazia avaliada como "done" por `remainingTasks` vazio → deve ser "empty" e não contar como Concluída para "Começa depois de" → V-02c (01.2).
2. `after` de uma sessão criada no mesmo save, apontando para outra também nova → gravado com os ids certos na segunda passada → V-03c (02.2).
3. Sessão `waiting` depois de cada vez travando a fila → não conta como agente trabalhando → V-05b (04.1).
4. "Pausar" chegando entre a escolha e o `launch` → a transição por `revision` impede um segundo início → V-06k (04.5).
5. Tick repetido ou reinício do worker → a `requestKey` derivada de (run, item, resume_count) não abre a sessão duas vezes → V-06d (04.4).
