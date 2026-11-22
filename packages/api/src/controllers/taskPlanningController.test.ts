import { describe, expect, it, vi } from "vitest";
import type { PlanningService } from "../application/services/tasks/planningService";
import type { WorkAuthorization } from "../application/services/assigned-issues/workAuthorization";
import { AssignedIssueError } from "../application/services/assigned-issues/assignedIssueErrors";
import { TaskPlanningController } from "./taskPlanningController";

const taskId = "00000000-0000-4000-8000-000000000011";
const projectId = "00000000-0000-4000-8000-000000000001";
const operator = { userId: "operator", sessionId: "s" };
const command = { projectId, taskId, requestKey: "k", expectedVersion: 7 };
const receipt = { taskId, operationId: "o", decisionId: null, version: 8, decisionVersion: null };
const review = { ...command, decisionId: "d", expectedDecisionVersion: 1, reviewedRoute: "prd" as const };

function build() {
  const planning = { start: vi.fn(async () => ({ ...receipt, replayed: false })), retry: vi.fn(async () => ({ ...receipt, replayed: false })), replan: vi.fn(async () => ({ ...receipt, replayed: false })), approve: vi.fn(async () => ({ ...receipt, replayed: false })), selectRoute: vi.fn(async () => ({ ...receipt, replayed: false })), submission: vi.fn(async () => ({ status: "not_accepted" as const })) };
  const authorization = { requireOperate: vi.fn(async (input: { actorId: string; taskId: string }) => { if (input.actorId !== "operator") throw new AssignedIssueError("operator_required"); if (input.taskId !== taskId) throw new AssignedIssueError("work_unavailable"); }), requireRead: vi.fn(async (input: { taskId: string }) => { if (input.taskId !== taskId) throw new AssignedIssueError("work_unavailable"); }) };
  return { planning, authorization, controller: new TaskPlanningController(planning as unknown as PlanningService, authorization as unknown as WorkAuthorization) };
}

describe("TaskPlanningController", () => {
  it("UT-015 returns the accepted receipt for the operator after reanalyzing the current source", async () => {
    const { controller, planning, authorization } = build();
    expect(await controller.start(operator, command)).toEqual(receipt);
    expect(planning.start).toHaveBeenCalledWith(expect.objectContaining({ actorUserId: "operator", sessionId: "s" }));
    expect(authorization.requireOperate).toHaveBeenCalledWith({ projectId, taskId, actorId: "operator" }, { currentSource: true, refreshSource: true });
  });

  it("replans against the current GitHub text instead of blocking on a changed Issue", async () => {
    const { controller, authorization } = build();
    await controller.replan(operator, command);
    expect(authorization.requireOperate).toHaveBeenCalledWith({ projectId, taskId, actorId: "operator" }, { currentSource: true, refreshSource: true });
  });

  it("UT-035 rejects an observer before any planning write", async () => {
    const { controller, planning } = build();
    await expect(controller.start({ userId: "reader", sessionId: "s" }, command)).rejects.toMatchObject({ reason: "operator_required" });
    await expect(controller.retry({ userId: "reader", sessionId: "s" }, { ...command, failedOperationId: "f" })).rejects.toMatchObject({ reason: "operator_required" });
    await expect(controller.approve({ userId: "reader", sessionId: "s" }, review)).rejects.toMatchObject({ reason: "operator_required" });
    expect(planning.start).not.toHaveBeenCalled();
    expect(planning.approve).not.toHaveBeenCalled();
  });

  it("UT-017 hides a task outside the scope on submission", async () => {
    const { controller } = build();
    await expect(controller.submission(operator, { projectId, taskId: "00000000-0000-4000-8000-000000000012", action: "planning.start", requestKey: "k" })).rejects.toMatchObject({ reason: "work_unavailable" });
  });

  it("V-10b starts a planning without any Dev Control variable in the environment", async () => {
    for (const name of Object.keys(process.env).filter((key) => /^(ISSUE_AUTHOR_|PLANNING_|FLOW_DEV_INTERNAL_)/.test(key))) vi.stubEnv(name, undefined);
    const { controller, planning } = build();
    expect(await controller.start(operator, command)).toEqual(receipt);
    expect(planning.start).toHaveBeenCalledTimes(1);
    vi.unstubAllEnvs();
  });

  it("approves only after requiring the operator and a current source, without touching the board", async () => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    const { controller, planning, authorization } = build();
    expect(await controller.approve(operator, review)).toEqual(receipt);
    expect(planning.approve).toHaveBeenCalledWith(expect.objectContaining({ actorUserId: "operator", decisionId: "d" }));
    expect(authorization.requireOperate).toHaveBeenCalledWith({ projectId, taskId, actorId: "operator" }, { currentSource: true });
    vi.restoreAllMocks();
  });

  it("logs a replayed command separately and keeps the flag out of the receipt", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const { controller, planning } = build();
    planning.start.mockResolvedValue({ ...receipt, replayed: true });
    expect(await controller.start(operator, command)).toEqual(receipt);
    expect(info.mock.calls.flat().join("")).toContain("planning.command_replayed");
    expect(info.mock.calls.flat().join("")).not.toContain("planning.accepted");
    info.mockRestore();
  });
});
