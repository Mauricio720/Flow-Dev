import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { trpc } from "@/lib/trpc/client";
import { OPUS_MAX_INPUT, SCOPE, mountEditor, pickSession } from "@/test/planEditor";
import { planItemOf, planOf } from "@/test/plan";

const save = vi.mocked(trpc.tasks.plan.save.mutate);
const CHANGE = { from: "docs/specs/login", to: "docs/specs/other" };
const NOTICE = "O plano foi montado para as tarefas de docs/specs/login, mas o conjunto de tarefas ativo agora está em docs/specs/other. As sessões já iniciadas continuam no histórico, mas saem do plano.";
const ALL_TASKS = ["task_01", "task_02", "task_03", "task_04"];
const changedPlan = (patch = {}) => planOf([], { folderChange: CHANGE, unassigned: ALL_TASKS, ...patch });

describe("plan of another task folder", () => {
  it("tells which folder changed and lets the operator adopt the new one, saving the empty plan with the version read", async () => {
    save.mockResolvedValue({ version: 4 });
    await mountEditor(changedPlan());
    expect(screen.getByRole("status").textContent).toBe(NOTICE);
    await userEvent.click(screen.getByRole("button", { name: "Usar as tarefas de docs/specs/other" }));
    expect(save).toHaveBeenCalledWith({ ...SCOPE, version: 3, items: [] });
  });

  it("saves what the person already arranged instead of discarding it when adopting the new folder", async () => {
    save.mockResolvedValue({ version: 4 });
    await mountEditor(changedPlan());
    await pickSession("01", "Nova sessão");
    await userEvent.click(screen.getByRole("button", { name: "Usar as tarefas de docs/specs/other" }));
    expect(save).toHaveBeenCalledWith({ ...SCOPE, version: 3, items: [{ taskIds: ["task_01"], choice: OPUS_MAX_INPUT }] });
  });

  it("shows the notice to a person who only reads, without the adopt button", async () => {
    await mountEditor(changedPlan({ canEdit: false }), true);
    expect(screen.getByRole("status").textContent).toBe(NOTICE);
    expect(screen.queryByRole("button", { name: /Usar as tarefas de/ })).toBeNull();
  });

  it("shows no notice when the folder did not change", async () => {
    await mountEditor(planOf([planItemOf("00000000-0000-4000-8000-0000000000e1", ["task_01"])]));
    expect(screen.queryByText(/conjunto de tarefas ativo agora está em/)).toBeNull();
  });
});
