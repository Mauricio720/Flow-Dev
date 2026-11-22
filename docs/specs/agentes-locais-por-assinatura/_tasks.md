---
schema_version: "compozy.tasks/v2"
workflow: agentes-locais-por-assinatura
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
      to: task_04
    - from: task_02
      to: task_04
    - from: task_02
      to: task_05
    - from: task_02
      to: task_06
    - from: task_03
      to: task_06
    - from: task_04
      to: task_06
    - from: task_05
      to: task_07
    - from: task_06
      to: task_07
---

# Tarefas: Issue Author e Planejamento com a assinatura da máquina

> **Spec:** [spec.md](spec.md) · **Data:** 2026-11-21 · **Total:** 7 tarefas, 27 mini-tarefas, 4 ondas

## Objetivo
Rascunhos e planejamentos rodam no worker do Flow Dev com o Claude Code (e o Codex, se o spike permitir) logado na máquina. Cada projeto escolhe provedor, modelo e esforço por agente, e nenhum código ou variável do Dev_Control sobra.

## Estado
| Tarefa | Tipo | Complexidade | Depende de | Mini-tarefas | Status | Revisão |
|---|---|---|---|---|---|---|
| [01 — Spike V-00: isolamento e saídas reais das CLIs](task_01.md) | test | high | — | 2/2 | completed | [review-003](reviews/review-003.md) |
| [02 — Configuração dos agentes por projeto na API](task_02.md) | backend | medium | — | 4/4 | completed | [review-003](reviews/review-003.md) |
| [03 — Ferramentas de contexto por endpoint MCP em loopback](task_03.md) | backend | high | — | 3/3 | completed | [review-003](reviews/review-003.md) |
| [04 — Runners do Claude Code e do Codex com processo supervisionado](task_04.md) | backend | high | 01, 02 | 5/5 | completed | [review-003](reviews/review-003.md) |
| [05 — Seção Agentes nas Configurações e mensagens novas](task_05.md) | frontend | medium | 02 | 4/4 | completed | [review-003](reviews/review-003.md) |
| [06 — Gateways locais e troca do motor no worker](task_06.md) | backend | high | 02, 03, 04 | 5/5 | completed | [review-003](reviews/review-003.md) |
| [07 — Retirada do Dev_Control, documentos e smoke real](task_07.md) | refactor | medium | 05, 06 | 4/4 | completed | [review-003](reviews/review-003.md) |

**Ondas:**

| Onda | Tarefas | Observação |
|---|---|---|
| 1 | 01, 02, 03 | em paralelo, arquivos disjuntos |
| 2 | 04, 05 | em paralelo; a 04 espera o veredito da 01 |
| 3 | 06 | o MVP: US-01 e US-02 ponta a ponta |
| 4 | 07 | — |

## Como executar (controle)
Veja o progresso e a próxima mini-tarefa liberada a qualquer momento: `python3 -I .claude/skills/spec-to-tasks/scripts/tasks_status.py docs/specs/agentes-locais-por-assinatura`.

1. **Escolha** a próxima tarefa liberada: `pending`, com todas as dependências `completed`.
2. **Implemente** numa sessão nova: "implemente a mini-tarefa 02.1 de `docs/specs/agentes-locais-por-assinatura/task_02.md`" (ou a tarefa inteira). O implementador:
   - muda o `status` para `in_progress`, no arquivo e aqui;
   - marca `[x]` em cada mini-tarefa só depois de rodar o "Pronto quando" dela;
   - anota os comandos e o resultado no "Registro de execução".
3. **Revise:** "revise a 02.1 (ou a task_02) contra a spec" com **spec-conformance**. O veredito vai para `reviews/`, com uma linha em "Revisões" da tarefa.
4. **Feche:** a tarefa só passa a `completed` com todas as mini-tarefas marcadas, os critérios de sucesso comprovados e a última revisão APROVADO ou APROVADO COM RESSALVAS (só achados menores). A revisão final roda com as mini-tarefas marcadas e as tarefas ainda em `in_progress`, e o fechamento vem depois dela. Se a revisão reprovar, a tarefa continua `in_progress`, e o prompt de correção vira a próxima rodada.

Mini-tarefas marcadas `[P]` podem rodar em paralelo com a anterior da mesma tarefa.

## Restrições globais
- **Padrões de código:** aplicar `.agents/rules/code-standards.md`: arquivos `.ts` ≤ 100 linhas, funções ≤ 30 linhas, ≤ 3 parâmetros, sem comentários, sem linhas em branco dentro de funções, constantes nomeadas.
- **Skills a ler antes de codar:**
  - `layered-backend` nas tarefas 02, 03, 04, 06 e 07;
  - `trpc-nextjs` na 02.4;
  - `nextjs-folder-structure` na 05.

  Em `apps/web`, ler também `apps/web/AGENTS.md` e o guia em `node_modules/next/dist/docs/`.
