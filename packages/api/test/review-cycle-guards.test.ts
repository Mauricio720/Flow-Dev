import { afterEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import type { ScriptStep } from "../src/infra/terminal/scriptedSessionSteps";
import { reviewContinuation } from "../src/application/services/review/reviewPrompts";
import { ScriptedSessionRuntime } from "../src/infra/terminal/scriptedSessionRuntime";
import { taskReviewRounds } from "../src/infra/database/schema";
import { cycle, sendMessage } from "./session-worker-support";
import { closeTaskFixture } from "./task-api-support";
import { cleanupTerminalFolders } from "./terminal-support";
import { FOLDER } from "./plan-support";
import { reviewCycleWorkerWorld } from "./review-cycle-world";
import { alignWorkerClock, cycleAtCurrentTime, REVIEW_EXECUTE, row } from "./review-cycle-sessions-support";
import { GUARD_REASONS, stopForGuard, type GuardInvalidation } from "./review-cycle-guards-support";

afterEach(async () => { await closeTaskFixture(); await cleanupTerminalFolders(); });

const INVALIDATIONS: GuardInvalidation[] = ["claim", "planning", "taskSet"];
const STATES = ["executing", "caveats"] as const;

describe("ReviewCycleStep guards", () => {
  for (const state of STATES) for (const invalidation of INVALIDATIONS) {
    it(`V-06h stops ${state} when ${invalidation} is invalid`, async () => {
      const result = await stopForGuard(state, invalidation);
      expect(result.stopped).toMatchObject({ state: "stopped", stopReason: GUARD_REASONS[invalidation], endedAt: expect.any(Date) });
      expect(result.sessions.map(({ status }) => status)).toEqual(["ended", "ended"]);
      expect(result.world.worker.log.entries.filter(({ event }) => event === "[review] cycle_finished").map(({ fields }) => fields.reason)).toEqual([GUARD_REASONS[invalidation]]);
    });
  }

  it("V-06i ignores a review turn outside its role and reads the next turn after continuation", async () => {
    const runtime = new ScriptedSessionRuntime({ script: ({ purpose }) => purpose === "review" ? REVIEW_CONVERSATION : EXECUTE_AFTER_MESSAGE });
    const world = await reviewCycleWorkerWorld(REVIEW_CONVERSATION, EXECUTE_AFTER_MESSAGE, { runtimes: { claude: runtime } });
    await alignWorkerClock(world.worker, (await row(world)).startedAt);
    await cycle(world.worker);
    await cycleAtCurrentTime(world.worker);
    await cycleAtCurrentTime(world.worker);
    const executing = await row(world);
    expect(executing).toMatchObject({ state: "executing", round: 1 });
    await sendMessage(world.worker, executing.reviewSessionId!, "O relatório mudou na conversa.");
    await cycleAtCurrentTime(world.worker);
    await cycleAtCurrentTime(world.worker);
    expect(await row(world)).toMatchObject({ state: "executing", round: 1 });
    await sendMessage(world.worker, executing.executeSessionId!, "Continue a execução.");
    for (let tick = 0; tick < 6; tick += 1) await cycleAtCurrentTime(world.worker);
    expect(await row(world)).toMatchObject({ state: "approved", round: 2 });
    const [secondRound] = await world.setup.database.select().from(taskReviewRounds).where(eq(taskReviewRounds.number, 2));
    expect(secondRound).toMatchObject({ verdict: "approved", reportPath: REPORT_006 });
    expect(runtime.runnerOf(executing.reviewSessionId!).received).toContain(reviewContinuation({ folder: FOLDER, partial: false }));
    expect(world.worker.log.entries.filter(({ event }) => event === "[review] stage_read").map(({ fields }) => [fields.role, fields.round])).toEqual([["review", 1], ["execute", 1], ["review", 2]]);
  });
});

const REPORT_005 = `${FOLDER}/reviews/review-005.md`;
const REPORT_006 = `${FOLDER}/reviews/review-006.md`;
const STAGE_PATH = `${FOLDER}/reviews/etapa.md`;
const REVIEW_CONVERSATION: ScriptStep[] = [...REVIEW_EXECUTE.slice(0, 3), { kind: "wait_message" }, { kind: "write_file", path: REPORT_005, content: "Relatório da conversa" }, { kind: "write_file", path: STAGE_PATH, content: `etapa: aprovada\nrelatorio: ${REPORT_005}\n` }, { kind: "end_turn" }, { kind: "wait_message" }, { kind: "write_file", path: REPORT_006, content: "Relatório da rodada" }, { kind: "write_file", path: STAGE_PATH, content: `etapa: aprovada\nrelatorio: ${REPORT_006}\n` }, { kind: "end_turn" }];
const EXECUTE_AFTER_MESSAGE: ScriptStep[] = [{ kind: "wait_message" }, { kind: "write_file", path: STAGE_PATH, content: "etapa: review\n" }, { kind: "end_turn" }, { kind: "wait_message" }];
