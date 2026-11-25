import { afterEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import type { NewReviewCycle } from "../src/application/database/dao/reviewCycleDao";
import { DrizzleReviewCycleDao } from "../src/infra/database/dao/review/drizzleReviewCycleDao";
import { taskArtifactVersions, taskReviewCycles, taskReviewRounds, taskTerminalSessions } from "../src/infra/database/schema";
import { closeTaskFixture } from "./task-api-support";
import { artifactWorld, sessionValues, versionValues, world } from "./terminal-tracking-support";

afterEach(closeTaskFixture);

type Context = Awaited<ReturnType<typeof world>>;
const REVIEWER = { agent: "claude" as const, model: "sonnet", effort: "high" };
const EXECUTOR = { agent: "codex" as const, model: "gpt-5", effort: "medium" };

function inputFor(context: Context): NewReviewCycle {
  return { taskId: context.setup.taskId, projectId: context.setup.project.id, hostId: "host-test", startedBy: context.setup.ownerId, requestKey: crypto.randomUUID(), reviewer: REVIEWER, executor: EXECUTOR, tasksFolder: "docs/specs/test", partial: false };
}

describe("review cycle DAO", () => {
  it("V-08a accepts one revisioned action and leaves stale or already-pending requests unchanged", async () => {
    const context = await world();
    const dao = new DrizzleReviewCycleDao(context.setup.database);
    const cycle = await dao.create(inputFor(context));
    const at = new Date("2026-11-25T12:00:00Z");
    expect(await dao.requestAction({ cycleId: cycle.id, revision: 0, action: "stop", by: context.setup.ownerId, at })).toBeNull();
    const [before] = await context.setup.database.select().from(taskReviewCycles).where(eq(taskReviewCycles.id, cycle.id));
    expect(before).toMatchObject({ revision: 1, pendingAction: null, pendingBy: null, pendingAt: null });
    expect(await dao.requestAction({ cycleId: cycle.id, revision: 1, action: "stop", by: context.setup.ownerId, at })).toMatchObject({ revision: 2, pendingAction: "stop", pendingBy: context.setup.ownerId, pendingAt: at });
    expect(await dao.requestAction({ cycleId: cycle.id, revision: 2, action: "accept", by: context.setup.ownerId, at })).toBeNull();
    const [after] = await context.setup.database.select().from(taskReviewCycles).where(eq(taskReviewCycles.id, cycle.id));
    expect(after).toMatchObject({ revision: 2, pendingAction: "stop", pendingBy: context.setup.ownerId, pendingAt: at });
  });

  it("returns the current step and rounds newest first with the stored report artifact", async () => {
    const context = await artifactWorld();
    const dao = new DrizzleReviewCycleDao(context.setup.database);
    const cycle = await dao.create(inputFor(context));
    const [review] = await context.setup.database.insert(taskTerminalSessions).values(sessionValues(context.setup, context.decisionId, { purpose: "review", status: "ended" })).returning();
    const [execute] = await context.setup.database.insert(taskTerminalSessions).values(sessionValues(context.setup, context.decisionId, { purpose: "review_execute", status: "running" })).returning();
    const [version] = await context.setup.database.insert(taskArtifactVersions).values(versionValues(context.artifact.id)).returning();
    await context.setup.database.update(taskReviewCycles).set({ state: "executing", stepRole: "execute", round: 2, reviewSessionId: review!.id, executeSessionId: execute!.id }).where(eq(taskReviewCycles.id, cycle.id));
    await context.setup.database.insert(taskReviewRounds).values([{ cycleId: cycle.id, number: 1, verdict: "rejected", reportPath: "docs/specs/test/reviews/review-004.md", reportVersionId: version!.id, reviewSessionId: review!.id }, { cycleId: cycle.id, number: 2, verdict: null, reviewSessionId: review!.id, executeSessionId: execute!.id }]);
    expect(await dao.view(cycle.id)).toMatchObject({ id: cycle.id, state: "executing", round: 2, reviewer: REVIEWER, executor: EXECUTOR, step: { role: "execute", sessionId: execute!.id, sessionStatus: "running" }, sessions: { review: review!.id, execute: execute!.id }, rounds: [{ number: 2, reportArtifactId: null }, { number: 1, verdict: "rejected", reportPath: "docs/specs/test/reviews/review-004.md", reportArtifactId: context.artifact.id }] });
    expect(await dao.view(crypto.randomUUID())).toBeNull();
  });

  it("finds open, latest, and requester-scoped idempotency records", async () => {
    const context = await world();
    const dao = new DrizzleReviewCycleDao(context.setup.database);
    const first = await dao.create(inputFor(context));
    expect(await dao.findOpen(context.setup.taskId)).toMatchObject({ id: first.id });
    expect(await dao.findLatest(context.setup.taskId)).toMatchObject({ id: first.id });
    expect(await dao.findByRequestKey(context.setup.ownerId, first.requestKey)).toMatchObject({ id: first.id });
    expect(await dao.findByRequestKey(context.setup.readerId, first.requestKey)).toBeNull();
  });
});
