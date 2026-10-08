import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { taskIssueClaimAttempts, taskIssueClaims, taskIssueSnapshots, taskIssueSources, taskPublicationAttempts, tasks } from "../src/infra/database/schema";
import { assignedFixture, closeAssigned, ITEM_ID, rejection, resetAssigned, type AssignedFixture } from "./assigned-support";
import { OPTIONS } from "./assigned-world";

let f: AssignedFixture;
beforeAll(async () => { f = await assignedFixture(); });
beforeEach(() => resetAssigned(f));
afterAll(closeAssigned);

describe("assignedIssues.claim", () => {
  it("IT-082 claims an external issue, imports it and confirms In Progress by read-back", async () => {
    const result = await f.caller(f.u1.id).claim(f.claimInput());
    expect(result).toMatchObject({ state: "claimed", operatorId: f.u1.id, reason: null, replayed: false });
    expect(f.world.items.get(ITEM_ID)!.status).toBe(OPTIONS.progress);
    const [task] = await f.database.select().from(tasks).where(eq(tasks.id, result.taskId));
    expect(task).toMatchObject({ origin: "external", status: "imported", authorUserId: null, title: "Issue 41" });
  });

  it("IT-007 imported task has null author and no publication attempt row", async () => {
    await f.caller(f.u1.id).claim(f.claimInput());
    expect(await f.database.select().from(taskPublicationAttempts)).toHaveLength(0);
    const [snapshot] = await f.database.select().from(taskIssueSnapshots);
    expect(snapshot).toMatchObject({ revision: 1, title: "Issue 41", bodyMarkdown: "Body 41", origin: "external" });
  });

  it("IT-010 concurrent claims from two callers produce one operator", async () => {
    const results = await Promise.all([f.caller(f.u1.id).claim(f.claimInput()), f.caller(f.u2.id).claim(f.claimInput())]);
    const operators = new Set(results.filter((result) => result.state === "claimed").map((result) => result.operatorId));
    expect(operators.size).toBe(1);
    expect(await f.database.select().from(taskIssueSources)).toHaveLength(1);
    expect(await f.database.select().from(taskIssueClaims)).toHaveLength(1);
    expect(f.world.mutations).toHaveLength(1);
  });

  it("UT-026 and UT-089 return the existing claimed work to repeat claimants", async () => {
    const first = await f.caller(f.u1.id).claim(f.claimInput());
    f.world.items.get(ITEM_ID)!.status = OPTIONS.progress;
    const other = await f.caller(f.u2.id).claim(f.claimInput());
    expect(other).toMatchObject({ taskId: first.taskId, operatorId: f.u1.id, replayed: true });
    const again = await f.caller(f.u1.id).claim(f.claimInput());
    expect(again).toMatchObject({ taskId: first.taskId, state: "claimed", replayed: true });
  });

  it("replays the same request key and rejects a reused key with another payload", async () => {
    const input = f.claimInput();
    const first = await f.caller(f.u1.id).claim(input);
    expect(await f.caller(f.u1.id).claim(input)).toMatchObject({ taskId: first.taskId, replayed: true });
    expect(await rejection(f.caller(f.u1.id).claim({ ...input, boardItemId: "PVTI_other" }))).toMatchObject({ code: "CONFLICT", reason: "request_key_reused" });
  });

  it("IT-088 provider failure before reservation leaves no claim", async () => {
    f.world.failAssigned = "transport";
    expect(await rejection(f.caller(f.u1.id).claim(f.claimInput()))).toMatchObject({ code: "SERVICE_UNAVAILABLE", reason: "provider_unavailable" });
    f.world.failAssigned = "rate_limited";
    expect(await rejection(f.caller(f.u1.id).claim(f.claimInput()))).toEqual({ code: "TOO_MANY_REQUESTS", reason: "provider_rate_limited", retryAfterSeconds: 30 });
    expect(await f.database.select().from(taskIssueClaims)).toHaveLength(0);
    expect(await f.database.select().from(taskIssueClaimAttempts).where(and(eq(taskIssueClaimAttempts.state, "reserved")))).toHaveLength(0);
  });
});
