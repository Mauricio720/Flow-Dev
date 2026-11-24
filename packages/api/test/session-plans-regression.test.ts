import { afterEach, describe, expect, it } from "vitest";
import { testDatabase } from "./database";
import { OPUS_MAX, draft, seedTaskSet } from "./plan-support";
import { closeTaskFixture } from "./task-api-support";
import { taskSetWorld } from "./task-set-support";
import { cleanupTerminalFolders } from "./terminal-support";

afterEach(async () => {
  await closeTaskFixture();
  await cleanupTerminalFolders();
});

const LEGACY_TABLES = ["task_execution_plans", "task_execution_runs"];
const TASK_COUNT = 30;
const SAMPLES = 20;
const P95_LIMIT_MS = 1_000;
const P95_RANK = 0.95;
const ids = Array.from({ length: TASK_COUNT }, (_, index) => `task_${String(index + 1).padStart(2, "0")}`);

const percentile95 = (durations: number[]) => [...durations].sort((left, right) => left - right)[Math.ceil(durations.length * P95_RANK) - 1]!;

async function measure(operation: () => Promise<unknown>) {
  const start = performance.now();
  await operation();
  return performance.now() - start;
}

describe("regression of the legacy tables and the NFR-15 limits", () => {
  it("V-43e leaves the columns of task_execution_plans and task_execution_runs as they were before the 0050", async () => {
    const before = await testDatabase(false, "0050_session_plans");
    const after = await testDatabase();
    try {
      const columns = (client: typeof before.client) => client`select table_name, column_name, data_type, is_nullable, column_default from information_schema.columns where table_schema = 'public' and table_name in ${client(LEGACY_TABLES)} order by table_name, ordinal_position`;
      const [previous, current] = [await columns(before.client), await columns(after.client)];
      expect(previous.length).toBeGreaterThan(0);
      expect(current).toEqual(previous);
    } finally {
      await before.close();
      await after.close();
    }
  });

  it("NFR-15 reads the set and the plan, and saves the plan, of 30 tasks in under a second at the 95th percentile", async () => {
    const world = await taskSetWorld();
    await seedTaskSet(world, { ids });
    const { caller } = world.harness;
    const sessions = ids.map((taskId) => draft([taskId]));
    await caller.plan.save({ ...world.scope, version: 0, items: sessions });
    const reads: number[] = [];
    const saves: number[] = [];
    for (let sample = 0; sample < SAMPLES; sample += 1) {
      reads.push(await measure(() => Promise.all([caller.taskSet.get(world.scope), caller.plan.get(world.scope)])));
      saves.push(await measure(() => caller.plan.save({ ...world.scope, version: sample + 1, items: sessions.map((item, index) => ({ ...item, id: undefined, choice: index % 2 === 0 ? OPUS_MAX : { agent: "claude", model: "sonnet", effort: "high" } })) })));
    }
    const view = await caller.plan.get(world.scope);
    expect(view.items).toHaveLength(TASK_COUNT);
    process.stdout.write(`[nfr-15] leitura p95=${percentile95(reads).toFixed(0)}ms salvamento p95=${percentile95(saves).toFixed(0)}ms (${SAMPLES} amostras, ${TASK_COUNT} tarefas)\n`);
    expect(percentile95(reads)).toBeLessThanOrEqual(P95_LIMIT_MS);
    expect(percentile95(saves)).toBeLessThanOrEqual(P95_LIMIT_MS);
  });
});
