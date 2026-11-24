import { afterEach, describe, expect, it } from "vitest";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { eq } from "drizzle-orm";
import { taskTerminalSessions } from "../src/infra/database/schema";
import { closeTaskFixture } from "./task-api-support";
import { cleanupTerminalFolders, sessionFolder } from "./terminal-support";
import { workerWorld, type WorkerWorld } from "./session-worker-support";

afterEach(async () => { await closeTaskFixture(); await cleanupTerminalFolders(); });

const sessionRow = async (world: WorkerWorld, id: string) => (await world.setup.database.select().from(taskTerminalSessions).where(eq(taskTerminalSessions.id, id)))[0]!;

describe("session preparation coordination", () => {
  it("holds a concurrent worker until the prompt and uploaded attachment are ready", async () => {
    const world = await workerWorld();
    let enter!: () => void;
    let release!: () => void;
    const entered = new Promise<void>((resolve) => { enter = resolve; });
    const wait = new Promise<void>((resolve) => { release = resolve; });
    world.harness.context.prepareBarrier = { entered: enter, wait };
    const attachment = await world.harness.attachments.upload({ userId: world.setup.ownerId }, { projectId: world.setup.project.id, taskId: world.setup.taskId, name: "anexo.txt", content: new Uint8Array(Buffer.from("conteúdo completo")) });
    const opening = world.open({ prompt: "prompt pronto", attachmentIds: [attachment.id] });
    await entered;
    const [row] = await world.setup.database.select().from(taskTerminalSessions);
    await world.worker.supervisor.tick();
    expect(world.runtime.starts).toEqual([]);
    expect(await sessionRow(world, row!.id)).toMatchObject({ status: "opening", preparedAt: null, workerId: null });
    release();
    const id = await opening;
    await world.worker.supervisor.tick();
    expect(world.runtime.starts).toHaveLength(1);
    expect(world.runtime.starts[0]).toMatchObject({ sessionId: id });
    expect(world.runtime.starts[0]!.prompt).toContain("prompt pronto");
    expect(world.runtime.starts[0]!.prompt).toContain("anexo.txt");
    const attachmentDir = join(sessionFolder(world.harness.state, id), "contexto", "anexos");
    const [stored] = await readdir(attachmentDir);
    expect(await readFile(join(attachmentDir, stored!), "utf8")).toBe("conteúdo completo");
  });
});
