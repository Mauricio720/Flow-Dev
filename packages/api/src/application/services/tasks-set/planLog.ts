export type PlanLogFields = Record<string, string | number | boolean | null>;

export interface PlanLog {
  manifestInvalid(fields: PlanLogFields): void;
  saved(fields: PlanLogFields): void;
  conflict(fields: PlanLogFields): void;
  itemStarted(fields: PlanLogFields): void;
  runStarted(fields: PlanLogFields): void;
  runSessionStarted(fields: PlanLogFields): void;
  runPaused(fields: PlanLogFields): void;
  runResumed(fields: PlanLogFields): void;
  runCompleted(fields: PlanLogFields): void;
}

const LOG_PREFIX = "[plan]";

export function formatPlanLog(event: string, fields: PlanLogFields) {
  const pairs = Object.entries(fields).map(([key, value]) => `${key}=${value}`);
  return `${LOG_PREFIX} ${event} ${pairs.join(" ")}`.trim();
}

export class ConsolePlanLog implements PlanLog {
  manifestInvalid(fields: PlanLogFields) {
    console.warn(formatPlanLog("manifest_invalid", fields));
  }

  saved(fields: PlanLogFields) {
    console.info(formatPlanLog("saved", fields));
  }

  conflict(fields: PlanLogFields) {
    console.warn(formatPlanLog("conflict", fields));
  }

  itemStarted(fields: PlanLogFields) {
    console.info(formatPlanLog("item_started", fields));
  }

  runStarted(fields: PlanLogFields) {
    console.info(formatPlanLog("run_started", fields));
  }

  runSessionStarted(fields: PlanLogFields) {
    console.info(formatPlanLog("run_session_started", fields));
  }

  runPaused(fields: PlanLogFields) {
    console.info(formatPlanLog("run_paused", fields));
  }

  runResumed(fields: PlanLogFields) {
    console.info(formatPlanLog("run_resumed", fields));
  }

  runCompleted(fields: PlanLogFields) {
    console.info(formatPlanLog("run_completed", fields));
  }
}
