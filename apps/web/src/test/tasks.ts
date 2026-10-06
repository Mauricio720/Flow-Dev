import type { IssueDraft, SourceReference, TaskDetail, TaskMessage, TaskRevision, TaskSummary, WorkspaceLoad } from "@/features/issues/issue-composer/contract";
import { projectFixture } from "./projects";

export const P = "00000000-0000-4000-8000-000000000001";
export const P2 = "00000000-0000-4000-8000-000000000002";
export const T = "00000000-0000-4000-8000-000000000011";
export const U = "00000000-0000-4000-8000-000000000012";
export const A = "00000000-0000-4000-8000-000000000021";
export const B = "00000000-0000-4000-8000-000000000022";
export const R7 = "00000000-0000-4000-8000-000000000037";
export const R8 = "00000000-0000-4000-8000-000000000038";
export const O = "00000000-0000-4000-8000-000000000041";
export const K = "00000000-0000-4000-8000-000000000071";
export const C = "00000000-0000-4000-8000-000000000081";
export const NOW = "2026-10-01T12:00:00.000Z";
export const ISSUE_41_URL = "https://github.com/acme/cart/issues/41";

export const CART_PROJECT = projectFixture(P, "Carrinho", { githubId: "202", owner: "acme", name: "cart", visibility: "private" });
export const DRAFT: IssueDraft = { title: "Corrigir total", context: "Ao remover item o total permanece antigo", objective: "Recalcular total", constraints: [], relevantContext: [], productConsiderations: [], references: [], priorityPoints: null, labels: ["generica"] };

export function fileSource(path = "src/cart.ts", line = 10): SourceReference {
  return { type: "project-file", path, line, repository: null, issueNumber: null, url: `https://github.com/acme/cart/blob/c1/${path}#L${line}` };
}

export function issueSource(issueNumber = 41): SourceReference {
  return { type: "github-issue", path: null, line: null, repository: "acme/cart", issueNumber, url: `https://github.com/acme/cart/issues/${issueNumber}` };
}

export function summaryOf(patch: Partial<TaskSummary> = {}): TaskSummary {
  return { id: T, projectId: P, authorUserId: A, authorName: "Ana", status: "draft_ready", planningStatus: null, version: 7, title: "Corrigir total", labels: ["generica"], createdAt: NOW, updatedAt: NOW, ...patch };
}

export function revisionOf(draft: Partial<IssueDraft> = {}, patch: Partial<TaskRevision> = {}): TaskRevision {
  return { id: R7, taskId: T, revisionNumber: 7, parentRevisionId: null, operationId: O, draft: { ...DRAFT, ...draft }, evidenceBindings: [], manuallyEditedPaths: [], createdAt: NOW, ...patch };
}

export function detailOf(patch: Partial<TaskDetail> = {}): TaskDetail {
  return { task: summaryOf(), currentRevision: revisionOf(), pendingProposal: null, publication: null, activity: [], planning: planningOf(), permissions: { canEdit: true }, lastError: null, ...patch };
}

export function messageOf(sequence: number, role: TaskMessage["role"], content: string): TaskMessage {
  return { id: `00000000-0000-4000-8000-0000000001${String(sequence).padStart(2, "0")}`, operationId: O, sequence, role, kind: role === "user" ? "intent" : "result", content, createdAt: NOW };
}

export function loadOf(detail: TaskDetail | null, messages: TaskMessage[] = []): WorkspaceLoad {
  const history = { kind: "ready" as const, page: { items: detail ? [detail.task] : [], nextCursor: null } };
  if (!detail) return { taskId: null, history, task: { kind: "none" } };
  return { taskId: detail.task.id, history, task: { kind: "ready", snapshot: { detail, messages, moreMessages: null } } };
}

export function taskRejection(code: string, reason?: string) {
  return Object.assign(new Error(reason ?? code), { data: { code, reason } });
}

export function callerRejection(code: string, reason?: string) {
  return Object.assign(new Error(reason ?? code), { code, cause: reason ? { reason } : undefined });
}

export function publishedDetail(): TaskDetail {
  const publication = { issueId: "9041", issueNumber: 41, issueUrl: ISSUE_41_URL, createdAt: NOW, title: DRAFT.title, bodyMarkdown: "## Contexto\n\nAo remover item o total permanece antigo", repository: "acme/cart" };
  return detailOf({ task: summaryOf({ status: "published", version: 9 }), publication });
}

const NO_PERMISSIONS = { canStart: false, canRetry: false, canSelectRoute: false, canApprove: false };
export const DECISION_ID = "00000000-0000-4000-8000-000000000091";
export const ASSESSMENT = { recommendedRoute: "tech_spec", complexity: "medium", summary: "A mudança altera o contrato do carrinho.", reasons: ["O total depende de dois módulos"], uncertainties: ["Definir paginação"] } as const;

export function planningOf(patch: Partial<TaskDetail["planning"]> = {}): TaskDetail["planning"] {
  return { status: null, eligibility: { canStart: false, reason: "publication_required" }, operation: null, decision: null, permissions: NO_PERMISSIONS, ...patch } as TaskDetail["planning"];
}

export function decisionOf(patch: Partial<NonNullable<TaskDetail["planning"]["decision"]>> = {}): NonNullable<TaskDetail["planning"]["decision"]> {
  return { id: DECISION_ID, taskId: T, publicationAttemptId: O, operationId: O, executionId: C, version: 1, ...ASSESSMENT, selectedRoute: "tech_spec", decisionSource: "AI", status: "review", createdAt: NOW, approvedByUserId: null, approvedAt: null, ...patch } as NonNullable<TaskDetail["planning"]["decision"]>;
}

export function reviewDetail(planning: Partial<TaskDetail["planning"]> = {}, version = 10): TaskDetail {
  const base = publishedDetail();
  const permissions = { canStart: false, canRetry: false, canSelectRoute: true, canApprove: true };
  return { ...base, task: { ...base.task, planningStatus: "review", version }, planning: planningOf({ status: "review", eligibility: { canStart: true, reason: null }, decision: decisionOf(), permissions, ...planning } as never) };
}
