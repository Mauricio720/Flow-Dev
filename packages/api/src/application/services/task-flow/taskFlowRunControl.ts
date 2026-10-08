import type { FlowUnitOfWork } from "../../database/dao/flowUnitOfWork";
import type { RunRecord } from "../../database/dao/taskFlowDao";
import type { ActionExecutor, ReconcileResult } from "./actionExecutor";
import type { ActionSnapshot } from "./flowContracts";
import { settlementFor } from "./runOutcomes";
import { grantId } from "./grantIds";
import { TaskFlowError } from "./taskFlowErrors";
import type { TaskScope } from "./taskFlowPorts";

export type CancelRunInput = { runId: string; idempotencyKey: string };
export type CancelResult = { runId: string; state: string; terminalCode: string | null };

export type RunControlDependencies = { unit: FlowUnitOfWork; executor?: Pick<ActionExecutor, "cancel">; releaseGrant?: (attemptId: string) => Promise<void>; owner: string; clock: () => Date; leaseMs: number };

const ACTIVE_STATES = ["queued", "dispatching", "running", "waiting", "finalizing", "stopping", "reconciling"];
const STOPPING_STATE = "stopping";
const RECONCILING_STATE = "reconciling";

export class TaskFlowRunControl {
  constructor(private readonly deps: RunControlDependencies) {}

  async cancel(scope: TaskScope, input: CancelRunInput): Promise<CancelResult> {
    if (!this.deps.executor?.cancel) throw new TaskFlowError("service_unavailable");
    const claimed = await this.claim(scope, input.runId);
    if ("view" in claimed) return claimed.view;
    const outcome = await this.deps.executor.cancel({ run: claimed.run, snapshot: claimed.run.snapshot as ActionSnapshot, grants: [] }).catch(() => ({ state: "unknown" as const, code: null }));
    return this.settle(claimed.run, outcome);
  }

  private claim(scope: TaskScope, runId: string): Promise<{ run: RunRecord } | { view: CancelResult }> {
    return this.deps.unit.run(async ({ flow }) => {
      await flow.lockTask(scope.taskId);
      await flow.assertWorkScope?.(scope);
      const run = await flow.runs.find(runId);
      if (!run || run.taskId !== scope.taskId) throw new TaskFlowError("run_unavailable");
      if (!ACTIVE_STATES.includes(run.state)) return { view: { runId, state: run.state, terminalCode: run.terminalCode } };
      const taken = await flow.runs.takeover({ runId, owner: this.deps.owner, now: this.deps.clock(), leaseMs: this.deps.leaseMs });
      if (!taken) throw new TaskFlowError("run_unavailable");
      return { run: taken };
    });
  }

  private async settle(run: RunRecord, outcome: ReconcileResult): Promise<CancelResult> {
    const settlement = settlementFor(outcome);
    const accepted = await this.deps.unit.run(async ({ flow }) => {
      const state = settlement?.state ?? (outcome.state === "running" ? STOPPING_STATE : RECONCILING_STATE);
      if (!settlement) {
        await flow.runs.advance({ runId: run.id, fence: run.leaseFence, state, leaseMs: this.deps.leaseMs, now: this.deps.clock() });
        return { result: { runId: run.id, state, terminalCode: null }, settled: false };
      }
      const settled = await flow.runs.settle({ runId: run.id, fence: run.leaseFence, state, terminalCode: settlement.terminalCode, now: this.deps.clock() });
      if (settled) await flow.plans.setActionState(run.actionId, settlement.actionState);
      return { result: { runId: run.id, state, terminalCode: settlement.terminalCode }, settled };
    });
    if (accepted.settled && this.deps.releaseGrant && (run.snapshot as ActionSnapshot).workspace.kind !== "local") await Promise.all(run.connectionIds.map((connectionId) => this.deps.releaseGrant!(grantId(run.id, connectionId))));
    return accepted.result;
  }
}
