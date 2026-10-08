import type { AssigneePage, BoardAssignee, BoardItemFacts } from "../../application/github/assignedIssueGateway";
import type { RawItem } from "./assignedIssueQueries";

type RawAssigneeConnection = { nodes?: ({ databaseId?: number | null; login?: string | null } | null)[] | null; pageInfo?: { hasNextPage?: boolean; endCursor?: string | null } | null } | null | undefined;

export function mapAssignees(connection: RawAssigneeConnection): AssigneePage {
  const assignees: BoardAssignee[] = [];
  for (const user of connection?.nodes ?? []) if (user?.databaseId) assignees.push({ githubId: String(user.databaseId), login: user.login ?? null });
  return { assignees, hasNextPage: Boolean(connection?.pageInfo?.hasNextPage), endCursor: connection?.pageInfo?.endCursor ?? null };
}

export function mapItem(raw: RawItem | null | undefined): BoardItemFacts | null {
  if (!raw?.id) return null;
  const content = raw.content;
  const base = { itemId: raw.id, boardNodeId: raw.project?.id ?? null, archived: Boolean(raw.isArchived), contentType: content?.__typename ?? null, statusOptionId: raw.status?.optionId ?? null };
  if (!content || content.__typename !== "Issue") return { ...base, issue: null };
  const assignees = mapAssignees(content.assignees);
  return { ...base, issue: { nodeId: content.id ?? null, number: content.number ?? null, url: content.url ?? null, title: content.title ?? null, body: content.body ?? null, state: content.state ?? null, updatedAt: content.updatedAt ?? null, repositoryNodeId: content.repository?.id ?? null, repositoryId: content.repository?.databaseId ? String(content.repository.databaseId) : null, repositoryOwner: content.repository?.owner?.login ?? null, repositoryName: content.repository?.name ?? null, assignees: assignees.assignees, assigneesHasNextPage: assignees.hasNextPage, assigneesCursor: assignees.endCursor } };
}
