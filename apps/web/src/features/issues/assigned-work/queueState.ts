import type { QueueItem, QueueLoad, QueuePage, TaskFailure } from "./contract";

export type QueueState = {
  items: QueueItem[];
  nextCursor: string | null;
  availability: QueuePage["availability"] | null;
  retryAfterSeconds: number | null;
  failure: TaskFailure | null;
  busy: boolean;
};

export type QueueAction =
  | { type: "requested" }
  | { type: "loaded"; page: QueuePage; replace: boolean }
  | { type: "failed"; failure: TaskFailure };

function uniqueByIssue(items: QueueItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => !seen.has(item.issueNodeId) && seen.add(item.issueNodeId));
}

export function initialQueueState(load: QueueLoad): QueueState {
  const empty = { items: [], nextCursor: null, availability: null, retryAfterSeconds: null, busy: false };
  if (load.kind === "failed") return { ...empty, failure: load.failure };
  return { ...empty, items: uniqueByIssue(load.page.items), nextCursor: load.page.nextCursor, availability: load.page.availability, retryAfterSeconds: load.page.retryAfterSeconds, failure: null };
}

export function queueReducer(state: QueueState, action: QueueAction): QueueState {
  if (action.type === "requested") return { ...state, busy: true };
  if (action.type === "failed") return { ...state, busy: false, failure: action.failure };
  const items = action.replace ? action.page.items : [...state.items, ...action.page.items];
  return { items: uniqueByIssue(items), nextCursor: action.page.nextCursor, availability: action.page.availability, retryAfterSeconds: action.page.retryAfterSeconds, failure: null, busy: false };
}
