import type { TaskPublication } from "./contract";
import { safeGitHubUrl } from "./draftSources";

const GITHUB_ORIGIN = "https://github.com";

export function repositoryIssuesUrl(repository: string) {
  return `${GITHUB_ORIGIN}/${repository}/issues`;
}

export function publishedIssueUrl(publication: TaskPublication) {
  const url = safeGitHubUrl(publication.issueUrl);
  return url === `${repositoryIssuesUrl(publication.repository)}/${publication.issueNumber}` ? url : null;
}
