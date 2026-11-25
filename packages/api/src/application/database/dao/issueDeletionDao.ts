import type { DeletionOperation, DeletionState, FrozenIssueIdentity, RemotePresence } from "../../services/issue-deletion/issueDeletionContracts";

export type DeletionReservation =
  | { kind: "task"; projectId: string; taskId: string; repositoryId: string; repositoryNodeId: string; issueNodeId: string | null; issueNumber: number | null }
  | { kind: "queue"; projectId: string; repositoryId: string; repositoryNodeId: string; issueNodeId: string; issueNumber: number | null };

export type ReserveDeletionInput = {
  projectId: string;
  initiatorUserId: string;
  requestKey: string;
  reservation: DeletionReservation;
  remotePresence: RemotePresence;
};

export type DeletionPatch = Partial<{
  state: DeletionState;
  remotePresence: RemotePresence;
  workStopped: boolean;
  reason: string | null;
  retryAt: Date | null;
  issueNodeId: string | null;
  issueNumber: number | null;
}>;

export type DeletionClaim = { operation: DeletionOperation; workerId: string; fence: number };

export type PurgeCondition = {
  remotePresence: RemotePresence;
  workStopped: boolean;
  taskId: string | null;
};

export type TaskDeletionFacts = {
  taskId: string;
  projectId: string;
  authorUserId: string | null;
  origin: "flow_dev" | "external";
  status: string;
  title: string;
  repositoryId: string;
  repositoryNodeId: string;
  issueNodeId: string | null;
  issueNumber: number | null;
  publicationOutcomes: string[];
  pendingDeletion: boolean;
};

export type StoppedReviewCycle = { id: string; taskId: string; round: number; stepRole: "review" | "execute"; reviewSessionId: string | null; executeSessionId: string | null; startedAt: Date };

export interface IssueDeletionDao {
  reserve(input: ReserveDeletionInput): Promise<{ operation: DeletionOperation; created: boolean }>;
  byId(operationId: string): Promise<DeletionOperation | null>;
  byRequestKey(initiatorUserId: string, requestKey: string): Promise<DeletionOperation | null>;
  activeForTask(taskId: string): Promise<DeletionOperation | null>;
  activeForIdentity(identity: { projectId: string; repositoryId: string; issueNodeId: string }): Promise<DeletionOperation | null>;
  claimNext(input: { owner: string; now: Date; leaseMs: number }): Promise<DeletionClaim | null>;
  heartbeat(input: { operationId: string; owner: string; fence: number; now: Date; leaseMs: number }): Promise<void>;
  patch(input: { operationId: string; fence: number; patch: DeletionPatch }): Promise<void>;
  adoptIdentity(input: { operationId: string; identity: FrozenIssueIdentity }): Promise<void>;
  purgeTaskAndComplete(input: { operationId: string; taskId: string; fence: number; expectedRemote: RemotePresence }): Promise<void>;
  completeQueueOnly(input: { operationId: string; fence: number }): Promise<void>;
  pending(limit: number): Promise<DeletionOperation[]>;
  activeFenceState(taskId: string): Promise<DeletionState | null>;
  taskFacts(projectId: string, taskId: string): Promise<TaskDeletionFacts | null>;
  cancelTaskWork(taskId: string, deletionOperationId: string): Promise<StoppedReviewCycle[]>;
  publicationState(taskId: string): Promise<{ unresolved: boolean; createdIdentity: FrozenIssueIdentity | null }>;
  remainingActiveWork(taskId: string): Promise<{ operations: string[]; runs: string[]; specs: string[]; reviewSessions: string[] }>;
  resume(input: { operationId: string; state: DeletionState }): Promise<DeletionOperation>;
}
