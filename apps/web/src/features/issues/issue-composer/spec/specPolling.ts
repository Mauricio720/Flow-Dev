import type { SpecSnapshot } from "./specContract";

const FAST_MS = 1_000;
const WAITING_MS = 5_000;
const SETTLED_MS = 30_000;
const FAST_STATES = ["queued", "running", "finalizing", "stopping"];
const WAITING_STATES = ["waiting_question", "waiting_permission", "review"];

export function specPollInterval(snapshot: SpecSnapshot | null) {
  if (!snapshot) return null;
  if (snapshot.attempt?.state === "reconciling" || FAST_STATES.includes(snapshot.state)) return FAST_MS;
  return WAITING_STATES.includes(snapshot.state) ? WAITING_MS : SETTLED_MS;
}
