import { afterEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { taskReviewCycles, taskTerminalMessages, taskTerminalRequests, taskTerminalSessions } from "../src/infra/database/schema";
import type { ScriptStep } from "../src/infra/terminal/scriptedSessionSteps";
import { DrizzleSessionRequestDao } from "../src/infra/database/dao/terminal/drizzleSessionRequestDao";
import { cycle, type WorkerWorld } from "./session-worker-support";
import { closeTaskFixture } from "./task-api-support";
import { cleanupTerminalFolders } from "./terminal-support";
import { reviewCycleWorkerWorld } from "./review-cycle-world";
import { cycleAtCurrentTime, tickUntil } from "./review-cycle-sessions-support";
import { FOLDER } from "./plan-support";

afterEach(async () => {
  await closeTaskFixture();
  await cleanupTerminalFolders();
});

describe("ReviewCycleStep pending requests", () => {
  it("V-07a waits through an unanswered execution question and continues after its answer", async () => {
    const world = await reviewCycleWorkerWorld(REVIEW_EXECUTE, EXECUTION_QUESTION, { permissions: undefined });
    const executionId = await startExecution(world);
    await setAskAll(world, executionId);
    await advanceCycle(world.worker);
    const [request] = await pendingRequests(world, executionId);
    expect(request).toMatchObject({ kind: "question", status: "pending" });
    const messages = await messageCount(world);
    for (let tick = 0; tick < THREE_TICKS; tick += 1) {
      world.worker.clock.advance(TWO_HOURS_MS);
      await cycle(world.worker);
    }
    expect(await cycleRow(world)).toMatchObject({ state: "executing", stepRole: "execute", round: 1 });
    expect(await messageCount(world)).toBe(messages);
    await answerRequest(world, request!.id, { answers: { [QUESTION]: "Continuar" } });
    const next = await tickUntil(world, (current) => current.state === "reviewing" && current.round === 2);
    expect(next).toMatchObject({ stepRole: "review" });
  });

  it("V-07b waits through an unanswered reviewer permission and continues after it is allowed", async () => {
    const world = await reviewCycleWorkerWorld(REVIEW_PERMISSION, [], { permissions: undefined });
    await cycle(world.worker);
    const [review] = await sessionsOf(world);
    await setAskAll(world, review!.id);
    await advanceCycle(world.worker);
    const [request] = await pendingRequests(world, review!.id);
    expect(request).toMatchObject({ kind: "permission", status: "pending" });
    const messages = await messageCount(world);
    for (let tick = 0; tick < THREE_TICKS; tick += 1) {
      world.worker.clock.advance(TWO_HOURS_MS);
      await cycle(world.worker);
    }
    expect(await cycleRow(world)).toMatchObject({ state: "reviewing", stepRole: "review", round: 1 });
    expect(await messageCount(world)).toBe(messages);
    await answerRequest(world, request!.id, { decision: "allow" });
    const next = await tickUntil(world, (current) => current.state === "executing");
    expect(next).toMatchObject({ stepRole: "execute", round: 1 });
  });
});

async function startExecution(world: Awaited<ReturnType<typeof reviewCycleWorkerWorld>>) {
  await cycle(world.worker);
  await advanceCycle(world.worker);
  await cycle(world.worker);
  const [record] = await world.setup.database.select().from(taskReviewCycles).where(eq(taskReviewCycles.id, world.reviewCycle.id));
  return record!.executeSessionId!;
}

async function advanceCycle(world: WorkerWorld) {
  await cycleAtCurrentTime(world);
}

async function setAskAll(world: Awaited<ReturnType<typeof reviewCycleWorkerWorld>>, sessionId: string) { await world.setup.database.update(taskTerminalSessions).set({ permissionMode: "ask_all" }).where(eq(taskTerminalSessions.id, sessionId)); }

async function pendingRequests(world: Awaited<ReturnType<typeof reviewCycleWorkerWorld>>, sessionId: string) { return world.setup.database.select().from(taskTerminalRequests).where(eq(taskTerminalRequests.sessionId, sessionId)); }

async function answerRequest(world: Awaited<ReturnType<typeof reviewCycleWorkerWorld>>, requestId: string, answer: unknown) { await new DrizzleSessionRequestDao(world.setup.database).answerIfPending({ requestId, answer, answeredBy: world.setup.ownerId, at: world.worker.clock.now() }); }

async function cycleRow(world: Awaited<ReturnType<typeof reviewCycleWorkerWorld>>) { return (await world.setup.database.select().from(taskReviewCycles).where(eq(taskReviewCycles.id, world.reviewCycle.id)))[0]!; }

async function sessionsOf(world: Awaited<ReturnType<typeof reviewCycleWorkerWorld>>) {
  return world.setup.database.select().from(taskTerminalSessions).where(eq(taskTerminalSessions.reviewCycleId, world.reviewCycle.id));
}

async function messageCount(world: Awaited<ReturnType<typeof reviewCycleWorkerWorld>>) {
  return (await world.setup.database.select().from(taskTerminalMessages)).length;
}

const QUESTION = "Seguir com a revisão?";
const QUESTION_SCRIPT: ScriptStep = { kind: "ask", questions: [{ question: QUESTION, header: "Revisão", multiSelect: false, options: [{ label: "Continuar", description: "Continuar a rodada" }] }] };
const PERMISSION_SCRIPT: ScriptStep = { kind: "permission", toolName: "Bash", input: { command: "pnpm test" } };
const REPORT = `${FOLDER}/reviews/review-004.md`;
const STAGE_PATH = `${FOLDER}/reviews/etapa.md`;
const REVIEW_EXECUTE: ScriptStep[] = [{ kind: "write_file", path: REPORT, content: "Reprovado" }, { kind: "write_file", path: STAGE_PATH, content: `etapa: execute\nrelatorio: ${REPORT}\n` }, { kind: "end_turn" }, { kind: "wait_message" }];
const EXECUTION_QUESTION: ScriptStep[] = [QUESTION_SCRIPT, { kind: "write_file", path: STAGE_PATH, content: "etapa: review\n" }, { kind: "end_turn" }];
const REVIEW_PERMISSION: ScriptStep[] = [PERMISSION_SCRIPT, { kind: "write_file", path: REPORT, content: "Reprovado" }, { kind: "write_file", path: STAGE_PATH, content: `etapa: execute\nrelatorio: ${REPORT}\n` }, { kind: "end_turn" }];
const ONE_SECOND_MS = 1_000;
const TWO_HOURS_MS = 2 * 60 * 60 * ONE_SECOND_MS;
const THREE_TICKS = 3;
