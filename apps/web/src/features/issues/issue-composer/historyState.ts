import type { HistoryLoad, TaskFailure, TaskPage, TaskSummary } from "./contract";
import { isPendingStatus } from "./workspaceState";

export type HistoryRequest = { search: string; cursor?: string; refresh?: boolean; background?: boolean };
export type HistoryStatus = "ready" | "loading" | "failed";
export type HistoryState = { items: TaskSummary[]; nextCursor: string | null; appliedSearch: string; status: HistoryStatus; pending: HistoryRequest | null; failure: TaskFailure | null };
export type HistoryAction =
  | { type: "requested"; request: HistoryRequest }
  | { type: "loaded"; request: HistoryRequest; page: TaskPage }
  | { type: "observed"; task: TaskSummary }
  | { type: "failed"; failure: TaskFailure };

const FIRST_PAGE: HistoryRequest = { search: "" };
const BACKGROUND_POLL_MS = 4_000;
const EMPTY_HISTORY: HistoryState = { items: [], nextCursor: null, appliedSearch: "", status: "ready", pending: null, failure: null };

function newestFirst(left: TaskSummary, right: TaskSummary) {
  if (left.createdAt !== right.createdAt) return left.createdAt < right.createdAt ? 1 : -1;
  return left.id < right.id ? 1 : -1;
}

function newerOf(known: TaskSummary | undefined, incoming: TaskSummary) {
  return known && known.version > incoming.version ? known : incoming;
}

export function mergeTaskPages(current: TaskSummary[], incoming: TaskSummary[]) {
  const byId = new Map<string, TaskSummary>();
  [...current, ...incoming].forEach((task) => byId.set(task.id, newerOf(byId.get(task.id), task)));
  return [...byId.values()].sort(newestFirst);
}

export function withCurrentTask(items: TaskSummary[], current: TaskSummary | null) {
  if (!current || !items.some((task) => task.id === current.id)) return items;
  return items.map((task) => (task.id === current.id ? current : task));
}

export function initialHistoryState(load: HistoryLoad): HistoryState {
  if (load.kind === "failed") return { ...EMPTY_HISTORY, status: "failed", pending: FIRST_PAGE, failure: load.failure };
  return { ...EMPTY_HISTORY, items: mergeTaskPages([], load.page.items), nextCursor: load.page.nextCursor };
}

function loadedItems(state: HistoryState, request: HistoryRequest, page: TaskPage) {
  const keepsLoaded = Boolean(request.cursor) || Boolean(request.refresh);
  return mergeTaskPages(keepsLoaded ? state.items : [], page.items);
}

function observedState(state: HistoryState, task: TaskSummary): HistoryState {
  const known = state.items.find((item) => item.id === task.id);
  if (!known || known.version >= task.version) return state;
  return { ...state, items: withCurrentTask(state.items, task) };
}

export function historyReducer(state: HistoryState, action: HistoryAction): HistoryState {
  if (action.type === "requested") return { ...state, status: "loading", pending: action.request, failure: null };
  if (action.type === "failed") return { ...state, status: "failed", failure: action.failure };
  if (action.type === "observed") return observedState(state, action.task);
  const nextCursor = action.request.background ? state.nextCursor : action.page.nextCursor;
  return { items: loadedItems(state, action.request, action.page), nextCursor, appliedSearch: action.request.search, status: "ready", pending: null, failure: null };
}

export function historyPollInterval(state: HistoryState) {
  if (state.status !== "ready") return null;
  return state.items.some((task) => isPendingStatus(task.status)) ? BACKGROUND_POLL_MS : null;
}
