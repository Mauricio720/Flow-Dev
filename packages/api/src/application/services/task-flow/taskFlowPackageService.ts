import type { FlowUnitOfWork } from "../../database/dao/flowUnitOfWork";
import type { PackageRecord } from "../../database/dao/unifiedPackageDao";
import { TaskFlowError } from "./taskFlowErrors";
import type { TaskScope } from "./taskFlowPorts";

export type ApprovePackageInput = { packageId: string; version: number; idempotencyKey: string };
export type ApprovalResult = { packageId: string; version: number; status: "approved"; approvedAt: Date };

function resultOf(record: PackageRecord): ApprovalResult {
  return { packageId: record.id, version: record.version, status: "approved", approvedAt: record.approvedAt! };
}

export class TaskFlowPackageService {
  constructor(private readonly unit: FlowUnitOfWork) {}

  approve(scope: TaskScope, input: ApprovePackageInput): Promise<ApprovalResult> {
    return this.unit.run(async ({ flow }) => {
      await flow.lockTask(scope.taskId);
      await flow.assertWorkScope?.(scope);
      const replay = await flow.packages.findApprovalByKey(scope.taskId, input.idempotencyKey);
      if (replay) return this.replayed(flow.packages, scope.taskId, replay.packageId, input);
      const target = await flow.packages.find(scope.taskId, input.packageId);
      if (!target) throw new TaskFlowError("package_unavailable");
      const latest = await flow.packages.latest(scope.taskId);
      if (target.version !== input.version || latest?.id !== target.id) throw new TaskFlowError("package_version_changed", undefined, { currentVersion: latest?.version });
      if (target.status === "approved") return resultOf(target);
      const approved = await flow.packages.approve({ packageId: target.id, taskId: scope.taskId, version: target.version, approverId: scope.actorId, idempotencyKey: input.idempotencyKey });
      return resultOf(approved);
    });
  }

  private async replayed(packages: { find(taskId: string, packageId: string): Promise<PackageRecord | null> }, taskId: string, packageId: string, input: ApprovePackageInput) {
    if (packageId !== input.packageId) throw new TaskFlowError("idempotency_key_reused");
    return resultOf((await packages.find(taskId, packageId))!);
  }
}
