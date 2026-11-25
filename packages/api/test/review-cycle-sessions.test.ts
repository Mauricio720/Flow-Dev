import { afterEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { taskReviewCycles, taskTerminalSessions } from "../src/infra/database/schema";
import { ScriptedSessionRuntime } from "../src/infra/terminal/scriptedSessionRuntime";
import { executeInitialPrompt, reviewInitialPrompt } from "../src/application/services/review/reviewPrompts";
import { cycle, scopeOf } from "./session-worker-support";
import { closeTaskFixture } from "./task-api-support";
import { cleanupTerminalFolders } from "./terminal-support";
import { reviewCycleWorkerWorld } from "./review-cycle-world";
import { FOLDER } from "./plan-support";
import { advance, alignWorkerClock, CRASH, driveReviewRoundTwo, EMPTY_CATALOG, INTERRUPTED_REASON, MODEL_UNAVAILABLE, REMOVED_MODEL, request, REPORT_004, REVIEW_EXECUTE, REVIEW_TWICE_OR_EXECUTE, reviewerInterruptRecovers, row, sessions, tickUntil, cycleAtCurrentTime, WAIT } from "./review-cycle-sessions-support";

const MAX_RESUME_TICKS = 4;

afterEach(async () => { await closeTaskFixture(); await cleanupTerminalFolders(); });

describe("ReviewCycleStep session failures", () => {
  it("V-06d fails on an unavailable executor model, retries the failure, and stops", async () => {
    const world = await reviewCycleWorkerWorld(REVIEW_EXECUTE, WAIT, { codexProbe: EMPTY_CATALOG });
    await world.setup.database.update(taskReviewCycles).set({ executorAgent: "codex", executorModel: REMOVED_MODEL, executorEffort: "medium" }).where(eq(taskReviewCycles.id, world.reviewCycle.id));
    await cycle(world.worker);
    await advance(world.worker);
    expect(await row(world)).toMatchObject({ state: "failed", stepRole: "execute", attempt: 1, failure: MODEL_UNAVAILABLE });
    await request(world, "retry");
    await cycle(world.worker);
    expect(await row(world)).toMatchObject({ state: "failed", stepRole: "execute", attempt: 2, failure: MODEL_UNAVAILABLE });
    await request(world, "stop");
    await cycle(world.worker);
    expect(await row(world)).toMatchObject({ state: "stopped", endedBy: world.setup.ownerId });
  });

  it("V-06e resumes a crashed reviewer with its same session and Claude history", async () => {
    const runtime = new ScriptedSessionRuntime({ script: CRASH, resumeScript: WAIT });
    const world = await reviewCycleWorkerWorld(CRASH, WAIT, { runtimes: { claude: runtime } });
    await cycle(world.worker);
    await advance(world.worker);
    const failed = await row(world);
    const [session] = await sessions(world);
    expect(failed).toMatchObject({ state: "failed", failure: INTERRUPTED_REASON, reviewSessionId: session!.id });
    await request(world, "retry");
    await cycle(world.worker);
    await cycle(world.worker);
    expect(runtime.resumes).toMatchObject([{ sessionId: session!.id, claudeSessionId: session!.claudeSessionId }]);
    expect(runtime.runnerOf(session!.id).received).toContain(reviewInitialPrompt({ folder: FOLDER, partial: false }));
    expect(await sessions(world)).toHaveLength(1);
  });

  it("V-06f resumes an interrupted execution only when the reviewer hands the turn back", async () => {
    const runtime = new ScriptedSessionRuntime({ script: REVIEW_TWICE_OR_EXECUTE, resumeScript: WAIT });
    const world = await reviewCycleWorkerWorld(REVIEW_EXECUTE, WAIT, { runtimes: { claude: runtime } });
    await alignWorkerClock(world.worker, (await row(world)).startedAt);
    await cycle(world.worker);
    await driveReviewRoundTwo(world);
    const current = await row(world);
    const executeId = current.executeSessionId!;
    await world.setup.database.update(taskTerminalSessions).set({ status: "interrupted", lastSignalAt: world.worker.clock.now() }).where(eq(taskTerminalSessions.id, executeId));
    const resumedBeforeHandover = () => runtime.resumes.some(({ sessionId }) => sessionId === executeId);
    const executing = await tickUntil(world, (next) => next.state === "executing" && next.round === 2, (next) => {
      expect(next.failure).toBeNull();
      if (next.state === "reviewing") expect(resumedBeforeHandover()).toBe(false);
    });
    expect(executing).toMatchObject({ executeSessionId: executeId, failure: null });
    for (let tick = 0; tick < MAX_RESUME_TICKS && !resumedBeforeHandover(); tick += 1) await cycleAtCurrentTime(world.worker);
    expect(runtime.resumes.map(({ sessionId }) => sessionId)).toContain(executeId);
  });

  it("V-06g replaces an ended executor and lets an interrupted reviewer recover by writing a stage", async () => {
    const world = await reviewCycleWorkerWorld(REVIEW_EXECUTE, WAIT);
    await cycle(world.worker);
    await advance(world.worker);
    const executing = await row(world);
    const oldExecuteId = executing.executeSessionId!;
    await world.harness.caller.session.end(scopeOf(world.worker, oldExecuteId));
    await cycle(world.worker);
    await cycle(world.worker);
    expect((await row(world)).state).toBe("failed");
    await request(world, "retry");
    await cycle(world.worker);
    const retried = await row(world);
    const sessionsNow = await sessions(world);
    expect(retried).toMatchObject({ state: "executing", attempt: 2, round: 1 });
    expect(retried.executeSessionId).not.toBe(oldExecuteId);
    expect(await world.harness.context.readPrompt(retried.executeSessionId!)).toBe(executeInitialPrompt({ folder: FOLDER, reportPath: REPORT_004 }));
    expect(sessionsNow.filter(({ status }) => status !== "ended" && status !== "launch_failed")).toHaveLength(2);
    await reviewerInterruptRecovers();
  });
});
