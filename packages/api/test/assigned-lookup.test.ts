import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { assignedFixture, closeAssigned, ITEM_ID, rejection, resetAssigned, type AssignedFixture } from "./assigned-support";
import { issue } from "./assigned-world";

let f: AssignedFixture;
beforeAll(async () => { f = await assignedFixture(); });
beforeEach(() => resetAssigned(f));
afterAll(closeAssigned);

describe("assignedIssues.byIssue", () => {
  const lookup = (overrides: Record<string, string> = {}) => f.caller(f.u1.id).byIssue({ projectId: f.project.id, issueNodeId: "I_fixture_41", boardItemId: ITEM_ID, ...overrides });

  it("IT-076 returns fresh issue, eligibility and no task before a claim", async () => {
    expect(await lookup()).toMatchObject({ issue: { issueNodeId: "I_fixture_41", number: 41 }, eligibility: { eligible: true, reason: "eligible" }, taskId: null });
    const claimed = await f.caller(f.u1.id).claim(f.claimInput());
    expect(await lookup()).toMatchObject({ taskId: claimed.taskId, eligibility: { eligible: false, reason: "not_ready" } });
  });

  it("IT-077 to IT-081 map provider and identity failures", async () => {
    expect(await rejection(lookup({ boardItemId: "PVTI_missing" }))).toMatchObject({ code: "NOT_FOUND", reason: "issue_unavailable" });
    f.world.items.get(ITEM_ID)!.issue = issue(41, [88], { repositoryNodeId: "R2", repositoryId: 303 });
    expect(await rejection(lookup())).toMatchObject({ code: "PRECONDITION_FAILED", reason: "repository_mismatch" });
    f.world.reset();
    Object.assign(f.world.items.get(ITEM_ID)!, { type: "PullRequest", issue: null });
    expect(await rejection(lookup())).toMatchObject({ code: "PRECONDITION_FAILED", reason: "board_item_invalid" });
    f.world.reset();
    f.world.failAssigned = "transport";
    expect(await rejection(lookup())).toMatchObject({ code: "SERVICE_UNAVAILABLE", reason: "provider_unavailable" });
    f.world.failAssigned = "rate_limited";
    expect(await rejection(lookup())).toEqual({ code: "TOO_MANY_REQUESTS", reason: "provider_rate_limited", retryAfterSeconds: 30 });
  });
});
