import type { TaskSpecDao } from "../../database/dao/taskSpecDao";
import { specEligibility } from "../spec/specEligibility";
import type { TaskFlowReason } from "./taskFlowErrors";
import type { TaskEligibility, TaskFlowGate, TaskScope } from "./taskFlowPorts";

const SPEC_REASONS: Record<string, TaskFlowReason> = {
  publication_required: "publication_required",
  planning_required: "planning_required",
  route_unsupported: "route_unsupported",
  source_changed: "source_changed",
};

export class SpecEligibilityGate implements TaskFlowGate {
  constructor(private readonly specs: TaskSpecDao) {}

  async eligibility(scope: TaskScope): Promise<TaskEligibility> {
    const snapshot = await this.specs.snapshot({ projectId: scope.projectId, taskId: scope.taskId });
    const result = specEligibility(snapshot.eligibility);
    if (result.canStart) return { canPlan: true, reason: null };
    return { canPlan: false, reason: SPEC_REASONS[result.reason ?? ""] ?? "flow_not_eligible" };
  }

  async approvedSpec(): Promise<boolean> {
    return false;
  }

  async approvedTasks(): Promise<boolean> {
    return false;
  }
}
