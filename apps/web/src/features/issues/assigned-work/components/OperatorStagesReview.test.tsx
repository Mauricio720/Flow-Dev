import { describe, expect, it, vi } from "vitest";
import { trpc } from "@/lib/trpc/client";
import { sessionOf } from "@/test/execution";
import { cycleOf, reviewOf } from "@/test/review";
import { timelineOf } from "@/test/session";
import { mountStages, reviewGet, running, selectedTab, tabNames, taskSetGet, withSessions } from "@/test/operatorStages";
import { setOf, taskOf, viewOf } from "@/test/taskSet";

describe("OperatorStages review tab", () => {
  it("V-12a puts Revisão between Tarefas and the session tab, also for a member, and omits it without a set", async () => {
    reviewGet.mockResolvedValue(reviewOf(null));
    taskSetGet.mockResolvedValue(viewOf(setOf([taskOf("01")])));
    await mountStages(withSessions([sessionOf({ status: "ended", runtime: "terminal" })]), false);
    expect(tabNames()).toEqual(["PlanejamentoConcluída", "SpecConcluída", "TarefasEm andamento", "RevisãoPendente", "Execução no terminalConcluída"]);
  });

  it("V-12a has no Revisão tab when there is no task set", async () => {
    taskSetGet.mockResolvedValue(viewOf(null));
    await mountStages(withSessions([]));
    expect(tabNames().some((name) => name?.startsWith("Revisão"))).toBe(false);
  });

  it("V-12c opens on Revisão while a cycle is not final, even with an active session", async () => {
    taskSetGet.mockResolvedValue(viewOf(setOf([taskOf("01", { status: "completed" })])));
    reviewGet.mockResolvedValue(reviewOf(cycleOf({ state: "executing" })));
    vi.mocked(trpc.tasks.session.timeline.query).mockResolvedValue(timelineOf());
    await mountStages(withSessions([running()]));
    expect(selectedTab()).toBe("RevisãoEm andamento");
  });

  it("V-12c keeps opening on the session tab when there is no cycle and a session is active", async () => {
    taskSetGet.mockResolvedValue(viewOf(setOf([taskOf("01", { status: "completed" })])));
    reviewGet.mockResolvedValue(reviewOf(null));
    await mountStages(withSessions([running()]));
    expect(selectedTab()).toBe("Execução no terminalEm andamento");
  });
});
