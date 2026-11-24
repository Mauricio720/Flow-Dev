import { describe, expect, it } from "vitest";
import { setOf, specOf, taskOf, viewOf } from "@/test/taskSet";
import { tasksTabState } from "./stageTabs";
import { allTasksCompleted, dependencyText, hasTasksTab, specsOfFolderFirst, taskRowLabel } from "./taskSetModel";

describe("taskSetModel", () => {
  it("V-40b writes the row as the spec words it, with the dependencies as numbers", () => {
    expect(taskRowLabel(taskOf("01", { title: "Esquema e DAO" }))).toBe("01 — Esquema e DAO · backend · medium · depende de — · 0/3 · Pendente");
    expect(taskRowLabel(taskOf("03", { dependsOn: ["task_01", "task_02"], status: "in_progress", miniDone: 1, miniTotal: 4 }))).toBe("03 — Tarefa 03 · backend · medium · depende de 01, 02 · 1/4 · Em andamento");
    expect(dependencyText({ dependsOn: ["task_07"] })).toBe("depende de 07");
  });

  it("V-40d shows a task without a captured file as unknown, naming that the file is missing", () => {
    const label = taskRowLabel(taskOf("03", { artifactId: null, path: null, title: null, type: null, complexity: null, status: "unknown", miniTotal: 0 }));
    expect(label).toBe("03 — Arquivo da tarefa não capturado · depende de — · 0/0 · Desconhecido");
  });

  it("falls back to a neutral title for a captured file without one", () => {
    expect(taskRowLabel(taskOf("02", { title: null }))).toContain("02 — Sem título");
  });

  it("V-40a shows the tab with a spec or a set, and hides it when there is neither", () => {
    expect(hasTasksTab(viewOf(null))).toBe(true);
    expect(hasTasksTab(viewOf(setOf([taskOf("01")]), []))).toBe(true);
    expect(hasTasksTab(viewOf(null, []))).toBe(false);
    expect(hasTasksTab(null)).toBe(false);
  });

  it("V-40f states the tab as pending with only a spec, current with a set, and done when every task is completed", () => {
    expect(tasksTabState(viewOf(null))).toBe("pending");
    expect(tasksTabState(viewOf(setOf([taskOf("01", { status: "completed" }), taskOf("02")])))).toBe("current");
    expect(tasksTabState(viewOf(setOf([taskOf("01", { status: "completed" }), taskOf("02", { status: "completed" })])))).toBe("done");
  });

  it("does not call a set with an unreadable manifest done, nor an empty list of tasks", () => {
    expect(tasksTabState(viewOf(setOf([], { problem: "o grafo de tarefas está ausente" })))).toBe("current");
    expect(allTasksCompleted(setOf([]))).toBe(false);
  });

  it("puts the spec of the set folder first and keeps the rest in their order", () => {
    const other = specOf("docs/specs/b/spec.md");
    const own = specOf("docs/specs/a/spec.md");
    const third = specOf("docs/specs/c/spec.md");
    expect(specsOfFolderFirst([other, third, own], "docs/specs/a")).toEqual([own, other, third]);
    expect(specsOfFolderFirst([other, third], "docs/specs/a")).toEqual([other, third]);
    expect(specsOfFolderFirst([other, specOf("spec.md")], "").map((spec) => spec.path)).toEqual(["spec.md", "docs/specs/b/spec.md"]);
  });
});
