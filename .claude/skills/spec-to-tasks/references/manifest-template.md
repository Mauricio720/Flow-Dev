# `_tasks.md` manifest template

The manifest owns the dependency graph and the overall state. Its frontmatter follows Compozy's `compozy.tasks/v2` schema exactly, so Compozy's parser and `compozy tasks validate` accept it.

## Frontmatter rules (Compozy-compatible)

- `schema_version` must be `"compozy.tasks/v2"`.
- `workflow` must match the name of the folder that holds the tasks (the spec's slug).
- `graph.nodes` lists every task exactly once, as `{ id: task_NN, file: task_NN.md }`, with ids zero-padded and sequential.
- `graph.edges` holds dependencies only; each edge means `from` must finish before `to` can start. Use `edges: []` when there are none. The graph has no cycles.
- Dependencies never go in the individual task files.

## Template

Headings are in Portuguese, the user's default; translate them when the spec is in another language.

```markdown
---
schema_version: "compozy.tasks/v2"
workflow: <slug-da-pasta>
graph:
  nodes:
    - id: task_01
      file: task_01.md
    - id: task_02
      file: task_02.md
    - id: task_03
      file: task_03.md
  edges:
    - from: task_01
      to: task_02
    - from: task_01
      to: task_03
---

# Tarefas: <Nome da feature>

> **Spec:** [spec.md](spec.md) · **Data:** AAAA-MM-DD · **Total:** N tarefas, M mini-tarefas

## Objetivo
<Uma frase: o que estará funcionando quando tudo terminar.>

## Estado
<!-- Keep this table in sync with each task file's frontmatter `status`. The implementer updates it when starting and finishing a task. -->
| Tarefa | Tipo | Complexidade | Depende de | Mini-tarefas | Status |
|---|---|---|---|---|---|
| [01 — <título>](task_01.md) | backend | medium | — | 0/3 | pending |
| [02 — <título>](task_02.md) | backend | high | 01 | 0/4 | pending |
| [03 — <título>](task_03.md) | frontend | medium | 01 | 0/3 | pending |

**Podem rodar em paralelo:** 02 e 03, depois de 01 (arquivos disjuntos).

## Como executar (controle)
Veja o progresso e a próxima mini-tarefa liberada a qualquer momento: `python3 -I .claude/skills/spec-to-tasks/scripts/tasks_status.py <esta-pasta>`.

1. **Escolha** a próxima tarefa liberada: `pending`, e todas as de que ela depende estão `completed`.
2. **Implemente** numa sessão nova: "implemente a mini-tarefa 02.1 de `task_02.md`" (ou a tarefa inteira). O implementador:
   - muda o `status` para `in_progress`;
   - marca `[x]` em cada mini-tarefa só depois de rodar o "Pronto quando" dela;
   - anota no "Registro de execução" os comandos e o resultado.
3. **Feche a tarefa:** ela passa a `completed` quando todas as mini-tarefas estão marcadas e os critérios de sucesso foram comprovados por comando. Repita a partir do passo 1 até todas as tarefas estarem `completed`.
4. **Revisão final, uma vez, depois de todas as tarefas:** "revise a feature contra a spec" com **spec-conformance**. Ela revisa tudo de uma vez: requisitos, regras do projeto, testes e o que os registros de execução afirmam. O veredito vai para `reviews/` e para a seção "Revisão final" abaixo.
5. **Se REPROVADO:** o prompt de correção do relatório vira uma rodada de correções; depois, nova revisão final. A feature está pronta quando a revisão final estiver APROVADO (ou APROVADO COM RESSALVAS aceito por você).

## Revisão final
<!-- spec-conformance appends one line per final review, e.g.:
- 2026-11-24 · review-001 · REPROVADO (2 bloqueantes) · reviews/review-001.md
- 2026-11-25 · review-002 · APROVADO · reviews/review-002.md -->

## Restrições globais
<!-- Constraints every task must respect, with exact values, from the spec and the project instructions (file-size limits, forbidden changes, UI language, verification commands). One line each. -->
- …

## Premissas e bloqueios
<!-- Open questions from the spec that affect tasks, and the assumption followed until answered. "Nenhum" if none. -->

## Matriz de cobertura
| ID da spec | Descrição curta | Tarefa · mini-tarefa |
|---|---|---|
| REQ-001 | … | 01 · 01.2 |
| V-01a | … | 01 · 01.1 |
| NFR-01 | … | 03 · 03.2 |

## Foco de revisão
<!-- Up to 5 inputs or failure modes the spec implies but no test exercised; each now has a test in its owning mini-task. -->
1. <entrada/condição> → <comportamento esperado> → teste em 0X.Y
```
