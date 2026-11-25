import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { trpc } from "@/lib/trpc/client";
import { planItemOf, planOf } from "@/test/plan";
import { A, B, OPUS_MAX_INPUT, SCOPE, applyChoice, mountEditor, openSessionTasks, sessionCard, taskChoice } from "@/test/planEditor";

const save = vi.mocked(trpc.tasks.plan.save.mutate);
const placeOfTask = (number: string) => taskChoice(number).closest("li")!;
const TITLES = ["Esquema", "Rotas", "Tela", "Docs"];
const titlesIn = (container: HTMLElement) => TITLES.filter((title) => within(container).queryByText(title));

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

describe("ExecutionPlanEditor choosing the tasks of a session", () => {
  it("V-02a opens with the tasks of the session checked and says where the others are", async () => {
    await mountEditor();
    await openSessionTasks(1);
    expect(screen.getByRole("heading", { name: "Tarefas da Sessão 1" })).toBeTruthy();
    const names = within(screen.getByRole("dialog")).getAllByRole("checkbox").map((box) => (box as HTMLInputElement).labels![0]!.textContent);
    expect(names).toEqual(["01 — Esquema", "02 — Rotas", "03 — Tela", "04 — Docs"]);
    expect(["01", "02", "03", "04"].map((number) => (taskChoice(number) as HTMLInputElement).checked)).toEqual([true, false, true, false]);
    expect(within(placeOfTask("02")).getByText("Está na Sessão 2")).toBeTruthy();
    expect(within(placeOfTask("04")).getByText("Está na Sessão 2")).toBeTruthy();
  });

  it("V-02b applies the choice to the draft only, and sends it when saved", async () => {
    await mountEditor();
    await openSessionTasks(1);
    await userEvent.click(taskChoice("03"));
    await userEvent.click(taskChoice("04"));
    await applyChoice();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(titlesIn(sessionCard(1))).toEqual(["Esquema", "Docs"]);
    expect(titlesIn(sessionCard(2))).toEqual(["Rotas"]);
    expect(titlesIn(screen.getByRole("region", { name: "Sem sessão" }))).toEqual(["Tela"]);
    expect(save).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(save).toHaveBeenCalledOnce();
    expect(save).toHaveBeenCalledWith({ ...SCOPE, version: 3, items: [{ id: A, taskIds: ["task_01", "task_04"], choice: OPUS_MAX_INPUT }, { id: B, taskIds: ["task_02"], choice: OPUS_MAX_INPUT }] });
  });

  it("V-02c removes the session that is left empty, and renumbers the count", async () => {
    await mountEditor();
    await openSessionTasks(2);
    await userEvent.click(taskChoice("02"));
    await userEvent.click(taskChoice("04"));
    await applyChoice();
    expect(screen.getByText("1 sessão")).toBeTruthy();
    const headings = within(screen.getByRole("list", { name: "Sessões do plano" })).getAllByRole("heading", { level: 3 });
    expect(headings.map((heading) => heading.textContent)).toEqual(["Sessão 1"]);
    expect(titlesIn(screen.getByRole("region", { name: "Sem sessão" }))).toEqual(["Rotas", "Docs"]);
  });

  it("V-02d does not offer the choice on a started session and locks its tasks", async () => {
    await mountEditor(planOf([planItemOf(A, ["task_01"], { started: true, state: "running" }), planItemOf(B, ["task_02"])], { unassigned: ["task_03", "task_04"] }));
    expect(within(sessionCard(1)).queryByRole("button", { name: "Escolher tarefas" })).toBeNull();
    await openSessionTasks(2);
    expect((taskChoice("01") as HTMLInputElement).disabled).toBe(true);
    expect(within(placeOfTask("01")).getByText("Sessão 1 · iniciada")).toBeTruthy();
  });

  it("V-02e says Sem sessão for a task that is in no session", async () => {
    await mountEditor(planOf([planItemOf(A, ["task_01", "task_03"]), planItemOf(B, ["task_02"])], { unassigned: ["task_04"] }));
    await openSessionTasks(2);
    expect((taskChoice("04") as HTMLInputElement).checked).toBe(false);
    expect(within(placeOfTask("04")).getByText("Sem sessão")).toBeTruthy();
    expect(within(placeOfTask("01")).getByText("Está na Sessão 1")).toBeTruthy();
  });
});
