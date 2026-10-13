import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { trpc } from "@/lib/trpc/client";
import { FLOW_TARGET, optionsOf, overviewOf, planOf, runsOf } from "@/test/taskFlow";
import { UnifiedSpecStage } from "./UnifiedSpecStage";

it("offers the local worktree to its operator and asks the connector to open it", async () => {
  const plan = planOf();
  const overview = overviewOf({ plan: { ...plan, actions: [{ ...plan.actions[0]!, workspace: { kind: "local" } }] } });
  vi.mocked(trpc.taskFlow.byTask.query).mockResolvedValue(overview);
  vi.mocked(trpc.taskFlow.options.query).mockResolvedValue(optionsOf());
  vi.mocked(trpc.taskFlow.runs.query).mockResolvedValue(runsOf());
  vi.mocked(trpc.taskFlow.openLocalWorktree.mutate).mockResolvedValue({ commandId: "11111111-1111-4111-8111-111111111111" });
  render(<UnifiedSpecStage target={FLOW_TARGET} initial={overview} canAct />);
  await userEvent.click(screen.getByRole("button", { name: "Abrir worktree no VS Code" }));
  await waitFor(() => expect(trpc.taskFlow.openLocalWorktree.mutate).toHaveBeenCalledWith(expect.objectContaining(FLOW_TARGET)));
  expect(screen.getByText(/recebe os arquivos .env do projeto vinculado/)).toBeTruthy();
});
