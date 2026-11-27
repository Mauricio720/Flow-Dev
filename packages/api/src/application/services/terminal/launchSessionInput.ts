import type { ApprovedPlanning, CreateTerminalSessionInput } from "../../database/dao/terminalSessionDao";
import { DEFAULT_PERMISSION_MODE } from "../../terminal/sessionInteraction";
import type { AgentChoice } from "../../terminal/sessionAgentCatalog";
import type { SessionPurposeKind } from "../../terminal/sessionPurposeKind";
import type { ResolvedPurpose } from "../../terminal/sessionPurposeInput";
import type { VerifiedCheckout } from "../projects/localCheckoutService";

export type ReviewPurpose = Extract<SessionPurposeKind, "review" | "review_execute">;
type LaunchBase = { actorId: string; taskId: string; projectId: string; requestKey: string; choice: AgentChoice; prompt: string };
export type ReviewLaunchInput = LaunchBase & { purpose: ReviewPurpose; reviewCycleId: string };
export type PlanItemLaunchInput = LaunchBase & { purpose: "plan_item"; planItemId: string };
export type LaunchInput = ReviewLaunchInput | PlanItemLaunchInput;
export type LaunchContext = { planning: ApprovedPlanning; checkout: VerifiedCheckout; hostId: string; agentAccountId: string | null };

const PLAN_ITEM_PURPOSE = "plan_item";

function purposeColumns(input: LaunchInput) {
  return input.purpose === PLAN_ITEM_PURPOSE ? { purpose: input.purpose, planItemId: input.planItemId } : { purpose: input.purpose, reviewCycleId: input.reviewCycleId };
}

export function launchSessionInput(input: LaunchInput, { planning, checkout, hostId, agentAccountId }: LaunchContext): CreateTerminalSessionInput {
  return { taskId: input.taskId, projectId: input.projectId, userId: input.actorId, planningDecisionId: planning.decisionId, route: planning.route, requestKey: input.requestKey, checkoutPath: checkout.path, branch: checkout.branch, dirty: checkout.dirty, runtime: "flow_dev", permissionMode: DEFAULT_PERMISSION_MODE, hostId, agent: input.choice.agent, model: input.choice.model, effort: input.choice.effort, agentAccountId, ...purposeColumns(input) };
}

export function launchedPurpose(input: LaunchInput): ResolvedPurpose | null {
  if (input.purpose !== PLAN_ITEM_PURPOSE) return null;
  return { columns: { purpose: PLAN_ITEM_PURPOSE, planItemId: input.planItemId, ...input.choice }, itemStart: { itemId: input.planItemId, force: false } };
}
