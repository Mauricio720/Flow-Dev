import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { taskPlanningDecisions, taskReviewCycles, taskReviewRounds, taskTerminalEvents, taskTerminalSessions, tasks } from "../src/infra/database/schema";
import { DrizzleIssueDeletionDao } from "../src/infra/database/dao/issue-deletion/drizzleIssueDeletionDao";
import { CoordinatedDeletionStop } from "../src/application/services/issue-deletion/coordinatedDeletionStop";
import { cycle } from "./session-worker-support";
import { reviewCycleWorkerWorld } from "./review-cycle-world";
import { closeTaskFixture } from "./task-api-support";
import { issueDeletionFixture, closeIssueDeletion, resetIssueDeletion, type IssueDeletionFixture } from "./issue-deletion-support";
import { seedSpecFlowTask } from "./issue-deletion-seed";
import { ISSUE_41 } from "./issue-deletion-world";
import { openInput, cleanupTerminalFolders } from "./terminal-support";

let deletion: IssueDeletionFixture;
beforeAll(async () => { deletion = await issueDeletionFixture(); });
beforeEach(() => resetIssueDeletion(deletion));
afterEach(async () => { await closeTaskFixture(); await cleanupTerminalFolders(); });
afterAll(closeIssueDeletion);

describe("review cycle deletion", () => {
  it("V-06l ends cycle sessions before purging its rows with the Issue", async () => {
    const spec = await seedSpecFlowTask(deletion.database, deletion.client, { projectId: deletion.project.id, authorId: deletion.member.id });
    const cycleId = await seedLiveCycle(deletion, spec.task);
    deletion.world.issue = { ...ISSUE_41, nodeId: "I_fixture_41", number: 41 };
    const preview = await deletion.caller(deletion.member.id).preview({ kind: "task", projectId: deletion.project.id, taskId: spec.task });
    const started = await deletion.caller(deletion.member.id).start({ target: { kind: "task", projectId: deletion.project.id, taskId: spec.task }, fingerprint: preview.fingerprint, requestKey: crypto.randomUUID() });
    await deletion.worker.tick();
    expect(await deletion.database.select().from(taskReviewCycles).where(eq(taskReviewCycles.id, cycleId))).toMatchObject([{ state: "stopped", endedAt: expect.any(Date) }]);
    const waiting = await deletion.database.select().from(taskTerminalSessions).where(eq(taskTerminalSessions.taskId, spec.task));
    expect(waiting).toHaveLength(2);
    expect(waiting.every((session) => session.endRequestedAt !== null && session.status === "running")).toBe(true);
    await deletion.database.update(taskTerminalSessions).set({ status: "ended", endedAt: deletion.clock.now, endRequestedAt: null }).where(eq(taskTerminalSessions.taskId, spec.task));
    await deletion.dao.resume({ operationId: started.operationId, state: "stopping" });
    await deletion.drain();
    expect(await deletion.database.select().from(tasks).where(eq(tasks.id, spec.task))).toEqual([]);
    expect(await deletion.database.select().from(taskReviewCycles).where(eq(taskReviewCycles.taskId, spec.task))).toEqual([]);
    expect(await deletion.database.select().from(taskReviewRounds).where(eq(taskReviewRounds.cycleId, cycleId))).toEqual([]);
  });

  it("V-06m logs failure and deletion stop metadata", async () => {
    const world = await reviewCycleWorkerWorld([{ kind: "end_turn" }]);
    await cycle(world.worker);
    world.worker.clock.advance(ONE_SECOND_MS);
    await cycle(world.worker);
    await cycle(world.worker);
    const failure = world.worker.log.entries.find(({ event }) => event === "[review] step_failed");
    expect(failure?.fields).toMatchObject({ cycleId: world.reviewCycle.id, round: 1, role: "review", reason: `A sessão de revisão terminou sem atualizar docs/specs/login/reviews/etapa.md.` });
    const stop = new CoordinatedDeletionStop({ dao: new DrizzleIssueDeletionDao(world.setup.database), log: world.worker.log });
    await stop.stopTask(world.setup.taskId, crypto.randomUUID());
    const finished = world.worker.log.entries.find(({ event }) => event === "[review] cycle_finished");
    expect(finished?.fields).toMatchObject({ cycleId: world.reviewCycle.id, round: 1, role: "review" });
  });

  it("V-13e opens a manual session during review and ignores its ended turn", async () => {
    const world = await reviewCycleWorkerWorld();
    await cycle(world.worker);
    const manual = await world.harness.caller.terminal.open(openInput(world.setup, { allowAdditional: true }));
    await cycle(world.worker);
    const [manualSession] = await world.setup.database.select().from(taskTerminalSessions).where(eq(taskTerminalSessions.id, manual.sessionId));
    expect(manualSession).toMatchObject({ purpose: "route", reviewCycleId: null });
    const [before] = await world.setup.database.select().from(taskReviewCycles).where(eq(taskReviewCycles.id, world.reviewCycle.id));
    await world.setup.database.insert(taskTerminalEvents).values({ sessionId: manual.sessionId, kind: "waiting", summary: "Manual turn ended", occurredAt: new Date(before!.stepStartedAt!.getTime() + ONE_SECOND_MS) });
    await cycle(world.worker);
    const [after] = await world.setup.database.select().from(taskReviewCycles).where(eq(taskReviewCycles.id, world.reviewCycle.id));
    const cycleSessions = await world.setup.database.select().from(taskTerminalSessions).where(eq(taskTerminalSessions.reviewCycleId, world.reviewCycle.id));
    expect(after).toMatchObject({ state: "reviewing", round: 1, revision: before!.revision });
    expect(cycleSessions.map(({ id }) => id)).not.toContain(manual.sessionId);
  });
});

async function seedLiveCycle(f: IssueDeletionFixture, taskId: string) {
  const [decision] = await f.database.select().from(taskPlanningDecisions).where(eq(taskPlanningDecisions.taskId, taskId));
  const ids = [crypto.randomUUID(), crypto.randomUUID()];
  const sessions = ids.map((id, index) => ({ id, taskId, projectId: f.project.id, userId: f.member.id, planningDecisionId: decision!.id, route: "tech_spec", requestKey: crypto.randomUUID(), checkoutPath: "/work/shop", dirty: false, status: "running", runtime: "flow_dev", hostId: "review-host", purpose: index === 0 ? "review" : "review_execute" }));
  await f.database.insert(taskTerminalSessions).values(sessions as never);
  await f.database.insert(taskReviewCycles).values({ id: crypto.randomUUID(), taskId, projectId: f.project.id, hostId: "review-host", startedBy: f.member.id, requestKey: crypto.randomUUID(), reviewerAgent: "claude", reviewerModel: "opus", reviewerEffort: "max", executorAgent: "claude", executorModel: "sonnet", executorEffort: "high", reviewSessionId: ids[0]!, executeSessionId: ids[1]!, tasksFolder: "docs/specs/issue", partial: false, state: "reviewing", stepRole: "review", startedAt: deletion.clock.now });
  const [reviewCycle] = await f.database.select({ id: taskReviewCycles.id }).from(taskReviewCycles).where(eq(taskReviewCycles.taskId, taskId));
  await f.database.update(taskTerminalSessions).set({ reviewCycleId: reviewCycle!.id }).where(eq(taskTerminalSessions.taskId, taskId));
  await f.database.insert(taskReviewRounds).values({ cycleId: reviewCycle!.id, number: 1, reviewSessionId: ids[0]!, executeSessionId: ids[1]! });
  return reviewCycle!.id;
}

const ONE_SECOND_MS = 1_000;
