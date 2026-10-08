import { createHash } from "node:crypto";
import type { BoardItemFacts } from "../../github/assignedIssueGateway";

const ISSUE_CONTENT_TYPE = "Issue";
const OPEN_ISSUE_STATE = "OPEN";
export const IN_PROGRESS_STATUS_NAME = "in progress";
export const READY_STATUS_NAME = "ready";

export type EligibilityContext = { repositoryNodeId: string; githubUserId: string; readyOptionId: string; boardNodeId: string };
export type Assessment = "eligible" | "malformed" | "not_issue" | "archived" | "closed" | "other_board" | "other_repository" | "not_ready" | "not_assigned" | "assignees_incomplete";
export type VerifiedIssue = { nodeId: string; number: number; url: string; title: string; body: string; updatedAt: string; repositoryId: string; repositoryNodeId: string };

export function assessItem(item: BoardItemFacts, context: EligibilityContext): Assessment {
  if (item.archived) return "archived";
  if (item.contentType !== ISSUE_CONTENT_TYPE) return "not_issue";
  if (!verifiedIssue(item)) return "malformed";
  if (item.boardNodeId !== context.boardNodeId) return "other_board";
  if (item.issue!.state !== OPEN_ISSUE_STATE) return "closed";
  if (item.issue!.repositoryNodeId !== context.repositoryNodeId) return "other_repository";
  if (item.statusOptionId !== context.readyOptionId) return "not_ready";
  return assignment(item, context.githubUserId);
}

function assignment(item: BoardItemFacts, githubUserId: string): Assessment {
  if (item.issue!.assignees.some((assignee) => assignee.githubId === githubUserId)) return "eligible";
  return item.issue!.assigneesHasNextPage ? "assignees_incomplete" : "not_assigned";
}

export function verifiedIssue(item: BoardItemFacts): VerifiedIssue | null {
  const issue = item.issue;
  if (!issue?.nodeId || !issue.number || !issue.url || issue.title === null || issue.body === null) return null;
  if (!issue.updatedAt || !issue.repositoryId || !issue.repositoryNodeId || !item.boardNodeId) return null;
  return { nodeId: issue.nodeId, number: issue.number, url: issue.url, title: issue.title, body: issue.body, updatedAt: issue.updatedAt, repositoryId: issue.repositoryId, repositoryNodeId: issue.repositoryNodeId };
}

export function sourceContentHash(input: { repositoryId: string; issueNodeId: string; title: string; bodyMarkdown: string }) {
  const hash = createHash("sha256");
  for (const value of [input.repositoryId, input.issueNodeId, input.title, input.bodyMarkdown]) hash.update(`${Buffer.byteLength(value)}:${value}\n`);
  return hash.digest("hex");
}

export function requestPayloadHash(parts: Record<string, string>) {
  return createHash("sha256").update(JSON.stringify(Object.entries(parts).sort(([left], [right]) => left.localeCompare(right)))).digest("hex");
}

export function findOption(options: { id: string; name: string }[], name: string) {
  return options.find((option) => option.name.trim().toLowerCase() === name) ?? null;
}
