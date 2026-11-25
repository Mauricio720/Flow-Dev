import { asc, eq } from "drizzle-orm";
import { expect } from "vitest";
import { taskReviewCycles, taskReviewRounds, taskTerminalMessages, taskTerminalSessions } from "../src/infra/database/schema";
import type { ScriptStep } from "../src/infra/terminal/scriptedSessionSteps";
import { reviewContinuation, reviewInitialPrompt } from "../src/application/services/review/reviewPrompts";
import { reviewCycleWorkerWorld } from "./review-cycle-world";
import { FOLDER } from "./plan-support";

export type RoundsWorld = Awaited<ReturnType<typeof reviewCycleWorkerWorld>>;
type SessionRows = Awaited<ReturnType<typeof sessionsOf>>;

export const REPORT_004 = `${FOLDER}/reviews/review-004.md`;
const REPORT_005 = `${FOLDER}/reviews/review-005.md`;
const REPORT_CONTENT = "Relatório interno de revisão";
const STAGE_PATH = `${FOLDER}/reviews/etapa.md`;
const FIRST_ROUND: ScriptStep[] = [
  { kind: "write_file", path: REPORT_004, content: REPORT_CONTENT },
  { kind: "write_file", path: STAGE_PATH, content: `etapa: execute\nrelatorio: ${REPORT_004}\n` },
  { kind: "end_turn" },
  { kind: "wait_message" },
];
export const REVIEW_TWICE: ScriptStep[] = [
  ...FIRST_ROUND,
  { kind: "write_file", path: REPORT_005, content: "Relatório aprovado" },
  { kind: "write_file", path: STAGE_PATH, content: `etapa: aprovada\nrelatorio: ${REPORT_005}\n` },
  { kind: "end_turn" },
  { kind: "wait_message" },
];
export const REVIEW_THEN_ASK: ScriptStep[] = [
  ...FIRST_ROUND,
  { kind: "ask", questions: [{ question: "Revisar agora?", header: "Revisão", options: [{ label: "Sim", description: "Continuar" }] }] },
];
export const EXECUTION: ScriptStep[] = [
  { kind: "write_file", path: STAGE_PATH, content: "etapa: review\n" },
  { kind: "end_turn" },
  { kind: "wait_message" },
];
export const APPROVED_ONCE: ScriptStep[] = [
  { kind: "write_file", path: REPORT_004, content: REPORT_CONTENT },
  { kind: "write_file", path: STAGE_PATH, content: `etapa: aprovada\nrelatorio: ${REPORT_004}\n` },
  { kind: "end_turn" },
];

export async function cycleRow(world: RoundsWorld) {
  return (await world.setup.database.select().from(taskReviewCycles).where(eq(taskReviewCycles.id, world.reviewCycle.id)))[0]!;
}

export async function sessionsOf(world: RoundsWorld) {
  return world.setup.database.select().from(taskTerminalSessions).where(eq(taskTerminalSessions.reviewCycleId, world.reviewCycle.id)).orderBy(asc(taskTerminalSessions.openedAt));
}

export async function continuationsOf(world: RoundsWorld, sessionId: string, content: string) {
  const messages = await world.setup.database.select().from(taskTerminalMessages).where(eq(taskTerminalMessages.sessionId, sessionId));
  return messages.filter((message) => message.content === content);
}

export async function userMessagesOf(world: RoundsWorld, sessionId: string) {
  const messages = await world.setup.database.select().from(taskTerminalMessages).where(eq(taskTerminalMessages.sessionId, sessionId));
  return messages.filter((message) => message.role === "user");
}

export async function expectRoundTwoMessage(world: RoundsWorld, sessions: SessionRows) {
  const reviewId = sessions.find((session) => session.purpose === "review")!.id;
  const messages = await continuationsOf(world, reviewId, reviewContinuation({ folder: FOLDER, partial: false }));
  expect(messages).toHaveLength(1);
  expect(await cycleRow(world)).toMatchObject({ round: 2, reviewSessionId: reviewId });
}

export async function expectApprovedAndClosed(world: RoundsWorld, sessions: SessionRows, endedAt: Date) {
  expect(await cycleRow(world)).toMatchObject({ state: "approved", round: 2, endedAt });
  const ended = await sessionsOf(world);
  expect(ended.map((session) => session.status)).toEqual(["ended", "ended"]);
  const rounds = await world.setup.database.select().from(taskReviewRounds).where(eq(taskReviewRounds.cycleId, world.reviewCycle.id)).orderBy(asc(taskReviewRounds.number));
  const [review, execute] = [sessions[0]!.id, sessions[1]!.id];
  expect(rounds.map((round) => [round.number, round.verdict, round.reviewSessionId, round.executeSessionId])).toEqual([[1, "rejected", review, execute], [2, "approved", review, execute]]);
}

export function expectReviewLogs(world: RoundsWorld, sessions: SessionRows) {
  const [review, execute] = [sessions[0]!.id, sessions[1]!.id];
  const logs = world.worker.log.entries.filter(({ event }) => event.startsWith("[review]"));
  const summary = logs.map(({ event, fields }) => [event, fields.round, fields.role, fields.sessionId, fields.stage, fields.reportPath]);
  expect(summary).toEqual([
    ["[review] cycle_started", 1, "review", null, undefined, undefined],
    ["[review] step_opened", 1, "review", review, undefined, undefined],
    ["[review] stage_read", 1, "review", review, "execute", REPORT_004],
    ["[review] step_opened", 1, "execute", execute, undefined, undefined],
    ["[review] stage_read", 1, "execute", execute, "review", null],
    ["[review] step_continued", 2, "review", review, undefined, undefined],
    ["[review] stage_read", 2, "review", review, "aprovada", REPORT_005],
    ["[review] cycle_finished", 2, "review", review, undefined, undefined],
  ]);
  expect(logs.every(({ fields }) => fields.cycleId === world.reviewCycle.id && fields.taskId === world.setup.taskId && typeof fields.durationMs === "number")).toBe(true);
  expect(JSON.stringify(logs)).not.toContain(REPORT_CONTENT);
  expect(JSON.stringify(logs)).not.toContain(reviewInitialPrompt({ folder: FOLDER, partial: false }));
}
