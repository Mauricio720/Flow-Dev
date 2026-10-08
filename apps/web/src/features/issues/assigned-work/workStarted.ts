import type { WorkSnapshot } from "./contract";

const NOT_STARTED_STATUSES: (string | null)[] = [null, "awaiting"];

export function workStarted({ detail }: WorkSnapshot) {
  const { planning } = detail;
  return !NOT_STARTED_STATUSES.includes(planning.status) || planning.operation !== null;
}
