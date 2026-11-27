import { afterEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { taskReviewCycles, taskReviewRounds } from "../src/infra/database/schema";
import type { ScriptStep } from "../src/infra/terminal/scriptedSessionSteps";
import { cycle, type WorkerWorld } from "./session-worker-support";
import { closeTaskFixture } from "./task-api-support";
import { cleanupTerminalFolders } from "./terminal-support";
import { reviewCycleWorkerWorld } from "./review-cycle-world";
import { FOLDER } from "./plan-support";

afterEach(async () => { await closeTaskFixture(); await cleanupTerminalFolders(); });

const ONE_SECOND_MS = 1_000;
const REPORT_004 = `${FOLDER}/reviews/review-004.md`;
const STAGE_PATH = `${FOLDER}/reviews/etapa.md`;
const REVIEW_BY_SHELL: ScriptStep[] = [
  { kind: "write_file", path: REPORT_004, content: "Relatório gravado pelo shell", shell: true },
  { kind: "write_file", path: STAGE_PATH, content: `etapa: execute\nrelatorio: ${REPORT_004}\n`, shell: true },
  { kind: "end_turn" },
  { kind: "wait_message" },
];
const EXECUTION_BY_SHELL: ScriptStep[] = [
  { kind: "write_file", path: STAGE_PATH, content: "etapa: review\n", shell: true },
  { kind: "end_turn" },
  { kind: "wait_message" },
];

describe("ReviewCycleStep with files written by shell commands", () => {
  it("advances review and execution without file edit events and records the report version", async () => {
    const world = await reviewCycleWorkerWorld(REVIEW_BY_SHELL, EXECUTION_BY_SHELL);
    await cycle(world.worker);
    await advance(world.worker);
    expect(await row(world)).toMatchObject({ state: "reviewing", stepRole: "review", round: 2, failure: null });
    const rounds = await world.setup.database.select().from(taskReviewRounds).where(eq(taskReviewRounds.cycleId, world.reviewCycle.id));
    const first = rounds.find(({ number }) => number === 1);
    expect(first).toMatchObject({ reportPath: REPORT_004 });
    expect(first!.reportVersionId).not.toBeNull();
    expect(first!.executeSessionId).not.toBeNull();
  });
});

async function advance(world: WorkerWorld) { world.clock.advance(ONE_SECOND_MS); await cycle(world); await cycle(world); }
async function row(world: Awaited<ReturnType<typeof reviewCycleWorkerWorld>>) { return (await world.setup.database.select().from(taskReviewCycles).where(eq(taskReviewCycles.id, world.reviewCycle.id)))[0]!; }
