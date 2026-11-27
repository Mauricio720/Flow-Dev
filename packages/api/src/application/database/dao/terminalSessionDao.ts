import type { PlanningComplexity, PlanningRoute } from "../../services/tasks/planningContracts";
import type { SessionAgent } from "../../terminal/sessionAgentCatalog";
import type { PermissionMode, SessionRuntimeKind } from "../../terminal/sessionInteraction";
import type { SessionPurposeKind } from "../../terminal/sessionPurposeKind";
import type { TerminalSessionStatus } from "../../terminal/terminalSessionStatus";
import type { SessionAttachmentLinks } from "./terminalAttachmentLinks";
import type { RouteSwitchFromRoute } from "../../terminal/routeSwitch";

export type TerminalSessionRecord = {
  id: string;
  taskId: string;
  projectId: string;
  userId: string;
  planningDecisionId: string;
  route: PlanningRoute;
  requestKey: string;
  checkoutPath: string;
  branch: string | null;
  dirty: boolean;
  openedAt: Date;
  lastSignalAt: Date;
  filesRemovedAt: Date | null;
  launchFailedAt: Date | null;
  launchError: string | null;
  status: TerminalSessionStatus;
  tokenHash: string | null;
  claudeSessionId: string | null;
  agentSessionId: string | null;
  agentVersion: string | null;
  endReason: string | null;
  activeSkill: string | null;
  droppedEvents: number;
  startedAt: Date | null;
  endedAt: Date | null;
  lastCaptureAt: Date | null;
  runtime: SessionRuntimeKind;
  permissionMode: PermissionMode;
  hostId: string | null;
  workerId: string | null;
  interruptRequestedAt: Date | null;
  endRequestedAt: Date | null;
  preparedAt: Date | null;
  purpose: SessionPurposeKind;
  planItemId: string | null;
  agent: SessionAgent;
  model: string | null;
  effort: string | null;
  reviewCycleId: string | null;
  agentAccountId: string | null;
};

export type ApprovedPlanning = {
  decisionId: string;
  route: PlanningRoute;
  switchedFrom: RouteSwitchFromRoute | null;
  complexity: PlanningComplexity;
  reasons: string[];
  uncertainties: string[];
  issue: { number: number; url: string; title: string; body: string };
};

export type CreateTerminalSessionInput = {
  taskId: string;
  projectId: string;
  userId: string;
  planningDecisionId: string;
  route: PlanningRoute;
  requestKey: string;
  checkoutPath: string;
  branch: string | null;
  dirty: boolean;
  runtime: SessionRuntimeKind;
  permissionMode: PermissionMode;
  hostId: string | null;
  purpose?: SessionPurposeKind;
  planItemId?: string | null;
  agent?: SessionAgent;
  model?: string | null;
  effort?: string | null;
  reviewCycleId?: string | null;
  agentVersion?: string | null;
  agentAccountId?: string | null;
};

export type CreatedTerminalSession = { session: TerminalSessionRecord; created: boolean };
export type LastTerminalOpening = { userName: string; openedAt: string };

export interface TerminalSessionDao {
  approvedPlanning(taskId: string): Promise<ApprovedPlanning | null>;
  findById(sessionId: string): Promise<TerminalSessionRecord | null>;
  findByRequestKey(userId: string, requestKey: string): Promise<TerminalSessionRecord | null>;
  create(input: CreateTerminalSessionInput, links?: SessionAttachmentLinks): Promise<CreatedTerminalSession>;
  markLaunchFailed(sessionId: string, reason: string): Promise<void>;
  markAgentVersion?(sessionId: string, version: string): Promise<void>;
  markPrepared(sessionId: string, at: Date): Promise<void>;
  lastOpened(taskId: string): Promise<LastTerminalOpening | null>;
  hasActiveSession(taskId: string, userId: string): Promise<boolean>;
}
