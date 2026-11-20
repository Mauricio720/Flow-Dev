import { resolveCompozyBaseUrl } from "../src/infra/compozy/compozyEndpoint";

type Review = { review_id: string; reviewer_session_id?: string };
type ReviewsResponse = { reviews?: Review[] };
type PendingInteraction = { kind?: string; status?: string; tool_id?: string };
type SessionResponse = { session?: { state?: string; pending_interactions?: PendingInteraction[] } };
type AgentMessage = { content: unknown; sequence: number; type: string };
type HistoryResponse = { history?: { events?: AgentMessage[] }[] };
type ReviewSession = { reviewId: string; id: string; state: string | null; pendingInteractions: PendingInteraction[]; lastAgentMessage: unknown };

const AGENT_MESSAGE_TYPE = "agent_message";

export async function readSmokeReviewSessions(workspaceId: string, runId: string): Promise<ReviewSession[]> {
  const { reviews = [] } = await daemonGet<ReviewsResponse>(`/api/task-runs/${encodeURIComponent(runId)}/reviews`);
  const routed = reviews.filter(hasReviewerSession);
  return Promise.all(routed.map((review) => readSessionEvidence(workspaceId, review)));
}

async function readSessionEvidence(workspaceId: string, review: Review & { reviewer_session_id: string }): Promise<ReviewSession> {
  const sessionId = review.reviewer_session_id;
  const base = `/api/workspaces/${encodeURIComponent(workspaceId)}/sessions/${encodeURIComponent(sessionId)}`;
  const [snapshot, history] = await Promise.all([
    daemonGet<SessionResponse>(base),
    daemonGet<HistoryResponse>(`${base}/history?type=${AGENT_MESSAGE_TYPE}&limit=1`),
  ]);
  return { reviewId: review.review_id, id: sessionId, state: snapshot.session?.state ?? null, pendingInteractions: snapshot.session?.pending_interactions ?? [], lastAgentMessage: lastAgentMessage(history.history ?? []) };
}

async function daemonGet<T>(path: string): Promise<T> {
  const response = await fetch(`${await resolveCompozyBaseUrl()}${path}`);
  if (!response.ok) throw new Error(`CompozyOS returned HTTP ${response.status} for ${path}`);
  return await response.json() as T;
}

function hasReviewerSession(review: Review): review is Review & { reviewer_session_id: string } {
  return Boolean(review.reviewer_session_id);
}

function lastAgentMessage(history: { events?: AgentMessage[] }[]) {
  const events = history.flatMap((turn) => turn.events ?? []);
  const messages = events.filter((event) => event.type === AGENT_MESSAGE_TYPE);
  return messages.sort((left, right) => left.sequence - right.sequence).at(-1)?.content ?? null;
}
