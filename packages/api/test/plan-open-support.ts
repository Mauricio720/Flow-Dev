import { eq } from "drizzle-orm";
import { taskSessionPlanItems, taskTerminalSessions } from "../src/infra/database/schema";
import { seedStoredPlan, seedTaskSet } from "./plan-support";
import type { workerWorld } from "./session-worker-support";
import { openInput } from "./terminal-support";

export type World = Awaited<ReturnType<typeof workerWorld>>;
export const EDGES: Array<[string, string]> = [["task_01", "task_02"]];

export const startItem = (world: World, purpose: Record<string, unknown>) => world.harness.caller.terminal.open({ ...openInput(world.setup), purpose } as never);
export const sessionsOf = (world: World) => world.setup.database.select().from(taskTerminalSessions);
export const itemRow = async (world: World, itemId: string) => (await world.setup.database.select().from(taskSessionPlanItems).where(eq(taskSessionPlanItems.id, itemId)))[0]!;

export async function blockedItem(world: World) {
  await seedTaskSet(world, { ids: ["task_01", "task_02"], edges: EDGES, statuses: { task_01: "in_progress" } });
  const { items } = await seedStoredPlan(world, { items: [{ taskIds: ["task_02"] }] });
  return items[0]!;
}
