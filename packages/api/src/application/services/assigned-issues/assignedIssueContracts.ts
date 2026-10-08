export type ClaimState = "unclaimed" | "pending" | "uncertain" | "failed" | "claimed";
export type ClaimResult = { taskId: string; state: ClaimState; operatorId: string | null; reason: string | null; replayed: boolean };
export type ClaimStatus = Omit<ClaimResult, "replayed">;
export type AssignedIssueItem = {
  issueNodeId: string;
  boardItemId: string;
  number: number;
  title: string;
  url: string;
  repository: { owner: string; name: string };
  assignees: { githubId: string; login: string | null }[];
  status: "Ready";
};
export type QueueAvailability = "available" | "empty" | "scan_continuing" | "retry_later";
export type AssignedQueuePage = { items: AssignedIssueItem[]; nextCursor: string | null; availability: QueueAvailability; retryAfterSeconds: number | null };
export type SourceView = { snapshotId: string; revision: number; origin: "flow_dev" | "external"; title: string; contentHash: string; githubUpdatedAt: string; issueNumber: number; issueUrl: string };
export type ActiveWorkItem = { taskId: string; title: string; issueNumber: number; issueUrl: string; operatorId: string; operatorName: string | null; stage: string | null; blockReason: string | null; claimedAt: string };
export type ActiveWorkFilter = "mine" | "shared";
