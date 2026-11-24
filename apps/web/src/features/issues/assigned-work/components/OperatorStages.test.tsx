import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { trpc } from "@/lib/trpc/client";
import { eventOf, sessionOf } from "@/test/execution";
import { planItemOf, planOf } from "@/test/plan";
import { setOf, taskOf, viewOf } from "@/test/taskSet";
import { CART_PROJECT, approvedDetail } from "@/test/tasks";
import { snapshotOf } from "@/test/work";
import type { TaskDetail } from "../contract";
import { OperatorStages } from "./OperatorStages";

const get = vi.mocked(trpc.tasks.taskSet.get.query);
const running = () => sessionOf({ status: "running", runtime: "terminal" });
const withSessions = (sessions: ReturnType<typeof sessionOf>[]): TaskDetail => ({ ...approvedDetail(), execution: { sessions, artifacts: [] } });

async function mount(detail: TaskDetail, viewerCanOperate = true) {
  render(<OperatorStages project={CART_PROJECT} snapshot={snapshotOf({ viewerCanOperate }, detail)} refresh={async () => undefined} onFailure={() => undefined} />);
  await act(async () => undefined);
}

const PLAN_ITEM = "00000000-0000-4000-8000-0000000000e1";
const tabStartingWith = (prefix: string) => screen.getAllByRole("tab").find((tab) => tab.textContent?.startsWith(prefix))!;

async function mountWithOlderPlanSession() {
  get.mockResolvedValue(viewOf(setOf([taskOf("01")])));
  vi.mocked(trpc.tasks.plan.get.query).mockResolvedValue(planOf([planItemOf(PLAN_ITEM, ["task_01"], { state: "ended", started: true, latestSessionId: "s2" })]));
  const newest = sessionOf({ id: "s1", status: "ended", userName: "Bruno", events: [eventOf({ summary: "pnpm lint" })] });
  const older = sessionOf({ id: "s2", status: "ended", userName: "Carla", purpose: "plan_item", planItemId: PLAN_ITEM, endedAt: "2026-11-21T11:00:00.000Z", events: [eventOf({ summary: "git status" })] });
  await mount(withSessions([newest, older]));
}

const tabNames = () => screen.getAllByRole("tab").map((tab) => tab.textContent);
const selectedTab = () => screen.getAllByRole("tab").find((tab) => tab.getAttribute("aria-selected") === "true")?.textContent;

describe("OperatorStages tabs with tasks", () => {
  it("V-40f puts Spec and Tarefas between the planning and the session, and opens on Tarefas when no session is active", async () => {
    get.mockResolvedValue(viewOf(setOf([taskOf("01")])));
    await mount(withSessions([sessionOf({ status: "ended", runtime: "terminal" })]));
    expect(tabNames()).toEqual(["PlanejamentoConcluída", "SpecConcluída", "TarefasEm andamento", "Execução no terminalConcluída"]);
    expect(selectedTab()).toBe("TarefasEm andamento");
  });

  it("V-40f keeps the session tab as the initial one while a session is active", async () => {
    get.mockResolvedValue(viewOf(setOf([taskOf("01")])));
    await mount(withSessions([running()]));
    expect(tabNames()[2]).toBe("TarefasEm andamento");
    expect(selectedTab()).toBe("Execução no terminalEm andamento");
  });

  it("V-40f shows the tab as Concluída when every task is completed", async () => {
    get.mockResolvedValue(viewOf(setOf([taskOf("01", { status: "completed" }), taskOf("02", { status: "completed" })])));
    await mount(withSessions([]));
    expect(tabNames()).toContain("TarefasConcluída");
  });

  it("V-40a shows the tab as pending when there is a spec and no set yet", async () => {
    get.mockResolvedValue(viewOf(null));
    await mount(withSessions([]));
    expect(tabNames()).toContain("TarefasPendente");
  });

  it("opens on the Spec tab when the spec is captured and no task was generated yet", async () => {
    get.mockResolvedValue(viewOf(null));
    await mount(withSessions([]));
    expect(selectedTab()).toBe("SpecConcluída");
  });

  it("B-38 hides the tab when there is neither a spec nor a set", async () => {
    get.mockResolvedValue(viewOf(null, []));
    await mount(withSessions([running()]));
    expect(tabNames().some((name) => name?.startsWith("Tarefas"))).toBe(false);
  });

  it("REQ-024 shows the same tab to a member who only follows the work", async () => {
    get.mockResolvedValue(viewOf(setOf([taskOf("01")])));
    await mount(withSessions([]), false);
    expect(tabNames()).toContain("TarefasEm andamento");
  });

  it("REQ-104 opens, from Ver a conversa, the conversation of the plan session even when a newer session exists", async () => {
    await mountWithOlderPlanSession();
    await userEvent.click(screen.getByRole("button", { name: "Ver a conversa" }));
    expect(selectedTab()).toBe("Execução no terminalConcluída");
    const history = screen.getByRole("list", { name: "Sessões anteriores" });
    expect(within(history).getByRole("button", { name: /Carla/ }).getAttribute("aria-expanded")).toBe("true");
    expect(within(history).getByText("Rodou: git status")).toBeTruthy();
  });

  it("does not open the conversation again when the person comes back to the session tab later", async () => {
    await mountWithOlderPlanSession();
    await userEvent.click(screen.getByRole("button", { name: "Ver a conversa" }));
    await userEvent.click(tabStartingWith("Tarefas"));
    await userEvent.click(tabStartingWith("Execução"));
    const history = screen.getByRole("list", { name: "Sessões anteriores" });
    expect(within(history).getByRole("button", { name: /Carla/ }).getAttribute("aria-expanded")).toBe("false");
  });
});
