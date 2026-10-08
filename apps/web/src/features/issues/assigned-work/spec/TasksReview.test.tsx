import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { documentOf, packageOf } from "@/test/spec";
import { TasksReview } from "./TasksReview";

const encoder = new TextEncoder();
const TASK = "# Task 01: Gerar CSV\n\n## Overview\n\nImplementa ExportService.\n\n## Tests\n\n- [ ] UT-001 — ExportService.\n";
const range = (text: string) => ({ startByte: encoder.encode(TASK.slice(0, TASK.indexOf(text))).length, endByte: encoder.encode(TASK).length });
const task = (id: string, path = `${id}.md`, dependsOn: string[] = [], testIds = ["UT-001"]) => ({ id, title: `Gerar ${id}`, path, dependsOn, testIds, scope: range("## Overview"), acceptance: range("## Tests") });
const view = (tasks: ReturnType<typeof task>[], diagnostics: unknown[] = []) => render(<TasksReview detail={packageOf({ stage: "tasks", diagnostics, relations: { stories: [], tests: [], tasks } as never })} documents={[documentOf("_tasks.md", "# Tasks\n"), ...tasks.slice(0, 20).map((item) => documentOf(item.path, TASK))]} />);

describe("TasksReview", () => {
  it("UT-051 shows full scope and validation ownership for a pending task", () => {
    view([task("task_01")]);
    const list = screen.getByRole("list", { name: "Tarefas" });
    expect(list.textContent).toContain("Implementa ExportService.");
    expect(list.textContent).toContain("Validação atribuída: UT-001");
    expect(list.textContent).toContain("Depende de: nenhuma tarefa");
  });

  it("UT-052 shows missing_dependency instead of presenting a valid graph", () => {
    view([task("task_01", "task_01.md", ["task_99"])], [{ code: "missing_dependency", severity: "blocking", documentId: null, blockId: null, message: "task_01 depende de task_99, que não existe" }]);
    expect(screen.getAllByRole("alert").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("O grafo de dependências não é válido.")).toBeTruthy();
    expect(document.body.textContent).toContain("task_99");
  });

  it("IT-080 pages through a 200-task list so every task is reachable without the graph", () => {
    const tasks = Array.from({ length: 200 }, (_, index) => task(`task_${String(index + 1).padStart(3, "0")}`));
    view(tasks);
    expect(screen.getAllByRole("heading", { level: 4 })).toHaveLength(10);
    for (let page = 0; page < 19; page += 1) fireEvent.click(screen.getByRole("button", { name: "Próxima" }));
    expect(screen.getByText(/task_200/)).toBeTruthy();
    expect((screen.getByRole("button", { name: "Próxima" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("shows an incomplete state when the manifest is absent", () => {
    render(<TasksReview detail={packageOf({ stage: "tasks" })} documents={[]} />);
    expect(screen.getByRole("alert").textContent).toContain("Pacote incompleto");
  });
});
