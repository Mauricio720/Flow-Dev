import type { PlanRunDao, PlanRunRecord } from "../../database/dao/planRunDao";
import type { PlanRunWorkerDao } from "../../database/dao/planRunWorkerDao";
import type { TickStep } from "../terminal/sessionTickStep";
import type { PlanLog } from "../tasks-set/planLog";
import { buildPlanView } from "../tasks-set/planView";
import type { PlanItemView } from "../tasks-set/planView";
import type { GuardedRun, PlanRunGuards } from "./planRunGuards";
import type { PlanRunPauser } from "./planRunPauser";
import { decidePlanRun } from "./planRunSelection";
import type { PlanRunDecision } from "./planRunSelection";
import type { PlanRunStepStart } from "./planRunStepStart";

export type PlanRunStepDeps = { worker: PlanRunWorkerDao; runs: Pick<PlanRunDao, "transition">; guards: Pick<PlanRunGuards, "check">; starter: Pick<PlanRunStepStart, "start">; pauser: Pick<PlanRunPauser, "pause">; captureStop: (sessionId: string) => Promise<void>; hostId: string; log: PlanLog };
type Evaluation = { guarded: GuardedRun; items: PlanItemView[]; decision: PlanRunDecision };

const FIRST_POSITION = 1;

export class PlanRunStep implements TickStep {
  readonly name = "plan_run";

  constructor(private readonly deps: PlanRunStepDeps) {}

  async run() {
    const runs = await this.deps.worker.listRunningForHost(this.deps.hostId);
    for (const run of runs) await this.advance(run);
  }

  private async advance(run: PlanRunRecord) {
    const first = await this.evaluate(run);
    if (!first) return;
    const settled = first.decision.kind === "pause" && run.currentSessionId ? await this.recaptured(run, run.currentSessionId) : first;
    if (settled) await this.apply(run, settled);
  }

  private async recaptured(run: PlanRunRecord, sessionId: string) {
    await this.deps.captureStop(sessionId);
    return this.evaluate(run);
  }

  private async evaluate(run: PlanRunRecord): Promise<Evaluation | null> {
    const guarded = await this.deps.guards.check(run);
    if (!guarded) return null;
    const items = buildPlanView({ plan: guarded.plan, set: guarded.set, canEdit: false, agents: [] }).items;
    const [working, current] = await Promise.all([this.deps.worker.agentWorking(run.taskId), this.current(run)]);
    return { guarded, items, decision: decidePlanRun({ items, set: guarded.set, working, current }) };
  }

  private async current(run: PlanRunRecord) {
    if (!run.currentItemId || !run.currentSessionId) return null;
    const session = await this.deps.worker.currentSession(run.currentSessionId);
    return session ? { itemId: run.currentItemId, ...session } : null;
  }

  private async apply(run: PlanRunRecord, input: Evaluation) {
    const { decision, items, guarded } = input;
    if (decision.kind === "pause") await this.deps.pauser.pause(run, decision);
    if (decision.kind === "complete") await this.complete(run);
    if (decision.kind !== "start") return;
    const index = items.findIndex((item) => item.id === decision.itemId);
    await this.deps.starter.start(run, { item: items[index]!, position: index + FIRST_POSITION, set: guarded.set });
  }

  private async complete(run: PlanRunRecord) {
    const completed = await this.deps.runs.transition({ runId: run.id, revision: run.revision, next: { state: "completed", currentItemId: null, currentSessionId: null } });
    if (completed) this.deps.log.runCompleted({ taskId: run.taskId, runId: run.id });
  }
}
