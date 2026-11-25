import type { ApprovedIssueRequest, IssueReceipt } from "../../application/github/issueGateway";
import { TaskError } from "../../application/services/tasks/taskErrors";

type JsonRecord = Record<string, unknown>;

export function issueReceipt(value: JsonRecord, input: ApprovedIssueRequest): IssueReceipt {
  const id = value.id;
  const number = value.number;
  const user = asRecord(value.user);
  const url = value.html_url;
  if (value.pull_request || (!Number.isSafeInteger(id) && typeof id !== "string") || !value.node_id || !Number.isSafeInteger(number) || Number(number) < 1 || String(user.id) !== input.publisherGithubId || typeof url !== "string" || !isExpectedIssueUrl(url, input, Number(number)) || typeof value.created_at !== "string" || Number.isNaN(Date.parse(value.created_at))) throw new TaskError("invalid_provider_response");
  return { issueId: String(id), nodeId: String(value.node_id), number: Number(number), url, repositoryId: input.repositoryId, publisherGithubId: input.publisherGithubId, assigneeGithubIds: assigneeIds(value.assignees), createdAt: value.created_at };
}

export function isExpectedIssueUrl(value: string, input: ApprovedIssueRequest, number: number) {
  try { const url = new URL(value); return url.protocol === "https:" && url.hostname === "github.com" && url.pathname === `/${input.owner}/${input.name}/issues/${number}` && !url.search && !url.hash; } catch { return false; }
}

function assigneeIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return [];
    const id = (entry as JsonRecord).id;
    return Number.isSafeInteger(id) || typeof id === "string" ? [String(id)] : [];
  });
}

function asRecord(value: unknown): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TaskError("invalid_provider_response");
  return value as JsonRecord;
}
