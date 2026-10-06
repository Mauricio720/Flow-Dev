import type { TaskRevisionRecord } from "../../application/database/dao/taskDao";
import { parseIssueDraft } from "../../application/services/tasks/draftRules";
import type { TaskPublication, TaskSummary } from "../../application/services/tasks/taskContracts";
import { TaskError } from "../../application/services/tasks/taskErrors";

export function revisionDto(revision: TaskRevisionRecord) {
  try { return { id: revision.id, taskId: revision.taskId, revisionNumber: revision.revisionNumber, parentRevisionId: revision.parentRevisionId, operationId: revision.operationId, draft: parseIssueDraft(revision.canonicalDraft), evidenceBindings: revision.evidenceBindings, manuallyEditedPaths: revision.manuallyEditedPaths, createdAt: revision.createdAt.toISOString() }; }
  catch { throw new TaskError("invalid_stored_content"); }
}

export function summaryDto(summary: TaskSummary, authorNames: Map<string, string>) {
  return { ...summary, authorName: authorNames.get(summary.authorUserId) ?? null };
}

export function publicationDto(publication: TaskPublication | null) {
  if (!publication) return null;
  if (!validIssueUrl(publication)) throw new TaskError("invalid_stored_content");
  return { ...publication, createdAt: publication.createdAt.toISOString() };
}

function validIssueUrl(publication: TaskPublication) {
  try {
    const url = new URL(publication.issueUrl);
    return url.origin === "https://github.com" && url.pathname === `/${publication.repository}/issues/${publication.issueNumber}` && !url.search && !url.hash;
  } catch { return false; }
}
