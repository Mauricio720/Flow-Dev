import type { TerminalSessionRecord } from "../../database/dao/terminalSessionDao";
import { isActiveSession } from "../../terminal/terminalSessionStatus";
import type { WorkAuthorization } from "../assigned-issues/workAuthorization";
import { TaskError } from "../tasks/taskErrors";

export type ControlScope = { projectId: string; taskId: string; sessionId: string; actorId: string };
export type SessionControlDeps = { sessions: { findById(sessionId: string): Promise<TerminalSessionRecord | null> }; authorization: Pick<WorkAuthorization, "requireOperate"> };

const OPERATOR_REQUIRED_REASON = "operator_required";

function isOperatorRequired(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { reason?: unknown }).reason === OPERATOR_REQUIRED_REASON;
}

export class SessionControlAuthorization {
  constructor(private readonly deps: SessionControlDeps) {}

  async requireOwn(scope: ControlScope): Promise<TerminalSessionRecord> {
    const session = await this.deps.sessions.findById(scope.sessionId);
    const owned = session && session.taskId === scope.taskId && session.projectId === scope.projectId && session.userId === scope.actorId;
    if (!owned) throw new TaskError("session_control_denied");
    await this.requireOperator(scope);
    return session;
  }

  async requireOwnActive(scope: ControlScope): Promise<TerminalSessionRecord> {
    const session = await this.requireOwn(scope);
    if (session.runtime !== "flow_dev" || !isActiveSession(session.status)) throw new TaskError("session_not_active");
    return session;
  }

  private async requireOperator(scope: ControlScope) {
    try {
      await this.deps.authorization.requireOperate({ projectId: scope.projectId, taskId: scope.taskId, actorId: scope.actorId });
    } catch (error) {
      if (isOperatorRequired(error)) throw new TaskError("session_control_denied", undefined, error);
      throw error;
    }
  }
}
