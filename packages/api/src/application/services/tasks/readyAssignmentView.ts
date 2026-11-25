import type { ReadyAssignmentState, TaskPublication } from "./taskContracts";

export const READY_ASSIGNMENT_WINDOW_MS = 120_000;

export function readyAssignmentView(publication: Pick<TaskPublication, "assignToSelf" | "readyAssignment" | "createdAt">, now: Date): null | { state: ReadyAssignmentState } {
  if (!publication.assignToSelf) return null;
  if (publication.readyAssignment) return { state: publication.readyAssignment };
  const age = now.getTime() - publication.createdAt.getTime();
  return { state: age < READY_ASSIGNMENT_WINDOW_MS ? "pending" : "unconfirmed" };
}
