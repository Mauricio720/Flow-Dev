import { eq } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";
import { taskCompozyExecutions, taskCompozySpecReviews } from "../src/infra/database/schema";
import type { CompozyTaskState } from "../src/application/compozy/compozyGateway";
import { executionFixture } from "./execution-support";

let current: Awaited<ReturnType<typeof executionFixture>> | undefined;
afterEach(async () => { await current?.close(); current = undefined; });

describe("spec execution with PostgreSQL", () => {
  it("IT-008 starts a PRD graph and enqueues only its spec task", async () => {
    current = await executionFixture("prd");
    const result = await current.caller.start(current.input);
    const [execution] = await current.database.select().from(taskCompozyExecutions).where(eq(taskCompozyExecutions.taskId, current.taskId));
    expect(result.state).toBe("spec_in_progress");
    expect(current.gateway.calls.map((call) => call.operation)).toEqual(["findWorktree", "createWorktree", "createTask", "createTask", "addDependency", "enqueueRun"]);
    expect(current.gateway.operations("enqueueRun")).toHaveLength(1);
    expect(execution).toMatchObject({ specRound: 1, specTaskId: "task_1", workTaskId: "task_2", specDir: expect.stringMatching(/^\.compozy\/tasks\//) });
    expect(current.gateway.task("task_1").spec.profile).toMatchObject({ worker: { agentName: "general" }, review: { agentName: "reviewer" }, worktree: { mode: "ref" }, runtime: { provider: "codex", model: "gpt-6-luna", reasoningEffort: "medium" } });
    expect(current.gateway.task("task_2").spec).toMatchObject({ requiresApproval: true, autoEnqueueOnReady: true, profile: { worker: { agentName: "spec_conductor" }, review: null, worktree: { mode: "none" }, runtime: { provider: "codex" } } });
  });

  it("IT-014 records and replays human approval once", async () => {
    current = await executionFixture("prd");
    const started = await current.caller.start(current.input);
    const execution = await prepareSpecReview(current, started.executionId, 1);
    const input = { projectId: current.project.id, taskId: current.taskId, executionId: execution.id, round: 1, decision: "approve" as const, idempotencyKey: crypto.randomUUID() };
    expect((await current.caller.status({ projectId: current.project.id, taskId: current.taskId })).current?.state).toBe("spec_review");
    expect(await current.caller.reviewSpec(input)).toMatchObject({ state: "in_progress", specRound: 1, replayed: false });
    expect(await current.caller.reviewSpec(input)).toMatchObject({ state: "in_progress", replayed: true });
    expect(current.gateway.operations("approveTask")).toHaveLength(1);
    expect(current.gateway.operations("enqueueRun")).toHaveLength(1);
    expect(await current.database.select().from(taskCompozySpecReviews)).toHaveLength(1);
    const status = await current.caller.status({ projectId: current.project.id, taskId: current.taskId });
    expect(status.current?.specReviews).toMatchObject([{ round: 1, decision: "approve", actorName: expect.any(String), createdAt: expect.any(String) }]);
  });

  it("IT-015 queues a spec revision and rejects by canceling active tasks", async () => {
    current = await executionFixture("prd");
    const started = await current.caller.start(current.input);
    const execution = await prepareSpecReview(current, started.executionId, 1);
    await current.caller.status({ projectId: current.project.id, taskId: current.taskId });
    const changes = { projectId: current.project.id, taskId: current.taskId, executionId: execution.id, round: 1, decision: "request_changes" as const, note: "Inclua os casos de erro.", idempotencyKey: crypto.randomUUID() };
    expect(await current.caller.reviewSpec(changes)).toMatchObject({ state: "spec_in_progress", specRound: 2 });
    expect(current.gateway.operations("enqueueRun")[1]?.input).toMatchObject({ metadata: { round: "2", note: "Inclua os casos de erro." } });
    await prepareSpecReview(current, started.executionId, 2);
    await current.database.update(taskCompozyExecutions).set({ state: "spec_review", lastSyncedAt: new Date(Date.now() - 10_000) }).where(eq(taskCompozyExecutions.id, execution.id));
    await current.caller.status({ projectId: current.project.id, taskId: current.taskId });
    const rejected = { ...changes, round: 2, decision: "reject" as const, note: undefined, idempotencyKey: crypto.randomUUID() };
    expect(await current.caller.reviewSpec(rejected)).toMatchObject({ state: "rejected", specRound: 2 });
    expect(current.gateway.operations("cancelTask")).toHaveLength(1);
    expect(await current.database.select().from(taskCompozySpecReviews)).toHaveLength(2);
  });
});

async function prepareSpecReview(current: NonNullable<typeof current>, executionId: string, round: number) {
  const [execution] = await current.database.select().from(taskCompozyExecutions).where(eq(taskCompozyExecutions.id, executionId));
  const specTask = current.gateway.task(execution.specTaskId!);
  const runId = `${specTask.taskId}_run_${round}`;
  specTask.status = "completed";
  specTask.latestRun = { runId, status: "completed", attempt: round, sessionId: null, error: null };
  specTask.latestReview = { reviewId: `review-${round}`, runId, status: "completed", outcome: "approved", summary: "Aprovada" };
  const file = `${execution.specDir}/_spec.md`;
  current.gateway.workspace.fileEntries.set(execution.specWorktreeId!, [{ path: file, kind: "file" }]);
  current.gateway.workspace.files.set(`${execution.specWorktreeId}:${file}`, { content: "# Spec" });
  await current.database.update(taskCompozyExecutions).set({ specRound: round, state: "spec_in_progress", lastSyncedAt: new Date(Date.now() - 10_000) }).where(eq(taskCompozyExecutions.id, executionId));
  return execution;
}
