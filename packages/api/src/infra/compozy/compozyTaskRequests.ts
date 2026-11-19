import type { CreateTaskRequest, ExecutionProfile, WorktreePolicy } from "@compozy/client";
import type { CompozyTaskSpec, CompozyWorktreePolicy } from "../../application/compozy/compozyGateway";

const WORKSPACE_SCOPE = "workspace";
const MANUAL_APPROVAL = "manual";
const NO_APPROVAL = "none";
const SELECTED_WORKER = "select";
const INHERITED_COORDINATOR = "inherit";
const DEFAULT_RUNTIME = "default";

export function createTaskRequest(workspaceId: string, spec: CompozyTaskSpec): CreateTaskRequest {
  return {
    scope: WORKSPACE_SCOPE,
    workspace: workspaceId,
    identifier: spec.identifier,
    title: spec.title,
    description: spec.description,
    metadata: spec.metadata,
    max_attempts: spec.maxAttempts,
    approval_policy: spec.requiresApproval ? MANUAL_APPROVAL : NO_APPROVAL,
    auto_enqueue_on_ready: spec.autoEnqueueOnReady,
    wake_creator: false,
  };
}

export function executionProfileRequest(taskId: string, profile: CompozyTaskSpec["profile"]): ExecutionProfile {
  const now = new Date().toISOString();
  return {
    task_id: taskId,
    created_at: now,
    updated_at: now,
    worker: { mode: SELECTED_WORKER, agent_name: profile.worker.agentName },
    review: profile.review ? { agent_name: profile.review.agentName } : {},
    worktree: worktreePolicy(profile.worktree),
    coordinator: { mode: INHERITED_COORDINATOR },
    participants: {},
    runtime: { mode: DEFAULT_RUNTIME },
  };
}

function worktreePolicy(policy: CompozyWorktreePolicy): WorktreePolicy {
  if (policy.mode === "ref") return { mode: "ref", worktree_ref: policy.worktreeId };
  return { mode: policy.mode };
}
