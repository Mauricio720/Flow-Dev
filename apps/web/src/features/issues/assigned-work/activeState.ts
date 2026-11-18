import type { ActiveFilter, ActiveItem, ActiveLoad, ActivePage, TaskFailure } from "./contract";

export type ActiveState = { filter: ActiveFilter; items: ActiveItem[]; nextCursor: string | null; failure: TaskFailure | null; busy: boolean };
export type ActiveAction =
  | { type: "requested"; filter: ActiveFilter }
  | { type: "loaded"; filter: ActiveFilter; page: ActivePage; replace: boolean }
  | { type: "failed"; failure: TaskFailure };

function uniqueByTask(items: ActiveItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => !seen.has(item.taskId) && seen.add(item.taskId));
}

export function initialActiveState(load: ActiveLoad): ActiveState {
  if (load.kind === "failed") return { filter: "mine", items: [], nextCursor: null, failure: load.failure, busy: false };
  return { filter: "mine", items: uniqueByTask(load.page.items), nextCursor: load.page.nextCursor, failure: null, busy: false };
}

export function activeReducer(state: ActiveState, action: ActiveAction): ActiveState {
  if (action.type === "requested") return { ...state, filter: action.filter, busy: true };
  if (action.type === "failed") return { ...state, busy: false, failure: action.failure };
  if (action.filter !== state.filter) return state;
  const items = action.replace ? action.page.items : [...state.items, ...action.page.items];
  return { filter: state.filter, items: uniqueByTask(items), nextCursor: action.page.nextCursor, failure: null, busy: false };
}
