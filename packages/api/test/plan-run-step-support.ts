import { asc, eq } from "drizzle-orm";
import { taskFileWith } from "../src/application/services/tasks-set/taskFileFixture";
import type { ScriptStep } from "../src/infra/terminal/scriptedSessionSteps";
import type { ScriptContext } from "../src/infra/terminal/scriptedSessionSteps";
import { taskSessionPlanRuns, taskTerminalSessions } from "../src/infra/database/schema";
import { createPlanRunService } from "../src/infra/planRunComposition";
import { machineIdentity } from "../src/infra/terminal/machineIdentity";
import { FOLDER, seedStoredPlan, seedTaskSet } from "./plan-support";
import { RUN_KEY, silentLog } from "./plan-run-support";
import { cycle, workerWorld } from "./session-worker-support";
import { HARNESS_NOW } from "./terminal-harness";

const TEST_TOOLS = { has: async () => true };
const MAX_TICKS = 8;

export const completeTask = (number: string): ScriptStep[] => [{ kind: "write_file", path: `${FOLDER}/task_${number}.md`, content: taskFileWith({ status: "completed", minis: [true] }) }, { kind: "end_turn" }, { kind: "wait_message" }];
export const leaveOpen = (number: string): ScriptStep[] => [{ kind: "write_file", path: `${FOLDER}/task_${number}.md`, content: taskFileWith({ status: "in_progress", minis: [false] }) }, { kind: "end_turn" }, { kind: "wait_message" }];
export const HOLD: ScriptStep[] = [{ kind: "wait_message" }];

type Scripts = (context: ScriptContext, index: number) => ScriptStep[];

export async function planRunWorkerWorld(scripts: Scripts, items: { taskIds: string[] }[]) {
  const opened: string[] = [];
  const script = (context: ScriptContext) => {
    if (!opened.includes(context.sessionId)) opened.push(context.sessionId);
    return scripts(context, opened.indexOf(context.sessionId));
  };
  const world = await workerWorld({ script }, { permissions: undefined, tools: TEST_TOOLS });
  await seedTaskSet(world, { ids: ["task_01", "task_02", "task_03"], edges: [["task_01", "task_02"]] });
  const plan = await seedStoredPlan(world, { items });
  const service = createPlanRunService(world.setup.database, { env: world.harness.env, context: world.harness.context, tools: TEST_TOOLS, hostId: machineIdentity(), now: () => HARNESS_NOW, log: silentLog });
  const scope = { projectId: world.setup.project.id, taskId: world.setup.taskId };
  const start = () => service.start({ ...scope, actorId: world.setup.ownerId, requestKey: RUN_KEY });
  return { ...world, plan, service, scope, start };
}

export type PlanRunWorkerWorld = Awaited<ReturnType<typeof planRunWorkerWorld>>;

export async function runRow(world: PlanRunWorkerWorld) {
  const [row] = await world.setup.database.select().from(taskSessionPlanRuns);
  return row!;
}

export function planSessions(world: PlanRunWorkerWorld) {
  return world.setup.database.select().from(taskTerminalSessions).where(eq(taskTerminalSessions.purpose, "plan_item")).orderBy(asc(taskTerminalSessions.openedAt));
}

export async function tickUntil(world: PlanRunWorkerWorld, done: () => Promise<boolean>) {
  for (let tick = 0; tick < MAX_TICKS; tick += 1) {
    await cycle(world);
    if (await done()) return true;
  }
  return false;
}
