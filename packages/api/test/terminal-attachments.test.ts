import { afterEach, describe, expect, it } from "vitest";
import { stat } from "node:fs/promises";
import { join } from "node:path";
import { eq } from "drizzle-orm";
import { taskTerminalAttachments, tasks } from "../src/infra/database/schema";
import { closeTaskFixture } from "./task-api-support";
import { approvedWork, cleanupTerminalFolders } from "./terminal-support";
import { terminalHarness } from "./terminal-harness";

afterEach(async () => {
  await closeTaskFixture();
  await cleanupTerminalFolders();
});

const MEGABYTE = 1024 * 1024;
const text = (label: string, size = 100) => new Uint8Array(Buffer.from(`${label}\n`.padEnd(size, "x")));

async function world() {
  const setup = await approvedWork();
  const harness = await terminalHarness(setup);
  const upload = (name: string, content: Uint8Array) => harness.attachments.upload({ userId: setup.ownerId }, { projectId: setup.project.id, taskId: setup.taskId, name, content });
  const rows = () => setup.database.select().from(taskTerminalAttachments);
  return { setup, harness, upload, rows };
}

async function reason(promise: Promise<unknown>) {
  return promise.then(() => null, (error: { reason: string; limitKind?: string }) => ({ reason: error.reason, kind: error.limitKind }));
}

describe("TerminalAttachmentService.upload", () => {
  it("stores an accepted file and answers with its id, name, type and size", async () => {
    const { upload, rows } = await world();
    const result = await upload("Relatório erro.log", text("erro", 500));
    expect(result).toMatchObject({ name: "Relatório erro.log", contentType: "text/plain", byteSize: 500 });
    expect(await rows()).toHaveLength(1);
  });

  it("V-12e refuses the 11th file and keeps the first ten", async () => {
    const { upload, rows } = await world();
    for (let index = 0; index < 10; index += 1) await upload(`a${index}.txt`, text(`file-${index}`));
    expect(await reason(upload("a10.txt", text("file-10")))).toEqual({ reason: "attachment_limit", kind: "count" });
    expect(await rows()).toHaveLength(10);
  });

  it("V-12f refuses only the file that would pass 30 MB in total", async () => {
    const { upload, rows } = await world();
    for (const label of ["a", "b", "c"]) await upload(`${label}.txt`, text(label, 10 * MEGABYTE));
    expect(await reason(upload("d.txt", text("d")))).toEqual({ reason: "attachment_limit", kind: "total_size" });
    expect(await rows()).toHaveLength(3);
  });

  it("V-12g keeps the first row when the same content is sent twice", async () => {
    const { upload, rows } = await world();
    const first = await upload("a.txt", text("same"));
    expect(await reason(upload("copy.txt", text("same")))).toEqual({ reason: "attachment_duplicate", kind: undefined });
    expect((await rows()).map((row) => row.id)).toEqual([first.id]);
  });

  it("accepts the same content again and frees the slot after the staged file is removed", async () => {
    const { harness, upload, rows } = await world();
    for (let index = 0; index < 10; index += 1) await upload(`a${index}.txt`, text(`file-${index}`));
    const [first] = await rows();
    await harness.attachments.remove({ userId: first!.userId }, first!.id);
    expect(await upload("again.txt", text("file-0"))).toMatchObject({ name: "again.txt" });
    expect(await rows()).toHaveLength(10);
  });

  it("refuses a type that is not accepted without storing anything", async () => {
    const { upload, rows } = await world();
    expect(await reason(upload("planilha.xlsx", new Uint8Array([0x50, 0x4b, 3, 4])))).toMatchObject({ reason: "attachment_type_rejected" });
    expect(await reason(upload("big.txt", new Uint8Array(10 * MEGABYTE + 1)))).toMatchObject({ reason: "attachment_too_large" });
    expect(await rows()).toHaveLength(0);
  });

  it("V-12k writes the file with a generated name, 0600, in a 0700 folder outside the clone", async () => {
    const { setup, harness, upload, rows } = await world();
    await upload("segredo-cliente.md", text("conteudo"));
    const [row] = await rows();
    const folder = join(harness.state, "flow-dev", "terminal-staging", setup.ownerId);
    const file = join(folder, row!.storedName);
    expect((await stat(file)).mode & 0o777).toBe(0o600);
    expect((await stat(folder)).mode & 0o777).toBe(0o700);
    expect(row!.storedName).not.toContain("segredo");
    expect(row!.storedName).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("refuses a person who is not the operator and a planning that is not approved", async () => {
    const { setup, harness } = await world();
    const input = { projectId: setup.project.id, taskId: setup.taskId, name: "a.txt", content: text("x") };
    await setup.authorize(setup.readerId);
    expect(await reason(harness.attachments.upload({ userId: setup.readerId }, input))).toMatchObject({ reason: "operator_required" });
    await setup.database.update(tasks).set({ planningStatus: "review" }).where(eq(tasks.id, setup.taskId));
    expect(await reason(harness.attachments.upload({ userId: setup.ownerId }, input))).toMatchObject({ reason: "planning_not_approved" });
  });
});
