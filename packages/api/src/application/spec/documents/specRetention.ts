const MILLISECONDS_PER_DAY = 86_400_000;
export const RUNTIME_DIAGNOSTIC_RETENTION_DAYS = 30;

export type RetentionSubject = { kind: "package" | "approval" | "answer" | "event" | "runtime_diagnostic"; capturedAt: Date | null; captureComplete: boolean };

export function mayDelete(subject: RetentionSubject, now: Date) {
  if (subject.kind !== "runtime_diagnostic") return false;
  if (!subject.captureComplete || !subject.capturedAt) return false;
  return now.getTime() - subject.capturedAt.getTime() >= RUNTIME_DIAGNOSTIC_RETENTION_DAYS * MILLISECONDS_PER_DAY;
}
