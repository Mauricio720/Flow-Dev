import type { IssueClaimDao, ClaimRecord } from "../../database/dao/issueClaimDao";
import type { IssueSourceDao, SourceRecord } from "../../database/dao/issueSourceDao";
import type { RepositoryAccessService } from "../projects/repositoryAccessService";
import { AssignedIssueError } from "./assignedIssueErrors";
import type { AssignedIssueReason } from "./assignedIssueErrors";
import { translated } from "./assignedIssueTranslation";
import type { WorkOperability } from "./workOperability";

export type WorkReadInput = { projectId: string; taskId: string; actorId: string };
export type WorkScope = { projectId: string; taskId: string; actorId: string; sourceSnapshotId: string; claimRevision: number };
export type WorkAssessment = { source: SourceRecord; claim: ClaimRecord | null; reason: AssignedIssueReason | null; contentHash: string | null };
export type OperateOptions = { currentSource?: boolean };
type Deps = { repositories: Pick<RepositoryAccessService, "personalContext">; sources: IssueSourceDao; claims: IssueClaimDao; operability: WorkOperability };

export class WorkAuthorization {
  constructor(private readonly deps: Deps) {}

  async requireRead(input: WorkReadInput): Promise<SourceRecord> {
    await translated(() => this.deps.repositories.personalContext({ userId: input.actorId }, input.projectId));
    const source = await this.deps.sources.findByTask(input.projectId, input.taskId);
    if (!source) throw new AssignedIssueError("work_unavailable");
    return source;
  }

  async requireOperate(input: WorkReadInput, options: OperateOptions = {}): Promise<WorkScope> {
    const assessment = await this.assess(input, true);
    if (assessment.reason) throw new AssignedIssueError(assessment.reason);
    if (options.currentSource && assessment.contentHash !== assessment.source.snapshot.contentHash) throw new AssignedIssueError("source_changed");
    return { projectId: input.projectId, taskId: input.taskId, actorId: input.actorId, sourceSnapshotId: assessment.source.snapshot.id, claimRevision: assessment.claim!.revision };
  }

  async assess(input: WorkReadInput, failOnProvider: boolean): Promise<WorkAssessment> {
    const context = await translated(() => this.deps.repositories.personalContext({ userId: input.actorId }, input.projectId));
    const source = await this.deps.sources.findByTask(input.projectId, input.taskId);
    if (!source) throw new AssignedIssueError("work_unavailable");
    const claim = await this.deps.claims.claimByTask(input.projectId, input.taskId);
    const standing = claimStanding(claim, input.actorId);
    if (standing) return { source, claim, reason: standing, contentHash: null };
    try {
      const operator = { token: context.token, githubUserId: context.githubUserId, repositoryNodeId: context.repository.nodeId, repositoryId: context.repository.githubId, archived: context.repository.archived, issueNodeId: source.identity.issueNodeId };
      return { source, claim, ...await this.deps.operability.evaluate(operator, claim!) };
    } catch (error) {
      if (failOnProvider || !(error instanceof AssignedIssueError)) throw error;
      return { source, claim, reason: error.reason, contentHash: null };
    }
  }
}

function claimStanding(claim: ClaimRecord | null, actorId: string): AssignedIssueReason | null {
  if (claim?.state === "pending" || claim?.state === "uncertain") return "claim_unresolved";
  return claim?.state === "claimed" && claim.operatorUserId === actorId ? null : "operator_required";
}
