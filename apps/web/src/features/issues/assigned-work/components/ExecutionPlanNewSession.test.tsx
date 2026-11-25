import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { trpc } from "@/lib/trpc/client";
import { planOf } from "@/test/plan";
import { A, B, OPUS_MAX_INPUT, SCOPE, mountEditor, sessionCard, taskChoice, twoSessions } from "@/test/planEditor";

const save = vi.mocked(trpc.tasks.plan.save.mutate);
const ALL_TASKS = ["task_01", "task_02", "task_03", "task_04"];
const TITLES = ["Esquema", "Rotas", "Tela", "Docs"];
const titlesIn = (container: HTMLElement) => TITLES.filter((title) => within(container).queryByText(title));
const openNewSession = () => userEvent.click(screen.getByRole("button", { name: "Nova sessão" }));
const createSession = () => userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Criar sessão" }));
const createButton = () => within(screen.getByRole("dialog")).getByRole("button", { name: "Criar sessão" }) as HTMLButtonElement;

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

describe("ExecutionPlanEditor creating a session with chosen tasks", () => {
  it("V-02f creates the first session in Claude Code, Opus and Maximum, and only enables Criar sessão once a task is checked", async () => {
    await mountEditor(planOf([], { unassigned: ALL_TASKS }));
    await openNewSession();
    expect(screen.getByRole("heading", { name: "Tarefas da nova sessão" })).toBeTruthy();
    expect(within(screen.getByRole("dialog")).getAllByRole("checkbox").map((box) => (box as HTMLInputElement).checked)).toEqual([false, false, false, false]);
    expect(createButton().disabled).toBe(true);
    await userEvent.click(taskChoice("01"));
    await userEvent.click(taskChoice("02"));
    expect(createButton().disabled).toBe(false);
    await createSession();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(titlesIn(sessionCard(1))).toEqual(["Esquema", "Rotas"]);
    const card = within(sessionCard(1));
    expect((card.getByLabelText("Agente") as HTMLSelectElement).selectedOptions[0]!.text).toBe("Claude Code");
    expect((card.getByLabelText("Modelo") as HTMLSelectElement).value).toBe("opus");
    expect((card.getByLabelText("Esforço") as HTMLSelectElement).value).toBe("max");
    expect(titlesIn(screen.getByRole("region", { name: "Sem sessão" }))).toEqual(["Tela", "Docs"]);
  });

  it("V-02g takes the task from where it was, adds the session last, and sends the new session without an id", async () => {
    await mountEditor(twoSessions());
    await openNewSession();
    await userEvent.click(taskChoice("03"));
    await createSession();
    expect(screen.getByText("3 sessões")).toBeTruthy();
    expect([titlesIn(sessionCard(1)), titlesIn(sessionCard(2)), titlesIn(sessionCard(3))]).toEqual([["Esquema"], ["Rotas", "Docs"], ["Tela"]]);
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(save).toHaveBeenCalledWith({ ...SCOPE, version: 3, items: [{ id: A, taskIds: ["task_01"], choice: OPUS_MAX_INPUT }, { id: B, taskIds: ["task_02", "task_04"], choice: OPUS_MAX_INPUT }, { taskIds: ["task_03"], choice: OPUS_MAX_INPUT }] });
  });
});
