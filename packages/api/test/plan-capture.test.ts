import { rm } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { taskArtifacts, taskTerminalSessions } from "../src/infra/database/schema";
import { captured, editWithSkill, versionsByPath, writeFileIn } from "./artifact-capture-support";
import { FOLDER, T10, seedStoredPlan } from "./plan-support";
import { closeTaskFixture } from "./task-api-support";
import { seedVersions } from "./task-set-support";
import { manifestWith } from "../src/application/services/tasks-set/manifestFixture";
import { taskFileWith } from "../src/application/services/tasks-set/taskFileFixture";
import { editOf, openedSession } from "./terminal-event-support";
import { cleanupTerminalFolders } from "./terminal-support";

afterEach(async () => {
  await closeTaskFixture();
  await cleanupTerminalFolders();
});

const TASK_ONE = `${FOLDER}/task_01.md`;

async function planSession() {
  const world = await openedSession();
  const { items } = await seedStoredPlan(world, { items: [{ taskIds: ["task_01", "task_02"] }] });
  await world.setup.database.update(taskTerminalSessions).set({ planItemId: items[0]!.id, purpose: "plan_item" }).where(eq(taskTerminalSessions.id, world.sessionId));
  return world;
}

const editedSkills = async (world: Awaited<ReturnType<typeof openedSession>>) => (await world.events()).filter((event) => event.kind === "file_edit").map((event) => [event.path, event.skill]);

describe("capture in a plan session", () => {
  it("V-39a turns a task file edited without an active skill into an artifact of the plan, at the end of the turn", async () => {
    const world = await planSession();
    await writeFileIn(world.clone, TASK_ONE, "---\nstatus: in_progress\n---\n");
    await world.send(editOf(world.clone, TASK_ONE));
    expect(await captured(world, world.sessionId, "stop")).toEqual({ files: 1, created: 1, failures: 0 });
    expect(await editedSkills(world)).toEqual([[TASK_ONE, "plano-de-execucao"]]);
    expect(await versionsByPath(world)).toEqual({ [TASK_ONE]: [{ version: 1, skill: "plano-de-execucao", content: "---\nstatus: in_progress\n---\n", sessionId: world.sessionId, trigger: "stop" }] });
  });

  it("V-39b ignores a file outside the task folder, which keeps its event without a skill", async () => {
    const world = await planSession();
    for (const path of ["README.md", "docs/specs/outra/spec.md", "docs/specs/login-old/task_01.md"]) {
      await writeFileIn(world.clone, path, "# x");
      await world.send(editOf(world.clone, path));
    }
    expect(await captured(world, world.sessionId)).toMatchObject({ files: 0 });
    expect(await versionsByPath(world)).toEqual({});
    expect((await editedSkills(world)).map(([, skill]) => skill)).toEqual([null, null, null]);
  });

  it("V-39c ignores a task file edited in a route session without a skill", async () => {
    const world = await openedSession();
    await writeFileIn(world.clone, TASK_ONE, "# x");
    await world.send(editOf(world.clone, TASK_ONE));
    expect(await captured(world, world.sessionId)).toMatchObject({ files: 0 });
    expect(await versionsByPath(world)).toEqual({});
  });

  it("V-39d keeps the active skill as the author of the version in a plan session", async () => {
    const world = await planSession();
    const path = `${FOLDER}/task_02.md`;
    await writeFileIn(world.clone, path, "# dois");
    await editWithSkill({ send: world.send, clone: world.clone, skill: "spec-to-tasks", path });
    await captured(world, world.sessionId);
    expect(Object.values(await versionsByPath(world)).flat().map((version) => version.skill)).toEqual(["spec-to-tasks"]);
  });

  it("V-39e keeps the last captured status when the file disappears from the clone, and shows why it could not be captured", async () => {
    const world = await planSession();
    await seedVersions(world.setup, { path: `${FOLDER}/_tasks.md`, versions: [{ skill: "spec-to-tasks", content: manifestWith({ ids: ["task_01"] }), at: T10 }] });
    await writeFileIn(world.clone, TASK_ONE, taskFileWith({ status: "in_progress", minis: [false] }));
    await world.send(editOf(world.clone, TASK_ONE));
    await captured(world, world.sessionId);
    await rm(join(world.clone, TASK_ONE));
    await world.send(editOf(world.clone, TASK_ONE));
    await captured(world, world.sessionId);
    const [artifact] = await world.setup.database.select().from(taskArtifacts).where(eq(taskArtifacts.relativePath, TASK_ONE));
    expect(artifact).toMatchObject({ latestVersion: 1, lastFailure: "Arquivo não encontrado no clone" });
    const { set } = await world.harness.caller.taskSet.get({ projectId: world.setup.project.id, taskId: world.setup.taskId });
    expect(set!.tasks[0]).toMatchObject({ id: "task_01", status: "in_progress", miniTotal: 1 });
  });

  it("captures a task file changed by a shell command, which leaves no edit event, and only once per content", async () => {
    const world = await planSession();
    await writeFileIn(world.clone, TASK_ONE, "---\nstatus: completed\n---\n");
    expect(await captured(world, world.sessionId, "stop")).toEqual({ files: 1, created: 1, failures: 0 });
    expect(await captured(world, world.sessionId, "stop")).toEqual({ files: 0, created: 0, failures: 0 });
    expect(await versionsByPath(world)).toEqual({ [TASK_ONE]: [{ version: 1, skill: "plano-de-execucao", content: "---\nstatus: completed\n---\n", sessionId: world.sessionId, trigger: "stop" }] });
  });
});
