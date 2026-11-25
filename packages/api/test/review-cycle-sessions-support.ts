import { eq } from "drizzle-orm";
import { expect } from "vitest";
import { taskReviewCycles, taskTerminalSessions } from "../src/infra/database/schema";
import { DrizzleSessionControlDao } from "../src/infra/database/dao/terminal/drizzleSessionControlDao";
import type { ScriptStep } from "../src/infra/terminal/scriptedSessionSteps";
import type { ScriptedRuntimeOptions } from "../src/infra/terminal/scriptedSessionRuntime";
import { cycle, sendMessage, type WorkerWorld } from "./session-worker-support";
import { reviewCycleWorkerWorld } from "./review-cycle-world";
import { FOLDER } from "./plan-support";

const ONE_SECOND_MS = 1_000;
const MAX_TICKS = 24;
export const REMOVED_MODEL = "gpt-removed";
export const MODEL_UNAVAILABLE = "O modelo gpt-removed não está mais disponível no Codex. Troque o modelo da sessão.";
export const INTERRUPTED_REASON = "A sessão foi interrompida ou encerrada antes de terminar a etapa.";
export const REPORT_004 = `${FOLDER}/reviews/review-004.md`;
const REPORT_005 = `${FOLDER}/reviews/review-005.md`;
const STAGE_PATH = `${FOLDER}/reviews/etapa.md`;
export const OPERATOR_MESSAGE = "Atualizei o resultado da revisão; continue pela etapa execute.";
export const EMPTY_CATALOG = { read: async () => ({ available: true, reason: null, version: "1", models: [], refreshedAt: "2026-11-23T14:32:00.000Z" }) };
export const WAIT: ScriptStep[] = [{ kind: "wait_message" }];
export const CRASH: ScriptStep[] = [{ kind: "crash" }];
export const REVIEW_EXECUTE: ScriptStep[] = [{ kind: "write_file", path: REPORT_004, content: "Relatório" }, { kind: "write_file", path: STAGE_PATH, content: `etapa: execute\nrelatorio: ${REPORT_004}\n` }, { kind: "end_turn" }, { kind: "wait_message" }];
const EXECUTION_REVIEW: ScriptStep[] = [{ kind: "write_file", path: STAGE_PATH, content: "etapa: review\n" }, { kind: "end_turn" }, { kind: "wait_message" }];
const REVIEW_TWO_WITH_HOLD: ScriptStep[] = [...REVIEW_EXECUTE.slice(0, 3), { kind: "wait_message" }, { kind: "write_file", path: REPORT_005, content: "Relatório 2" }, { kind: "write_file", path: STAGE_PATH, content: `etapa: execute\nrelatorio: ${REPORT_005}\n` }, { kind: "end_turn" }];
const REVIEW_AFTER_INTERRUPT: ScriptStep[] = [{ kind: "wait_message" }, { kind: "wait_message" }, ...REVIEW_EXECUTE.slice(0, 3)];
export const REVIEW_TWICE_OR_EXECUTE: ScriptedRuntimeOptions["script"] = ({ purpose }) => purpose === "review" ? REVIEW_TWO_WITH_HOLD : EXECUTION_REVIEW;

type CycleWorld = Awaited<ReturnType<typeof reviewCycleWorkerWorld>>;

export async function advance(world: WorkerWorld) {
  world.clock.advance(ONE_SECOND_MS);
  await cycle(world);
  await cycle(world);
}

export async function alignWorkerClock(world: WorkerWorld, startedAt: Date) {
  const drift = startedAt.getTime() - world.clock.now().getTime() - ONE_SECOND_MS;
  if (drift > 0) world.clock.advance(drift);
}

export async function cycleAtCurrentTime(world: WorkerWorld) {
  const drift = Date.now() - world.clock.now().getTime();
  if (drift > 0) world.clock.advance(drift);
  await cycle(world);
}

export async function request(world: CycleWorld, action: "retry" | "stop") {
  const current = await row(world);
  return world.service.request({ taskId: world.setup.taskId, cycleId: current.id, revision: current.revision, action, by: world.setup.ownerId, at: world.worker.clock.now() });
}

export async function row(world: CycleWorld) {
  return (await world.setup.database.select().from(taskReviewCycles).where(eq(taskReviewCycles.id, world.reviewCycle.id)))[0]!;
}

export async function sessions(world: CycleWorld) {
  return world.setup.database.select().from(taskTerminalSessions).where(eq(taskTerminalSessions.reviewCycleId, world.reviewCycle.id));
}

export async function tickUntil(world: CycleWorld, reached: (current: Awaited<ReturnType<typeof row>>) => boolean, onTick?: (current: Awaited<ReturnType<typeof row>>) => void) {
  for (let tick = 0; tick < MAX_TICKS; tick += 1) {
    await cycleAtCurrentTime(world.worker);
    const current = await row(world);
    onTick?.(current);
    if (reached(current)) return current;
  }
  throw new Error("O ciclo não chegou ao estado esperado.");
}

export async function driveReviewRoundTwo(world: CycleWorld) {
  return tickUntil(world, (current) => current.state === "reviewing" && current.round === 2);
}

export async function reviewerInterruptRecovers() {
  const world = await reviewCycleWorkerWorld(REVIEW_AFTER_INTERRUPT, WAIT);
  await cycle(world.worker);
  await advance(world.worker);
  const current = await row(world);
  await new DrizzleSessionControlDao(world.setup.database).requestInterrupt(current.reviewSessionId!, new Date(current.stepStartedAt!.getTime() + ONE_SECOND_MS));
  await cycle(world.worker);
  expect(await row(world)).toMatchObject({ state: "failed", failure: INTERRUPTED_REASON });
  await sendMessage(world.worker, current.reviewSessionId!, OPERATOR_MESSAGE);
  await advance(world.worker);
  await sendMessage(world.worker, current.reviewSessionId!, OPERATOR_MESSAGE);
  await advance(world.worker);
  expect(await row(world)).toMatchObject({ state: "executing", round: 1, pendingAction: null });
}
