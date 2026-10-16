import { describe, expect, it } from "vitest";
import { readPackage } from "../packageReader";
import { tasksOverview } from "./taskOverview";

const MANIFEST = `---
schema_version: "compozy.tasks/v2"
graph:
  nodes:
    - id: task_01
      file: task_01.md
    - id: task_02
      file: task_02.md
  edges:
    - from: task_01
      to: task_02
---

# Grafo de tarefas

## Resultado da entrega

A jornada em \`/planos\` terá etapas visíveis.

## Cobertura e decisões pendentes

Cada ID de \`_tests.md\` possui um único dono.
`;

const taskFile = (number: number, outcome: string) => `---
status: pending
title: "Task ${number}: Tarefa número ${number}"
type: backend
complexity: high
---

# Task ${number}: Tarefa número ${number}

## Resultado entregável

- ${outcome}
- Verificar nesta tarefa: testes.
`;

function overviewOf(manifest = MANIFEST) {
  return tasksOverview(readPackage({ documents: [{ path: "_tasks.md", role: "tasks_manifest", sourceText: manifest }, { path: "task_02.md", role: "task", sourceText: taskFile(2, "Outcome: resultados tipados.") }, { path: "task_01.md", role: "task", sourceText: taskFile(1, "Resultado: ranks persistidos.") }] } as never));
}

describe("tasksOverview", () => {
  it("orders tasks, reads their outcome and dependencies from the declared graph", () => {
    const overview = overviewOf();
    expect(overview.graphKnown).toBe(true);
    expect(overview.tasks.map((task) => [task.number, task.title, task.meta, task.dependsOn, task.detail])).toEqual([
      [1, "Tarefa número 1", ["backend", "complexidade alta"], [], ["ranks persistidos."]],
      [2, "Tarefa número 2", ["backend", "complexidade alta"], [1], ["resultados tipados."]],
    ]);
    expect(overview.tasks[1]!.source).toMatchObject({ tabId: "task", documentId: "task_02.md", label: "Tarefas › Tarefa número 2" });
  });

  it("keeps the manifest outcome and coverage note with their sources", () => {
    const overview = overviewOf();
    expect(overview.outcome).toMatchObject({ text: "A jornada em `/planos` terá etapas visíveis.", source: { label: "Plano de tarefas › Resultado da entrega" } });
    expect(overview.coverage?.text).toBe("Cada ID de `_tests.md` possui um único dono.");
  });

  it("reports an unknown graph instead of claiming tasks are independent", () => {
    const overview = overviewOf("# Tarefas\n\nSem grafo.");
    expect(overview.graphKnown).toBe(false);
    expect(overview.tasks.every((task) => task.dependsOn.length === 0)).toBe(true);
    expect(overview.outcome).toBeNull();
  });
});
