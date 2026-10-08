import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { taskIssueClaimAttempts, taskIssueClaims } from "../src/infra/database/schema";
import { DISPATCH_SETTLE_MS } from "../src/application/services/assigned-issues/issueClaimRules";
import { assignedFixture, clock, closeAssigned, ITEM_ID, NOW, rejection, resetAssigned, type AssignedFixture } from "./assigned-support";
import { OPTIONS } from "./assigned-world";

let f: AssignedFixture;
beforeAll(async () => { f = await assignedFixture(); });
beforeEach(() => resetAssigned(f));
afterAll(closeAssigned);

const claimUncertain = async (mode: "drop" | "applied_then_drop" = "applied_then_drop") => {
  f.world.mutation = mode;
  const result = await f.caller(f.u1.id).claim(f.claimInput());
  f.world.mutation = "ok";
  return result;
};
const claimRow = async () => (await f.database.select().from(taskIssueClaims))[0]!;
const reconcile = (userId = f.u1.id, taskId?: string, requestKey = crypto.randomUUID()) => f.caller(userId).reconcileClaim({ projectId: f.project.id, taskId: taskId ?? "", requestKey });

describe("claim uncertainty and recovery", () => {
  it("UT-025 retains the candidate as uncertain when the status mutation times out", async () => {
    const result = await claimUncertain("drop");
    expect(result).toMatchObject({ state: "uncertain", operatorId: null, reason: "provider_unavailable" });
    expect(await claimRow()).toMatchObject({ candidateUserId: f.u1.id, operatorUserId: null, state: "uncertain" });
  });

  it("IT-004 persists the uncertain claim across a host restart", async () => {
    const { taskId } = await claimUncertain("drop");
    const status = await f.freshController().claimStatus({ userId: f.u2.id }, { projectId: f.project.id, taskId });
    expect(status).toEqual({ taskId, state: "uncertain", operatorId: null, reason: "provider_unavailable" });
  });

  it("IT-011 completes the original claimant after a dropped response by read-back only", async () => {
    await claimUncertain("applied_then_drop");
    expect(await f.services.reconciliation.sweep(10)).toBe(1);
    expect(await claimRow()).toMatchObject({ state: "claimed", operatorUserId: f.u1.id });
    expect(f.world.mutations).toHaveLength(1);
    const [attempt] = await f.database.select().from(taskIssueClaimAttempts);
    expect(attempt).toMatchObject({ state: "confirmed", readBackStatus: "in_progress" });
  });

  it("UT-090 and IT-012 keep an unresolved reservation away from another claimant", async () => {
    const { taskId } = await claimUncertain("drop");
    const contender = await f.caller(f.u2.id).claim(f.claimInput());
    expect(contender).toMatchObject({ taskId, state: "uncertain", operatorId: null });
    expect(await f.database.select().from(taskIssueClaimAttempts)).toHaveLength(1);
    expect(f.world.mutations).toHaveLength(1);
  });

  it("IT-012 keeps a reservation whose dispatch intent was recorded but never settled", async () => {
    const claimed = await f.claimsDao.reserve({ source: factsFor(f), claimantUserId: f.u1.id, requestKey: crypto.randomUUID(), payloadHash: "h", board: board() });
    if (claimed.kind !== "reserved") throw new Error("expected reservation");
    expect(await f.claimsDao.beginDispatch({ attemptId: claimed.attempt.id, fence: claimed.attempt.fence, at: NOW })).toBe(true);
    expect(await f.claimsDao.beginDispatch({ attemptId: claimed.attempt.id, fence: claimed.attempt.fence, at: NOW })).toBe(false);
    expect(await f.caller(f.u2.id).claim(f.claimInput())).toMatchObject({ state: "pending", operatorId: null });
    expect(f.world.mutations).toHaveLength(0);
  });

  it("IT-013 releases the reservation after a definite rejection when a fresh read proves Ready", async () => {
    f.world.mutation = "forbidden";
    const failed = await f.caller(f.u1.id).claim(f.claimInput());
    expect(failed).toMatchObject({ state: "failed", operatorId: null, reason: "provider_rejected" });
    const [attempt] = await f.database.select().from(taskIssueClaimAttempts);
    expect(attempt).toMatchObject({ state: "failed", failureCode: "provider_rejected", claimantUserId: f.u1.id });
    f.world.mutation = "ok";
    expect(await f.caller(f.u2.id).claim(f.claimInput())).toMatchObject({ state: "claimed", operatorId: f.u2.id });
    expect(await f.database.select().from(taskIssueClaimAttempts)).toHaveLength(2);
  });

  it("IT-014 background reconciliation of a failed claim never sends another status mutation", async () => {
    f.world.mutation = "forbidden";
    await f.caller(f.u1.id).claim(f.claimInput());
    f.world.mutation = "ok";
    const before = f.world.mutations.length;
    expect(await f.services.reconciliation.sweep(10)).toBe(0);
    expect(f.world.mutations).toHaveLength(before);
    expect(await f.caller(f.u1.id).claim(f.claimInput())).toMatchObject({ state: "claimed" });
    expect(f.world.mutations).toHaveLength(before + 1);
  });

  it("IT-015 stores the resulting board state observed by read-back rather than assuming a distributed CAS", async () => {
    f.world.afterMutation = () => { f.world.items.get(ITEM_ID)!.status = OPTIONS.backlog; };
    expect(await f.caller(f.u1.id).claim(f.claimInput())).toMatchObject({ state: "uncertain", operatorId: null, reason: "read_back_mismatch" });
    const [attempt] = await f.database.select().from(taskIssueClaimAttempts);
    expect(attempt).toMatchObject({ state: "uncertain", readBackStatus: OPTIONS.backlog });
  });
});

function factsFor(fixture: AssignedFixture) {
  const identity = { projectId: fixture.project.id, repositoryId: "202", repositoryNodeId: "R_202", issueNodeId: "I_fixture_41" };
  return { identity, issueNumber: 41, issueUrl: "https://github.com/acme/private/issues/41", snapshot: { title: "Issue 41", bodyMarkdown: "Body 41", githubUpdatedAt: NOW, contentHash: "c".repeat(64), verifiedAt: NOW, verifiedByUserId: fixture.u1.id } };
}

function board() {
  return { boardNodeId: "PVT_board", boardItemId: ITEM_ID, statusFieldId: "PVTSSF_status", optionId: OPTIONS.progress };
}

