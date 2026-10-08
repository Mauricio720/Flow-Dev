import { and, asc, eq, inArray } from "drizzle-orm";
import type { ActionRecord, ActionRelocation, PlanRecord, PlanSaveReceipt, PlanStore, PlannedAction } from "../../../../application/database/dao/taskFlowDao";
import type { Database } from "../../client";
import { taskExecutionActions, taskExecutionPlanSaves, taskExecutionPlans, taskExecutionRuntimeBindings } from "../../schema";
import { toAction, toPlan } from "./taskFlowMappers";

const PLANNED_STATE = "planned";

export class TaskFlowPlanStore implements PlanStore {
  constructor(private readonly database: Database) {}

  async find(taskId: string) {
    const [row] = await this.database.select().from(taskExecutionPlans).where(eq(taskExecutionPlans.taskId, taskId));
    return row ? this.hydrate(row) : null;
  }

  async lock(taskId: string) {
    const [row] = await this.database.select().from(taskExecutionPlans).where(eq(taskExecutionPlans.taskId, taskId)).for("update");
    return row ? this.hydrate(row) : null;
  }

  async insert(input: { taskId: string; actorId: string; revision: number }) {
    const [row] = await this.database.insert(taskExecutionPlans).values({ taskId: input.taskId, createdBy: input.actorId, revision: input.revision }).returning();
    return toPlan(row!, []);
  }

  async setActionState(actionId: string, state: string) {
    await this.database.update(taskExecutionActions).set({ state, updatedAt: new Date() }).where(eq(taskExecutionActions.id, actionId));
  }

  async setStatus(planId: string, status: PlanRecord["status"]) {
    await this.database.update(taskExecutionPlans).set({ status, updatedAt: new Date() }).where(eq(taskExecutionPlans.id, planId));
  }

  async replacePlanned(input: { planId: string; revision: number; actions: PlannedAction[] }) {
    const [plan] = await this.database.update(taskExecutionPlans).set({ revision: input.revision, updatedAt: new Date() }).where(eq(taskExecutionPlans.id, input.planId)).returning();
    await this.database.delete(taskExecutionActions).where(and(eq(taskExecutionActions.planId, input.planId), eq(taskExecutionActions.state, PLANNED_STATE)));
    await this.writeActions(plan!, input.actions);
    return this.hydrate(plan!);
  }

  async relocateAction(input: ActionRelocation) {
    const updatedAt = new Date();
    await this.database.update(taskExecutionPlans).set({ revision: input.revision, updatedAt }).where(eq(taskExecutionPlans.id, input.planId));
    await this.database.update(taskExecutionActions).set({ ...workspaceColumns(input.workspace), updatedAt }).where(and(eq(taskExecutionActions.id, input.actionId), eq(taskExecutionActions.planId, input.planId)));
    await this.database.delete(taskExecutionRuntimeBindings).where(eq(taskExecutionRuntimeBindings.actionId, input.actionId));
    await this.database.insert(taskExecutionRuntimeBindings).values(input.bindings.map((binding) => ({ ...binding, actionId: input.actionId })));
  }

  async findSave(taskId: string, idempotencyKey: string): Promise<PlanSaveReceipt | null> {
    const [row] = await this.database.select().from(taskExecutionPlanSaves).where(and(eq(taskExecutionPlanSaves.taskId, taskId), eq(taskExecutionPlanSaves.idempotencyKey, idempotencyKey)));
    return row ? { requestHash: row.requestHash, resultRevision: row.resultRevision } : null;
  }

  async recordSave(input: { taskId: string; idempotencyKey: string } & PlanSaveReceipt) {
    await this.database.insert(taskExecutionPlanSaves).values(input);
  }

  private async hydrate(row: typeof taskExecutionPlans.$inferSelect): Promise<PlanRecord> {
    const actions = await this.database.select().from(taskExecutionActions).where(eq(taskExecutionActions.planId, row.id)).orderBy(asc(taskExecutionActions.position));
    const bindings = actions.length ? await this.database.select().from(taskExecutionRuntimeBindings).where(inArray(taskExecutionRuntimeBindings.actionId, actions.map((action) => action.id))) : [];
    return toPlan(row, actions.map((action): ActionRecord => toAction(action, bindings)));
  }

  private async writeActions(plan: typeof taskExecutionPlans.$inferSelect, actions: PlannedAction[]) {
    for (const action of actions) {
      const [row] = await this.database.insert(taskExecutionActions).values({ planId: plan.id, taskId: plan.taskId, position: action.position, kind: action.kind, loopName: action.loopName, loopVersion: action.loopVersion, inputs: action.inputs, ...workspaceColumns(action.workspace), state: PLANNED_STATE }).returning();
      if (action.bindings.length) await this.database.insert(taskExecutionRuntimeBindings).values(action.bindings.map((binding) => ({ ...binding, actionId: row!.id })));
    }
  }
}

function workspaceColumns(workspace: PlannedAction["workspace"]) {
  return { workspaceKind: workspace.kind, worktreeId: workspace.kind === "existing" ? workspace.worktreeId : null, worktreeName: workspace.kind === "new" ? workspace.name : null, ...localColumns(workspace) };
}

function localColumns(workspace: PlannedAction["workspace"]) {
  if (workspace.kind !== "local" || !workspace.target) return { localMachineId: null, localLinkId: null, localLinkRevision: null, localCheckoutHandle: null };
  const { machineId, linkId, linkRevision, checkoutHandle } = workspace.target;
  return { localMachineId: machineId, localLinkId: linkId, localLinkRevision: linkRevision, localCheckoutHandle: checkoutHandle };
}
