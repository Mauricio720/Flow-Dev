import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { trpc } from "@/lib/trpc/client";
import { planItemOf, planOf } from "@/test/plan";
import { P, T, approvedDetail } from "@/test/tasks";
import { setOf, taskOf } from "@/test/taskSet";
import { OPUS_MAX, preflightOf } from "@/test/terminal";
import { ExecutionPlanEditor } from "./ExecutionPlanEditor";

const getPlan = vi.mocked(trpc.tasks.plan.get.query);
const preflight = vi.mocked(trpc.tasks.terminal.preflight.query);
const open = vi.mocked(trpc.tasks.terminal.open.mutate);
const SCOPE = { projectId: P, taskId: T };
const ITEM = "00000000-0000-4000-8000-0000000000e1";
const SET = setOf([taskOf("01", { status: "in_progress" }), taskOf("02", { dependsOn: ["task_01"] }), taskOf("03", { status: "completed" })]);

async function mount(view: ReturnType<typeof planOf>, props: { reader?: boolean; onConversation?: (id: string) => void } = {}) {
  getPlan.mockResolvedValue(view);
  render(<ExecutionPlanEditor scope={SCOPE} detail={approvedDetail()} set={SET} reader={props.reader ?? false} onConversation={props.onConversation} />);
  await act(async () => undefined);
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  preflight.mockResolvedValue(preflightOf({ prompt: "Implemente a tarefa", choice: OPUS_MAX }));
  open.mockResolvedValue({ sessionId: "s1", unavailableIssueImages: 0 });
});

describe("PlanSessionCard states and start", () => {
  it("V-40q announces the blocked session with the missing task, asks to confirm and opens the dialog forcing the start", async () => {
    await mount(planOf([planItemOf(ITEM, ["task_02"], { state: "blocked", blockedBy: [{ taskId: "task_01", status: "in_progress" }] })]));
    expect(screen.getByRole("status").textContent).toBe("Bloqueada: aguardando 01 (Em andamento)");
    await userEvent.click(screen.getByRole("button", { name: "Iniciar mesmo assim" }));
    expect(screen.getByRole("alert").textContent).toContain("A sessão depende de tarefas ou sessões não concluídas: 01. Iniciar mesmo assim?");
    await userEvent.click(within(screen.getByRole("alert")).getByRole("button", { name: "Iniciar mesmo assim" }));
    const dialog = await screen.findByRole("dialog", { name: "Iniciar a sessão do plano" });
    await within(dialog).findByLabelText("Prompt");
    await userEvent.click(within(dialog).getByRole("button", { name: "Iniciar sessão" }));
    await waitFor(() => expect(open).toHaveBeenCalledOnce());
    expect(open.mock.calls[0]![0].purpose).toEqual({ kind: "plan_item", planItemId: ITEM, force: true });
  });

  it("V-40q does not open the dialog when the person cancels the confirmation", async () => {
    await mount(planOf([planItemOf(ITEM, ["task_02"], { state: "blocked", blockedBy: [{ taskId: "task_01", status: "in_progress" }] })]));
    await userEvent.click(screen.getByRole("button", { name: "Iniciar mesmo assim" }));
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("button", { name: "Iniciar mesmo assim" })).toBeTruthy();
    expect(preflight).not.toHaveBeenCalled();
  });

  it("V-40q writes who started with open dependencies, and when, once the session started", async () => {
    await mount(planOf([planItemOf(ITEM, ["task_02"], { state: "running", started: true, forced: { by: "Ana", at: "2026-11-23T15:10:00" } })]));
    expect(screen.getByText("Iniciada com dependências abertas por Ana às 15:10")).toBeTruthy();
  });

  it("V-40r shows an ended session with its open tasks and Iniciar de novo, which opens the same item without force", async () => {
    await mount(planOf([planItemOf(ITEM, ["task_01", "task_03"], { state: "ended", started: true, latestSessionId: "s9" })]));
    expect(screen.getByText("Encerrada · 1 tarefa não concluída")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Iniciar de novo" }));
    await screen.findByRole("dialog", { name: "Iniciar a sessão do plano" });
    expect(preflight).toHaveBeenCalledWith({ ...SCOPE, purpose: { kind: "plan_item", planItemId: ITEM } });
  });

  it("V-40r shows the running session with the link to the conversation and without a start button", async () => {
    const onConversation = vi.fn();
    await mount(planOf([planItemOf(ITEM, ["task_01"], { state: "running", started: true, latestSessionId: "s9" })]), { onConversation });
    expect(screen.getByText("Em execução")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^Iniciar/ })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Ver a conversa" }));
    expect(onConversation).toHaveBeenCalledWith("s9");
  });

  it("V-40r shows a ready session with Iniciar and a completed one without it", async () => {
    await mount(planOf([planItemOf(ITEM, ["task_01"], { state: "ready" }), planItemOf("00000000-0000-4000-8000-0000000000e2", ["task_03"], { state: "done", started: true })]));
    expect(screen.getByText("Pronta")).toBeTruthy();
    expect(screen.getByText("Concluída")).toBeTruthy();
    expect(screen.getAllByRole("button", { name: /^Iniciar/ })).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Iniciar" })).toBeTruthy();
  });

  it("shows the states to a person who only reads, without any start button", async () => {
    await mount(planOf([planItemOf(ITEM, ["task_01"], { state: "ready" })], { canEdit: false }));
    expect(screen.getByText("Pronta")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^Iniciar/ })).toBeNull();
  });
});
