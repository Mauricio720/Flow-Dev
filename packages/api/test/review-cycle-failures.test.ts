import { afterEach, describe, expect, it } from "vitest";
import { eq, sql } from "drizzle-orm";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { taskReviewCycles, taskTerminalMessages, taskTerminalSessions } from "../src/infra/database/schema";
import type { ScriptStep } from "../src/infra/terminal/scriptedSessionSteps";
import { executeInitialPrompt, reviewInitialPrompt } from "../src/application/services/review/reviewPrompts";
import { cycle, sendMessage, type WorkerWorld } from "./session-worker-support";
import { closeTaskFixture } from "./task-api-support";
import { cleanupTerminalFolders } from "./terminal-support";
import { reviewCycleWorkerWorld } from "./review-cycle-world";
import { FOLDER } from "./plan-support";

afterEach(async () => { await closeTaskFixture(); await cleanupTerminalFolders(); });

describe("ReviewCycleStep failures", () => {
  it("V-06a stops the third execution round and leaves its checkout file intact", async () => {
    const world = await reviewCycleWorkerWorld(REVIEW_004, EXECUTION_HOLD);
    await cycle(world.worker);
    await advance(world.worker);
    await advance(world.worker);
    await world.setup.database.update(taskReviewCycles).set({ state: "executing", stepRole: "execute", round: 3, stepStartedAt: world.worker.clock.now(), revision: sql`${taskReviewCycles.revision} + 1` }).where(eq(taskReviewCycles.id, world.reviewCycle.id));
    expect(await row(world)).toMatchObject({ state: "executing", round: 3 });
    const preserved = await readFile(join(world.clone, PRESERVED_PATH), "utf8");
    await request(world, "stop");
    await cycle(world.worker);
    expect(await row(world)).toMatchObject({ state: "stopped", round: 3, endedBy: world.setup.ownerId });
    expect((await sessions(world)).map(({ status }) => status)).toEqual(["ended", "ended"]);
    expect(await readFile(join(world.clone, PRESERVED_PATH), "utf8")).toBe(preserved);
    expect(world.worker.log.entries.map(({ event }) => event)).toContain("[review] cycle_finished");
  });

  it("V-06b fails on missing stages, idles without retries, and resends the same round message", async () => {
    const world = await reviewCycleWorkerWorld(REVIEW_RETRY, [{ kind: "end_turn" }, { kind: "wait_message" }]);
    await cycle(world.worker);
    await advance(world.worker);
    const failed = await row(world);
    const reviewId = failed.reviewSessionId!;
    expect(failed).toMatchObject({ state: "failed", round: 1, failure: `A sessão de revisão terminou sem atualizar ${STAGE_PATH}.` });
    const count = (await world.setup.database.select().from(taskTerminalMessages)).length;
    for (let tick = 0; tick < FIVE_TICKS; tick += 1) await advance(world.worker);
    expect(await row(world)).toMatchObject({ revision: failed.revision, state: "failed" });
    expect((await sessions(world)).map(({ id }) => id)).toEqual([reviewId]);
    expect((await world.setup.database.select().from(taskTerminalMessages)).length).toBe(count);
    expect(world.worker.log.entries.filter(({ event }) => event === "[review] step_failed")).toHaveLength(1);
    await request(world, "retry");
    await cycle(world.worker);
    expect(await row(world)).toMatchObject({ state: "reviewing", round: 1, reviewSessionId: reviewId });
    const prompt = reviewInitialPrompt({ folder: FOLDER, partial: false });
    const retryMessages = (await world.setup.database.select().from(taskTerminalMessages).where(eq(taskTerminalMessages.sessionId, reviewId))).filter(({ content }) => content === prompt);
    expect(retryMessages).toHaveLength(1);
    expect(world.worker.runtime.runnerOf(reviewId).received.filter((message) => message === prompt)).toHaveLength(1);
    await advance(world.worker);
    await advance(world.worker);
    expect(await row(world)).toMatchObject({ state: "failed", stepRole: "execute", round: 1, failure: `A sessão de execução terminou sem atualizar ${STAGE_PATH}.` });
    expect((await sessions(world)).map(({ id }) => id)).toHaveLength(2);
  });

  it("V-06c follows a valid later reviewer turn without a retry action", async () => {
    const world = await reviewCycleWorkerWorld(REVIEW_RECOVER, []);
    await cycle(world.worker);
    await advance(world.worker);
    const failed = await row(world);
    expect(failed.state).toBe("failed");
    await sendMessage(world.worker, failed.reviewSessionId!, OPERATOR_MESSAGE);
    await advance(world.worker);
    const continued = await row(world);
    expect(continued).toMatchObject({ state: "executing", round: 1, stepRole: "execute", pendingAction: null });
    const sessionsForCycle = await sessions(world);
    const review = world.worker.runtime.runnerOf(failed.reviewSessionId!);
    expect(review.received).toEqual([reviewInitialPrompt({ folder: FOLDER, partial: false }), OPERATOR_MESSAGE]);
    const execution = sessionsForCycle.find(({ purpose }) => purpose === "review_execute")!;
    expect(await world.harness.context.readPrompt(execution.id)).toBe(executeInitialPrompt({ folder: FOLDER, reportPath: REPORT_004 }));
  });
});

async function advance(world: WorkerWorld) { world.clock.advance(ONE_SECOND_MS); await cycle(world); await cycle(world); }
async function request(world: Awaited<ReturnType<typeof reviewCycleWorkerWorld>>, action: "stop" | "retry") { const current = await row(world); return world.service.request({ taskId: world.setup.taskId, cycleId: current.id, revision: current.revision, action, by: world.setup.ownerId, at: world.worker.clock.now() }); }
async function row(world: Awaited<ReturnType<typeof reviewCycleWorkerWorld>>) { return (await world.setup.database.select().from(taskReviewCycles).where(eq(taskReviewCycles.id, world.reviewCycle.id)))[0]!; }
async function sessions(world: Awaited<ReturnType<typeof reviewCycleWorkerWorld>>) { return world.setup.database.select().from(taskTerminalSessions).where(eq(taskTerminalSessions.reviewCycleId, world.reviewCycle.id)); }

const ONE_SECOND_MS = 1_000;
const FIVE_TICKS = 5;
const REPORT_CONTENT = "Relatório do ciclo";
const REPORT_004 = `${FOLDER}/reviews/review-004.md`;
const STAGE_PATH = `${FOLDER}/reviews/etapa.md`;
const PRESERVED_PATH = `${FOLDER}/arquivo-executado.txt`;
const OPERATOR_MESSAGE = "Atualizei o resultado da revisão; continue pela etapa execute.";
const REVIEW_004: ScriptStep[] = [{ kind: "write_file", path: REPORT_004, content: REPORT_CONTENT }, { kind: "write_file", path: STAGE_PATH, content: `etapa: execute\nrelatorio: ${REPORT_004}\n` }, { kind: "end_turn" }];
const EXECUTION_HOLD: ScriptStep[] = [{ kind: "write_file", path: PRESERVED_PATH, content: "resultado executado" }, { kind: "wait_message" }];
const REVIEW_RETRY: ScriptStep[] = [{ kind: "end_turn" }, { kind: "wait_message" }, ...REVIEW_004, { kind: "wait_message" }];
const REVIEW_RECOVER: ScriptStep[] = [{ kind: "end_turn" }, { kind: "wait_message" }, ...REVIEW_004];
