import { describe, expect, it } from "vitest";
import { planItemOf } from "@/test/plan";
import { taskOf } from "@/test/taskSet";
import { blockedNumbers, forcedNote, launchActionOf, planStateText } from "./planStateModel";

const TASKS = [taskOf("01", { status: "completed" }), taskOf("02", { status: "in_progress" }), taskOf("03")];

describe("planStateModel", () => {
  it("V-40q writes the blocked state with each missing task and its status", () => {
    const item = planItemOf("a", ["task_03"], { state: "blocked", blockedBy: [{ taskId: "task_01", status: "in_progress" }, { taskId: "task_02", status: "pending" }] });
    expect(planStateText(item, TASKS)).toBe("Bloqueada: aguardando 01 (Em andamento), 02 (Pendente)");
    expect(blockedNumbers(item)).toEqual(["01", "02"]);
  });

  it("V-40r writes the other states with text", () => {
    expect(planStateText(planItemOf("a", ["task_01"], { state: "ready" }), TASKS)).toBe("Pronta");
    expect(planStateText(planItemOf("a", ["task_01"], { state: "running" }), TASKS)).toBe("Em execução");
    expect(planStateText(planItemOf("a", ["task_01"], { state: "done" }), TASKS)).toBe("Concluída");
  });

  it("V-40r counts the tasks of an ended session that are not completed, in the singular and the plural", () => {
    expect(planStateText(planItemOf("a", ["task_01", "task_02"], { state: "ended", started: true }), TASKS)).toBe("Encerrada · 1 tarefa não concluída");
    expect(planStateText(planItemOf("a", ["task_02", "task_03"], { state: "ended", started: true }), TASKS)).toBe("Encerrada · 2 tarefas não concluídas");
  });

  it("V-40q writes who started the session with open dependencies, and when", () => {
    expect(forcedNote({ by: "Ana", at: "2026-11-23T15:10:00" })).toBe("Iniciada com dependências abertas por Ana às 15:10");
    expect(forcedNote(null)).toBeNull();
  });

  it("chooses the start action by the state, asking to force when a dependency is open", () => {
    expect(launchActionOf(planItemOf("a", ["task_01"], { state: "ready" }))).toEqual({ label: "Iniciar", force: false });
    expect(launchActionOf(planItemOf("a", ["task_02"], { state: "blocked", blockedBy: [{ taskId: "task_01", status: "pending" }] }))).toEqual({ label: "Iniciar mesmo assim", force: true });
    expect(launchActionOf(planItemOf("a", ["task_02"], { state: "ended" }))).toEqual({ label: "Iniciar de novo", force: false });
    expect(launchActionOf(planItemOf("a", ["task_02"], { state: "ended", blockedBy: [{ taskId: "task_01", status: "pending" }] }))).toEqual({ label: "Iniciar de novo", force: true });
    expect(launchActionOf(planItemOf("a", ["task_01"], { state: "running" }))).toBeNull();
    expect(launchActionOf(planItemOf("a", ["task_01"], { state: "done" }))).toBeNull();
  });
});
