import type { CompozyAgentRuntime, CompozyTaskSpec } from "../../compozy/compozyGateway";
import type { PlanningRoute } from "../tasks/planningContracts";
import { directExecutionBriefing } from "./executionBriefing";
import { specDeliveryBriefing, specGenerationBriefing } from "./executionSpecBriefing";
import { executionNames } from "./executionNames";

export const EXECUTION_MAX_ATTEMPTS = 3;
export const INITIAL_SPEC_ROUND = 1;
export const WORKER_AGENT = "code_implementer";
const REVIEW_AGENT = "reviewer";
export const SPEC_AGENT = "general";
export const DELIVERY_AGENT = "spec_conductor";
export const SPEC_ROUND_METADATA = "flow_dev.round";
const IMPLEMENT_TITLE_PREFIX = "Implementar: ";
const SPEC_TITLE_PREFIX = "Spec: ";
const DELIVERY_TITLE_PREFIX = "Entregar spec: ";

export type ExecutionIssue = { title: string; url: string; number: number; bodyMarkdown: string };
export type ExecutionDecision = { selectedRoute: PlanningRoute; summary: string; reasons: string[]; uncertainties: string[] };
export type ExecutionPlanInput = { executionId: string; taskId: string; projectKey: string; defaultBranch: string; issue: ExecutionIssue; decision: ExecutionDecision; runtime: CompozyAgentRuntime | null };
export type ExecutionPlan = DirectExecutionPlan | SpecExecutionPlan;
export type DirectExecutionPlan = { route: "direct_execution"; branch: string; workIdentifier: string; work: CompozyTaskSpec };
export type SpecExecutionPlan = { route: Exclude<PlanningRoute, "direct_execution">; branch: string; specIdentifier: string; deliveryIdentifier: string; specDir: string; worktree: { name: string; branch: string; baseRef: string }; createSpecTask: (worktreeId: string) => CompozyTaskSpec; createDeliveryTask: (worktreePath: string) => CompozyTaskSpec };
type SpecTaskInput = { input: ExecutionPlanInput; names: ReturnType<typeof executionNames>; worktreeId: string };
type DeliveryTaskInput = { input: ExecutionPlanInput; names: ReturnType<typeof executionNames>; worktreePath: string };

export function buildExecutionPlan(input: ExecutionPlanInput): ExecutionPlan {
  const names = executionNames(input);
  if (input.decision.selectedRoute === "direct_execution") return directPlan(input, names);
  return specPlan(input, names);
}

function directPlan(input: ExecutionPlanInput, names: ReturnType<typeof executionNames>): DirectExecutionPlan {
  return { route: "direct_execution", branch: names.branch, workIdentifier: names.workIdentifier, work: directWorkTask(input, names) };
}

function specPlan(input: ExecutionPlanInput, names: ReturnType<typeof executionNames>): SpecExecutionPlan {
  return {
    route: input.decision.selectedRoute as Exclude<PlanningRoute, "direct_execution">,
    branch: names.branch,
    specIdentifier: names.specIdentifier,
    deliveryIdentifier: names.deliveryIdentifier,
    specDir: names.specDir,
    worktree: { name: names.specWorktreeName, branch: names.specBranch, baseRef: input.defaultBranch },
    createSpecTask: (worktreeId) => specTask({ input, names, worktreeId }),
    createDeliveryTask: (worktreePath) => deliveryTask({ input, names, worktreePath }),
  };
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

function specTask({ input, names, worktreeId }: SpecTaskInput): CompozyTaskSpec {
  return { identifier: names.specIdentifier, title: SPEC_TITLE_PREFIX + input.issue.title, description: specGenerationBriefing({ ...input, route: input.decision.selectedRoute as "tech_spec" | "prd", specDir: names.specDir }), metadata: executionMetadata(input, INITIAL_SPEC_ROUND), maxAttempts: EXECUTION_MAX_ATTEMPTS, requiresApproval: false, autoEnqueueOnReady: false, profile: { worker: { agentName: SPEC_AGENT }, review: { agentName: REVIEW_AGENT }, worktree: { mode: "ref", worktreeId }, runtime: input.runtime } };
}

function deliveryTask({ input, names, worktreePath }: DeliveryTaskInput): CompozyTaskSpec {
  return { identifier: names.deliveryIdentifier, title: DELIVERY_TITLE_PREFIX + input.issue.title, description: specDeliveryBriefing({ issueTitle: input.issue.title, specBranch: names.specBranch, deliveryBranch: names.branch, defaultBranch: input.defaultBranch, worktreePath, specDir: names.specDir }), metadata: executionMetadata(input), maxAttempts: EXECUTION_MAX_ATTEMPTS, requiresApproval: true, autoEnqueueOnReady: true, profile: { worker: { agentName: DELIVERY_AGENT }, review: null, worktree: { mode: "none" }, runtime: input.runtime } };
}

function executionMetadata(input: ExecutionPlanInput, specRound?: number) {
  return { "flow_dev.task_id": input.taskId, "flow_dev.execution_id": input.executionId, "flow_dev.route": input.decision.selectedRoute, "flow_dev.project": input.projectKey, ...(specRound ? { [SPEC_ROUND_METADATA]: String(specRound) } : {}) };
}
