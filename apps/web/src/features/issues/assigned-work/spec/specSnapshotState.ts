import { acceptSnapshot, emptyEventState, reduceSpecEvents, type ReducibleEvent, type SpecEventState } from "@flow-dev/api/spec";
import type { SpecEventRecord, SpecFailure, SpecSnapshot } from "./specContract";
import { accessProblem } from "@/lib/tasks/taskFailure";

export type SpecState = { scope: string; snapshot: SpecSnapshot | null; events: SpecEventState; afterCursor: string | null; olderCursor: string | null; failure: SpecFailure | null; contactLost: boolean };
export type SpecAction =
  | { type: "snapshot"; scope: string; snapshot: SpecSnapshot }
  | { type: "events"; scope: string; items: SpecEventRecord[]; after: string | null; older?: string | null }
  | { type: "failed"; scope: string; failure: SpecFailure };

export const emptySpecState = (scope: string, snapshot: SpecSnapshot | null = null): SpecState => ({ scope, snapshot, events: emptyEventState, afterCursor: snapshot?.eventCursor ?? null, olderCursor: null, failure: null, contactLost: false });

function toReducible(event: SpecEventRecord): ReducibleEvent {
  const payload = event.payload as { toolCallId?: string | null; status?: string | null; text?: string };
  return { id: event.id, sequence: event.sequence, attemptId: event.attemptId, kind: event.kind, payload };
}

export function specReducer(state: SpecState, action: SpecAction): SpecState {
  if (action.scope !== state.scope) return state;
  if (action.type === "snapshot") return { ...state, snapshot: acceptSnapshot(state.snapshot, action.snapshot), failure: null, contactLost: false };
  if (action.type === "events") return { ...state, events: reduceSpecEvents(state.events, action.items.map(toReducible)), afterCursor: action.after ?? state.afterCursor, olderCursor: action.older === undefined ? state.olderCursor : action.older };
  if (accessProblem(action.failure)) return { ...emptySpecState(state.scope), failure: action.failure };
  return { ...state, failure: action.failure, contactLost: true };
}

export function visibleEvents(state: SpecState) {
  return state.events.entries;
}
