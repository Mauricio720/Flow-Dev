export type DeletionTarget =
  | { kind: "task"; projectId: string; taskId: string }
  | { kind: "queue"; projectId: string; issueNodeId: string };

export type DeletionState = "stopping" | "reconciling" | "deleting_remote" | "verifying_remote" | "cleaning_local" | "recoverable" | "completed";
export type RemotePresence = "not_applicable" | "present" | "absent" | "unknown";
export type DeletionDestination = "flow_dev" | "github";

export type DeletionFailureReason =
  | "github_permission_denied"
  | "provider_rate_limited"
  | "provider_unavailable"
  | "authorization_needed"
  | "identity_conflict"
  | "missing_identity"
  | "invalid_target"
  | "unknown_remote_outcome"
  | "unknown_stop"
  | "uncertain_publication"
  | "repository_access_lost"
  | "stale_fence";

export type DeletionStatus = {
  operationId: string;
  state: DeletionState;
  remotePresence: RemotePresence;
  workStopped: boolean;
  reason: string | null;
  retryAfterSeconds: number | null;
};

export type DeletionPreview = {
  target: DeletionTarget;
  title: string;
  repository: string;
  issueNumber: number | null;
  destinations: DeletionDestination[];
  canDelete: boolean;
  fingerprint: string;
  deleteReason: DeletionFailureReason | "forbidden" | null;
};

export type StartDeletionInput = { target: DeletionTarget; fingerprint: string; requestKey: string };
export type RetryDeletionInput = { operationId: string; requestKey: string };

export type FrozenIssueIdentity = { repositoryId: string; repositoryNodeId: string; issueNodeId: string; issueNumber: number };

export type DeletionOperation = {
  id: string;
  projectId: string;
  taskId: string | null;
  repositoryId: string;
  repositoryNodeId: string;
  issueNodeId: string | null;
  issueNumber: number | null;
  initiatorUserId: string;
  requestKey: string;
  state: DeletionState;
  remotePresence: RemotePresence;
  workStopped: boolean;
  reason: string | null;
  retryAt: Date | null;
  leaseOwner: string | null;
  leaseFence: number;
  leaseUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
};
