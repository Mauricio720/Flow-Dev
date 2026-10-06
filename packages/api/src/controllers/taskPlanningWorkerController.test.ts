import { afterEach, describe, expect, it, vi } from "vitest";
import type { PlanningClaim, TaskPlanningWorkerDao } from "../application/database/dao/taskPlanningWorkerDao";
import { TaskError } from "../application/services/tasks/taskErrors";
import { TaskPlanningWorkerController } from "./taskPlanningWorkerController";

const WORKER_ID = "00000000-0000-4000-8000-000000000001";
const now = new Date("2026-10-05T12:00:00.000Z");
const claim: PlanningClaim = { taskId: "t", projectId: "p", authorUserId: "u", sessionId: "s", operationId: "o", executionId: "e", fence: 1, workerId: "w", leaseUntil: new Date(now.getTime() + 60_000), attempts: 1, deadline: new Date(now.getTime() + 900_000), repositoryId: "1", repositoryNodeId: "R", contextCapability: "c" };
const input = { protocolVersion: 1 as const, operationId: "o", executionId: "e", taskId: "t", inputHash: "h", publication: { attemptId: "a", repositoryId: "1", repositoryNodeId: "R", issueId: "2", issueNumber: 3, title: "T", bodyMarkdown: "B" }, issueUrl: "https://github.com/acme/shop/issues/3", contextCapability: "c" };
const envelope = { protocolVersion: 1 as const, operationId: "o", executionId: "e", taskId: "t", inputHash: "h", result: { recommendedRoute: "prd" as const, complexity: "high" as const, summary: "S", reasons: ["R"], uncertainties: [] } };

function build(overrides: Partial<TaskPlanningWorkerDao> = {}, analyze = vi.fn(async () => envelope)) {
  const dao = { claim: vi.fn(async () => claim), heartbeat: vi.fn(async () => {}), sessionActive: vi.fn(async () => true), input: vi.fn(async () => input), complete: vi.fn(async () => {}), fail: vi.fn(async () => {}), requeue: vi.fn(async () => {}), ...overrides } as unknown as TaskPlanningWorkerDao;
  const repositories = { requireRead: vi.fn(async () => ({ githubId: "1", nodeId: "R" })) } as never;
  return { dao, analyze, worker: new TaskPlanningWorkerController(dao, repositories, { analyze }, WORKER_ID, () => now) };
}

afterEach(() => vi.restoreAllMocks());

describe("TaskPlanningWorkerController", () => {
  it("UT-027 completes the current claim with the validated envelope", async () => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    const { worker, dao } = build();
    expect(await worker.tick()).toBe(true);
    expect(dao.complete).toHaveBeenCalledWith({ claim, envelope });
  });

  it("UT-028 records access revocation without calling the provider", async () => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { worker, dao, analyze } = build({ sessionActive: vi.fn(async () => false) });
    await worker.tick();
    expect(dao.fail).toHaveBeenCalledWith({ claim, reason: "planning_access_revoked" });
    expect(analyze).not.toHaveBeenCalled();
  });

  it("UT-029 aborts the request and never completes after a heartbeat failure", async () => {
    vi.useFakeTimers();
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    let signal: AbortSignal | undefined;
    const analyze = vi.fn((_input: unknown, received: AbortSignal) => new Promise<typeof envelope>((_resolve, reject) => { signal = received; received.addEventListener("abort", () => reject(new TaskError("stale_execution"))); }));
    const { worker, dao } = build({ heartbeat: vi.fn(async () => { throw new TaskError("stale_execution"); }) }, analyze as never);
    const tick = worker.tick();
    await vi.advanceTimersByTimeAsync(15_000);
    await tick;
    vi.useRealTimers();
    expect(signal?.aborted).toBe(true);
    expect(dao.complete).not.toHaveBeenCalled();
    expect(dao.fail).not.toHaveBeenCalled();
  });

  it("UT-075 does not report a saved review when settlement fails", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { worker } = build({ complete: vi.fn(async () => { throw new Error("connection lost"); }) });
    await worker.tick();
    expect(info.mock.calls.flat().join("")).not.toContain("planning.saved");
  });

  it("fails immediately with a safe reason on invalid stored content", async () => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { worker, dao, analyze } = build({ input: vi.fn(async () => { throw new TaskError("invalid_stored_content"); }) });
    await worker.tick();
    expect(dao.fail).toHaveBeenCalledWith({ claim, reason: "invalid_stored_content" });
    expect(analyze).not.toHaveBeenCalled();
  });

  it("logs an unclassified error without leaking its message and keeps the operation recoverable", async () => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const { worker, dao } = build({ input: vi.fn(async () => { throw new TypeError("secret payload"); }) });
    await worker.tick();
    const output = errors.mock.calls.flat().join("");
    expect(output).toContain("planning.unclassified_error");
    expect(output).toContain("TypeError");
    expect(output).not.toContain("secret payload");
    expect(dao.fail).not.toHaveBeenCalled();
    expect(dao.requeue).not.toHaveBeenCalled();
  });

  it("aborts the in-flight request on shutdown and never completes", async () => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    const shutdown = new AbortController();
    let signal: AbortSignal | undefined;
    const analyze = vi.fn((_input: unknown, received: AbortSignal) => new Promise<typeof envelope>((_resolve, reject) => { signal = received; received.addEventListener("abort", () => reject(new TaskError("stale_execution"))); }));
    const { worker, dao } = build({}, analyze as never);
    const tick = worker.tick(shutdown.signal);
    await vi.waitFor(() => expect(signal).toBeDefined());
    shutdown.abort();
    await tick;
    expect(signal?.aborted).toBe(true);
    expect(dao.complete).not.toHaveBeenCalled();
    expect(dao.fail).not.toHaveBeenCalled();
  });
});
