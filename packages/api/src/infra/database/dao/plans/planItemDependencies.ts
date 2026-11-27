import { asc, eq, inArray } from "drizzle-orm";
import type { Database } from "../../client";
import { taskSessionPlanItemDependencies, taskSessionPlanItems } from "../../schema";

type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
export type WrittenItem = { id: string; started: boolean; after: number[] };

const FIRST_POSITION = 1;

function dependencyRows(items: WrittenItem[]) {
  return items.filter((item) => !item.started).flatMap((item) => item.after.flatMap((position) => {
    const target = items[position - FIRST_POSITION];
    return target ? [{ itemId: item.id, afterItemId: target.id }] : [];
  }));
}

export async function rewriteDependencies(tx: Transaction, items: WrittenItem[]) {
  const editable = items.filter((item) => !item.started).map((item) => item.id);
  if (editable.length > 0) await tx.delete(taskSessionPlanItemDependencies).where(inArray(taskSessionPlanItemDependencies.itemId, editable));
  const rows = dependencyRows(items);
  if (rows.length > 0) await tx.insert(taskSessionPlanItemDependencies).values(rows);
}

export async function dependenciesOf(database: Database, itemIds: string[]) {
  const after = new Map<string, string[]>();
  if (itemIds.length === 0) return after;
  const rows = await database.select({ itemId: taskSessionPlanItemDependencies.itemId, afterItemId: taskSessionPlanItemDependencies.afterItemId }).from(taskSessionPlanItemDependencies).innerJoin(taskSessionPlanItems, eq(taskSessionPlanItems.id, taskSessionPlanItemDependencies.afterItemId)).where(inArray(taskSessionPlanItemDependencies.itemId, itemIds)).orderBy(asc(taskSessionPlanItems.position));
  for (const row of rows) after.set(row.itemId, [...(after.get(row.itemId) ?? []), row.afterItemId]);
  return after;
}
