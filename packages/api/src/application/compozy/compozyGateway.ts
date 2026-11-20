export type CompozyAgentRef = { agentName: string };
export type CompozyAgentRuntime = { provider: string; model: string; reasoningEffort: string };

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
    runtime: CompozyAgentRuntime | null;
  };
};

export const compozyReviewOutcomes = ["approved", "rejected", "blocked", "error", "timeout", "invalid_output"] as const;
export type CompozyReviewOutcome = (typeof compozyReviewOutcomes)[number];

export const compozyBlockKinds = ["needs_input", "capability", "transient"] as const;
export type CompozyBlockKind = (typeof compozyBlockKinds)[number];

export type CompozyRunState = { runId: string; status: string; attempt: number; sessionId: string | null; error: string | null };
export type CompozyReviewState = { reviewId: string; runId: string; status: string; outcome: CompozyReviewOutcome | null; summary: string | null };

export type CompozyTaskState = {
  taskId: string;
  status: string;
  latestRun: CompozyRunState | null;
  latestReview: CompozyReviewState | null;
  openBlocks: { kind: CompozyBlockKind; reason: string }[];
};

export type CompozyWorktreeInput = { workspaceId: string; name: string; branch: string; baseRef: string };
export type CompozyWorktreeRef = { worktreeId: string; name: string; branch: string; path: string };
export type CompozyRunInput = { taskId: string; idempotencyKey: string; metadata?: Record<string, string> };
export type CompozyFileInput = { workspaceId: string; worktreeId: string; path: string };
export type CompozyFileListInput = CompozyFileInput;
export type CompozyFileEntry = { path: string; kind: string; sensitive?: boolean; symlink?: boolean };
export type CompozyFileContent = { content: string } | { sensitive: true };
export type CompozySessionInput = { workspaceId: string; sessionId: string };
export type CompozyPullRequest = { url: string; state: string };
export type CompozyReviewInput = { taskId: string; runId: string };

export interface CompozyGateway {
  health(): Promise<{ reachable: boolean; version: string | null }>;
  resolveWorkspace(path: string): Promise<{ workspaceId: string }>;
  createWorktree(input: CompozyWorktreeInput): Promise<{ worktreeId: string; path: string }>;
  findWorktree(input: { workspaceId: string; name: string }): Promise<CompozyWorktreeRef | null>;
  createTask(workspaceId: string, spec: CompozyTaskSpec): Promise<{ taskId: string }>;
  addDependency(input: { taskId: string; dependsOnTaskId: string }): Promise<void>;
  enqueueRun(input: CompozyRunInput): Promise<{ runId: string }>;
  approveTask(input: { taskId: string; idempotencyKey: string }): Promise<void>;
  cancelTask(taskId: string): Promise<void>;
  requestReview(input: CompozyReviewInput): Promise<void>;
  readTask(taskId: string): Promise<CompozyTaskState>;
  readRunResult(runId: string): Promise<string>;
  listFileEntries(input: CompozyFileListInput): Promise<CompozyFileEntry[]>;
  readFile(input: CompozyFileInput): Promise<CompozyFileContent>;
  sessionPullRequest(input: CompozySessionInput): Promise<CompozyPullRequest | null>;
}
