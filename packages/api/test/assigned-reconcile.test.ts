import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { assignedFixture, closeAssigned, rejection, resetAssigned, type AssignedFixture } from "./assigned-support";

let f: AssignedFixture;
beforeAll(async () => { f = await assignedFixture(); });
beforeEach(() => resetAssigned(f));
afterAll(closeAssigned);

const uncertain = async () => {
  f.world.mutation = "applied_then_drop";
  const result = await f.caller(f.u1.id).claim(f.claimInput());
  f.world.mutation = "ok";
  return result.taskId;
};
const reconcile = (userId: string, taskId: string, requestKey = crypto.randomUUID()) => f.caller(userId).reconcileClaim({ projectId: f.project.id, taskId, requestKey });

describe("assignedIssues.reconcileClaim", () => {
  it("IT-092 completes an uncertain claim whose item reads back In Progress", async () => {
    const taskId = await uncertain();
    expect(await reconcile(f.u1.id, taskId)).toMatchObject({ taskId, state: "claimed", operatorId: f.u1.id });
  });

  it("returns the already claimed result without another provider mutation", async () => {
    const { taskId } = await f.caller(f.u1.id).claim(f.claimInput());
    expect(await reconcile(f.u1.id, taskId)).toMatchObject({ state: "claimed" });
    expect(f.world.mutations).toHaveLength(1);
  });

  it("IT-093 only the claimant may reconcile a pending claim", async () => {
    const taskId = await uncertain();
    expect(await rejection(reconcile(f.u2.id, taskId))).toMatchObject({ code: "FORBIDDEN", reason: "claimant_required" });
  });

  it("IT-094 reports claim_unresolved when read-back cannot settle the claim", async () => {
    f.world.mutation = "drop";
    const { taskId } = await f.caller(f.u1.id).claim(f.claimInput());
    expect(await rejection(reconcile(f.u1.id, taskId))).toMatchObject({ code: "PRECONDITION_FAILED", reason: "claim_unresolved" });
  });

  it("IT-095 and IT-096 surface provider failures without settling", async () => {
    const taskId = await uncertain();
    f.world.failAssigned = "transport";
    expect(await rejection(reconcile(f.u1.id, taskId))).toMatchObject({ code: "SERVICE_UNAVAILABLE", reason: "provider_unavailable" });
    f.world.failAssigned = "rate_limited";
    expect(await rejection(reconcile(f.u1.id, taskId))).toEqual({ code: "TOO_MANY_REQUESTS", reason: "provider_rate_limited", retryAfterSeconds: 30 });
  });

  it("IT-097 rejects a request key already recorded with a different payload", async () => {
    const requestKey = crypto.randomUUID();
    const { taskId } = await f.caller(f.u1.id).claim(f.claimInput(requestKey));
    expect(await rejection(reconcile(f.u1.id, taskId, requestKey))).toMatchObject({ code: "CONFLICT", reason: "request_key_reused" });
    const key = crypto.randomUUID();
    await reconcile(f.u1.id, taskId, key);
    expect(await reconcile(f.u1.id, taskId, key)).toMatchObject({ state: "claimed" });
  });

  it("hides reconciliation of an unknown task", async () => {
    expect(await rejection(reconcile(f.u1.id, crypto.randomUUID()))).toMatchObject({ code: "NOT_FOUND", reason: "work_unavailable" });
  });
});
