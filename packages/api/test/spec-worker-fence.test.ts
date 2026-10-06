import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { taskSpecEvents, taskSpecStages, taskSpecWorkflows } from "../src/infra/database/schema";
import { closeTaskFixture } from "./task-api-support";
import { specCaller, specScope, specTask } from "./spec-support";
import { attemptRow, fakeDeps, setAttempt } from "./spec-worker-support";
import { startWorkflow } from "./spec-seed";

beforeEach(() => vi.stubEnv("TASK_CURSOR_SECRET", "spec-test-cursor-secret"));
afterEach(closeTaskFixture);

describe("spec worker admission and fencing", () => {
  it("UT-016 rejects a stale fence and UT-015 accepts the current one", async () => {
    const setup = await specTask();
    await startWorkflow(setup);
    const { deps } = fakeDeps(setup);
    const claim = (await deps.dao.claim({ owner: "a", now: new Date(), maxActive: 2 }))!;
    await setAttempt(setup, { leaseFence: 7 });
    await expect(deps.dao.settle({ ...claim, fence: 6 }, { state: "failed", reason: "runtime_failed" })).rejects.toMatchObject({ reason: "stale_execution" });
    await expect(deps.dao.settle({ ...claim, fence: 7 }, { state: "failed", reason: "runtime_failed" })).resolves.toBeUndefined();
    expect((await attemptRow(setup)).state).toBe("failed");
  });

  it("reclaims an expired supervisor lease with a higher fence", async () => {
    const setup = await specTask();
    await startWorkflow(setup);
    const { deps } = fakeDeps(setup);
    const first = (await deps.dao.claim({ owner: "a", now: new Date("2026-10-05T10:00:00Z"), maxActive: 2 }))!;
    expect(await deps.dao.claim({ owner: "b", now: new Date("2026-10-05T10:00:10Z"), maxActive: 2 })).toBeNull();
    const second = (await deps.dao.claim({ owner: "b", now: new Date("2026-10-05T10:01:00Z"), maxActive: 2 }))!;
    expect(second.fence).toBe(first.fence + 1);
    await expect(deps.dao.settle(first, { state: "failed", reason: "runtime_failed" })).rejects.toMatchObject({ reason: "stale_execution" });
  });

  it("IT-212 commits one canceled terminal event even when settled twice", async () => {
    const setup = await specTask();
    await startWorkflow(setup);
    const { deps } = fakeDeps(setup);
    const claim = (await deps.dao.claim({ owner: "a", now: new Date(), maxActive: 2 }))!;
    await deps.dao.settle(claim, { state: "canceled", reason: null });
    await deps.dao.settle(claim, { state: "canceled", reason: null }).catch(() => undefined);
    const events = await setup.database.select().from(taskSpecEvents);
    expect(events.map((event) => event.kind)).toEqual(["attempt.canceled"]);
    expect((await setup.database.select().from(taskSpecStages).where(eq(taskSpecStages.stage, "prd")))[0]?.state).toBe("canceled");
    expect((await setup.database.select().from(taskSpecWorkflows))[0]?.state).toBe("canceled");
    expect((await specCaller(setup).byTask(specScope(setup))).state).toBe("canceled");
  });
});
