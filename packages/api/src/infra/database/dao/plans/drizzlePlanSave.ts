import { and, eq, inArray, isNotNull, sql } from "drizzle-orm";
import type { SavePlanInput, SavePlanResult } from "../../../../application/database/dao/executionPlanDao";
import type { PlanItemDraft } from "../../../../application/services/tasks-set/planTypes";
import type { Database } from "../../client";
import { taskSessionPlanItems, taskSessionPlans, taskTerminalSessions } from "../../schema";

type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
type ItemWrite = { planId: string; position: number; draft: PlanItemDraft; existing: boolean; started: boolean };

const POSITION_OFFSET = 1000;
const FIRST_POSITION = 1;
const PLAN_COLUMNS = { id: taskSessionPlans.id, version: taskSessionPlans.version };

async function claimVersion(tx: Transaction, input: SavePlanInput) {
  const values = { tasksFolder: input.tasksFolder, manifestVersion: input.manifestVersion, updatedBy: input.actorId, updatedAt: new Date() };
  if (input.version === 0) {
    const [created] = await tx.insert(taskSessionPlans).values({ taskId: input.taskId, ...values }).onConflictDoNothing({ target: taskSessionPlans.taskId }).returning(PLAN_COLUMNS);
    return created ?? null;
  }
  const where = and(eq(taskSessionPlans.taskId, input.taskId), eq(taskSessionPlans.version, input.version));
  const [updated] = await tx.update(taskSessionPlans).set({ ...values, version: sql`${taskSessionPlans.version} + 1` }).where(where).returning(PLAN_COLUMNS);
  return updated ?? null;
}

async function startedItemIds(tx: Transaction, itemIds: string[]) {
  if (itemIds.length === 0) return new Set<string>();
  const rows = await tx.selectDistinct({ id: taskTerminalSessions.planItemId }).from(taskTerminalSessions).where(and(inArray(taskTerminalSessions.planItemId, itemIds), isNotNull(taskTerminalSessions.startedAt)));
  return new Set(rows.map((row) => row.id!));
}

async function writeItem(tx: Transaction, write: ItemWrite) {
  const { planId, position, draft, existing, started } = write;
  const content = { taskIds: draft.taskIds, agent: draft.choice.agent, model: draft.choice.model, effort: draft.choice.effort };
  if (!existing) {
    await tx.insert(taskSessionPlanItems).values({ planId, position, ...content });
    return;
  }
  const changes = started ? { position } : { position, ...content };
  await tx.update(taskSessionPlanItems).set(changes).where(eq(taskSessionPlanItems.id, draft.id!));
}

async function replaceItems(tx: Transaction, planId: string, drafts: PlanItemDraft[]) {
  const stored = await tx.select({ id: taskSessionPlanItems.id }).from(taskSessionPlanItems).where(eq(taskSessionPlanItems.planId, planId));
  const storedIds = new Set(stored.map((item) => item.id));
  const started = await startedItemIds(tx, [...storedIds]);
  const kept = new Set(drafts.flatMap((draft) => draft.id ?? []));
  const removable = [...storedIds].filter((id) => !kept.has(id) && !started.has(id));
  if (removable.length > 0) await tx.delete(taskSessionPlanItems).where(inArray(taskSessionPlanItems.id, removable));
  await tx.update(taskSessionPlanItems).set({ position: sql`${taskSessionPlanItems.position} + ${POSITION_OFFSET}` }).where(eq(taskSessionPlanItems.planId, planId));
  for (const [index, draft] of drafts.entries()) {
    const existing = draft.id !== undefined && storedIds.has(draft.id);
    await writeItem(tx, { planId, position: index + FIRST_POSITION, draft, existing, started: existing && started.has(draft.id!) });
  }
}

export function savePlan(database: Database, input: SavePlanInput): Promise<SavePlanResult> {
  return database.transaction(async (tx) => {
    const claimed = await claimVersion(tx, input);
    if (!claimed) return "conflict" as const;
    if (input.resetItems) await tx.delete(taskSessionPlanItems).where(eq(taskSessionPlanItems.planId, claimed.id));
    await replaceItems(tx, claimed.id, input.items);
    return { version: claimed.version };
  });
}
