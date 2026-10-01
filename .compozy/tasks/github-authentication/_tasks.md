---
schema_version: "compozy.tasks/v2"
workflow: github-authentication
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
  edges:
    - from: task_01
      to: task_02
    - from: task_01
      to: task_03
    - from: task_02
      to: task_03
    - from: task_03
      to: task_04
    - from: task_02
      to: task_05
    - from: task_03
      to: task_05
    - from: task_04
      to: task_05
---

# GitHub Authentication and Project Access Task List

## Execution Plan

| ID | Task | Type | Complexity | Depends on | Task-required cases |
| --- | --- | --- | --- | --- | ---: |
| task_01 | Persistência PostgreSQL e catálogo durável | infra | high | — | 7 |
| task_02 | Autenticação GitHub e sessões Better Auth | infra | critical | task_01 | 23 |
| task_03 | Autorização tRPC e acesso a projetos | backend | critical | task_01, task_02 | 38 |
| task_04 | Administração e provisionamento | backend | high | task_03 | 40 |
| task_05 | Interface privada e gestão de acesso | frontend | high | task_02, task_03, task_04 | 9 |

## Gate Plan

Os gates abaixo não bloqueiam a conclusão individual de uma tarefa. Executá-los após integrar as superfícies indicadas, com banco PostgreSQL isolado e credenciais GitHub não produtivas quando aplicável.

### Autenticação e sessão

- **Owner:** task_02. **Command:** `pnpm --filter @flow-dev/api test:integration` e `pnpm --filter web test:integration` após integrar OAuth/session bridge.
- **Feature-gate:** IT-005, IT-006, IT-009, IT-010, IT-016, IT-017, IT-019, IT-020, IT-023, IT-025, IT-026, IT-029, IT-030, IT-129.
- **QA/release:** E2E-012, E2E-013 e E2E-015, em staging, com OAuth Apps e contas de teste separadas por ambiente.

### Autorização e catálogo de projetos

- **Owner:** task_03. **Command:** `pnpm --filter @flow-dev/api test:integration` depois das migrações e da troca do catálogo público.
- **Feature-gate:** IT-015, IT-036, IT-040, IT-043, IT-046, IT-049, IT-050, IT-053, IT-055, IT-056, IT-059, IT-060, IT-088, IT-093, IT-096, IT-098, IT-099, IT-100, IT-118, IT-124.

### Administração e provisionamento

- **Owner:** task_04. **Command:** `pnpm --filter @flow-dev/api test:integration` com concorrência e PostgreSQL efêmero.
- **Feature-gate:** IT-063, IT-065, IT-066, IT-067, IT-069, IT-070, IT-073, IT-075, IT-076, IT-079, IT-080, IT-083, IT-085, IT-086, IT-089, IT-090, IT-103, IT-105, IT-106, IT-110, IT-131.

### Jornadas privadas e interface

- **Owner:** task_05. **Command:** `pnpm --filter web test:e2e` com Playwright, fixtures independentes e banco de teste.
- **Feature-gate:** IT-008, IT-018, IT-028, IT-033, IT-035, IT-037, IT-038, IT-039, IT-045, IT-048, IT-095, E2E-001, E2E-002, E2E-003, E2E-004, E2E-005, E2E-006, E2E-007, E2E-008, E2E-009, E2E-010, E2E-011.
- **QA/release:** E2E-014, em desktop e móvel por teclado.

## Completion Rule

Cada tarefa implementa e aprova todos os IDs `task-required` presentes no seu arquivo. Antes de integrar a entrega, executar os checks de escopo aplicáveis e os gates da superfície alterada.
