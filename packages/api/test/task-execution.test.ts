import { eq } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";
import { taskCompozyExecutions } from "../src/infra/database/schema";
import { executionFixture } from "./execution-support";

let current: Awaited<ReturnType<typeof executionFixture>> | undefined;
afterEach(async () => { await current?.close(); current = undefined; });

describe("task execution with PostgreSQL", () => {
  it("IT-005 starts a direct task and records gateway ordering", async () => {
    current = await executionFixture();
    const result = await current.caller.start(current.input);
    expect(result.state).toBe("in_progress");
    expect(current.gateway.calls.map((call) => call.operation)).toEqual(["createTask", "enqueueRun"]);
    const rows = await current.database.select().from(taskCompozyExecutions).where(eq(taskCompozyExecutions.taskId, current.taskId));
    expect(rows).toHaveLength(1);
  });

  it("IT-006 replays parallel starts with one task creation", async () => {
    current = await executionFixture();
    const results = await Promise.all(Array.from({ length: 5 }, () => current!.caller.start(current!.input)));
    expect(results.filter((result) => result.replayed)).toHaveLength(4);
    expect(current.gateway.operations("createTask")).toHaveLength(1);
  });

  it("IT-007 rejects a new key while an execution is active", async () => {
    current = await executionFixture();
    await current.caller.start(current.input);
    await expect(current.caller.start({ ...current.input, idempotencyKey: crypto.randomUUID() })).rejects.toMatchObject({ cause: { reason: "execution_active" } });
  });

  it("IT-009 reconciles stale status and keeps fresh status cached", async () => {
    current = await executionFixture();
    await current.caller.start(current.input);
    const [row] = await current.database.select().from(taskCompozyExecutions).where(eq(taskCompozyExecutions.taskId, current.taskId));
    expect(current.gateway.operations("readTask")).toHaveLength(0);
    await current.database.update(taskCompozyExecutions).set({ lastSyncedAt: new Date(Date.now() - 10_000) }).where(eq(taskCompozyExecutions.id, row.id));
    await current.caller.status({ projectId: current.project.id, taskId: current.taskId });
    expect(current.gateway.operations("readTask")).toHaveLength(1);
  });

  it("IT-010 keeps the saved state when status cannot reach Compozy", async () => {
    current = await executionFixture();
    const started = await current.caller.start(current.input);
    const [row] = await current.database.select().from(taskCompozyExecutions).where(eq(taskCompozyExecutions.taskId, current.taskId));
    await current.database.update(taskCompozyExecutions).set({ lastSyncedAt: new Date(Date.now() - 10_000) }).where(eq(taskCompozyExecutions.id, row.id));
    current.gateway.unavailable = true;
    const result = await current.caller.status({ projectId: current.project.id, taskId: current.taskId });
    expect(result.current).toMatchObject({ state: started.state, compozyReachable: false });
    expect((await current.database.select().from(taskCompozyExecutions))[0].state).toBe("in_progress");
  });

  it("IT-012 cancels once and treats the next request as a replay", async () => {
    current = await executionFixture();
    const started = await current.caller.start(current.input);
    const cancel = { projectId: current.project.id, taskId: current.taskId, executionId: started.executionId, idempotencyKey: crypto.randomUUID() };
    expect(await current.caller.cancel(cancel)).toMatchObject({ state: "canceled", replayed: false });
    expect(await current.caller.cancel(cancel)).toMatchObject({ state: "canceled", replayed: true });
    expect(current.gateway.operations("cancelTask")).toHaveLength(1);
  });

  it("IT-013 retries an unavailable dispatch on the same execution", async () => {
    current = await executionFixture();
    current.gateway.failures.set("createTask", "compozy_unavailable");
    const unavailable = await current.caller.start(current.input);
    current.gateway.failures.clear();
    const retried = await current.caller.start(current.input);
    expect(unavailable).toMatchObject({ state: "unavailable", replayed: false });
    expect(retried).toMatchObject({ executionId: unavailable.executionId, state: "in_progress", replayed: false });
    expect((await current.database.select().from(taskCompozyExecutions))).toHaveLength(1);
  });

  it("IT-016 reflects a task canceled directly in Compozy", async () => {
    current = await executionFixture();
    await current.caller.start(current.input);
    const remoteTask = current.gateway.tasks.get("task_1")!;
    remoteTask.status = "canceled";
    const [row] = await current.database.select().from(taskCompozyExecutions).where(eq(taskCompozyExecutions.taskId, current.taskId));
    await current.database.update(taskCompozyExecutions).set({ lastSyncedAt: new Date(Date.now() - 10_000) }).where(eq(taskCompozyExecutions.id, row.id));
    const result = await current.caller.status({ projectId: current.project.id, taskId: current.taskId });
    expect(result.current?.state).toBe("canceled");
  });
});
