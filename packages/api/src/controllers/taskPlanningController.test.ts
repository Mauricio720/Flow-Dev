import { describe, expect, it, vi } from "vitest";
import type { TaskDao } from "../application/database/dao/taskDao";
import type { PlanningService } from "../application/services/tasks/planningService";
import { TaskError } from "../application/services/tasks/taskErrors";
import { TaskPlanningController } from "./taskPlanningController";

const taskId = "00000000-0000-4000-8000-000000000011";
const projectId = "00000000-0000-4000-8000-000000000001";
const author = { userId: "author", sessionId: "s" };
const command = { projectId, taskId, requestKey: "k", expectedVersion: 7 };
const receipt = { taskId, operationId: "o", decisionId: null, version: 8, decisionVersion: null };

const review = { ...command, decisionId: "d", expectedDecisionVersion: 1, reviewedRoute: "prd" as const };

function build(configuration = () => {}) {
  const planning = { start: vi.fn(async (_input?: { beforeAccept?: () => void }) => ({ ...receipt, replayed: false })), approve: vi.fn(async () => ({ ...receipt, replayed: false })), publishedIssueNodeId: vi.fn(async (): Promise<string | null> => "I_1"), submission: vi.fn(async () => ({ status: "not_accepted" as const })) };
  const tasks = { findScoped: async (_project: string, id: string) => id === taskId ? { authorUserId: "author" } : null } as unknown as TaskDao;
  const repositories = { requireRead: vi.fn(async () => ({})), contextCredentials: vi.fn(async () => ({ token: "token" })) } as never;
  const ready = { move: vi.fn(async () => "moved" as const) };
  return { planning, ready, controller: new TaskPlanningController(tasks, planning as unknown as PlanningService, repositories, configuration, ready as never) };
}

describe("TaskPlanningController", () => {
  it("UT-015 returns the accepted receipt for the author", async () => {
    const { controller, planning } = build();
    expect(await controller.start(author, command)).toEqual(receipt);
    expect(planning.start).toHaveBeenCalledWith(expect.objectContaining({ actorUserId: "author", sessionId: "s" }));
  });

  it("UT-016 rejects a reader before any planning write", async () => {
    const { controller, planning } = build();
    await expect(controller.start({ userId: "reader", sessionId: "s" }, command)).rejects.toMatchObject({ reason: "author_required" });
    expect(planning.start).not.toHaveBeenCalled();
  });

  it("UT-017 hides a task outside the scope on submission", async () => {
    const { controller } = build();
    await expect(controller.submission(author, { projectId, taskId: "00000000-0000-4000-8000-000000000012", action: "planning.start", requestKey: "k" })).rejects.toMatchObject({ reason: "task_unavailable" });
  });

  it("UT-018 passes the configuration check to run before enqueueing", async () => {
    const configuration = () => { throw new TaskError("planning_unconfigured"); };
    const { controller, planning } = build(configuration);
    planning.start.mockImplementation(async (input) => { input?.beforeAccept?.(); return { ...receipt, replayed: false }; });
    await expect(controller.start(author, command)).rejects.toMatchObject({ reason: "planning_unconfigured" });
  });

  it("moves the published Issue to Ready on the board after the approval is saved", async () => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    const { controller, planning, ready } = build();
    expect(await controller.approve(author, review)).toEqual(receipt);
    expect(ready.move).toHaveBeenCalledWith({ projectId, token: "token", issueNodeId: "I_1" });
    expect(planning.approve.mock.invocationCallOrder[0]).toBeLessThan(ready.move.mock.invocationCallOrder[0]!);
    vi.restoreAllMocks();
  });

  it("keeps the approval when the board cannot be updated and logs no error text", async () => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const { controller, ready } = build();
    ready.move.mockRejectedValue(new TypeError("secret board text"));
    expect(await controller.approve(author, review)).toEqual(receipt);
    expect(errors.mock.calls.flat().join("")).toContain("planning.ready_placement_failed");
    expect(errors.mock.calls.flat().join("")).not.toContain("secret board text");
    vi.restoreAllMocks();
  });

  it("does not touch the board when the approval is rejected or the Issue has no node", async () => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    const rejected = build();
    rejected.planning.approve.mockRejectedValue(new TaskError("planning_conflict"));
    await expect(rejected.controller.approve(author, review)).rejects.toMatchObject({ reason: "planning_conflict" });
    expect(rejected.ready.move).not.toHaveBeenCalled();
    const nodeless = build();
    nodeless.planning.publishedIssueNodeId.mockResolvedValue(null);
    await nodeless.controller.approve(author, review);
    expect(nodeless.ready.move).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  it("logs a replayed command separately and keeps the flag out of the receipt", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const { controller, planning } = build();
    planning.start.mockResolvedValue({ ...receipt, replayed: true });
    expect(await controller.start(author, command)).toEqual(receipt);
    expect(info.mock.calls.flat().join("")).toContain("planning.command_replayed");
    expect(info.mock.calls.flat().join("")).not.toContain("planning.accepted");
    info.mockRestore();
  });
});
