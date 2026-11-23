import type { IssueClaimDao } from "../application/database/dao/issueClaimDao";
import type { TerminalSessionRecord } from "../application/database/dao/terminalSessionDao";
import type { RepositoryAccessService } from "../application/services/projects/repositoryAccessService";
import { TaskError } from "../application/services/tasks/taskErrors";
import type { SessionTimelineReader } from "../application/services/terminal/sessionTimelineReader";
import type { SessionRequestDao } from "../application/terminal/sessionInteractionPorts";
import type { SessionPrincipal } from "../context";

type TimelineInput = { projectId: string; taskId: string; sessionId: string; after?: string };

export type SessionTimelineDeps = {
  repositories: Pick<RepositoryAccessService, "requireRead">;
  sessions: { findById(sessionId: string): Promise<TerminalSessionRecord | null> };
  claims: Pick<IssueClaimDao, "claimByTask">;
  requests: Pick<SessionRequestDao, "pendingIds">;
  expireUnconfirmed(scope: { projectId: string; taskId: string }, now: Date): Promise<void>;
  reader: SessionTimelineReader;
  now?: () => Date;
};

const READ_CHECK_TTL_MS = 5_000;

export class SessionTimelineController {
  private readonly readChecks = new Map<string, number>();

  constructor(private readonly deps: SessionTimelineDeps) {}

  async timeline(actor: SessionPrincipal, input: TimelineInput) {
    const now = (this.deps.now ?? (() => new Date()))();
    await this.requireRead(actor, input.projectId, now);
    await this.deps.expireUnconfirmed({ projectId: input.projectId, taskId: input.taskId }, now);
    const session = await this.requireSession(input);
    const [page, pending, canControl] = await Promise.all([this.deps.reader.read({ sessionId: session.id, after: input.after, now }), this.deps.requests.pendingIds(session.id), this.canControl(actor, session)]);
    return { status: session.status, canControl, pending: { requestIds: pending }, ...page };
  }

  private async requireRead(actor: SessionPrincipal, projectId: string, now: Date) {
    const key = `${actor.userId}:${projectId}`;
    if ((this.readChecks.get(key) ?? 0) > now.getTime()) return;
    await this.deps.repositories.requireRead(actor, projectId);
    this.readChecks.set(key, now.getTime() + READ_CHECK_TTL_MS);
  }

  private async requireSession(input: TimelineInput) {
    const session = await this.deps.sessions.findById(input.sessionId);
    if (!session || session.taskId !== input.taskId || session.projectId !== input.projectId) throw new TaskError("task_unavailable");
    return session;
  }

  private async canControl(actor: SessionPrincipal, session: TerminalSessionRecord) {
    if (session.runtime !== "flow_dev" || session.userId !== actor.userId) return false;
    const claim = await this.deps.claims.claimByTask(session.projectId, session.taskId);
    return claim?.state === "claimed" && claim.operatorUserId === actor.userId;
  }
}
