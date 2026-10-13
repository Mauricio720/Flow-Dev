import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { trpc } from "@/lib/trpc/client";
import { FLOW_TARGET, connectionOf, optionsOf, overviewOf, packageOf, planOf, runOf, runsOf } from "@/test/taskFlow";
import { flowStages } from "./flowStages";
import { LOCAL_REQUIRED_NOTICE } from "./pullRequestOffer";
import { UnifiedSpecStage } from "./UnifiedSpecStage";
import type { FlowOverview } from "./unifiedContract";

const flow = trpc.taskFlow;
const APPROVED_AT = "2026-10-06T12:00:00.000Z";
const machine = connectionOf({ executionTarget: "machine", machineId: "m1" });
const localOptions = optionsOf({ connections: [machine], workspaces: [{ kind: "isolated" }, { kind: "local" }] });
const tasks = packageOf({ id: "k2", version: 2, format: "os_tasks_v1", status: "approved", approvedAt: APPROVED_AT });
const base = planOf("succeeded").actions[0]!;

type StepOverrides = { state?: string; workspace?: { kind: string }; concludedAt?: string | null };

function loop(loopName: string, position: number, overrides: StepOverrides = {}) {
  return { ...base, id: loopName, position, kind: "loop", loopName, loopVersion: "1", inputs: {}, workspace: { kind: "local" }, state: "succeeded", ...overrides };
}

function publication(state: string) {
  return { ...base, id: "publish", position: 3, kind: "open_pull_request", workspace: { kind: "local" }, state };
}

function reviewedOverview(...extra: unknown[]): FlowOverview {
  const actions = [loop("implement-tasks", 1), loop("review-and-fix", 2), ...extra];
  return overviewOf({ plan: { ...planOf("succeeded"), actions } as never, packages: [tasks] });
}

function renderFlow(overview: FlowOverview, runs = runsOf()) {
  vi.mocked(flow.byTask.query).mockResolvedValue(overview);
  vi.mocked(flow.options.query).mockResolvedValue(localOptions);
  vi.mocked(flow.runs.query).mockResolvedValue(runs);
  return render(<UnifiedSpecStage target={FLOW_TARGET} initial={overview} canAct />);
}

const publicationStage = (overview: FlowOverview) => flowStages(overview).at(-1);

describe("pull request stage", () => {
  it("follows the publication action once a clean Review released it", () => {
    expect(publicationStage(reviewedOverview())).toEqual({ key: "pull_request", state: "yours" });
    expect(publicationStage(reviewedOverview(publication("planned")))).toEqual({ key: "pull_request", state: "yours" });
    expect(publicationStage(reviewedOverview(publication("running")))).toEqual({ key: "pull_request", state: "current" });
    expect(publicationStage(reviewedOverview(publication("blocked")))).toEqual({ key: "pull_request", state: "failed" });
    expect(publicationStage(reviewedOverview(publication("succeeded")))).toEqual({ key: "pull_request", state: "done" });
  });

  it("stays closed when the operator concluded the Review by hand", () => {
    const concluded = overviewOf({ plan: { ...planOf("succeeded"), actions: [loop("implement-tasks", 1), loop("review-and-fix", 2, { concludedAt: APPROVED_AT })] } as never, packages: [tasks] });
    expect(publicationStage(concluded)).toEqual({ key: "pull_request", state: "pending" });
    renderFlow(concluded);
    expect(screen.getByRole("heading", { name: "Esta Issue não segue para Pull Request" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Adicionar Abrir Pull Request" })).toBeNull();
  });

  it("adds a local-only publication action and saves it after the Review", async () => {
    vi.mocked(flow.savePlan.mutate).mockResolvedValue({ revision: 2, state: "planned", runId: null });
    renderFlow(reviewedOverview());
    expect(screen.getByRole("tab", { selected: true }).textContent).toContain("Pull Request");
    expect(screen.getByRole("heading", { name: "Abra a Pull Request" })).toBeTruthy();
    await userEvent.click(await screen.findByRole("button", { name: "Adicionar Abrir Pull Request" }));
    expect(screen.getByRole("heading", { name: "3. Abrir Pull Request" })).toBeTruthy();
    expect(within(screen.getByLabelText("Checkout")).getAllByRole("option").map((option) => option.textContent)).toEqual(["Projeto local vinculado"]);
    expect(screen.getByLabelText("Idioma da Pull Request")).toBeTruthy();
    await userEvent.selectOptions(screen.getByLabelText("Conexão"), "c1");
    await userEvent.selectOptions(screen.getByLabelText("Modelo"), "gpt-5.6-sol");
    await userEvent.click(screen.getByRole("button", { name: "Salvar fluxo" }));
    const saved = vi.mocked(flow.savePlan.mutate).mock.calls[0]![0];
    expect(saved.actions.at(-1)).toEqual(expect.objectContaining({ kind: "open_pull_request", workspace: { kind: "local" } }));
  });

  it("explains why publication is unavailable when the code is not in the local project", async () => {
    const isolated = { kind: "isolated" };
    const overview = overviewOf({ plan: { ...planOf("succeeded"), actions: [loop("implement-tasks", 1, { workspace: isolated }), loop("review-and-fix", 2, { workspace: isolated })] } as never, packages: [tasks] });
    renderFlow(overview);
    expect(await screen.findByText(LOCAL_REQUIRED_NOTICE)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Adicionar Abrir Pull Request" })).toBeNull();
  });

  it("shows what stopped the agent from publishing", async () => {
    const run = runOf({ actionId: "publish", kind: "open_pull_request", state: "blocked", terminalCode: "pull_request_blocked" });
    renderFlow(reviewedOverview(publication("blocked")), runsOf([run]));
    const lastAttempt = within(await screen.findByRole("group", { name: "O que aconteceu na última tentativa" }));
    expect(lastAttempt.getByText(/não conseguiu publicar a Issue/)).toBeTruthy();
    expect(screen.getByRole("heading", { name: "A Pull Request não foi aberta" })).toBeTruthy();
  });
});
