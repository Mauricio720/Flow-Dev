import type { GitHubIssueGateway } from "../application/github/issueGateway";
import type { TaskRecord } from "../application/database/dao/taskDao";
import type { RepositoryAccessService } from "../application/services/projects/repositoryAccessService";
import { TaskError } from "../application/services/tasks/taskErrors";

export async function assertPublicationEligibility(github: GitHubIssueGateway, repository: Awaited<ReturnType<RepositoryAccessService["contextCredentials"]>>["repository"], token: string, publisherGithubId: string) {
  const eligibility = await github.eligibility({ repositoryId: repository.githubId, owner: repository.owner, name: repository.name, token, publisherGithubId });
  if (eligibility.repositoryId !== repository.githubId || eligibility.owner !== repository.owner || eligibility.name !== repository.name || eligibility.publisherGithubId !== publisherGithubId) throw new TaskError("identity_mismatch");
  if (eligibility.archived) throw new TaskError("repository_archived");
  if (!eligibility.issuesEnabled) throw new TaskError("issues_disabled");
  if (!eligibility.canRead) throw new TaskError("destination_unavailable");
  if (!eligibility.canCreateIssues) throw new TaskError("issue_permission_denied");
  return eligibility;
}

export function publicationReadiness(task: TaskRecord, revisionId: string, allowPublishing: boolean) {
  return task.currentRevisionId === revisionId && !task.pendingProposalOperationId && (allowPublishing ? task.status === "publishing" : task.status === "draft_ready" && !task.activeOperationId);
}
