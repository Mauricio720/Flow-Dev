import type { TaskPublication } from "../../../../application/services/tasks/taskContracts";

export function publicationMapping(row: { issueId: string | null; issueNumber: number | null; issueUrl: string | null; issueCreatedAt: Date | null; titleSnapshot: string; bodySnapshot: string; approvedOwner: string; approvedName: string; assignToSelf: boolean; readyAssignment: string | null }): TaskPublication | null {
  if (!row.issueId || !row.issueNumber || !row.issueUrl || !row.issueCreatedAt) return null;
  return { issueId: row.issueId, issueNumber: row.issueNumber, issueUrl: row.issueUrl, createdAt: row.issueCreatedAt, title: row.titleSnapshot, bodyMarkdown: row.bodySnapshot, repository: `${row.approvedOwner}/${row.approvedName}`, assignToSelf: row.assignToSelf, readyAssignment: result(row.readyAssignment) };
}

function result(value: string | null): TaskPublication["readyAssignment"] {
  return value === "ready" || value === "not_assigned" || value === "ready_failed" ? value : null;
}
