import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { trpc } from "@/lib/trpc/client";
import { planItemOf, planOf } from "@/test/plan";
import { OPUS_MAX_INPUT, A, B, SCOPE, mountEditor, twoSessions } from "@/test/planEditor";

const save = vi.mocked(trpc.tasks.plan.save.mutate);

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

describe("ExecutionPlanEditor shortcuts and read-only", () => {
  it("V-40o applies the shortcuts to the sessions that were not started and saves the whole list", async () => {
    save.mockResolvedValue({ version: 4 });
    await mountEditor(planOf([planItemOf(A, ["task_01"], { started: true, state: "running" }), planItemOf(B, ["task_02"])], { unassigned: ["task_03", "task_04"] }));
    await userEvent.click(screen.getByRole("button", { name: "Todas numa sessão" }));
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(save).toHaveBeenCalledOnce());
    expect(save.mock.calls[0]![0]).toEqual({ ...SCOPE, version: 3, items: [{ id: A, taskIds: ["task_01"], choice: OPUS_MAX_INPUT, after: [] }, { taskIds: ["task_02", "task_03", "task_04"], choice: OPUS_MAX_INPUT, after: [] }] });
  });

  it("applies one choice to every session that was not started from the shortcut", async () => {
    await mountEditor();
    await userEvent.click(screen.getByRole("button", { name: "Mesmo modelo para todas" }));
    const group = screen.getByRole("group", { name: "Atalhos do plano" });
    await userEvent.selectOptions(within(group).getByLabelText("Modelo"), "haiku");
    await userEvent.selectOptions(within(group).getByLabelText("Esforço"), "medium");
    await userEvent.click(within(group).getByRole("button", { name: "Aplicar" }));
    for (const model of screen.getAllByLabelText("Modelo").filter((field) => !group.contains(field))) expect((model as HTMLSelectElement).value).toBe("haiku");
  });

  it("V-40p shows the plan read-only without edit, with no selector, shortcut, save or start button", async () => {
    await mountEditor(planOf([planItemOf(A, ["task_01"]), planItemOf(B, ["task_02"], { state: "blocked", blockedBy: [{ taskId: "task_01", status: "pending" }] })], { canEdit: false }));
    expect(screen.getByText("Sessão 1")).toBeTruthy();
    expect(screen.getAllByText("Claude Code · Opus · Máximo")).toHaveLength(2);
    expect(screen.getByText("Esquema")).toBeTruthy();
    expect(screen.queryAllByRole("combobox")).toHaveLength(0);
    expect(screen.queryByRole("group", { name: "Atalhos do plano" })).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("V-40p keeps the plan read-only for a person who only follows the work, even if the server said canEdit", async () => {
    await mountEditor(twoSessions(), true);
    expect(screen.queryByRole("button", { name: "Salvar" })).toBeNull();
    expect(screen.queryAllByRole("combobox")).toHaveLength(0);
  });

  it("B-42 keeps the agent editable in the plan when a session was saved with an agent that is not available", async () => {
    const codex = { agent: "codex", model: "gpt-6.1-sol", effort: "high" } as const;
    await mountEditor(planOf([planItemOf(A, ["task_01"], { choice: codex })]));
    const agent = screen.getByLabelText("Agente") as HTMLSelectElement;
    expect(agent.value).toBe("codex");
    expect((screen.getByRole("option", { name: "Claude Code" }) as HTMLOptionElement).disabled).toBe(false);
    await userEvent.selectOptions(agent, "claude");
    expect((screen.getByRole("button", { name: "Salvar" }) as HTMLButtonElement).disabled).toBe(false);
  });
});
