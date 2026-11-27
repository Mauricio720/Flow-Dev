import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { planItemOf, planOf } from "@/test/plan";
import { mountEditor, sessionCard } from "@/test/planEditor";
import { setOf, taskOf } from "@/test/taskSet";

const A = "00000000-0000-4000-8000-0000000000e1";
const B = "00000000-0000-4000-8000-0000000000e2";
const C = "00000000-0000-4000-8000-0000000000e3";
const FLAT = setOf([taskOf("01", { title: "Esquema" }), taskOf("02", { title: "Rotas" }), taskOf("03", { title: "Tela" })]);
const three = (patch = {}) => planOf([planItemOf(A, ["task_01"]), planItemOf(B, ["task_02"]), planItemOf(C, ["task_03"])], patch);

beforeEach(() => void vi.useFakeTimers({ shouldAdvanceTime: true }));

describe("PlanSessionConditions", () => {
  it("V-08f offers earlier sessions only, unchecked, and shows the condition once checked", async () => {
    await mountEditor(three(), false, FLAT);
    expect(within(sessionCard(1)).queryByRole("group", { name: "Começa depois de" })).toBeNull();
    const group = within(sessionCard(3)).getByRole("group", { name: "Começa depois de" });
    const boxes = within(group).getAllByRole("checkbox") as HTMLInputElement[];
    expect(boxes.map((box) => [box.labels![0]!.textContent, box.checked])).toEqual([["Sessão 1", false], ["Sessão 2", false]]);
    await userEvent.click(within(group).getByRole("checkbox", { name: "Sessão 1" }));
    expect(within(sessionCard(3)).getByText("Começa depois de: Sessão 1")).toBeTruthy();
  });

  it("V-08g shows the tasks a session waits for and where they are, including tasks in no session", async () => {
    const set = setOf([taskOf("01", { title: "Esquema" }), taskOf("02", { title: "Rotas", dependsOn: ["task_01"] }), taskOf("03", { title: "Tela", dependsOn: ["task_01", "task_04"] }), taskOf("04", { title: "Docs" }), taskOf("05", { title: "Testes", dependsOn: ["task_06"] }), taskOf("06", { title: "Base" })]);
    const plan = planOf([planItemOf(A, ["task_01"]), planItemOf(B, ["task_02", "task_04"]), planItemOf(C, ["task_03", "task_05"])], { unassigned: ["task_06"] });
    await mountEditor(plan, false, set);
    expect(within(sessionCard(2)).getByText("Aguarda a tarefa 01 (Sessão 1)")).toBeTruthy();
    expect(within(sessionCard(3)).getByText("Aguarda as tarefas 01, 04, 06 (Sessões 1 e 2 e sem sessão)")).toBeTruthy();
  });

  it("V-08h shows a saved session blocked by an earlier session", async () => {
    await mountEditor(planOf([planItemOf(A, ["task_01"]), planItemOf(B, ["task_02"], { state: "blocked", after: [A], waitingSessions: [A] })]), false, FLAT);
    expect(within(sessionCard(2)).getByText("Bloqueada: aguardando Sessão 1")).toBeTruthy();
    expect(within(sessionCard(2)).getByText("Começa depois de: Sessão 1")).toBeTruthy();
  });

  it("V-08i shows a saved empty session as Sem tarefas without a start button", async () => {
    await mountEditor(planOf([planItemOf(A, [], { state: "empty" })]), false, FLAT);
    expect(within(sessionCard(1)).getByText("Sem tarefas")).toBeTruthy();
    expect(within(sessionCard(1)).queryByRole("button", { name: /^Iniciar/ })).toBeNull();
  });

  it("V-08j lists the waiting tasks and sessions in the confirmation of Iniciar mesmo assim", async () => {
    const item = planItemOf(C, ["task_03"], { state: "blocked", blockedBy: [{ taskId: "task_01", status: "pending" }], after: [A], waitingSessions: [A] });
    await mountEditor(planOf([planItemOf(A, ["task_02"]), planItemOf(B, ["task_01"]), item]), false, FLAT);
    await userEvent.click(within(sessionCard(3)).getByRole("button", { name: "Iniciar mesmo assim" }));
    expect(screen.getByRole("alert").textContent).toContain("A sessão depende de tarefas ou sessões não concluídas: 01, Sessão 1. Iniciar mesmo assim?");
  });

  it("V-08k lets a member read the conditions without any edit control or draggable row", async () => {
    await mountEditor(planOf([planItemOf(A, ["task_01"]), planItemOf(B, ["task_02"], { state: "blocked", after: [A], waitingSessions: [A] })], { canEdit: false }), false, FLAT);
    expect(within(sessionCard(2)).getByText("Começa depois de: Sessão 1")).toBeTruthy();
    expect(screen.queryByRole("group", { name: "Começa depois de" })).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
    expect(document.querySelectorAll('[draggable="true"]')).toHaveLength(0);
  });
});
