import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { planItemOf, planOf } from "@/test/plan";
import { applyChoice, dragOnto, mountEditor, openSessionTasks, removeFromSession, sessionCard, taskChoice, taskRow, twoSessions } from "@/test/planEditor";

const ALL_TASKS = ["task_01", "task_02", "task_03", "task_04"];
const EMPTY_TEXT = "Sem tarefas. Arraste tarefas para cá ou use Adicionar tarefas.";
const TITLES = ["Esquema", "Rotas", "Tela", "Docs"];
const titlesIn = (container: HTMLElement) => TITLES.filter((title) => within(container).queryByText(title));
const headings = () => within(screen.getByRole("list", { name: "Sessões do plano" })).getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent);
const addSession = () => userEvent.click(screen.getByRole("button", { name: "Nova sessão" }));

beforeEach(() => void vi.useFakeTimers({ shouldAdvanceTime: true }));

describe("ExecutionPlanEditor with sessions as molds", () => {
  it("V-08a creates two empty sessions in Claude Code, Opus and Maximum without opening a dialog", async () => {
    await mountEditor(planOf([], { unassigned: ALL_TASKS }));
    await addSession();
    await addSession();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(headings()).toEqual(["Sessão 1", "Sessão 2"]);
    for (const position of [1, 2]) {
      const card = within(sessionCard(position));
      expect(card.getByText(EMPTY_TEXT)).toBeTruthy();
      expect((card.getByLabelText("Modelo") as HTMLSelectElement).value).toBe("opus");
      expect((card.getByLabelText("Esforço") as HTMLSelectElement).value).toBe("max");
    }
  });

  it("V-08b has no session selector per task", async () => {
    await mountEditor(planOf([planItemOf("a", ["task_01"])], { unassigned: ["task_02", "task_03", "task_04"] }));
    expect(screen.queryByLabelText(/^Sessão da tarefa/)).toBeNull();
    expect(screen.queryAllByRole("combobox").filter((field) => field.getAttribute("aria-label")?.startsWith("Sessão"))).toEqual([]);
  });

  it("V-08c drops a task on a session and adds tasks through Adicionar tarefas, and Sem sessão goes away", async () => {
    await mountEditor(planOf([], { unassigned: ALL_TASKS }));
    await addSession();
    await addSession();
    dragOnto(taskRow(screen.getByRole("region", { name: "Sem sessão" }), "Esquema"), screen.getByRole("listitem", { name: "Sessão 1" }));
    await openSessionTasks(2);
    for (const number of ["02", "03", "04"]) await userEvent.click(taskChoice(number));
    await applyChoice();
    expect([titlesIn(sessionCard(1)), titlesIn(sessionCard(2))]).toEqual([["Esquema"], ["Rotas", "Tela", "Docs"]]);
    expect(screen.queryByRole("region", { name: "Sem sessão" })).toBeNull();
  });

  it("V-08d removes tasks keeping the empty session, and removes a whole session", async () => {
    await mountEditor();
    await removeFromSession(2, "Rotas");
    await removeFromSession(2, "Docs");
    expect(within(sessionCard(2)).getByText(EMPTY_TEXT)).toBeTruthy();
    expect(titlesIn(screen.getByRole("region", { name: "Sem sessão" }))).toEqual(["Rotas", "Docs"]);
    await userEvent.click(within(sessionCard(2)).getByRole("button", { name: "Remover sessão" }));
    expect(headings()).toEqual(["Sessão 1"]);
  });

  it("V-08e reorders by keyboard, disables the moves past the ends and names the drop targets", async () => {
    await mountEditor(twoSessions());
    const firstUp = within(sessionCard(1)).getByRole("button", { name: "Subir" }) as HTMLButtonElement;
    const lastDown = within(sessionCard(2)).getByRole("button", { name: "Descer" }) as HTMLButtonElement;
    expect([firstUp.disabled, lastDown.disabled]).toEqual([true, true]);
    within(sessionCard(1)).getByRole("button", { name: "Descer" }).focus();
    await userEvent.keyboard("{Enter}");
    expect([titlesIn(sessionCard(1)), titlesIn(sessionCard(2))]).toEqual([["Rotas", "Docs"], ["Esquema", "Tela"]]);
    expect(screen.getByRole("listitem", { name: "Sessão 1" })).toBeTruthy();
    await removeFromSession(1, "Rotas");
    expect(screen.getByRole("region", { name: "Sem sessão" })).toBeTruthy();
  });
});
