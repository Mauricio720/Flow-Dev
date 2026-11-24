export type PlanLogFields = Record<string, string | number | boolean | null>;

export interface PlanLog {
  manifestInvalid(fields: PlanLogFields): void;
  saved(fields: PlanLogFields): void;
  conflict(fields: PlanLogFields): void;
  itemStarted(fields: PlanLogFields): void;
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
}
