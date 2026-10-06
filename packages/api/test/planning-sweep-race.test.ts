import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { taskOperations } from "../src/infra/database/schema";
import { closeTaskFixture } from "./task-api-support";
import { ASSESSMENT, keepSessionAlive, movableClock, plannerFor } from "./planning-provider-fixture";
import { publishedTask, startPlanning } from "./planning-support";

const DEADLINE_MS = 900_000;
const DEADLOCK_CODE = "40P01";

beforeEach(() => { vi.spyOn(console, "info").mockImplementation(() => {}); vi.spyOn(console, "error").mockImplementation(() => {}); });
afterEach(async () => { vi.restoreAllMocks(); await closeTaskFixture(); });

describe("planning settlement racing the deadline sweep", () => {
  it("IT-092 never deadlocks when a late settlement meets a claim sweep", async () => {
    const setup = await publishedTask();
    await keepSessionAlive(setup);
    await startPlanning(setup);
    const clock = movableClock();
    const { dao } = plannerFor(setup, undefined, { clock: clock.now });
    const claim = (await dao.claim("w1"))!;
    await setup.database.update(taskOperations).set({ createdAt: new Date(clock.now().getTime() - DEADLINE_MS), leaseUntil: new Date(clock.now().getTime() + 60_000) }).where(eq(taskOperations.id, claim.operationId));
    const envelope = { protocolVersion: 1 as const, operationId: claim.operationId, executionId: claim.executionId, taskId: claim.taskId, inputHash: "h", result: ASSESSMENT as never };
    const results = await Promise.allSettled([dao.complete({ claim, envelope }), plannerFor(setup, undefined, { clock: clock.now }).dao.claim("w2")]);
    for (const result of results) {
      if (result.status === "rejected") expect(JSON.stringify(result.reason)).not.toContain(DEADLOCK_CODE);
    }
    const [operation] = await setup.database.select().from(taskOperations).where(eq(taskOperations.id, claim.operationId));
    expect(["succeeded", "failed"]).toContain(operation!.state);
  });
});
