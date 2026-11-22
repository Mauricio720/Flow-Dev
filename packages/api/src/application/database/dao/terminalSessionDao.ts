import type { PlanningComplexity, PlanningRoute } from "../../services/tasks/planningContracts";
import type { SessionAttachmentLinks } from "./terminalAttachmentLinks";

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
};

export type ApprovedPlanning = {
  decisionId: string;
  route: PlanningRoute;
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
};

export type CreatedTerminalSession = { session: TerminalSessionRecord; created: boolean };
export type LastTerminalOpening = { userName: string; openedAt: string };

export interface TerminalSessionDao {
  approvedPlanning(taskId: string): Promise<ApprovedPlanning | null>;
  findByRequestKey(userId: string, requestKey: string): Promise<TerminalSessionRecord | null>;
  create(input: CreateTerminalSessionInput, links?: SessionAttachmentLinks): Promise<CreatedTerminalSession>;
  markLaunchFailed(sessionId: string, reason: string): Promise<void>;
  lastOpened(taskId: string): Promise<LastTerminalOpening | null>;
}
