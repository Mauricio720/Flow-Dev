import type { Project, ProjectPage } from "@/lib/projects/contract";

export type CatalogRequest = { search: string; cursor?: string };
export type CatalogStatus = "ready" | "loading" | "failed";
export type CatalogLoad = { kind: "ready"; page: ProjectPage } | { kind: "failed" };
export type CatalogViewer = { isAdmin: boolean; lastProjectId: string | null };
export type CatalogState = { items: Project[]; nextCursor: string | null; appliedSearch: string; status: CatalogStatus; pending: CatalogRequest | null };
export type CatalogAction =
  | { type: "requested"; request: CatalogRequest }
  | { type: "loaded"; request: CatalogRequest; page: ProjectPage }
  | { type: "failed" }
  | { type: "cleared" };

const FIRST_PAGE: CatalogRequest = { search: "" };
const EMPTY_CATALOG: CatalogState = { items: [], nextCursor: null, appliedSearch: "", status: "ready", pending: null };

export function mergeProjectPages(current: Project[], incoming: Project[]) {
  const byId = new Map<string, Project>();
  [...current, ...incoming].forEach((project) => byId.set(project.id, project));
  return [...byId.values()];
}

export function initialCatalogState(load: CatalogLoad): CatalogState {
  if (load.kind === "failed") return { ...EMPTY_CATALOG, status: "failed", pending: FIRST_PAGE };
  return { ...EMPTY_CATALOG, items: mergeProjectPages([], load.page.items), nextCursor: load.page.nextCursor };
}

export function catalogReducer(state: CatalogState, action: CatalogAction): CatalogState {
  if (action.type === "requested") return { ...state, status: "loading", pending: action.request };
  if (action.type === "failed") return { ...state, status: "failed" };
  if (action.type === "cleared") return EMPTY_CATALOG;
  const previous = action.request.cursor ? state.items : [];
  return { items: mergeProjectPages(previous, action.page.items), nextCursor: action.page.nextCursor, appliedSearch: action.request.search, status: "ready", pending: null };
}
