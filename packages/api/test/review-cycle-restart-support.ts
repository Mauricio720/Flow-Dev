import { eq } from "drizzle-orm";
import type { ReviewCycleWorkerDao } from "../src/application/database/dao/reviewCycleWorkerDao";
import { ScriptedSessionRuntime } from "../src/infra/terminal/scriptedSessionRuntime";
import { taskTerminalSessions } from "../src/infra/database/schema";
import { alignWorkerClock, cycleAtCurrentTime, REVIEW_EXECUTE, row, WAIT } from "./review-cycle-sessions-support";
import { reviewCycleWorkerWorld } from "./review-cycle-world";

export async function executingCycleWorld() {
  const runtime = new ScriptedSessionRuntime({ script: ({ purpose }) => purpose === "review" ? REVIEW_EXECUTE : WAIT, claudeSessionIdFor: (id) => `claude-${id}` });
  const world = await reviewCycleWorkerWorld(REVIEW_EXECUTE, WAIT, { runtimes: { claude: runtime } });
  await alignWorkerClock(world.worker, (await row(world)).startedAt);
  for (let tick = 0; tick < 6; tick += 1) {
    await cycleAtCurrentTime(world.worker);
    const current = await row(world);
    if (current.state === "executing" && current.executeSessionId) break;
  }
  await cycleAtCurrentTime(world.worker);
  return { world, runtime, cycle: await row(world) };
}

export async function cycleSessions(world: Awaited<ReturnType<typeof reviewCycleWorkerWorld>>) {
  return world.setup.database.select().from(taskTerminalSessions).where(eq(taskTerminalSessions.reviewCycleId, world.reviewCycle.id));
}

export function failSetSession(base: ReviewCycleWorkerDao): ReviewCycleWorkerDao {
  return new Proxy(base, { get(target, key) { if (key === "setSession") return async () => { throw new Error("falha simulada após launch"); }; const value = Reflect.get(target, key, target); return typeof value === "function" ? value.bind(target) : value; } });
}
