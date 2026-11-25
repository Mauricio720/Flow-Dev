import { afterEach, describe, expect, it, vi } from "vitest";
import { taskPublicationAttempts } from "../src/infra/database/schema";
import type { PublicationWorkerClaim } from "../src/application/database/dao/taskPublicationWorkerDao";
import type { IssueReceipt } from "../src/application/github/issueGateway";
import { publicationCase } from "./task-publication-case";

const closes: Array<() => Promise<void>> = [];
afterEach(async () => { await Promise.all(closes.splice(0).map((close) => close())); });

async function run(options: Parameters<typeof publicationCase>[0], assignToSelf: boolean, beforeTick?: (setup: Awaited<ReturnType<typeof publicationCase>>) => void, extra: Record<string, unknown> = {}) {
  const setup = await publicationCase(options);
  closes.push(setup.close);
  const caller = setup.caller();
  const preview = await caller.preview({ projectId: setup.project.id, taskId: setup.taskId, revisionId: setup.revisionId });
  await caller.publish({ projectId: setup.project.id, taskId: setup.taskId, requestKey: crypto.randomUUID(), expectedVersion: 7, revisionId: setup.revisionId, repositoryId: "202", previewHash: preview.previewHash, assignToSelf, ...extra } as never);
  beforeTick?.(setup);
  await setup.worker.tick();
  return setup;
}

describe("Ready assignment worker", () => {
  it.each([["ready_status_missing", ["backlog"]], ["assign_permission_denied", ["backlog", "ready"]]] as const)("rejects if %s changes before dispatch", async (reason, statuses) => {
    const setup = await run({ board: { statuses: ["backlog", "ready"] } }, true, (value) => { value.setBoardStatuses(statuses); if (reason === "assign_permission_denied") value.setCanWriteContents(false); });
    const [attempt] = await setup.state.database.select().from(taskPublicationAttempts);
    expect(attempt).toMatchObject({ outcome: "rejected", rejectionReason: reason });
    expect(setup.calls.create).toBe(0);
    expect(await setup.taskDao.findScoped(setup.project.id, setup.taskId)).toMatchObject({ status: "draft_ready" });
  });

  it("creates with only the publisher login and moves a confirmed assignee to Ready", async () => {
    const setup = await run({ board: { statuses: ["backlog", "ready"] }, creation: { status: "created", receipt: { issueId: "4101", nodeId: "ISSUE41", number: 41, url: "https://github.com/acme/private/issues/41", repositoryId: "202", publisherGithubId: "88", assigneeGithubIds: ["88"], createdAt: "2026-10-01T12:00:00.000Z" } } }, true, undefined, { login: "outra", assignees: ["outra"] });
    expect(setup.calls.lastCreate).toMatchObject({ assignees: ["octo"] });
    expect(setup.calls.boardPlacements).toBe(1);
    const [attempt] = await setup.state.database.select().from(taskPublicationAttempts);
    expect(attempt?.readyAssignment).toBe("ready");
    await expect(setup.taskDao.publication(setup.taskId)).resolves.toMatchObject({ readyAssignment: "ready" });
  });

  it("sends an unassigned result to Backlog and logs no login", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const setup = await run({ board: { statuses: ["backlog", "ready"] } }, true);
    const [attempt] = await setup.state.database.select().from(taskPublicationAttempts);
    expect(attempt?.readyAssignment).toBe("not_assigned");
    expect(setup.calls.boardPlacements).toBe(1);
    expect(log.mock.calls.flat().join(" ")).not.toContain("octo");
  });

  it("keeps the legacy request and Backlog behavior when the option is absent", async () => {
    const setup = await run({ board: { statuses: ["backlog", "ready"] }, creation: { status: "created", receipt: { issueId: "4101", nodeId: "ISSUE41", number: 41, url: "https://github.com/acme/private/issues/41", repositoryId: "202", publisherGithubId: "88", assigneeGithubIds: ["88"], createdAt: "2026-10-01T12:00:00.000Z" } } }, false);
    expect(setup.calls.lastCreate).not.toHaveProperty("assignees");
    expect(setup.calls.boardPlacements).toBe(1);
    const [attempt] = await setup.state.database.select().from(taskPublicationAttempts);
    expect(attempt?.readyAssignment).toBeNull();
  });

  it("does not touch the board when creation is uncertain", async () => {
    const setup = await run({ board: { statuses: ["backlog", "ready"] }, creation: { status: "uncertain", reason: "delivery_unknown" } }, true);
    expect(setup.calls.boardPlacements).toBe(0);
    const [attempt] = await setup.state.database.select().from(taskPublicationAttempts);
    expect(attempt?.readyAssignment).toBeNull();
  });

  it("refuses before create when the worker cannot resolve the publisher login", async () => {
    const setup = await run({ board: { statuses: ["backlog", "ready"] }, eligibility: { publisherLogin: null } }, true);
    const [attempt] = await setup.state.database.select().from(taskPublicationAttempts);
    expect(setup.calls.create).toBe(0);
    expect(attempt).toMatchObject({ outcome: "rejected", rejectionReason: "provider_unavailable", assignToSelf: true });
  });

  it("keeps the first stored result when a later Ready attempt fails", async () => {
    const setup = await run({ board: { statuses: ["backlog", "ready"] }, creation: { status: "created", receipt: { issueId: "4101", nodeId: "ISSUE41", number: 41, url: "https://github.com/acme/private/issues/41", repositoryId: "202", publisherGithubId: "88", assigneeGithubIds: ["88"], createdAt: "2026-10-01T12:00:00.000Z" } } }, true);
    const [attempt] = await setup.state.database.select().from(taskPublicationAttempts);
    setup.setPlaceFailures(2);
    await setup.readyAssignment.settle({ claim: { taskId: setup.taskId, attemptId: attempt!.id, publisherGithubId: "88", assignToSelf: true } as PublicationWorkerClaim, token: "access_test", receipt: { nodeId: "ISSUE41", assigneeGithubIds: ["88"] } as IssueReceipt, priorityPoints: null });
    const [stored] = await setup.state.database.select().from(taskPublicationAttempts);
    expect(stored?.readyAssignment).toBe("ready");
  });

  it("records ready_failed after two placement failures without undoing publication", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const setup = await run({ board: { statuses: ["backlog", "ready"], placeFailures: 2 }, creation: { status: "created", receipt: { issueId: "4101", nodeId: "ISSUE41", number: 41, url: "https://github.com/acme/private/issues/41", repositoryId: "202", publisherGithubId: "88", assigneeGithubIds: ["88"], createdAt: "2026-10-01T12:00:00.000Z" } } }, true);
    expect(setup.calls.boardPlacements).toBe(2);
    expect(await setup.taskDao.findScoped(setup.project.id, setup.taskId)).toMatchObject({ status: "published" });
    const [attempt] = await setup.state.database.select().from(taskPublicationAttempts);
    expect(attempt?.readyAssignment).toBe("ready_failed");
    expect(log.mock.calls.flat().join(" ")).toContain(setup.taskId);
  });
});
