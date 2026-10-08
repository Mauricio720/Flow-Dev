import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { taskIssueClaimAttempts, taskIssueClaims, taskIssueSnapshots, taskIssueSources, tasks } from "../src/infra/database/schema";
import { settleTaskPublication } from "../src/infra/database/dao/tasks/taskPublicationState";
import { lockIdentity } from "../src/infra/database/dao/assigned-issues/identityLock";
import { bindPublishedSource } from "../src/infra/database/dao/assigned-issues/publicationBinding";
import { assignedFixture, closeAssigned, ITEM_ID, NOW, resetAssigned, type AssignedFixture } from "./assigned-support";
import { PUBLISHED, RECEIPT, seedPublication } from "./assigned-publish-support";
import { OPTIONS } from "./assigned-world";

let f: AssignedFixture;
beforeAll(async () => { f = await assignedFixture(); });
beforeEach(() => resetAssigned(f));
afterAll(closeAssigned);

const facts = (title = "Issue 41") => ({ identity: { projectId: f.project.id, repositoryId: "202", repositoryNodeId: "R_202", issueNodeId: "I_fixture_41" }, issueNumber: 41, issueUrl: "https://github.com/acme/private/issues/41", snapshot: { title, bodyMarkdown: "Body 41", githubUpdatedAt: NOW, contentHash: title.padEnd(64, "0"), verifiedAt: NOW, verifiedByUserId: f.u1.id } });
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("issue source identity", () => {
  it("IT-002 resolves 100 concurrent requests for one identity to a single source and task", async () => {
    const results = await Promise.all(Array.from({ length: 100 }, () => f.sourcesDao.resolve(facts())));
    expect(new Set(results.map((result) => result.taskId)).size).toBe(1);
    expect(results.filter((result) => result.created)).toHaveLength(1);
    expect(await f.database.select().from(taskIssueSources)).toHaveLength(1);
    expect(await f.database.select().from(tasks)).toHaveLength(1);
    expect(await f.database.select().from(taskIssueSnapshots)).toHaveLength(1);
  });

  it("appends an immutable revision when fresh content differs from the pinned snapshot", async () => {
    const first = await f.sourcesDao.resolve(facts("Original"));
    const second = await f.sourcesDao.resolve(facts("Edited"));
    expect(second).toMatchObject({ taskId: first.taskId, snapshot: { revision: 2, title: "Edited" } });
    expect(await f.database.select().from(taskIssueSnapshots)).toHaveLength(2);
  });

  it("UT-094 reuses a published task with the retained identity instead of importing a duplicate", async () => {
    await seedPublication(f, "created");
    const claim = await f.caller(f.u1.id).claim(f.claimInput());
    expect(claim).toMatchObject({ taskId: PUBLISHED.taskId, state: "claimed", operatorId: f.u1.id });
    expect(await f.database.select().from(tasks)).toHaveLength(1);
    const [source] = await f.database.select().from(taskIssueSources);
    expect(source).toMatchObject({ taskId: PUBLISHED.taskId, origin: "flow_dev", publicationAttemptId: PUBLISHED.attemptId });
  });

  it("IT-009 a claim waiting on the identity lock reuses the binding committed by publication settlement", async () => {
    await seedPublication(f, "created");
    await f.database.delete(taskIssueSources);
    const holder = f.database.transaction(async (raw) => {
      const tx = raw as never;
      await lockIdentity(tx, facts().identity);
      await bindPublishedSource(tx, { id: PUBLISHED.attemptId, taskId: PUBLISHED.taskId, publisherUserId: f.u1.id, repositoryId: "202", repositoryNodeId: "R_202", titleSnapshot: "Implement CSV export", bodySnapshot: "Implement CSV export." }, RECEIPT);
      await sleep(400);
    });
    await sleep(100);
    const claim = await f.caller(f.u1.id).claim(f.claimInput());
    await holder;
    expect(claim.taskId).toBe(PUBLISHED.taskId);
    expect(await f.database.select().from(tasks)).toHaveLength(1);
    expect(await f.database.select().from(taskIssueSources)).toHaveLength(1);
  });

  it("binds the actual issue source atomically when publication settles, without claiming", async () => {
    await seedPublication(f, "dispatching");
    await settleTaskPublication(f.database, PUBLISHED.taskId, PUBLISHED.attemptId, { status: "created", receipt: RECEIPT });
    const [source] = await f.database.select().from(taskIssueSources);
    expect(source).toMatchObject({ taskId: PUBLISHED.taskId, issueNodeId: "I_fixture_41", issueNumber: 41, origin: "flow_dev", publicationAttemptId: PUBLISHED.attemptId });
    const [snapshot] = await f.database.select().from(taskIssueSnapshots);
    expect(snapshot).toMatchObject({ title: "Implement CSV export", bodyMarkdown: "Implement CSV export.", revision: 1, publicationAttemptId: PUBLISHED.attemptId });
    expect(await f.database.select().from(taskIssueClaims)).toHaveLength(0);
    expect((await f.database.select().from(tasks).where(eq(tasks.id, PUBLISHED.taskId)))[0]).toMatchObject({ status: "published", authorUserId: f.u1.id });
  });
});

describe("claim reservation", () => {
  it("IT-001 lets exactly one of two concurrent reservations hold the source", async () => {
    const reserve = (userId: string) => f.claimsDao.reserve({ source: facts(), claimantUserId: userId, requestKey: crypto.randomUUID(), payloadHash: "h", board: { boardNodeId: "PVT_board", boardItemId: ITEM_ID, statusFieldId: "PVTSSF_status", optionId: OPTIONS.progress } });
    const outcomes = await Promise.all([reserve(f.u1.id), reserve(f.u2.id)]);
    expect(outcomes.filter((outcome) => outcome.kind === "reserved")).toHaveLength(1);
    expect(outcomes.filter((outcome) => outcome.kind === "held")).toHaveLength(1);
    expect(await f.database.select().from(taskIssueClaimAttempts)).toHaveLength(1);
  });

  it("keeps the operator immutable once a claim is settled", async () => {
    await f.caller(f.u1.id).claim(f.claimInput());
    await expect(f.database.update(taskIssueClaims).set({ operatorUserId: f.u2.id })).rejects.toThrow();
    await expect(f.database.update(taskIssueClaims).set({ state: "failed" })).rejects.toThrow();
  });
});
