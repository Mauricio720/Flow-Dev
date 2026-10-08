import type { taskIssueClaims } from "../../schema";
import type { SourceRecord } from "../../../../application/database/dao/issueSourceDao";
import type { PlanningSourceRecord } from "../../../../application/database/dao/taskPlanningDao";

export function planningSourceRecord(source: SourceRecord, claim: typeof taskIssueClaims.$inferSelect | null): PlanningSourceRecord {
  const { snapshot } = source;
  return { snapshotId: snapshot.id, revision: snapshot.revision, origin: source.origin, publicationAttemptId: snapshot.publicationAttemptId, issueNodeId: source.identity.issueNodeId, issueNumber: source.issueNumber, issueUrl: source.issueUrl, repositoryId: source.identity.repositoryId, repositoryNodeId: source.identity.repositoryNodeId, title: snapshot.title, bodyMarkdown: snapshot.bodyMarkdown, contentHash: snapshot.contentHash, claim: claim && { state: claim.state, operatorUserId: claim.operatorUserId, revision: claim.revision } };
}
