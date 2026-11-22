import { afterEach, describe, expect, it } from "vitest";
import { readFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { eq } from "drizzle-orm";
import { taskImages, taskTerminalAttachments, taskTerminalSessions } from "../src/infra/database/schema";
import { closeTaskFixture } from "./task-api-support";
import { addPublishedTask } from "./planning-support";
import { cleanupTerminalFolders, openInput } from "./terminal-support";
import { attachmentWorld, imageId } from "./terminal-attachment-support";

afterEach(async () => {
  await closeTaskFixture();
  await cleanupTerminalFolders();
});

const PNG_UPLOAD = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 9, 9]);
const MARKDOWN = new Uint8Array(Buffer.from("# nota\n"));

async function reasonOf(promise: Promise<unknown>) {
  return promise.then(() => null, (error: { cause?: { reason: string } }) => error.cause?.reason ?? "unknown");
}

describe("tasks.terminal.open with attachments", () => {
  it("V-13c and V-13d deliver four files and list them at the end of the prompt", async () => {
    const world = await attachmentWorld(2);
    const first = await world.upload("Print do erro.png", PNG_UPLOAD);
    const second = await world.upload("notas ação.md", MARKDOWN);
    const result = await world.open({ attachmentIds: [first.id, second.id], issueImageIds: [imageId(1), imageId(2)] });
    const folder = join(world.harness.state, "flow-dev", "terminal-sessions", result.sessionId, "contexto", "anexos");
    expect((await readdir(folder)).sort()).toEqual(["01-tela-a.png", "02-tela-b.png", "03-print-do-erro.png", "04-notas-acao.md"]);
    expect((await stat(join(folder, "04-notas-acao.md"))).mode & 0o777).toBe(0o600);
    expect(new Uint8Array(await readFile(join(folder, "03-print-do-erro.png")))).toEqual(PNG_UPLOAD);
    const prompt = world.harness.launcher.commands[0]!.args.at(-1)!;
    const lines = prompt.split("\nAnexos (leia antes de começar):\n")[1]!.split("\n");
    expect(lines).toEqual([`- tela A (image/png): ${join(folder, "01-tela-a.png")}`, `- tela B (image/png): ${join(folder, "02-tela-b.png")}`, `- Print do erro.png (image/png): ${join(folder, "03-print-do-erro.png")}`, `- notas ação.md (text/markdown): ${join(folder, "04-notas-acao.md")}`]);
    const stagedFolder = join(world.harness.state, "flow-dev", "terminal-staging", world.setup.ownerId);
    expect(await readdir(stagedFolder)).toEqual([]);
  });

  it("V-13e opens without an Issue image that disappeared and counts it as unavailable", async () => {
    const world = await attachmentWorld(2);
    await world.setup.database.delete(taskImages).where(eq(taskImages.id, imageId(2)));
    const result = await world.open({ issueImageIds: [imageId(1), imageId(2)] });
    expect(result.unavailableIssueImages).toBe(1);
    const prompt = world.harness.launcher.commands[0]!.args.at(-1)!;
    expect(prompt).toContain("- tela A (image/png)");
    expect(prompt).not.toContain("tela B");
  });

  it("V-13g refuses 8 uploads plus 3 Issue images and leaves the staging intact", async () => {
    const world = await attachmentWorld(3);
    const ids: string[] = [];
    for (let index = 0; index < 8; index += 1) ids.push((await world.upload(`n${index}.md`, new Uint8Array(Buffer.from(`# ${index}`)))).id);
    expect(await reasonOf(world.open({ attachmentIds: ids, issueImageIds: [imageId(1), imageId(2), imageId(3)] }))).toBe("attachment_limit");
    expect(world.harness.launcher.commands).toHaveLength(0);
    expect(await world.setup.database.select().from(taskTerminalSessions)).toHaveLength(0);
    const rows = await world.setup.database.select().from(taskTerminalAttachments);
    expect(rows.filter((row) => row.sessionId === null)).toHaveLength(8);
  });

  it("V-13h refuses ids of another person, another task or an attachment already in a session", async () => {
    const world = await attachmentWorld(0);
    const mine = await world.upload("a.md", MARKDOWN);
    const otherTask = await addPublishedTask(world.setup);
    const foreign = (userId: string, taskId: string, sha: string) => ({ taskId, userId, origin: "upload", originalName: "x.md", storedName: crypto.randomUUID(), contentType: "text/markdown", byteSize: 3, sha256: sha.repeat(64) });
    const [theirs] = await world.setup.database.insert(taskTerminalAttachments).values(foreign(world.setup.readerId, world.setup.taskId, "b")).returning();
    const [elsewhere] = await world.setup.database.insert(taskTerminalAttachments).values(foreign(world.setup.ownerId, otherTask, "c")).returning();
    for (const id of [theirs!.id, elsewhere!.id, crypto.randomUUID()]) expect(await reasonOf(world.open({ attachmentIds: [id] }))).toBe("attachment_missing");
    await world.open({ attachmentIds: [mine.id] });
    expect(await reasonOf(world.open({ attachmentIds: [mine.id] }))).toBe("attachment_missing");
    expect(world.harness.launcher.commands).toHaveLength(1);
  });

  it("V-11b leaves the task images untouched", async () => {
    const world = await attachmentWorld(2);
    const before = JSON.stringify(await world.setup.database.select().from(taskImages));
    await world.open({ issueImageIds: [imageId(1), imageId(2)] });
    expect(JSON.stringify(await world.setup.database.select().from(taskImages))).toBe(before);
  });

  it("returns the uploads to staging when the launch fails, so the same ids work on a retry", async () => {
    const world = await attachmentWorld(0);
    const upload = await world.upload("a.md", MARKDOWN);
    world.harness.launcher.failure = new Error("sem display");
    const input = openInput(world.setup, { attachmentIds: [upload.id] });
    expect(await reasonOf(world.harness.caller.terminal.open(input as never))).toBe("terminal_unavailable");
    world.harness.launcher.failure = null;
    expect((await world.harness.caller.terminal.open(input as never)).sessionId).toBeTruthy();
    expect(world.harness.launcher.commands[0]!.args.at(-1)).toContain("- a.md (text/markdown)");
  });
});
