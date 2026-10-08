import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CART_PROJECT } from "@/test/tasks";
import { optionsOf, overviewOf } from "@/test/taskFlow";
import { trpc } from "@/lib/trpc/client";
import { FlowStage } from "./FlowStage";
import { SpecInitialProvider, type SpecInitial } from "./specInitialContext";

vi.mock("./SpecStage", () => ({ SpecStage: () => <p>ESTAGIO-LEGADO</p> }));

const SELECTION = { stage: null, packageId: null, documentId: null };

function renderStage(initial: SpecInitial) {
  vi.mocked(trpc.taskFlow.byTask.query).mockResolvedValue(overviewOf());
  vi.mocked(trpc.taskFlow.runs.query).mockResolvedValue({ items: [], nextCursor: null });
  vi.mocked(trpc.taskFlow.options.query).mockResolvedValue(optionsOf());
  return render(<SpecInitialProvider value={initial}><FlowStage project={CART_PROJECT} taskId="t1" decision={null} canAct onFailure={() => undefined} /></SpecInitialProvider>);
}

describe("flow stage discriminator", () => {
  it("IT-104 keeps a legacy split-stage task on its legacy route", () => {
    renderStage({ load: { kind: "none" }, selection: SELECTION, flow: { kind: "ready", overview: overviewOf({ flow: "legacy" }) } });
    expect(screen.getByText("ESTAGIO-LEGADO")).toBeTruthy();
    expect(trpc.taskFlow.runs.query).not.toHaveBeenCalled();
  });

  it("retries a failed initial read and opens the current flow", async () => {
    renderStage({ load: { kind: "none" }, selection: SELECTION, flow: { kind: "failed" } });
    expect(await screen.findByRole("region", { name: "Fluxo CompozyOS da tarefa" })).toBeTruthy();
    expect(screen.queryByText("ESTAGIO-LEGADO")).toBeNull();
  });

  it("shows a retry instead of the legacy action when the flow lookup fails", async () => {
    vi.mocked(trpc.taskFlow.byTask.query).mockRejectedValueOnce(new Error("offline"));
    renderStage({ load: { kind: "none" }, selection: SELECTION, flow: { kind: "failed" } });
    await screen.findByRole("button", { name: "Tentar novamente" });
    expect(screen.queryByText("ESTAGIO-LEGADO")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    await waitFor(() => expect(screen.getByRole("region", { name: "Fluxo CompozyOS da tarefa" })).toBeTruthy());
    expect(screen.queryByRole("button", { name: "Tentar novamente" })).toBeNull();
  });

  it("renders the unified stage for a task with no legacy workflow", async () => {
    renderStage({ load: { kind: "none" }, selection: SELECTION, flow: { kind: "ready", overview: overviewOf({ flow: "none" }) } });
    expect(await screen.findByRole("region", { name: "Fluxo CompozyOS da tarefa" })).toBeTruthy();
    expect(screen.queryByText("ESTAGIO-LEGADO")).toBeNull();
  });
});
