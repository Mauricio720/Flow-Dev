import { rm } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { projectLocalCheckouts, taskArtifacts } from "../src/infra/database/schema";
import { closeTaskFixture } from "./task-api-support";
import { cleanupTerminalFolders, gitClone } from "./terminal-support";
import { openAnotherSession, openedSession } from "./terminal-event-support";
import { captured, editWithSkill, versionsByPath, writeFileIn } from "./artifact-capture-support";

afterEach(async () => {
  await closeTaskFixture();
  await cleanupTerminalFolders();
});

const MAX_BYTES = 1_048_576;

describe("artifact versions across sessions, failures and renames", () => {
  it("V-16g accumulates versions of the same path across sessions of the same task", async () => {
    const world = await openedSession();
    for (const content of ["v1", "v2"]) {
      await writeFileIn(world.clone, "docs/spec.md", content);
      await editWithSkill({ send: world.send, clone: world.clone, skill: "spec-writer", path: "docs/spec.md" });
      await captured(world, world.sessionId);
    }
    const second = await openAnotherSession(world);
    await writeFileIn(world.clone, "docs/_tasks.md", "tarefas");
    await writeFileIn(world.clone, "docs/spec.md", "v3");
    await editWithSkill({ send: second.send, clone: world.clone, skill: "spec-to-tasks", path: "docs/_tasks.md" });
    await editWithSkill({ send: second.send, clone: world.clone, skill: "spec-to-tasks", path: "docs/spec.md" });
    await captured(world, second.sessionId);
    const versions = await versionsByPath(world);
    expect(versions["docs/_tasks.md"]!.map((v) => [v.version, v.skill, v.sessionId])).toEqual([[1, "spec-to-tasks", second.sessionId]]);
    expect(versions["docs/spec.md"]!.map((v) => [v.version, v.skill, v.sessionId])).toEqual([[1, "spec-writer", world.sessionId], [2, "spec-writer", world.sessionId], [3, "spec-to-tasks", second.sessionId]]);
  });

  it("keeps the artifact time at its last version when a later capture fails", async () => {
    const world = await openedSession();
    await writeFileIn(world.clone, "docs/spec.md", "v1");
    await editWithSkill({ send: world.send, clone: world.clone, skill: "spec-writer", path: "docs/spec.md" });
    await captured(world, world.sessionId);
    const [stored] = await world.setup.database.select().from(taskArtifacts);
    await rm(join(world.clone, "docs/spec.md"));
    await editWithSkill({ send: world.send, clone: world.clone, skill: "spec-writer", path: "docs/spec.md" });
    await captured(world, world.sessionId);
    const [failed] = await world.setup.database.select().from(taskArtifacts);
    expect(failed).toMatchObject({ latestVersion: 1, lastFailure: "Arquivo não encontrado no clone" });
    expect(failed!.updatedAt).toEqual(stored!.updatedAt);
  });

  it("V-17f records the failure of a file over 1 MB and clears it once the file shrinks", async () => {
    const world = await openedSession();
    await writeFileIn(world.clone, "docs/grande.md", Buffer.alloc(MAX_BYTES + 1, "a"));
    await editWithSkill({ send: world.send, clone: world.clone, skill: "spec-writer", path: "docs/grande.md" });
    expect(await captured(world, world.sessionId)).toMatchObject({ created: 0, failures: 1 });
    const [failed] = await world.setup.database.select().from(taskArtifacts);
    expect(failed).toMatchObject({ latestVersion: 0, lastFailure: "Maior que 1 MB" });
    expect(await versionsByPath(world)).toEqual({ "docs/grande.md": [] });
    await writeFileIn(world.clone, "docs/grande.md", "pequeno");
    await editWithSkill({ send: world.send, clone: world.clone, skill: "spec-writer", path: "docs/grande.md" });
    await captured(world, world.sessionId);
    const [fixed] = await world.setup.database.select().from(taskArtifacts);
    expect(fixed).toMatchObject({ latestVersion: 1, lastFailure: null });
  });

  it("V-17g treats a renamed file as a new artifact and keeps the old one", async () => {
    const world = await openedSession();
    await writeFileIn(world.clone, "spec.md", "A");
    await editWithSkill({ send: world.send, clone: world.clone, skill: "spec-writer", path: "spec.md" });
    await captured(world, world.sessionId);
    await writeFileIn(world.clone, "spec-v2.md", "A2");
    await editWithSkill({ send: world.send, clone: world.clone, skill: "spec-writer", path: "spec-v2.md" });
    await captured(world, world.sessionId);
    const versions = await versionsByPath(world);
    expect(Object.keys(versions).sort()).toEqual(["spec-v2.md", "spec.md"]);
    expect(versions["spec-v2.md"]).toHaveLength(1);
    expect(versions["spec.md"]).toHaveLength(1);
  });

  it("V-17h keeps the stored versions and reads from the new clone after the local link changes", async () => {
    const world = await openedSession();
    await writeFileIn(world.clone, "spec.md", "do clone A");
    await editWithSkill({ send: world.send, clone: world.clone, skill: "spec-writer", path: "spec.md" });
    await captured(world, world.sessionId);
    const otherClone = await gitClone();
    await world.setup.database.update(projectLocalCheckouts).set({ path: otherClone }).where(eq(projectLocalCheckouts.userId, world.setup.ownerId));
    const second = await openAnotherSession(world);
    await writeFileIn(otherClone, "spec.md", "do clone B");
    await editWithSkill({ send: second.send, clone: otherClone, skill: "spec-writer", path: "spec.md" });
    await captured(world, second.sessionId);
    expect((await versionsByPath(world))["spec.md"]!.map((v) => [v.version, v.content])).toEqual([[1, "do clone A"], [2, "do clone B"]]);
  });
});
