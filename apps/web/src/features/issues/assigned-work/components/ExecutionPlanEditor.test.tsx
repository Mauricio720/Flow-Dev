import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { trpc } from "@/lib/trpc/client";
import { planItemOf, planOf } from "@/test/plan";
import { OPUS_MAX_INPUT, A, B, SCOPE, applyChoice, dragOnto, mountEditor, openSessionTasks, removeFromSession, sessionCard, taskChoice, taskRow, twoSessions } from "@/test/planEditor";
import { terminalRejection } from "@/test/terminal";

const getPlan = vi.mocked(trpc.tasks.plan.get.query);
const save = vi.mocked(trpc.tasks.plan.save.mutate);

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

describe("ExecutionPlanEditor", () => {
  it("V-40o lets the person move tasks with the keyboard and shows the order error of the server", async () => {
    save.mockRejectedValue(terminalRejection("plan_invalid_order", "A tarefa 02 depende da 01, que está numa sessão posterior.", "BAD_REQUEST"));
    await mountEditor();
    await openSessionTasks(2);
    await userEvent.click(taskChoice("01"));
    await applyChoice();
    await openSessionTasks(1);
    await userEvent.click(taskChoice("02"));
    await applyChoice();
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect((await screen.findByRole("alert")).textContent).toBe("A tarefa 02 depende da 01, que está numa sessão posterior.");
    expect(save).toHaveBeenCalledWith({ ...SCOPE, version: 3, items: [{ id: A, taskIds: ["task_02", "task_03"], choice: OPUS_MAX_INPUT, after: [] }, { id: B, taskIds: ["task_01", "task_04"], choice: OPUS_MAX_INPUT, after: [] }] });
  });

  it("V-40o shows the conflict message of the server and reads the plan again", async () => {
    save.mockRejectedValue(terminalRejection("plan_conflict", "O plano mudou em outra aba. Recarregue para continuar.", "CONFLICT"));
    await mountEditor();
    await removeFromSession(1, "Tela");
    const reads = getPlan.mock.calls.length;
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect((await screen.findByRole("alert")).textContent).toBe("O plano mudou em outra aba. Recarregue para continuar.");
    expect(getPlan.mock.calls.length).toBeGreaterThan(reads);
  });

  it("V-40o warns with a status when the tasks changed since the plan was saved", async () => {
    await mountEditor(twoSessions({ stale: true }));
    expect(screen.getByRole("status").textContent).toBe("As tarefas mudaram desde que o plano foi salvo. Revise o plano.");
  });

  it("V-40o lists the tasks that are in no session under Sem sessão, and moves one into a new session", async () => {
    await mountEditor(planOf([planItemOf(A, ["task_01"])], { unassigned: ["task_02", "task_03", "task_04"] }));
    const section = screen.getByRole("region", { name: "Sem sessão" });
    for (const title of ["Rotas", "Tela", "Docs"]) expect(within(section).getByText(title)).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Nova sessão" }));
    dragOnto(taskRow(section, "Tela"), sessionCard(2));
    const cards = within(screen.getByRole("list", { name: "Sessões do plano" })).getAllByRole("heading", { level: 3 });
    expect(cards.map((heading) => heading.textContent)).toEqual(["Sessão 1", "Sessão 2"]);
    expect(screen.queryByRole("region", { name: "Sem sessão" })?.textContent).not.toContain("Tela");
  });
});
