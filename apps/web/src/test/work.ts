import type { ActiveItem, QueueItem, QueuePage, WorkSnapshot, WorkView } from "@/features/issues/assigned-work/contract";
import { A, NOW, P, T, U, publishedDetail } from "./tasks";

export const ISSUE_NODE = "I_kwDOAAA";
export const BOARD_ITEM = "PVTI_AAA";
export const OPERATOR_ID = A;

export function queueItemOf(patch: Partial<QueueItem> = {}): QueueItem {
  return { issueNodeId: ISSUE_NODE, boardItemId: BOARD_ITEM, number: 41, title: "Corrigir total do carrinho", url: "https://github.com/acme/cart/issues/41", repository: { owner: "acme", name: "cart" }, assignees: [{ githubId: "501", login: "ana" }], status: "Ready", ...patch };
}

export function queuePageOf(items: QueueItem[], patch: Partial<QueuePage> = {}): QueuePage {
  return { items, nextCursor: null, availability: items.length > 0 ? "available" : "empty", retryAfterSeconds: null, ...patch };
}

export function activeItemOf(patch: Partial<ActiveItem> = {}): ActiveItem {
  return { taskId: T, title: "Corrigir total do carrinho", issueNumber: 41, issueUrl: "https://github.com/acme/cart/issues/41", operatorId: OPERATOR_ID, operatorName: "Ana", stage: "planning", blockReason: null, claimedAt: NOW, ...patch };
}

export function viewOf(patch: Partial<WorkView> = {}): WorkView {
  const source = { snapshotId: U, revision: 1, origin: "external" as const, title: "Corrigir total do carrinho", contentHash: "abcdef0123456789", githubUpdatedAt: NOW, issueNumber: 41, issueUrl: "https://github.com/acme/cart/issues/41" };
  const claim = { taskId: T, state: "claimed" as const, operatorId: OPERATOR_ID, reason: null };
  return { taskId: T, projectId: P, sourceSnapshotId: U, source, claim, viewerCanOperate: true, reason: null, sourceChanged: false, ...patch };
}

export function snapshotOf(view: Partial<WorkView> = {}, detail = publishedDetail()): WorkSnapshot {
  return { view: viewOf(view), detail };
}
