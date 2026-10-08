import type { SessionPrincipal } from "../../../context";
import type { IssueClaimDao } from "../../database/dao/issueClaimDao";
import type { SourceRecord } from "../../database/dao/issueSourceDao";
import type { RepositoryAccessService } from "../projects/repositoryAccessService";
import { AssignedIssueError } from "./assignedIssueErrors";
import { translated } from "./assignedIssueTranslation";
import { decodeBoundCursor, encodeBoundCursor } from "./assignedIssueCursor";
import type { ActiveWorkFilter, ClaimStatus, SourceView } from "./assignedIssueContracts";
import { claimStatus } from "./claimResults";
import type { WorkAuthorization } from "./workAuthorization";

type Deps = { repositories: RepositoryAccessService; claims: IssueClaimDao; authorization: WorkAuthorization };
type ActiveInput = { projectId: string; filter: ActiveWorkFilter; cursor?: string; limit: number };
type ActiveKey = { claimedAt: string; id: string };
const UNCLAIMED_REASON = "claim_required";

export class AssignedWorkReader {
  constructor(private readonly deps: Deps) {}

  async claimStatus(actor: SessionPrincipal, scope: { projectId: string; taskId: string }): Promise<ClaimStatus> {
    const source = await this.deps.authorization.requireRead({ ...scope, actorId: actor.userId });
    const claim = await this.deps.claims.claimByTask(scope.projectId, scope.taskId);
    return claim ? claimStatus(claim) : { taskId: source.taskId, state: "unclaimed", operatorId: null, reason: null };
  }

  async byTask(actor: SessionPrincipal, scope: { projectId: string; taskId: string }) {
    const assessment = await this.deps.authorization.assess({ ...scope, actorId: actor.userId }, false);
    const status = assessment.claim ? claimStatus(assessment.claim) : { taskId: scope.taskId, state: "unclaimed" as const, operatorId: null, reason: null };
    return { taskId: scope.taskId, projectId: scope.projectId, sourceSnapshotId: assessment.source.snapshot.id, source: sourceView(assessment.source), claim: status, viewerCanOperate: assessment.reason === null, reason: displayReason(assessment.reason, status), sourceChanged: assessment.contentHash !== null && assessment.contentHash !== assessment.source.snapshot.contentHash };
  }

  async active(actor: SessionPrincipal, input: ActiveInput) {
    await translated(() => this.deps.repositories.personalContext(actor, input.projectId));
    const binding = { projectId: input.projectId, actorId: actor.userId, boardId: input.filter };
    const after = activeKey(decodeBoundCursor(input.cursor, binding));
    const page = await this.deps.claims.active({ projectId: input.projectId, operatorUserId: input.filter === "mine" ? actor.userId : null, limit: input.limit, after });
    return { items: page.items, nextCursor: page.lastKey ? encodeBoundCursor(binding, page.lastKey) : null };
  }
}

function sourceView(source: SourceRecord): SourceView {
  const { snapshot } = source;
  return { snapshotId: snapshot.id, revision: snapshot.revision, origin: source.origin, title: snapshot.title, contentHash: snapshot.contentHash, githubUpdatedAt: snapshot.githubUpdatedAt.toISOString(), issueNumber: source.issueNumber, issueUrl: source.issueUrl };
}

function displayReason(reason: string | null, status: ClaimStatus) {
  if (reason === "operator_required" && status.state !== "claimed") return UNCLAIMED_REASON;
  return reason;
}

function activeKey(value: unknown): ActiveKey | null {
  if (value === null) return null;
  const key = value as Partial<ActiveKey>;
  if (typeof key.id !== "string" || typeof key.claimedAt !== "string" || Number.isNaN(Date.parse(key.claimedAt))) throw new AssignedIssueError("invalid_cursor");
  return { claimedAt: key.claimedAt, id: key.id };
}
