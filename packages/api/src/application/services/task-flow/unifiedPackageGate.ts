import type { TaskFlowDao } from "../../database/dao/taskFlowDao";
import type { TaskEligibility, TaskFlowGate, TaskScope } from "./taskFlowPorts";

export class UnifiedPackageGate implements TaskFlowGate {
  constructor(private readonly base: Pick<TaskFlowGate, "eligibility">, private readonly flow: TaskFlowDao) {}

  eligibility(scope: TaskScope): Promise<TaskEligibility> {
    return this.base.eligibility(scope);
  }

  approvedSpec(taskId: string) {
    return this.flow.packages.hasApprovedLatest(taskId, "os_spec_v1");
  }

  approvedTasks(taskId: string) {
    return this.flow.packages.hasApprovedLatest(taskId, "os_tasks_v1");
  }
}
