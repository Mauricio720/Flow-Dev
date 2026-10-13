import type { TaskSpecDao } from "../../database/dao/taskSpecDao";
import { specEligibility, type SpecEligibilityInput } from "../spec/specEligibility";
import { DIRECT_PLANNING_ROUTE, flowRouteOf } from "./directExecution";
import type { TaskFlowReason } from "./taskFlowErrors";
import type { TaskEligibility, TaskFlowGate, TaskScope } from "./taskFlowPorts";

const ROUTE_UNSUPPORTED = "route_unsupported";
const SPEC_REASONS: Record<string, TaskFlowReason> = {
  publication_required: "publication_required",
  planning_required: "planning_required",
  route_unsupported: ROUTE_UNSUPPORTED,
  source_changed: "source_changed",
};

// The route is the last thing spec eligibility checks, so an unsupported direct route means every other precondition already holds.
function approvedDirectRoute(input: SpecEligibilityInput, reason: string | null) {
  return reason === ROUTE_UNSUPPORTED && input.planning?.selectedRoute === DIRECT_PLANNING_ROUTE;
}

export class SpecEligibilityGate implements TaskFlowGate {
  constructor(private readonly specs: TaskSpecDao) {}

  async eligibility(scope: TaskScope): Promise<TaskEligibility> {
    const snapshot = await this.specs.snapshot({ projectId: scope.projectId, taskId: scope.taskId });
    const result = specEligibility(snapshot.eligibility);
    const route = flowRouteOf(snapshot.eligibility.planning?.selectedRoute);
    if (result.canStart || approvedDirectRoute(snapshot.eligibility, result.reason)) return { canPlan: true, reason: null, route };
    return { canPlan: false, reason: SPEC_REASONS[result.reason ?? ""] ?? "flow_not_eligible", route };
  }

  async approvedSpec(): Promise<boolean> {
    return false;
  }

  async approvedTasks(): Promise<boolean> {
    return false;
  }
}
