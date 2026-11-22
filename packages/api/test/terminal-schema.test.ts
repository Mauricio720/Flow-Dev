import { afterEach, describe, expect, it } from "vitest";
import { projectLocalCheckouts, taskTerminalAttachments, taskTerminalSessions, taskPlanningDecisions } from "../src/infra/database/schema";
import { closeTaskFixture } from "./task-api-support";
import { publishedTask, seedReview, type PlanningSetup } from "./planning-support";

afterEach(closeTaskFixture);

const MAX_BYTES = 10_485_760;

async function world() {
  const setup = await publishedTask();
  await seedReview(setup);
  const [decision] = await setup.database.select().from(taskPlanningDecisions);
  return { setup, decisionId: decision!.id };
}

function sessionValues(setup: PlanningSetup, decisionId: string, overrides: Record<string, unknown> = {}) {
  return { taskId: setup.taskId, projectId: setup.project.id, userId: setup.ownerId, planningDecisionId: decisionId, route: "tech_spec", requestKey: crypto.randomUUID(), checkoutPath: "/work/shop", dirty: false, ...overrides } as never;
}

function attachmentValues(setup: PlanningSetup, overrides: Record<string, unknown> = {}) {
  return { taskId: setup.taskId, userId: setup.ownerId, origin: "upload", originalName: "a.md", storedName: "x", contentType: "text/markdown", byteSize: 10, sha256: "a".repeat(64), ...overrides } as never;
}

describe("terminal execution schema", () => {
  it("keeps one checkout per person and project and checks path and version", async () => {
    const { setup } = await world();
    const row = { userId: setup.ownerId, projectId: setup.project.id, path: "/work/shop", verifiedAt: new Date() };
    await setup.database.insert(projectLocalCheckouts).values(row);
    await expect(setup.database.insert(projectLocalCheckouts).values(row)).rejects.toThrow();
    await expect(setup.database.update(projectLocalCheckouts).set({ path: "" })).rejects.toThrow();
    await expect(setup.database.update(projectLocalCheckouts).set({ path: "/".repeat(1025) })).rejects.toThrow();
    await expect(setup.database.update(projectLocalCheckouts).set({ version: 0 })).rejects.toThrow();
  });

  it("accepts only the three planning routes and a single session per request key", async () => {
    const { setup, decisionId } = await world();
    await expect(setup.database.insert(taskTerminalSessions).values(sessionValues(setup, decisionId, { route: "other" }))).rejects.toThrow();
    const requestKey = crypto.randomUUID();
    await setup.database.insert(taskTerminalSessions).values(sessionValues(setup, decisionId, { requestKey }));
    await expect(setup.database.insert(taskTerminalSessions).values(sessionValues(setup, decisionId, { requestKey }))).rejects.toThrow();
    const [stored] = await setup.database.select().from(taskTerminalSessions);
    expect(stored).toMatchObject({ launchFailedAt: null, launchError: null, filesRemovedAt: null, branch: null });
    expect(stored!.lastSignalAt.getTime()).toBeGreaterThanOrEqual(stored!.openedAt.getTime() - 1000);
  });

  it("checks origin, name length and byte size of attachments", async () => {
    const { setup } = await world();
    await expect(setup.database.insert(taskTerminalAttachments).values(attachmentValues(setup, { origin: "paste" }))).rejects.toThrow();
    await expect(setup.database.insert(taskTerminalAttachments).values(attachmentValues(setup, { originalName: "" }))).rejects.toThrow();
    await expect(setup.database.insert(taskTerminalAttachments).values(attachmentValues(setup, { originalName: "n".repeat(256) }))).rejects.toThrow();
    await expect(setup.database.insert(taskTerminalAttachments).values(attachmentValues(setup, { byteSize: 0 }))).rejects.toThrow();
    await expect(setup.database.insert(taskTerminalAttachments).values(attachmentValues(setup, { byteSize: MAX_BYTES + 1 }))).rejects.toThrow();
    await setup.database.insert(taskTerminalAttachments).values(attachmentValues(setup, { byteSize: MAX_BYTES }));
  });

  it("blocks a duplicate staged hash but allows it once the attachment belongs to a session", async () => {
    const { setup, decisionId } = await world();
    await setup.database.insert(taskTerminalAttachments).values(attachmentValues(setup));
    await expect(setup.database.insert(taskTerminalAttachments).values(attachmentValues(setup))).rejects.toThrow();
    const [session] = await setup.database.insert(taskTerminalSessions).values(sessionValues(setup, decisionId)).returning();
    await setup.database.insert(taskTerminalAttachments).values(attachmentValues(setup, { sessionId: session!.id }));
    await setup.database.insert(taskTerminalAttachments).values(attachmentValues(setup, { sessionId: session!.id, sha256: "b".repeat(64) }));
  });
});
