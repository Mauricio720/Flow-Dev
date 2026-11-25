import { afterEach, describe, expect, it } from "vitest";
import { taskPublicationAttempts } from "../src/infra/database/schema";
import { publicationCase } from "./task-publication-case";

const closes: Array<() => Promise<void>> = [];
afterEach(async () => { await Promise.all(closes.splice(0).map((close) => close())); });

async function accepted(options: Parameters<typeof publicationCase>[0], assignToSelf: boolean) {
  const setup = await publicationCase(options);
  closes.push(setup.close);
  const caller = setup.caller();
  const preview = await caller.preview({ projectId: setup.project.id, taskId: setup.taskId, revisionId: setup.revisionId });
  const previewBoardReads = setup.calls.boardReads;
  const result = await caller.publish({ projectId: setup.project.id, taskId: setup.taskId, requestKey: crypto.randomUUID(), expectedVersion: 7, revisionId: setup.revisionId, repositoryId: "202", previewHash: preview.previewHash, assignToSelf });
  return { setup, result, preview, caller, previewBoardReads };
}

describe("publish with Ready assignment", () => {
  it.each([
    [{ board: null }, "ready_board_missing"],
    [{ board: { statuses: ["backlog"] } }, "ready_status_missing"],
    [{ board: { statuses: ["backlog", "ready"] }, eligibility: { canWriteContents: false } }, "assign_permission_denied"],
  ] as const)("rejects before accepting when a prerequisite is missing", async (options, reason) => {
    const setup = await publicationCase(options);
    closes.push(setup.close);
    const caller = setup.caller();
    const preview = await caller.preview({ projectId: setup.project.id, taskId: setup.taskId, revisionId: setup.revisionId });
    await expect(caller.publish({ projectId: setup.project.id, taskId: setup.taskId, requestKey: crypto.randomUUID(), expectedVersion: 7, revisionId: setup.revisionId, repositoryId: "202", previewHash: preview.previewHash, assignToSelf: true })).rejects.toMatchObject({ cause: { reason } });
    expect(setup.calls.create).toBe(0);
    expect(await setup.taskDao.findScoped(setup.project.id, setup.taskId)).toMatchObject({ status: "draft_ready", version: 7, currentRevisionId: setup.revisionId });
    expect(await setup.state.database.select().from(taskPublicationAttempts)).toHaveLength(0);
  });

  it.each([["unreadable", "provider_unavailable"], ["rate_limited", "provider_rate_limited"]] as const)("maps board read failures to %s", async (status, reason) => {
    const setup = await publicationCase({ board: { statuses: status } });
    closes.push(setup.close);
    const preview = await setup.caller().preview({ projectId: setup.project.id, taskId: setup.taskId, revisionId: setup.revisionId });
    await expect(setup.caller().publish({ projectId: setup.project.id, taskId: setup.taskId, requestKey: crypto.randomUUID(), expectedVersion: 7, revisionId: setup.revisionId, repositoryId: "202", previewHash: preview.previewHash, assignToSelf: true })).rejects.toMatchObject({ cause: { reason } });
    expect(setup.calls.create).toBe(0);
  });

  it("reads the board once for either choice and stores the choice", async () => {
    const withOption = await accepted({ board: { statuses: ["backlog", "ready"] } }, true);
    expect(withOption.result.status).toBe("publishing");
    expect(withOption.previewBoardReads).toBe(1);
    expect(withOption.setup.calls.boardReads - withOption.previewBoardReads).toBe(1);
    expect(await withOption.setup.state.database.select({ assignToSelf: taskPublicationAttempts.assignToSelf }).from(taskPublicationAttempts)).toEqual([{ assignToSelf: true }]);
    const withoutOption = await accepted({ board: { statuses: ["backlog", "ready"] } }, false);
    expect(withoutOption.previewBoardReads).toBe(1);
    expect(withoutOption.setup.calls.boardReads - withoutOption.previewBoardReads).toBe(1);
    expect(await withoutOption.setup.state.database.select({ assignToSelf: taskPublicationAttempts.assignToSelf }).from(taskPublicationAttempts)).toEqual([{ assignToSelf: false }]);
  });

  it("rejects reusing a request key with a different choice", async () => {
    const setup = await publicationCase({ board: { statuses: ["backlog"] } });
    closes.push(setup.close);
    const caller = setup.caller();
    const preview = await caller.preview({ projectId: setup.project.id, taskId: setup.taskId, revisionId: setup.revisionId });
    const input = { projectId: setup.project.id, taskId: setup.taskId, requestKey: crypto.randomUUID(), expectedVersion: 7, revisionId: setup.revisionId, repositoryId: "202", previewHash: preview.previewHash };
    await caller.publish({ ...input, assignToSelf: false });
    await expect(caller.publish({ ...input, assignToSelf: true })).rejects.toMatchObject({ cause: { reason: "request_key_reused" } });
  });

  it("allows default publication after an assignment prerequisite refusal", async () => {
    const setup = await publicationCase({ board: { statuses: ["backlog"] } });
    closes.push(setup.close);
    const caller = setup.caller();
    const preview = await caller.preview({ projectId: setup.project.id, taskId: setup.taskId, revisionId: setup.revisionId });
    const input = { projectId: setup.project.id, taskId: setup.taskId, expectedVersion: 7, revisionId: setup.revisionId, repositoryId: "202", previewHash: preview.previewHash };
    await expect(caller.publish({ ...input, requestKey: crypto.randomUUID(), assignToSelf: true })).rejects.toMatchObject({ cause: { reason: "ready_status_missing" } });
    await expect(caller.publish({ ...input, requestKey: crypto.randomUUID() })).resolves.toMatchObject({ status: "publishing" });
  });

  it("keeps default publication available when the board cannot be read", async () => {
    const { setup, result } = await accepted({ board: { statuses: "unreadable" } }, false);
    expect(result.status).toBe("publishing");
    expect(setup.calls.create).toBe(0);
  });

  it("replays a repeated request with the same choice", async () => {
    const setup = await publicationCase({ board: { statuses: ["backlog", "ready"] } });
    closes.push(setup.close);
    const caller = setup.caller();
    const preview = await caller.preview({ projectId: setup.project.id, taskId: setup.taskId, revisionId: setup.revisionId });
    const input = { projectId: setup.project.id, taskId: setup.taskId, requestKey: "00000000-0000-4000-8000-000000000071", expectedVersion: 7, revisionId: setup.revisionId, repositoryId: "202", previewHash: preview.previewHash, assignToSelf: true };
    const first = await caller.publish(input);
    const replay = await caller.publish(input);
    expect(replay.attemptId).toBe(first.attemptId);
    expect(await setup.state.database.select().from(taskPublicationAttempts)).toHaveLength(1);
  });
});
