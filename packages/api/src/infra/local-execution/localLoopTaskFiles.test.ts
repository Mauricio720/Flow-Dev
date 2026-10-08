import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { installApprovedSpecFiles, installLoopTaskFiles, removeApprovedSpecFiles } from "./localLoopTaskFiles";

const TASK_ID = "2b775b8d-de72-46c7-9b9c-1976d7162dd1";
const FILES = [{ path: "_tasks.md", content: "# Tasks" }, { path: "task_01.md", content: "status: pending" }, { path: "adrs/adr-001.md", content: "# ADR" }];
const roots: string[] = [];

async function checkout() {
  const root = await mkdtemp(join(tmpdir(), "flow-loop-files-"));
  roots.push(root);
  return root;
}

afterEach(async () => { await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))); });

describe("loop task files in the linked checkout", () => {
  it("writes the approved documents under the task folder the Loop reads", async () => {
    const root = await checkout();
    await installLoopTaskFiles({ root, taskId: TASK_ID, files: FILES });
    const folder = join(root, ".compozy", "tasks", TASK_ID);
    expect(await readFile(join(folder, "task_01.md"), "utf8")).toBe("status: pending");
    expect(await readFile(join(folder, "adrs", "adr-001.md"), "utf8")).toBe("# ADR");
  });

  it("keeps the progress a previous attempt recorded in an existing task file", async () => {
    const root = await checkout();
    const folder = join(root, ".compozy", "tasks", TASK_ID);
    await mkdir(folder, { recursive: true });
    await writeFile(join(folder, "task_01.md"), "status: completed");
    await installLoopTaskFiles({ root, taskId: TASK_ID, files: FILES });
    expect(await readFile(join(folder, "task_01.md"), "utf8")).toBe("status: completed");
    expect(await readFile(join(folder, "_tasks.md"), "utf8")).toBe("# Tasks");
  });

  it("refuses to start without documents or through a linked task folder", async () => {
    const root = await checkout();
    await expect(installLoopTaskFiles({ root, taskId: TASK_ID, files: [] })).rejects.toMatchObject({ reason: "artifact_conflict" });
    const outside = await checkout();
    await mkdir(join(root, ".compozy"), { recursive: true });
    await symlink(outside, join(root, ".compozy", "tasks"));
    await expect(installLoopTaskFiles({ root, taskId: TASK_ID, files: FILES })).rejects.toMatchObject({ reason: "artifact_conflict" });
  });
});

describe("approved spec in the linked checkout", () => {
  const SPEC_FILES = [{ path: "_spec.md", content: "# Spec" }, { path: "adrs/adr-001.md", content: "# ADR" }];

  it("writes the approved spec where the task breakdown reads it and accepts an identical copy", async () => {
    const root = await checkout();
    await installApprovedSpecFiles({ root, files: SPEC_FILES });
    await installApprovedSpecFiles({ root, files: SPEC_FILES });
    expect(await readFile(join(root, ".flow-spec", "_spec.md"), "utf8")).toBe("# Spec");
    expect(await readFile(join(root, ".flow-spec", "adrs", "adr-001.md"), "utf8")).toBe("# ADR");
  });

  it("never overwrites a different spec left in the checkout by other work", async () => {
    const root = await checkout();
    await mkdir(join(root, ".flow-spec"));
    await writeFile(join(root, ".flow-spec", "_spec.md"), "# Another task");
    await expect(installApprovedSpecFiles({ root, files: SPEC_FILES })).rejects.toMatchObject({ reason: "artifact_conflict" });
    expect(await readFile(join(root, ".flow-spec", "_spec.md"), "utf8")).toBe("# Another task");
  });

  it("removes the approved spec it placed and keeps a document changed by other work", async () => {
    const root = await checkout();
    await installApprovedSpecFiles({ root, files: SPEC_FILES });
    await writeFile(join(root, ".flow-spec", "adrs", "adr-001.md"), "# Edited");
    await removeApprovedSpecFiles({ root, files: SPEC_FILES });
    await expect(readFile(join(root, ".flow-spec", "_spec.md"), "utf8")).rejects.toMatchObject({ code: "ENOENT" });
    expect(await readFile(join(root, ".flow-spec", "adrs", "adr-001.md"), "utf8")).toBe("# Edited");
  });
});
