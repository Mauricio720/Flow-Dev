import { afterEach, describe, expect, it, vi } from "vitest";
import { manifestWith } from "../src/application/services/tasks-set/manifestFixture";
import { taskFileWith } from "../src/application/services/tasks-set/taskFileFixture";
import { tasks, users } from "../src/infra/database/schema";
import { closeTaskFixture } from "./task-api-support";
import { seedVersions, taskSetWorld } from "./task-set-support";
import { repository } from "./fixture";
import { cleanupTerminalFolders } from "./terminal-support";

afterEach(async () => {
  vi.restoreAllMocks();
  await closeTaskFixture();
  await cleanupTerminalFolders();
});

const T10 = "2026-11-23T10:00:00Z";
const T11 = "2026-11-23T11:00:00Z";
const manifest = (ids: string[]) => manifestWith({ ids, edges: [["task_01", "task_02"], ["task_01", "task_03"]] });

describe("tasks.taskSet.get", () => {
  it("V-34m reads the latest version of each file and the path of every task", async () => {
    const { setup, caller, scope } = await taskSetWorld();
    const content = manifest(["task_01", "task_02", "task_03"]);
    await seedVersions(setup, { path: "docs/specs/login/_tasks.md", versions: [{ skill: "spec-to-tasks", content, at: T10 }, { skill: "spec-to-tasks", content, at: T11 }] });
    await seedVersions(setup, { path: "docs/specs/login/task_02.md", versions: [{ skill: "spec-to-tasks", content: taskFileWith({ status: "pending", minis: [false] }), at: T10 }, { skill: "plano-de-execucao", content: taskFileWith({ status: "completed", minis: [true] }), at: T11 }] });
    const { set } = await caller.get(scope);
    expect(set).toMatchObject({ folder: "docs/specs/login", manifestVersion: 2, problem: null, otherFolders: [] });
    expect(set!.tasks.map((task) => [task.id, task.status, task.path])).toEqual([["task_01", "unknown", null], ["task_02", "completed", "docs/specs/login/task_02.md"], ["task_03", "unknown", null]]);
    expect(set!.tasks[1]).toMatchObject({ miniDone: 1, miniTotal: 1, dependsOn: ["task_01"] });
  });

  it("V-34n picks the manifest captured last and lists the other folders", async () => {
    const { setup, caller, scope } = await taskSetWorld();
    await seedVersions(setup, { path: "docs/specs/old/_tasks.md", versions: [{ skill: "spec-to-tasks", content: manifest(["task_01"]), at: T10 }] });
    await seedVersions(setup, { path: "docs/specs/login/_tasks.md", versions: [{ skill: "spec-to-tasks", content: manifest(["task_01"]), at: T11 }] });
    const { set } = await caller.get(scope);
    expect(set).toMatchObject({ folder: "docs/specs/login", otherFolders: ["docs/specs/old"] });
  });

  it("V-34o lists the spec-writer specs, newest first, without specs from other skills", async () => {
    const { setup, caller, scope } = await taskSetWorld();
    await seedVersions(setup, { path: "docs/specs/a/spec.md", versions: [{ skill: "spec-writer", content: "a", at: T10 }] });
    await seedVersions(setup, { path: "docs/specs/b/spec.md", versions: [{ skill: "spec-writer", content: "b", at: T11 }] });
    await seedVersions(setup, { path: "docs/specs/c/spec.md", versions: [{ skill: "spec-to-tasks", content: "c", at: T11 }] });
    const { specs } = await caller.get(scope);
    expect(specs.map((spec) => spec.path)).toEqual(["docs/specs/b/spec.md", "docs/specs/a/spec.md"]);
    expect(specs[0]!.updatedAt).toBe("2026-11-23T11:00:00.000Z");
  });

  it("V-34p returns no set without a manifest, and the reason, with a [plan] log, when it is invalid", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { setup, caller, scope } = await taskSetWorld();
    expect(await caller.get(scope)).toEqual({ specs: [], set: null });
    const withoutGraph = '---\nschema_version: "compozy.tasks/v2"\nworkflow: demo\n---\n';
    await seedVersions(setup, { path: "docs/specs/login/_tasks.md", versions: [{ skill: "spec-to-tasks", content: withoutGraph, at: T10 }] });
    const { set } = await caller.get(scope);
    expect(set).toMatchObject({ problem: "o grafo de tarefas está ausente", tasks: [], folder: "docs/specs/login" });
    expect(warn).toHaveBeenCalledWith("[plan] manifest_invalid folder=docs/specs/login reason=o grafo de tarefas está ausente");
  });

  it("V-34q refuses a person without access, lets a member read, and hides another project's task", async () => {
    const { setup, harness, caller, scope } = await taskSetWorld();
    const [stranger] = await setup.database.insert(users).values({ name: "Estranha", email: "estranha@test.invalid" }).returning();
    await expect(harness.callerFor(stranger!.id).taskSet.get(scope)).rejects.toThrow();
    await setup.authorize(setup.readerId);
    expect(await harness.callerFor(setup.readerId).taskSet.get(scope)).toEqual({ specs: [], set: null });
    const other = await setup.createProject({ ...repository, githubId: "404", nodeId: "R_404", name: "outro" }, "Outro");
    const otherTaskId = crypto.randomUUID();
    await setup.database.insert(tasks).values({ id: otherTaskId, projectId: other.id, authorUserId: setup.ownerId, repositoryId: "404", repositoryNodeId: "R_404", status: "draft_ready", version: 1, title: "De outro projeto" });
    await expect(caller.get({ projectId: setup.project.id, taskId: otherTaskId })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
