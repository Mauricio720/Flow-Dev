export type IssueOrigin = "flow_dev" | "external";
export type SourceIdentity = { projectId: string; repositoryId: string; repositoryNodeId: string; issueNodeId: string };
export type SnapshotDraft = { title: string; bodyMarkdown: string; githubUpdatedAt: Date; contentHash: string; verifiedAt: Date; verifiedByUserId: string | null };
export type SourceFacts = { identity: SourceIdentity; issueNumber: number; issueUrl: string; snapshot: SnapshotDraft };
export type SnapshotRecord = SnapshotDraft & { id: string; revision: number; origin: IssueOrigin; publicationAttemptId: string | null };
export type SourceRecord = { sourceId: string; taskId: string; origin: IssueOrigin; identity: SourceIdentity; issueNumber: number; issueUrl: string; snapshot: SnapshotRecord };
export type ResolvedSource = SourceRecord & { created: boolean };

export interface IssueSourceDao {
  resolve(facts: SourceFacts): Promise<ResolvedSource>;
  findByIdentity(identity: SourceIdentity): Promise<SourceRecord | null>;
  findByTask(projectId: string, taskId: string): Promise<SourceRecord | null>;
}
