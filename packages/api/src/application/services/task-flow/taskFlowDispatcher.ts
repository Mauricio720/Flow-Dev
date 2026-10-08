import type { FlowUnitOfWork } from "../../database/dao/flowUnitOfWork";
import type { RunRecord } from "../../database/dao/taskFlowDao";
import type { AttemptGrant, CredentialBroker } from "../../software/credentialBroker";
import type { ActionExecutor, ExecutionRequest } from "./actionExecutor";
import type { ActionSnapshot } from "./flowContracts";
import { grantId } from "./grantIds";
import type { PackageCapture } from "./packageCapture";
import { settlementFor, type RunSettlement } from "./runOutcomes";
import { captureRunResult, refreshTaskFlowPlanStatus } from "./taskFlowRunFinalization";

export type DispatcherDependencies = { unit: FlowUnitOfWork; broker: CredentialBroker; executor: ActionExecutor; owner: string; clock: () => Date; leaseMs: number; capture?: Pick<PackageCapture, "capture">; authorize?: (run: RunRecord) => Promise<string | null> };

const RECONCILING_STATE = "reconciling";
const RUNNING_STATE = "running";
const ACTIVE_MONITOR_LEASE_MS = 5000;

export class TaskFlowDispatcher {
  constructor(private readonly deps: DispatcherDependencies) {}

  async runOnce(): Promise<boolean> {
    const { unit, owner, clock, leaseMs } = this.deps;
    const run = await unit.run(({ flow }) => flow.runs.claimNext({ owner, now: clock(), leaseMs }));
    if (!run) return false;
    try { await this.handle(run); } catch { await this.markUnknown(run); }
    return true;
  }

  private async handle(run: RunRecord) {
    const fresh = run.state === "dispatching" && !run.runtime.sessionId && !run.runtime.runId;
    const blocked = fresh ? await this.deps.authorize?.(run) : null;
    if (blocked) return this.settle(run, { state: "blocked", terminalCode: blocked, actionState: "blocked" });
    const request = await this.request(run);
    if (fresh) return this.dispatch(request);
    const result = await this.deps.executor.reconcile(request);
    if (result.runtime) await this.deps.unit.run(({ flow }) => flow.runs.bindRuntime({ runId: run.id, fence: run.leaseFence, runtime: result.runtime! }));
    if (result.runtimeEventSequence !== undefined && result.runtimeEventSequence > (run.runtimeEventSequence ?? 0)) {
      await this.deps.unit.run(async ({ flow }) => {
        if (!flow.runs.recordActivity) return false;
        return flow.runs.recordActivity({ runId: run.id, fence: run.leaseFence, runtimeEventSequence: result.runtimeEventSequence!, activity: result.activity ?? null, now: this.deps.clock() });
      });
    }
    const settlement = settlementFor(result);
    if (settlement) return this.settle(run, await captureRunResult(this.deps.capture, run, settlement));
    await this.advance(run, result.state === "running" ? RUNNING_STATE : RECONCILING_STATE);
  }

  private async dispatch(request: ExecutionRequest) {
    const result = await this.deps.executor.execute(request);
    const { run } = request;
    if (result.kind === "submitted") {
      await this.deps.unit.run(({ flow }) => flow.runs.bindRuntime({ runId: run.id, fence: run.leaseFence, runtime: result.runtime }));
      return this.advance(run, RUNNING_STATE);
    }
    if (result.kind === "unknown" && result.runtime) {
      const runtime = result.runtime;
      await this.deps.unit.run(({ flow }) => flow.runs.bindRuntime({ runId: run.id, fence: run.leaseFence, runtime }));
    }
    const settlement = settlementFor(result);
    if (settlement) return this.settle(run, settlement);
    await this.advance(run, RECONCILING_STATE);
  }

  private async request(run: RunRecord): Promise<ExecutionRequest> {
    const grants: AttemptGrant[] = [];
    const snapshot = run.snapshot as ActionSnapshot;
    if (snapshot.workspace.kind === "local") return { run, snapshot, grants };
    try {
      for (const connectionId of run.connectionIds) grants.push(await this.deps.broker.grantForAttempt({ connectionId, attemptId: grantId(run.id, connectionId) }));
      return { run, snapshot, grants };
    } catch (error) {
      await Promise.allSettled(grants.map((grant) => this.deps.broker.releaseGrant(grant.attemptId)));
      throw error;
    }
  }

  private async advance(run: RunRecord, state: string) {
    const { unit, clock } = this.deps;
    const leaseMs = [RUNNING_STATE, RECONCILING_STATE].includes(state) ? ACTIVE_MONITOR_LEASE_MS : this.deps.leaseMs;
    await unit.run(({ flow }) => flow.runs.advance({ runId: run.id, fence: run.leaseFence, state, leaseMs, now: clock() }));
  }

  private async settle(run: RunRecord, settlement: RunSettlement) {
    const settled = await this.deps.unit.run(async ({ flow }) => {
      const accepted = await flow.runs.settle({ runId: run.id, fence: run.leaseFence, state: settlement.state, terminalCode: settlement.terminalCode, now: this.deps.clock(), ...(settlement.activity ? { activity: settlement.activity } : {}) });
      if (!accepted) return false;
      await flow.plans.setActionState(run.actionId, settlement.actionState);
      await refreshTaskFlowPlanStatus(flow, run.taskId);
      return true;
    });
    if (settled && (run.snapshot as ActionSnapshot).workspace.kind !== "local") await Promise.all(run.connectionIds.map((id) => this.deps.broker.releaseGrant(grantId(run.id, id))));
  }

  private async markUnknown(run: RunRecord) {
    await this.advance(run, RECONCILING_STATE).catch(() => undefined);
  }
}
