import type { RepositoryCandidate, RepositoryCandidatePage } from "@/lib/projects/contract";

export type CandidateRequest = { search: string; cursor?: string };
export type CandidateState = { items: RepositoryCandidate[]; nextCursor: string | null; appliedSearch: string; status: "loading" | "ready" | "failed"; failureCode: unknown; pending: CandidateRequest };
export type CandidateAction =
  | { type: "requested"; request: CandidateRequest }
  | { type: "loaded"; request: CandidateRequest; page: RepositoryCandidatePage }
  | { type: "failed"; code: unknown };

const FIRST_BATCH: CandidateRequest = { search: "" };

export const INITIAL_CANDIDATES: CandidateState = { items: [], nextCursor: null, appliedSearch: "", status: "loading", failureCode: undefined, pending: FIRST_BATCH };

export function mergeCandidates(current: RepositoryCandidate[], incoming: RepositoryCandidate[]) {
  const byRepository = new Map<string, RepositoryCandidate>();
  [...current, ...incoming].forEach((candidate) => byRepository.set(candidate.repository.githubId, candidate));
  return [...byRepository.values()];
}

export function candidateReducer(state: CandidateState, action: CandidateAction): CandidateState {
  if (action.type === "requested") return { ...state, status: "loading", failureCode: undefined, pending: action.request };
  if (action.type === "failed") return { ...state, status: "failed", failureCode: action.code };
  const previous = action.request.cursor ? state.items : [];
  return { ...state, items: mergeCandidates(previous, action.page.items), nextCursor: action.page.nextCursor, appliedSearch: action.request.search, status: "ready" };
}
