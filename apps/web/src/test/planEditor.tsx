import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { ExecutionPlanEditor } from "@/features/issues/assigned-work/components/ExecutionPlanEditor";
import { trpc } from "@/lib/trpc/client";
import { planItemOf, planOf } from "./plan";
import { P, T, approvedDetail } from "./tasks";
import { setOf, taskOf } from "./taskSet";

export const SCOPE = { projectId: P, taskId: T };
export const SET = setOf([taskOf("01", { title: "Esquema" }), taskOf("02", { title: "Rotas", dependsOn: ["task_01"] }), taskOf("03", { title: "Tela" }), taskOf("04", { title: "Docs" })]);
export const A = "00000000-0000-4000-8000-0000000000e1";
export const B = "00000000-0000-4000-8000-0000000000e2";
export const OPUS_MAX_INPUT = { agent: "claude", model: "opus", effort: "max" };
export const twoSessions = (patch = {}) => planOf([planItemOf(A, ["task_01", "task_03"]), planItemOf(B, ["task_02", "task_04"])], patch);

export async function mountEditor(view = twoSessions(), reader = false, set = SET) {
  vi.mocked(trpc.tasks.plan.get.query).mockResolvedValue(view);
  render(<ExecutionPlanEditor scope={SCOPE} detail={approvedDetail()} set={set} reader={reader} />);
  await act(async () => undefined);
}

export const pickSession = (task: string, session: string) => userEvent.selectOptions(screen.getByLabelText(`Sessão da tarefa ${task}`), session);

export function sessionCard(position: number) {
  const list = screen.getByRole("list", { name: "Sessões do plano" });
  return within(list).getByRole("heading", { level: 3, name: new RegExp(`^Sessão ${position}`) }).closest("li")!;
}

export const openSessionTasks = (position: number) => userEvent.click(within(sessionCard(position)).getByRole("button", { name: "Escolher tarefas" }));
export const taskChoice = (number: string) => within(screen.getByRole("dialog")).getByRole("checkbox", { name: new RegExp(`^${number} — `) });
export const applyChoice = () => userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Aplicar" }));