- **Textos de interface:** em pt-BR, com as mensagens exatas da spec (US-01 cen. 3, US-03 cen. 3, REQ-016, REQ-019).
- **Ports intocados:** `IssueAuthorGateway` (`packages/api/src/application/issue-author/issueAuthorGateway.ts`) e `PlanningGateway` (`packages/api/src/application/planning/planningGateway.ts`) não mudam de assinatura.
- **Limites do broker inalterados:** 12 consultas, 300 linhas por leitura, 64 KB por resultado (spec §9).
- **Ambiente do agente:** o processo do agente nunca recebe variáveis do `.env.local` fora da lista de NFR-01.
- **Comandos de teste:**
  - unitário: `pnpm --dir packages/api exec vitest run <arquivo>`;
  - integração: `pnpm --dir packages/api exec vitest run --config vitest.integration.config.ts <arquivo>`, sem `TEST_DATABASE_URL`;
  - web: `pnpm --dir apps/web exec vitest run <arquivo>`.
- **Verificação proporcional:** `typecheck` do pacote alterado ao fim de cada mini-tarefa (`pnpm --dir packages/api typecheck` ou `pnpm --dir apps/web typecheck`). As suítes completas rodam uma vez só, na 07.4.
- **Migration nova:** registrada em `packages/api/drizzle/meta/_journal.json` e em `packages/api/test/databaseMigrations.ts`.
- **Uso da assinatura:** nenhum teste automatizado gasta a assinatura. A CLI real só roda na tarefa 01 e nas checagens manuais de 06.5 e 07.4.

## Premissas e bloqueios
- **Veredito do Codex:** a tarefa 04 só começa com a 01 concluída. Se a 01.2 der "Codex: retirado":
  - a 04.4 retira o Codex do catálogo em vez de criar `codexRunner.ts`;
  - os casos de Codex em 05.3 e 07.4 passam a usar Claude/`opus` (REQ-023);
  - o check `'codex'` do banco fica, porque é inofensivo e evita uma migration.
- **Questões da spec:** Q-01 e Q-02 estão respondidas; não há `[PRECISA ESCLARECER]` na spec.
- **Origem destes arquivos:** substituem o antigo `tasks.md`. As tarefas foram renumeradas na ordem das ondas: a antiga T04 virou a 03, a T03 virou a 04, a T06 virou a 05 e a T05 virou a 06.

