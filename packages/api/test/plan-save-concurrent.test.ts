import { afterEach, describe, expect, it } from "vitest";
import { taskSessionPlans } from "../src/infra/database/schema";
import { THREE, draft, seedStoredPlan, seedTaskSet, storedItems } from "./plan-support";
import { closeTaskFixture } from "./task-api-support";
import { taskSetWorld } from "./task-set-support";
import { cleanupTerminalFolders } from "./terminal-support";

afterEach(async () => {
  await closeTaskFixture();
  await cleanupTerminalFolders();
});

const OPUS_MAX_COLUMNS = ["opus", "max"];
const SPLIT_ITEMS = [draft(["task_01"]), draft(["task_02", "task_03"])];
const MERGED_ITEMS = [draft(["task_01", "task_02", "task_03"])];
const SPLIT_STORED = [[1, ["task_01"], ...OPUS_MAX_COLUMNS], [2, ["task_02", "task_03"], ...OPUS_MAX_COLUMNS]];
const MERGED_STORED = [[1, ["task_01", "task_02", "task_03"], ...OPUS_MAX_COLUMNS]];

type Save = Promise<{ version: number }>;

const settle = (save: Save) => save.then((value) => ({ value, reason: null }), (error: { cause?: { reason: string } }) => ({ value: null, reason: error.cause?.reason ?? null }));

async function raceTwoSaves(world: Awaited<ReturnType<typeof taskSetWorld>>, version: number) {
  const { caller } = world.harness;
  const [split, merged] = await Promise.all([
    settle(caller.plan.save({ ...world.scope, version, items: SPLIT_ITEMS })),
    settle(caller.plan.save({ ...world.scope, version, items: MERGED_ITEMS })),
  ]);
  return { split, merged };
}

describe("tasks.plan.save with two tabs saving at the same time", () => {
  it("V-36d lets exactly one of two concurrent saves on the same version win, and keeps only the winner's sessions", async () => {
    const world = await taskSetWorld();
    await seedTaskSet(world, THREE);
    await seedStoredPlan(world, { version: 1, items: [{ taskIds: ["task_01"] }] });
    const { split, merged } = await raceTwoSaves(world, 1);
    const winner = split.value ? split : merged;
    const loser = split.value ? merged : split;
    expect(winner.value).toEqual({ version: 2 });
    expect(loser).toEqual({ value: null, reason: "plan_conflict" });
    expect(await storedItems(world)).toEqual(split.value ? SPLIT_STORED : MERGED_STORED);
  });

  it("V-36d lets exactly one of two first saves on version 0 create the plan", async () => {
    const world = await taskSetWorld();
    await seedTaskSet(world, THREE);
    const { split, merged } = await raceTwoSaves(world, 0);
    const outcomes = [split, merged];
    expect(outcomes.filter((outcome) => outcome.value)).toEqual([{ value: { version: 1 }, reason: null }]);
    expect(outcomes.filter((outcome) => outcome.reason === "plan_conflict")).toHaveLength(1);
    expect((await world.setup.database.select().from(taskSessionPlans)).map((plan) => plan.version)).toEqual([1]);
    expect(await storedItems(world)).toEqual(split.value ? SPLIT_STORED : MERGED_STORED);
  });
});
