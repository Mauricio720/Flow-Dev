import { AssignedIssueError } from "../application/services/assigned-issues/assignedIssueErrors";
import { ProjectUnavailableError } from "../application/services/access/projectAccessService";
import { TaskError } from "../application/services/tasks/taskErrors";

const UNAVAILABLE_WORK_REASON = "work_unavailable";

export async function unavailableSpecError(error: unknown, hadAccess: () => Promise<boolean>) {
  if (!(error instanceof AssignedIssueError) || error.reason !== UNAVAILABLE_WORK_REASON) return error;
  return new TaskError(await hadAccess() ? "access_revoked" : "spec_unavailable");
}

export function lostProjectAccess(error: unknown) {
  return error instanceof AssignedIssueError && error.cause instanceof ProjectUnavailableError;
}
