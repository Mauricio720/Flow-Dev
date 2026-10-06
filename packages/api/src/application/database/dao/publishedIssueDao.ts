export type PublishedIssue = { taskId: string; issueNodeId: string; issueNumber: number; issueUrl: string; title: string };

export type PublishedIssueDraft = PublishedIssue & { canonicalDraft: unknown };

export interface PublishedIssueDao {
  listByProject(projectId: string): Promise<PublishedIssue[]>;
}

export interface PublishedIssueDraftDao {
  listDraftsByProject(projectId: string): Promise<PublishedIssueDraft[]>;
}
