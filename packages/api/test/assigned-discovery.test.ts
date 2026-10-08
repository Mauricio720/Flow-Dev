import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { assignedFixture, closeAssigned, ITEM_ID, rejection, resetAssigned, type AssignedFixture } from "./assigned-support";
import { encodeBoundCursor } from "../src/application/services/assigned-issues/assignedIssueCursor";
import { OPTIONS, issue } from "./assigned-world";

let f: AssignedFixture;
beforeAll(async () => { f = await assignedFixture(); });
beforeEach(() => resetAssigned(f));
afterAll(closeAssigned);

const list = (userId = f.u1.id, cursor?: string, projectId = f.project.id) => f.caller(userId).list({ projectId, limit: 20, cursor });

async function drain(userId: string) {
  const found: string[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < 40; page += 1) {
    const result = await list(userId, cursor);
    found.push(...result.items.map((entry) => entry.issueNodeId));
    if (!result.nextCursor) return found;
    cursor = result.nextCursor;
  }
  throw new Error("pagination did not finish");
}

describe("assignedIssues.list", () => {
  it("IT-069 returns eligible Ready issues with the serialized success shape", async () => {
    const page = await list();
    expect(page).toEqual({ items: [expect.objectContaining({ issueNodeId: "I_fixture_41", boardItemId: ITEM_ID, number: 41, status: "Ready", title: "Issue 41" })], nextCursor: null, availability: "available", retryAfterSeconds: null });
  });

  it("IT-070 and IT-071 and IT-072 report missing configuration as preconditions", async () => {
    f.world.options = f.world.options.filter((option) => option.name !== "Ready");
    expect(await rejection(list())).toMatchObject({ code: "PRECONDITION_FAILED", reason: "ready_missing" });
    await f.dao.updateBoard(f.project.id, null);
    expect(await rejection(list())).toMatchObject({ code: "PRECONDITION_FAILED", reason: "board_missing" });
  });

  it("IT-072 requires a personal GitHub authorization", async () => {
    f.world.reset();
    await f.database.execute(f.sql`delete from github_repository_authorizations where user_id = ${f.u1.id}`);
    expect(await rejection(list())).toMatchObject({ code: "PRECONDITION_FAILED", reason: "repository_authorization_needed" });
  });

  it("IT-073 and IT-074 report transport failure and rate limit instead of an empty queue", async () => {
    f.world.failAssigned = "transport";
    expect(await rejection(list())).toMatchObject({ code: "SERVICE_UNAVAILABLE", reason: "provider_unavailable" });
    f.world.failAssigned = "rate_limited";
    expect(await rejection(list())).toEqual({ code: "TOO_MANY_REQUESTS", reason: "provider_rate_limited", retryAfterSeconds: 30 });
  });

  it("IT-075 rejects a cursor bound to another project the caller cannot access", async () => {
    const foreign = encodeBoundCursor({ projectId: "10000000-0000-4000-8000-000000000002", actorId: f.u1.id, boardId: "PVT_board" }, "c1");
    expect(await rejection(list(f.u1.id, foreign))).toMatchObject({ code: "BAD_REQUEST", reason: "invalid_cursor" });
    const wrongActor = encodeBoundCursor({ projectId: f.project.id, actorId: f.u2.id, boardId: "PVT_board" }, "c1");
    expect(await rejection(list(f.u1.id, wrongActor))).toMatchObject({ code: "BAD_REQUEST", reason: "invalid_cursor" });
    expect(await rejection(list(f.u1.id, "%%%"))).toMatchObject({ code: "BAD_REQUEST", reason: "invalid_cursor" });
  });

  it("IT-017 reaches every eligible issue across 151 mixed items and an assignment past the first assignee page", async () => {
    f.world.reset();
    f.world.assigneePageSize = 2;
    const expected = ["I_fixture_41"];
    for (let index = 0; index < 150; index += 1) {
      const eligible = index % 50 === 7;
      const owners = eligible ? [11, 12, 13, 88] : [11, 12];
      f.world.add({ id: `PVTI_mixed_${index}`, issue: issue(2000 + index, owners), status: index % 3 === 0 ? OPTIONS.backlog : OPTIONS.ready });
      if (eligible && index % 3 !== 0) expected.push(`I_fixture_${2000 + index}`);
    }
    const found = await drain(f.u1.id);
    expect(new Set(found)).toEqual(new Set(expected));
    expect(found).toHaveLength(new Set(found).size);
    expect(found.length).toBeGreaterThan(1);
  });

  it("IT-018 keeps the cursor and reports a rate limit instead of a final empty queue", async () => {
    for (let index = 0; index < 150; index += 1) f.world.add({ id: `PVTI_none_${index}`, issue: issue(3000 + index, [1]), status: OPTIONS.backlog });
    f.world.items.delete(ITEM_ID);
    const scanning = await f.caller(f.u1.id).list({ projectId: f.project.id, limit: 20 });
    expect(scanning).toMatchObject({ items: [], availability: "scan_continuing" });
    expect(scanning.nextCursor).not.toBeNull();
    f.world.failAssigned = "rate_limited";
    expect(await rejection(list(f.u1.id, scanning.nextCursor!))).toMatchObject({ code: "TOO_MANY_REQUESTS", reason: "provider_rate_limited" });
  });

  it("excludes drafts, pull requests, closed, other-repository and archived entries", async () => {
    f.world.add({ id: "PVTI_draft", issue: null });
    f.world.add({ id: "PVTI_pr", issue: null, type: "PullRequest" });
    f.world.add({ id: "PVTI_closed", issue: issue(50, [88], { state: "CLOSED" }) });
    f.world.add({ id: "PVTI_other_repo", issue: issue(51, [88], { repositoryNodeId: "R_other", repositoryId: 999 }) });
    f.world.add({ id: "PVTI_archived", issue: issue(52, [88]), archived: true });
    f.world.add({ id: "PVTI_other_user", issue: issue(53, [99]) });
    expect((await list()).items.map((entry) => entry.issueNodeId)).toEqual(["I_fixture_41"]);
    expect((await list(f.u2.id)).items.map((entry) => entry.issueNodeId)).toEqual(["I_fixture_41", "I_fixture_53"]);
  });
});
