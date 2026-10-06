import type { PlanningDispatch } from "../../application/services/tasks/planningContracts";
import { TaskError } from "../../application/services/tasks/taskErrors";

const PUBLISHED_STATUS = "published";
// Captures <owner>/<name> from the path of a GitHub Issue URL: /<owner>/<name>/issues/<number>.
const ISSUE_PATH = /^\/([^/\s]+\/[^/\s]+)\/issues\/\d+$/u;

export function toDevControlRequest(input: PlanningDispatch) {
  const { publication } = input;
  const issue = { publicationStatus: PUBLISHED_STATUS, repository: repositoryOf(input.issueUrl), issueNumber: publication.issueNumber, url: input.issueUrl, title: publication.title, body: publication.bodyMarkdown, labels: [], structuredDraft: null };
  return { protocolVersion: input.protocolVersion, operationId: input.operationId, executionId: input.executionId, issueRevisionId: publication.attemptId, issue };
}

function repositoryOf(issueUrl: string) {
  const repository = issuePath(issueUrl).match(ISSUE_PATH)?.[1];
  if (!repository) throw new TaskError("invalid_stored_content");
  return repository;
}

function issuePath(issueUrl: string) {
  try { return new URL(issueUrl).pathname; }
  catch { throw new TaskError("invalid_stored_content"); }
}
