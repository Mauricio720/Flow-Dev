import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { DISPATCH_SETTLE_MS } from "../src/application/services/assigned-issues/issueClaimRules";
import { assignedFixture, clock, closeAssigned, ITEM_ID, NOW, rejection, resetAssigned, type AssignedFixture } from "./assigned-support";
import { OPTIONS } from "./assigned-world";

let f: AssignedFixture;
beforeAll(async () => { f = await assignedFixture(); });
beforeEach(() => resetAssigned(f));
afterAll(closeAssigned);

const uncertain = async () => {
  f.world.mutation = "drop";
  const result = await f.caller(f.u1.id).claim(f.claimInput());
  f.world.mutation = "ok";
  return result;
};
const reconcile = (taskId: string) => f.caller(f.u1.id).reconcileClaim({ projectId: f.project.id, taskId, requestKey: crypto.randomUUID() });

describe("claim release", () => {
  it("releases an uncertain claim only after the dispatch is known settled and Ready is read back", async () => {
    const { taskId } = await uncertain();
    expect(await rejection(reconcile(taskId))).toMatchObject({ code: "PRECONDITION_FAILED", reason: "claim_unresolved" });
    clock.now = new Date(NOW.getTime() + DISPATCH_SETTLE_MS);
    expect(await reconcile(taskId)).toMatchObject({ state: "failed", operatorId: null, reason: "dispatch_not_applied" });
    expect(f.world.mutations).toHaveLength(1);
  });

  it("does not release a claim whose item moved to another status", async () => {
    const { taskId } = await uncertain();
    f.world.items.get(ITEM_ID)!.status = OPTIONS.backlog;
    clock.now = new Date(NOW.getTime() + DISPATCH_SETTLE_MS);
    expect(await rejection(reconcile(taskId))).toMatchObject({ reason: "claim_unresolved" });
  });
});
