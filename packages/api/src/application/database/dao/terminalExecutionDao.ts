import type { PlanningRoute } from "../../services/tasks/planningContracts";
import type { SessionAgent } from "../../terminal/sessionAgentCatalog";
import type { SessionRuntimeKind } from "../../terminal/sessionInteraction";
import type { SessionPurposeKind } from "../../terminal/sessionPurposeKind";
import type { TerminalEventKind } from "../../terminal/terminalEventKind";
import type { TerminalSessionStatus } from "../../terminal/terminalSessionStatus";

export type ExecutionSessionRow = {
  id: string;
  status: TerminalSessionStatus;
  runtime: SessionRuntimeKind;
  route: PlanningRoute;
  switchedTo: "direct_execution" | null;
  userName: string;
  openedAt: Date;
  lastSignalAt: Date;
  endedAt: Date | null;
  droppedEvents: number;
  filesRemovedAt: Date | null;
  purpose: SessionPurposeKind;
  planItemId: string | null;
  agent: SessionAgent;
  accountId: string | null;
  accountLabel: string | null;
  accountOwnerUserId: string | null;
  accountRemovedAt: Date | null;
  model: string | null;
  effort: string | null;
};

export type ExecutionEventRow = { sessionId: string; kind: TerminalEventKind; summary: string; occurredAt: Date };
export type ExecutionEventCount = { sessionId: string; total: number; lastAt: Date | null };
export type ExecutionAttachmentRow = { sessionId: string; name: string; contentType: string; byteSize: number };
export type ExecutionArtifactRow = { id: string; path: string; skill: string | null; versions: number; updatedAt: Date; lastFailure: string | null };

export interface TerminalExecutionDao {
  sessionsOf(taskId: string): Promise<ExecutionSessionRow[]>;
  recentEvents(sessionIds: string[], limit: number): Promise<ExecutionEventRow[]>;
  eventCounts(sessionIds: string[]): Promise<ExecutionEventCount[]>;
  attachmentsOf(sessionIds: string[]): Promise<ExecutionAttachmentRow[]>;
  artifactSummaries(taskId: string): Promise<ExecutionArtifactRow[]>;
  expireUnconfirmed(scope: { projectId: string; taskId: string }, before: Date): Promise<void>;
}
