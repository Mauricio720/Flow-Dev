import { describe, expect, it, vi } from "vitest";
import type { PlanningClaim, TaskPlanningWorkerDao } from "../application/database/dao/taskPlanningWorkerDao";
import type { PlanningGateway } from "../application/planning/planningGateway";
import { TaskError } from "../application/services/tasks/taskErrors";
import { TaskPlanningWorkerController } from "./taskPlanningWorkerController";

const NOW = new Date("2026-10-09T12:00:00.000Z");
const WORKER_ID = "00000000-0000-4000-8000-000000000001";
const CLAIM = { taskId: "task", projectId: "project", requesterUserId: "owner", sessionId: "session", repositoryId: "1", repositoryNodeId: "R", attempts: 1, deadline: new Date(NOW.getTime() + 900_000) } as PlanningClaim;

function fixture(provision: () => Promise<void>) {
  const analyze = vi.fn(async () => ({ result: {} }));
  const complete = vi.fn(async () => undefined);
  const requeue = vi.fn(async () => undefined);
  const dao = { claim: async () => CLAIM, sessionActive: async () => true, input: async () => ({}), complete, requeue } as unknown as TaskPlanningWorkerDao;
  const repositories = { requireRead: async () => ({ githubId: "1", nodeId: "R" }) } as never;
  const gateway = { analyze } as unknown as PlanningGateway;
  const worker = new TaskPlanningWorkerController(dao, repositories, gateway, WORKER_ID, () => NOW, undefined, { provision });
  return { worker, analyze, complete, requeue };
}

describe("planning workspace preparation", () => {
  it("does not regenerate the recommendation when workspace preparation fails", async () => {
    const current = fixture(async () => { throw new TaskError("workspace_unavailable"); });
    await current.worker.tick();
    expect(current.analyze).not.toHaveBeenCalled();
    expect(current.complete).not.toHaveBeenCalled();
    expect(current.requeue).toHaveBeenCalledWith(expect.objectContaining({ reason: "planning_workspace_unavailable" }));
  });

  it("prepares the workspace before analysis and saves the recommendation", async () => {
    const order: string[] = [];
    const current = fixture(async () => { order.push("workspace"); });
    current.analyze.mockImplementation(async () => { order.push("analyze"); return { result: {} }; });
    await current.worker.tick();
    expect(order).toEqual(["workspace", "analyze"]);
    expect(current.complete).toHaveBeenCalledTimes(1);
  });
});