## Matriz de cobertura
| ID da spec | Descrição curta | Tarefa · mini-tarefa |
|---|---|---|
| US-01 cen. 1–2 | rascunho e clarificação | 06 · 06.3 |
| US-01 cen. 3–4 | limite de uso; CLI deslogada | 04 · 04.2; 06 · 06.2; 05 · 05.1 |
| US-02 cen. 1–2 | rota citada; citação inválida | 06 · 06.4 |
| US-02 cen. 3 | prazo vencido | 04 · 04.1; 06 · 06.2 |
| US-03 cen. 1–2 | admin salva; membro só lê | 05 · 05.2, 05.3, 05.4 |
| US-03 cen. 3 | conflito de versão | 02 · 02.2, 02.4; 05 · 05.3 |
| US-03 cen. 4 | troca no meio não afeta a tentativa | 06 · 06.3 |
| US-04 cen. 1–2 | sem variáveis do Dev_Control; rota 404 | 07 · 07.2 |
| REQ-001, REQ-003, REQ-004 | Issue Author com configuração fixada e entradas iguais | 06 · 06.3 |
| REQ-002 | Planejamento com configuração | 06 · 06.4 |
| REQ-005 | quatro ferramentas, escopo e registro | 03 · 03.1, 03.2, 03.3 |
| REQ-006, REQ-013 | sem ferramentas nativas nem estado pessoal | 01 · 01.1, 01.2 (prova); 04 · 04.3, 04.4 |
| REQ-007 | fail-closed | 04 · 04.5 |
| REQ-008 | validação pelos contratos | 06 · 06.3, 06.4; 04 · 04.3 |
| REQ-009 | CLI ausente ou deslogada | 04 · 04.2, 04.3; 05 · 05.1 |
| REQ-010 | limite sem troca de provedor | 04 · 04.2; 06 · 06.2; 05 · 05.1 |
| REQ-011, REQ-012 | prazo e cancelamento matam a árvore | 04 · 04.1; 06 · 06.3, 06.4 |
| REQ-014 | seção Agentes | 05 · 05.2, 05.3 |
| REQ-015 | só admin grava | 02 · 02.3, 02.4 |
| REQ-016 | validação de catálogo | 02 · 02.1, 02.3, 02.4 |
| REQ-017 | padrão sem linha | 02 · 02.1, 02.3 |
| REQ-018 | conflito de versão | 02 · 02.2, 02.4 |
| REQ-019 | modelo fora do catálogo | 02 · 02.3; 06 · 06.3, 06.4; 05 · 05.2 |
| REQ-020 | não chamar o Dev_Control | 07 · 07.1, 07.3 |
| REQ-021 | rota interna removida | 07 · 07.2 |
| REQ-022 | planejamento sem configuração externa | 07 · 07.2 |
| REQ-023 | Codex condicionado ao V-00 | 01 · 01.2; 04 · 04.4 |
| NFR-01 | ambiente com lista de permissão | 04 · 04.2 (validado em 01) |
| NFR-02 | prazos reais | 07 · 07.4 |
| NFR-03 | nenhum processo restante | 04 · 04.1, 04.5 |
| B-01, B-02, B-03 | simultâneas; saída inválida; CLI que não encerra | 04 · 04.5, 04.1/04.3, 04.1 |
| B-04 | injeção no texto | 06 · 06.3 |
| B-05 | restart do worker | 04 · 04.5; 06 · 06.5 |
| B-06 | fila antiga | 06 · 06.5 |
| B-07, B-08 | 13ª consulta; capability alheia | 03 · 03.3 |
| B-09 | admin perde o papel | 02 · 02.4 |
| DEC-01, DEC-04 | CLIs headless; isolamento | 01; 04 · 04.3, 04.4 |
| DEC-02 | skills portadas | 06 · 06.1 |
| DEC-03 | endpoint MCP | 03 · 03.3 |
| DEC-05 | tabela por projeto | 02 · 02.2 |
| R-01, R-02 | shell do Codex; CLAUDE.md vazando | 01 · 01.2, 01.1 |
| R-03, R-05 | textos de limite; versão de CLI | 01; 04 · 04.2, 04.5 |
| §19 log `[agents] run` | observabilidade | 06 · 06.3, 06.4 |
| §20 rollout e reversão | ordem das ondas; rollback SQL | 02 · 02.2; 07 |
| V-00a–e / V-00f–j | spike | 01 · 01.1 / 01.2 |
| V-07f, V-08c / V-08d, V-08f, V-08i / V-07a, V-07b, V-08g, V-08j / V-08a, V-08b, V-08e, V-08h, V-08k | configuração | 02 · 02.1 / 02.2 / 02.3 / 02.4 |
| V-06g / V-06e, V-06h / V-06a–d, V-06f, V-06i | endpoint MCP | 03 · 03.1 / 03.2 / 03.3 |
| V-04a–d, V-02c / V-05b, V-03b–d, V-03h / V-05a, V-05c, V-05d, V-02e, V-03a / V-05e / V-03e, V-03i, V-03l, V-04e | runners | 04 · 04.1 / 04.2 / 04.3 / 04.4 / 04.5 |
| V-03f, V-09f, V-09g / V-09b, V-09d / V-09a, V-09c / V-09e | UI | 05 · 05.1 / 05.2 / 05.3 / 05.4 |
| V-01d / V-03g, V-03k / V-01a, V-01b, V-02d, V-07c, V-07d / V-01c, V-02a, V-02b, V-07e / V-10a | gateways e composição | 06 · 06.1 / 06.2 / 06.3 / 06.4 / 06.5 |
| V-10b, V-10c / V-10d / V-11a–c | retirada e smoke | 07 · 07.2 / 07.3 / 07.4 |

## Foco de revisão
1. CLI que escreve a resposta no stdout e depois o erro de limite no stderr, com saída ≠ 0 → o código de saída vence, e a falha é `usage_limit` → V-03h em 04.2.
2. Worker recebe SIGTERM com dois agentes em execução → os dois grupos morrem antes de o processo sair → V-04e em 04.5, chamado por 06.5.
3. Projeto apagado com configuração salva → a linha some por cascade, sem erro na próxima leitura → V-08f em 02.2.
4. Bearer com aspas, espaços ou mais de 128 caracteres → recusado antes do controller, sem log do valor → V-06f em 03.3.
5. Saída do Claude com `structured_output` e um `result` textual divergente → vale só `structured_output` → V-05d em 04.3.

## Revisão final
- 2026-11-22 · review-001 · REPROVADO (0 bloqueantes, 3 importantes, 4 menores) · reviews/review-001.md
- 2026-11-22 · review-002 · REPROVADO (0 bloqueantes, 1 importante, 1 menor) · reviews/review-002.md
- 2026-11-22 · review-003 · APROVADO COM RESSALVAS (0 bloqueantes, 0 importantes, 1 menor) · reviews/review-003.md
