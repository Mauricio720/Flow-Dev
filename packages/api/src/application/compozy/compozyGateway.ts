export type CompozyAgentRef = { agentName: string };

export type CompozyWorktreePolicy = { mode: "per_run" } | { mode: "ref"; worktreeId: string } | { mode: "none" };

export type CompozyTaskSpec = {
  identifier: string;
  title: string;
  description: string;
  metadata: Record<string, string>;
  maxAttempts: number;
  requiresApproval: boolean;
  autoEnqueueOnReady: boolean;
  profile: {
    worker: CompozyAgentRef;
    review: CompozyAgentRef | null;
    worktree: CompozyWorktreePolicy;
  };
};

export const compozyReviewOutcomes = ["approved", "rejected", "blocked", "error", "timeout", "invalid_output"] as const;
export type CompozyReviewOutcome = (typeof compozyReviewOutcomes)[number];

export const compozyBlockKinds = ["needs_input", "capability", "transient"] as const;
export type CompozyBlockKind = (typeof compozyBlockKinds)[number];

export type CompozyTaskState = {
  taskId: string;
  status: string;
  latestRun: { runId: string; status: string; attempt: number; sessionId: string | null } | null;
  latestReview: { outcome: CompozyReviewOutcome; summary: string | null } | null;
  openBlocks: { kind: CompozyBlockKind; reason: string }[];
};

export type CompozyWorktreeInput = { workspaceId: string; name: string; branch: string; baseRef: string };
export type CompozyRunInput = { taskId: string; idempotencyKey: string; metadata?: Record<string, string> };
export type CompozyFileInput = { workspaceId: string; worktreeId: string; path: string };
export type CompozyFileContent = { content: string } | { sensitive: true };
export type CompozySessionInput = { workspaceId: string; sessionId: string };
export type CompozyPullRequest = { url: string; state: string };

export interface CompozyGateway {
  health(): Promise<{ reachable: boolean; version: string | null }>;
  resolveWorkspace(path: string): Promise<{ workspaceId: string }>;
  createWorktree(input: CompozyWorktreeInput): Promise<{ worktreeId: string; path: string }>;
  createTask(workspaceId: string, spec: CompozyTaskSpec): Promise<{ taskId: string }>;
  addDependency(input: { taskId: string; dependsOnTaskId: string }): Promise<void>;
  enqueueRun(input: CompozyRunInput): Promise<{ runId: string }>;
  approveTask(input: { taskId: string; idempotencyKey: string }): Promise<void>;
  cancelTask(taskId: string): Promise<void>;
  readTask(taskId: string): Promise<CompozyTaskState>;
  readRunResult(runId: string): Promise<string>;
  readFile(input: CompozyFileInput): Promise<CompozyFileContent>;
  sessionPullRequest(input: CompozySessionInput): Promise<CompozyPullRequest | null>;
}
