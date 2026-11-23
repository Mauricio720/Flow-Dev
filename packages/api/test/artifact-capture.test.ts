import { afterEach, describe, expect, it } from "vitest";
import { taskArtifactVersions, taskArtifacts } from "../src/infra/database/schema";
import { closeTaskFixture } from "./task-api-support";
import { cleanupTerminalFolders } from "./terminal-support";
import { editOf, openedSession, skillOf } from "./terminal-event-support";
import { sha256Of } from "../src/application/services/terminal/artifactCapturePlan";
import { captured, editWithSkill, versionsByPath, writeFileIn } from "./artifact-capture-support";

afterEach(async () => {
  await closeTaskFixture();
  await cleanupTerminalFolders();
});

const SPEC = "docs/specs/login/spec.md";

describe("artifact capture", () => {
  it("V-16a turns a Markdown file edited under an active skill into version 1 of an artifact", async () => {
    const world = await openedSession();
    await writeFileIn(world.clone, SPEC, "# Login");
    await editWithSkill({ send: world.send, clone: world.clone, skill: "spec-writer", path: SPEC });
    expect(await captured(world, world.sessionId, "stop")).toEqual({ files: 1, created: 1, failures: 0 });
    const [version] = await world.setup.database.select().from(taskArtifactVersions);
    expect(version).toMatchObject({ version: 1, skill: "spec-writer", sessionId: world.sessionId, trigger: "stop", content: "# Login", byteSize: 7, sha256: sha256Of("# Login") });
    const [artifact] = await world.setup.database.select().from(taskArtifacts);
    expect(artifact).toMatchObject({ relativePath: SPEC, latestVersion: 1, lastFailure: null });
  });

  it("V-16b ignores a file edited without an active skill but keeps its event", async () => {
    const world = await openedSession();
    await writeFileIn(world.clone, "README.md", "# Readme");
    await world.send(editOf(world.clone, "README.md"));
    expect(await captured(world, world.sessionId)).toMatchObject({ files: 0 });
    expect(await world.setup.database.select().from(taskArtifacts)).toHaveLength(0);
    expect((await world.events()).filter((event) => event.kind === "file_edit")).toHaveLength(1);
  });

  it("V-16c ignores a non-Markdown file edited under an active skill", async () => {
    const world = await openedSession();
    await writeFileIn(world.clone, "src/app.ts", "export {}");
    await editWithSkill({ send: world.send, clone: world.clone, skill: "spec-writer", path: "src/app.ts" });
    await captured(world, world.sessionId);
    expect(await world.setup.database.select().from(taskArtifacts)).toHaveLength(0);
  });

  it("V-16f attributes each file to the skill active at its last edit in the same turn", async () => {
    const world = await openedSession();
    for (const name of ["a.md", "b.md", "c.md"]) await writeFileIn(world.clone, name, name);
    await world.send(skillOf("spec-writer"));
    await world.send(editOf(world.clone, "a.md"));
    await world.send(editOf(world.clone, "c.md"));
    await world.send(skillOf("spec-to-tasks"));
    await world.send(editOf(world.clone, "b.md"));
    await world.send(editOf(world.clone, "c.md"));
    await captured(world, world.sessionId);
    const skills = Object.fromEntries(Object.entries(await versionsByPath(world)).map(([path, versions]) => [path, versions.map((version) => version.skill)]));
    expect(skills).toEqual({ "a.md": ["spec-writer"], "b.md": ["spec-to-tasks"], "c.md": ["spec-to-tasks"] });
  });

  it("V-16h records a repeated old content as a new version because it differs from the previous one", async () => {
    const world = await openedSession();
    for (const content of ["A", "B", "A"]) {
      await writeFileIn(world.clone, "doc.md", content);
      await editWithSkill({ send: world.send, clone: world.clone, skill: "spec-writer", path: "doc.md" });
      await captured(world, world.sessionId);
    }
    expect((await versionsByPath(world))["doc.md"]!.map((version) => [version.version, version.content])).toEqual([[1, "A"], [2, "B"], [3, "A"]]);
  });

  it("V-17a creates no version when the content did not change and still advances the capture mark", async () => {
    const world = await openedSession();
    await writeFileIn(world.clone, "doc.md", "A");
    await editWithSkill({ send: world.send, clone: world.clone, skill: "spec-writer", path: "doc.md" });
    await captured(world, world.sessionId);
    const first = (await world.session()).lastCaptureAt!;
    await editWithSkill({ send: world.send, clone: world.clone, skill: "spec-writer", path: "doc.md" });
    expect(await captured(world, world.sessionId)).toEqual({ files: 1, created: 0, failures: 0 });
    expect((await versionsByPath(world))["doc.md"]).toHaveLength(1);
    expect((await world.session()).lastCaptureAt!.getTime()).toBeGreaterThan(first.getTime());
  });
});
