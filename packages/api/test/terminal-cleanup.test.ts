import { afterEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { stat } from "node:fs/promises";
import { join } from "node:path";
import { taskTerminalAttachments, taskTerminalSessions } from "../src/infra/database/schema";
import { closeTaskFixture } from "./task-api-support";
import { cleanupTerminalFolders } from "./terminal-support";
import { attachmentWorld } from "./terminal-attachment-support";

afterEach(async () => {
  await closeTaskFixture();
  await cleanupTerminalFolders();
});

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const MARKDOWN = (label: string) => new Uint8Array(Buffer.from(`# ${label}`));
const exists = (path: string) => stat(path).then(() => true, () => false);

describe("terminal cleanup", () => {
  it("V-12j removes staged attachments older than 24 hours on the next preflight and keeps the newer one", async () => {
    const world = await attachmentWorld(0);
    const old = await world.upload("velho.md", MARKDOWN("velho"));
    const recent = await world.upload("novo.md", MARKDOWN("novo"));
    const db = world.setup.database;
    await db.update(taskTerminalAttachments).set({ createdAt: new Date(Date.now() - 25 * HOUR) }).where(eq(taskTerminalAttachments.id, old.id));
    await db.update(taskTerminalAttachments).set({ createdAt: new Date(Date.now() - 23 * HOUR) }).where(eq(taskTerminalAttachments.id, recent.id));
    const rows = await db.select().from(taskTerminalAttachments);
    const stagedFile = (id: string) => join(world.harness.state, "flow-dev", "terminal-staging", world.setup.ownerId, rows.find((row) => row.id === id)!.storedName);
    await world.harness.caller.terminal.preflight({ projectId: world.setup.project.id, taskId: world.setup.taskId });
    expect((await db.select().from(taskTerminalAttachments)).map((row) => row.id)).toEqual([recent.id]);
    expect(await exists(stagedFile(old.id))).toBe(false);
    expect(await exists(stagedFile(recent.id))).toBe(true);
  });

  it("V-13f removes the folder of a session whose last signal is 8 days old and keeps the one of 6 days", async () => {
    const world = await attachmentWorld(0);
    const aging = await world.open();
    const fresh = await world.open();
    const db = world.setup.database;
    await db.update(taskTerminalSessions).set({ lastSignalAt: new Date(Date.now() - 8 * DAY) }).where(eq(taskTerminalSessions.id, aging.sessionId));
    await db.update(taskTerminalSessions).set({ lastSignalAt: new Date(Date.now() - 6 * DAY) }).where(eq(taskTerminalSessions.id, fresh.sessionId));
    await world.harness.caller.terminal.preflight({ projectId: world.setup.project.id, taskId: world.setup.taskId });
    const folder = (id: string) => join(world.harness.state, "flow-dev", "terminal-sessions", id);
    expect(await exists(folder(aging.sessionId))).toBe(false);
    expect(await exists(folder(fresh.sessionId))).toBe(true);
    const sessions = await db.select().from(taskTerminalSessions);
    expect(sessions.find((row) => row.id === aging.sessionId)!.filesRemovedAt).not.toBeNull();
    expect(sessions.find((row) => row.id === fresh.sessionId)!.filesRemovedAt).toBeNull();
  });
});
