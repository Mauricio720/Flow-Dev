import type { CompozyAgentRuntime, CompozyTaskSpec } from "../../compozy/compozyGateway";
import type { PlanningRoute } from "../tasks/planningContracts";
import { directExecutionBriefing } from "./executionBriefing";
import { executionNames } from "./executionNames";

export const EXECUTION_MAX_ATTEMPTS = 3;
export const WORKER_AGENT = "code_implementer";
const REVIEW_AGENT = "reviewer";
const IMPLEMENT_TITLE_PREFIX = "Implementar: ";

export type ExecutionIssue = { title: string; url: string; number: number; bodyMarkdown: string };
export type ExecutionDecision = { selectedRoute: PlanningRoute; summary: string; reasons: string[]; uncertainties: string[] };
export type ExecutionPlanInput = { executionId: string; taskId: string; projectKey: string; defaultBranch: string; issue: ExecutionIssue; decision: ExecutionDecision; runtime: CompozyAgentRuntime | null };
export type ExecutionPlan = { route: PlanningRoute; branch: string; work: CompozyTaskSpec };

export function buildExecutionPlan(input: ExecutionPlanInput): ExecutionPlan {
  if (input.decision.selectedRoute !== "direct_execution") throw new Error(`execution route ${input.decision.selectedRoute} is not implemented`);
  const names = executionNames(input);
  return { route: input.decision.selectedRoute, branch: names.branch, work: directWorkTask(input, names) };
}

function directWorkTask(input: ExecutionPlanInput, names: ReturnType<typeof executionNames>): CompozyTaskSpec {
  return {
    identifier: names.workIdentifier,
    title: IMPLEMENT_TITLE_PREFIX + input.issue.title,
    description: directExecutionBriefing({ ...input, branch: names.branch }),
    metadata: executionMetadata(input),
    maxAttempts: EXECUTION_MAX_ATTEMPTS,
    requiresApproval: false,
    autoEnqueueOnReady: false,
    profile: { worker: { agentName: WORKER_AGENT }, review: { agentName: REVIEW_AGENT }, worktree: { mode: "per_run" }, runtime: input.runtime },
  };
}

function executionMetadata(input: ExecutionPlanInput) {
  return { "flow_dev.task_id": input.taskId, "flow_dev.execution_id": input.executionId, "flow_dev.route": input.decision.selectedRoute, "flow_dev.project": input.projectKey };
}
