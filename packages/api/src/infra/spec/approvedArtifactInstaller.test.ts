import { mkdtemp, readFile, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { ApprovedArtifactInstaller } from "./approvedArtifactInstaller";

const directories: string[] = [];
afterEach(async () => { await Promise.all(directories.splice(0).map((path) => rm(path, { recursive: true, force: true }))); });

async function setup() {
  const root = await mkdtemp(join(tmpdir(), "flow-artifacts-test-"));
  directories.push(root);
  const packages = [
    { id: "tasks", format: "os_tasks_v1", approvedAt: new Date() },
    { id: "spec", format: "os_spec_v1", approvedAt: new Date() },
  ];
  const files = async (id: string) => id === "spec" ? [{ path: "_spec.md", sourceText: "# Approved spec" }] : [{ path: "_tasks.md", sourceText: "# Tasks" }, { path: "task_01.md", sourceText: "# First task" }];
  const installer = new ApprovedArtifactInstaller({ packages: { list: async () => packages, files } } as never, { prepare: async () => ({ repositoryPath: root, homePath: join(root, "home") }) });
  return { root, installer };
}

describe("ApprovedArtifactInstaller", () => {
  it("seeds approved spec for task creation and installs both packages for the Loop", async () => {
    const { root, installer } = await setup();
    await installer.install({ taskId: "task-1", snapshot: { kind: "create_tasks" } } as never);
    expect(await readFile(join(root, ".flow-spec", "_spec.md"), "utf8")).toBe("# Approved spec");
    await installer.install({ taskId: "task-1", snapshot: { kind: "loop" } } as never);
    expect(await readFile(join(root, ".compozy", "tasks", "task-1", "task_01.md"), "utf8")).toBe("# First task");
  });

  it("refuses to overwrite a local document edited after approval", async () => {
    const { root, installer } = await setup();
    await mkdir(join(root, ".flow-spec"));
    await writeFile(join(root, ".flow-spec", "_spec.md"), "# Local edit");
    await expect(installer.install({ taskId: "task-1", snapshot: { kind: "create_tasks" } } as never)).rejects.toMatchObject({ reason: "artifact_conflict" });
    expect(await readFile(join(root, ".flow-spec", "_spec.md"), "utf8")).toBe("# Local edit");
  });
});
