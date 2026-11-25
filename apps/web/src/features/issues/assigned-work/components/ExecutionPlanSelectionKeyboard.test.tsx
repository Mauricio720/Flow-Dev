import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { trpc } from "@/lib/trpc/client";
import { setOf, taskOf } from "@/test/taskSet";
import { terminalRejection } from "@/test/terminal";
import { A, B, OPUS_MAX_INPUT, SCOPE, applyChoice, mountEditor, openSessionTasks, sessionCard, taskChoice, twoSessions } from "@/test/planEditor";

const save = vi.mocked(trpc.tasks.plan.save.mutate);
const TITLES = ["Esquema", "Rotas", "Tela", "Docs"];
const titlesIn = (container: HTMLElement) => TITLES.filter((title) => within(container).queryByText(title));
const chooseButton = (position: number) => within(sessionCard(position)).getByRole("button", { name: "Escolher tarefas" });
const chooseControls = () => screen.queryAllByRole("button", { name: /^(Escolher tarefas|Nova sessão)$/ });
const saveButton = () => screen.getByRole("button", { name: "Salvar" }) as HTMLButtonElement;

async function tabUntil(target: HTMLElement) {
  for (let presses = 0; presses < 40 && document.activeElement !== target; presses += 1) await userEvent.tab();
  expect(document.activeElement).toBe(target);
}

beforeEach(() => void vi.useFakeTimers({ shouldAdvanceTime: true }));

describe("ExecutionPlanEditor task choice by keyboard, cancel and read only", () => {
  it("V-02h lets the person check and uncheck with Space and close with Escape, returning the focus to Escolher tarefas", async () => {
    await mountEditor();
    await tabUntil(chooseButton(1));
    await userEvent.keyboard(" ");
    await userEvent.tab();
    await userEvent.tab();
    expect(document.activeElement).toBe(taskChoice("02"));
    await userEvent.keyboard(" ");
    expect((taskChoice("02") as HTMLInputElement).checked).toBe(true);
    await userEvent.keyboard(" ");
    expect((taskChoice("02") as HTMLInputElement).checked).toBe(false);
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(titlesIn(sessionCard(1))).toEqual(["Esquema", "Tela"]);
    await waitFor(() => expect(document.activeElement).toBe(chooseButton(1)));
    expect(saveButton().disabled).toBe(true);
  });

  it("V-02i closes with Cancelar without changing the draft, and the focus goes back to Nova sessão", async () => {
    await mountEditor();
    const trigger = screen.getByRole("button", { name: "Nova sessão" });
    await userEvent.click(trigger);
    await userEvent.click(taskChoice("03"));
    await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect([titlesIn(sessionCard(1)), titlesIn(sessionCard(2))]).toEqual([["Esquema", "Tela"], ["Rotas", "Docs"]]);
    await waitFor(() => expect(document.activeElement).toBe(trigger));
    expect(saveButton().disabled).toBe(true);
  });

  it("V-02j shows the message of the server when the order chosen in the dialogs is refused", async () => {
    save.mockRejectedValue(terminalRejection("plan_invalid_order", "A tarefa 02 depende da 01, que está numa sessão posterior.", "BAD_REQUEST"));
    await mountEditor();
    await openSessionTasks(1);
    await userEvent.click(taskChoice("01"));
    await userEvent.click(taskChoice("02"));
    await applyChoice();
    await openSessionTasks(2);
    await userEvent.click(taskChoice("01"));
    await applyChoice();
    await userEvent.click(saveButton());
    expect((await screen.findByRole("alert")).textContent).toBe("A tarefa 02 depende da 01, que está numa sessão posterior.");
    expect(save).toHaveBeenCalledWith({ ...SCOPE, version: 3, items: [{ id: A, taskIds: ["task_02", "task_03"], choice: OPUS_MAX_INPUT }, { id: B, taskIds: ["task_01", "task_04"], choice: OPUS_MAX_INPUT }] });
  });

  it("V-02k offers no way to choose tasks to someone who only reads", async () => {
    await mountEditor(twoSessions(), true);
    expect(chooseControls()).toEqual([]);
  });

  it("V-02k offers no way to choose tasks when the plan cannot be edited", async () => {
    await mountEditor(twoSessions({ canEdit: false }));
    expect(chooseControls()).toEqual([]);
  });

  it("V-02l keeps a completed task enabled, and it can be taken into another session", async () => {
    const set = setOf([taskOf("01", { title: "Esquema" }), taskOf("02", { title: "Rotas" }), taskOf("03", { title: "Tela", status: "completed" }), taskOf("04", { title: "Docs" })]);
    await mountEditor(twoSessions(), false, set);
    await openSessionTasks(2);
    expect((taskChoice("03") as HTMLInputElement).disabled).toBe(false);
    await userEvent.click(taskChoice("03"));
    await applyChoice();
    expect(titlesIn(sessionCard(2))).toEqual(["Rotas", "Tela", "Docs"]);
  });

  it("V-02m keeps Tab inside the dialog instead of reaching the session selects of the plan", async () => {
    await mountEditor();
    await openSessionTasks(1);
    const dialog = screen.getByRole("dialog");
    await tabUntil(within(dialog).getByRole("button", { name: "Aplicar" }));
    await userEvent.tab();
    expect(document.activeElement).toBe(taskChoice("01"));
    expect(document.activeElement!.closest("dialog")).toBe(dialog);
  });
});
