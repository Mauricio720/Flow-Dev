import type { ExecutionArtifactRow, ExecutionSessionRow, TerminalExecutionDao } from "../../database/dao/terminalExecutionDao";
import { SESSION_RETENTION_MS } from "./terminalCleanup";
import { UNCONFIRMED_AFTER_MS, silentSince } from "./terminalSessionTiming";
import { sessionAccountView } from "./sessionAccountView";

export const MAX_EVENTS_PER_SESSION = 200;
const FLOW_DEV_RUNTIME = "flow_dev";

type Rows = Awaited<ReturnType<TerminalExecutionReader["load"]>>;

export class TerminalExecutionReader {
  constructor(private readonly dao: TerminalExecutionDao) {}

  async expireUnconfirmed(scope: { projectId: string; taskId: string }, now: Date): Promise<void> {
    await this.dao.expireUnconfirmed(scope, new Date(now.getTime() - UNCONFIRMED_AFTER_MS));
  }

  async read(taskId: string, viewerUserId: string, now: Date) {
    const rows = await this.load(taskId);
    return { sessions: rows.sessions.map((session) => sessionView(session, rows, viewerUserId, now)), artifacts: rows.artifacts.map(artifactView) };
  }

  private async load(taskId: string) {
    const sessions = await this.dao.sessionsOf(taskId);
    const ids = sessions.map((session) => session.id);
    const [events, counts, attachments, artifacts] = await Promise.all([this.dao.recentEvents(ids, MAX_EVENTS_PER_SESSION), this.dao.eventCounts(ids), this.dao.attachmentsOf(ids), this.dao.artifactSummaries(taskId)]);
    return { sessions, events, counts, attachments, artifacts };
  }
}

function sessionView(session: ExecutionSessionRow, rows: Rows, viewerUserId: string, now: Date) {
  const events = rows.events.filter((event) => event.sessionId === session.id);
  const count = rows.counts.find((entry) => entry.sessionId === session.id);
  const silent = session.runtime === FLOW_DEV_RUNTIME ? null : silentSince({ status: session.status, lastSignalAt: session.lastSignalAt, now });
  const removed = session.filesRemovedAt !== null;
  const availableUntil = removed ? null : new Date(session.lastSignalAt.getTime() + SESSION_RETENTION_MS).toISOString();
  const attachments = rows.attachments.filter((item) => item.sessionId === session.id).map(({ name, contentType, byteSize }) => ({ name, contentType, byteSize, availableUntil, removed }));
  return {
    id: session.id, status: session.status, runtime: session.runtime, route: session.route, switchedTo: session.switchedTo, userName: session.userName,
    purpose: session.purpose, planItemId: session.planItemId, agent: session.agent, account: sessionAccountView(session, viewerUserId), model: session.model, effort: session.effort,
    openedAt: session.openedAt.toISOString(), endedAt: session.endedAt?.toISOString() ?? null,
    lastEventAt: count?.lastAt?.toISOString() ?? null, silentSince: silent?.toISOString() ?? null,
    droppedEvents: session.droppedEvents, hiddenEvents: Math.max(0, (count?.total ?? 0) - events.length),
    events: events.map((event) => ({ kind: event.kind, summary: event.summary, occurredAt: event.occurredAt.toISOString() })), attachments,
  };
}

function artifactView(row: ExecutionArtifactRow) {
  return { id: row.id, path: row.path, skill: row.skill, versions: row.versions, updatedAt: row.updatedAt.toISOString(), lastFailure: row.lastFailure };
}

export type TerminalExecutionView = Awaited<ReturnType<TerminalExecutionReader["read"]>>;
