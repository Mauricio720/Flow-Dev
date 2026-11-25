import type { ReviewCycleRecord } from "../../database/dao/reviewCycleDao";
import type { SessionLog } from "../terminal/sessionLog";
import type { ReviewRole, ReviewStage } from "./reviewCycleTypes";

export type ReviewLogEvent = "cycle_started" | "step_opened" | "step_continued" | "stage_read" | "step_failed" | "cycle_finished";
export type ReviewLogFields = { cycleId: string; taskId: string; round: number; role: ReviewRole; sessionId: string | null; durationMs: number; stage?: ReviewStage | null; reportPath?: string | null; reason?: string };
export type StageReadLog = { cycle: ReviewCycleRecord; role: ReviewRole; sessionId: string; stage: ReviewStage; reportPath: string | null; at: Date };

const REVIEW_LOG_PREFIX = "[review]";
const MINIMUM_DURATION_MS = 0;

export function elapsedMs(from: Date, to: Date) {
  return Math.max(MINIMUM_DURATION_MS, to.getTime() - from.getTime());
}

export function logReview(log: SessionLog, event: ReviewLogEvent, fields: ReviewLogFields) {
  log.info(`${REVIEW_LOG_PREFIX} ${event}`, fields);
}

export function logStageRead(log: SessionLog, input: StageReadLog) {
  const { cycle, role, sessionId, stage, reportPath, at } = input;
  logReview(log, "stage_read", { cycleId: cycle.id, taskId: cycle.taskId, round: cycle.round, role, sessionId, stage, reportPath, durationMs: elapsedMs(cycle.stepStartedAt ?? cycle.startedAt, at) });
}
