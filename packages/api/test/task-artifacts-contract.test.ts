import { afterEach, describe, expect, it } from "vitest";
import { tasks, users } from "../src/infra/database/schema";
import { closeTaskFixture } from "./task-api-support";
import { cleanupTerminalFolders } from "./terminal-support";
import { terminalHarness } from "./terminal-harness";
import { executionWorld, seedArtifact } from "./terminal-execution-support";

afterEach(async () => {
  await closeTaskFixture();
  await cleanupTerminalFolders();
});

async function world() {
  const base = await executionWorld();
  const spec = await seedArtifact(base.setup, { path: "docs/spec.md", versions: ["spec-writer", "spec-writer", "spec-to-tasks"] });
  const tasksFile = await seedArtifact(base.setup, { path: "docs/_tasks.md", versions: ["spec-to-tasks"] });
  const harness = await terminalHarness(base.setup);
  const scope = { projectId: base.setup.project.id, taskId: base.setup.taskId };
  return { ...base, spec, tasksFile, harness, scope, caller: harness.caller.artifacts };
}

describe("tasks.artifacts contract", () => {
  it("V-20b lists each artifact with its ordered versions and no content", async () => {
    const { caller, scope, spec, tasksFile } = await world();
    const items = await caller.list(scope);
    const byId = Object.fromEntries(items.map((item) => [item.id, item]));
    expect(items).toHaveLength(2);
    expect(byId[tasksFile.id]!.versions.map((version) => version.version)).toEqual([1]);
    expect(byId[spec.id]!.versions.map((version) => version.version)).toEqual([1, 2, 3]);
    expect(byId[spec.id]!.versions[2]).toEqual({ version: 3, skill: "spec-to-tasks", sessionId: null, capturedAt: expect.any(String), byteSize: 10 });
    expect(JSON.stringify(items)).not.toContain("conteudo");
  });

  it("V-20c returns the latest version by default, a chosen one, and not found otherwise", async () => {
    const { caller, scope, spec, setup } = await world();
    expect(await caller.get({ ...scope, artifactId: spec.id })).toMatchObject({ path: "docs/spec.md", version: 3, skill: "spec-to-tasks", content: "conteudo 3" });
    expect(await caller.get({ ...scope, artifactId: spec.id, version: 1 })).toMatchObject({ version: 1, content: "conteudo 1" });
    await expect(caller.get({ ...scope, artifactId: spec.id, version: 9 })).rejects.toMatchObject({ code: "NOT_FOUND" });
    const otherId = crypto.randomUUID();
    await setup.database.insert(tasks).values({ id: otherId, projectId: setup.project.id, authorUserId: setup.ownerId, repositoryId: "202", repositoryNodeId: "R_202", status: "draft_ready", version: 1, title: "Outra" });
    await expect(caller.get({ ...scope, taskId: otherId, artifactId: spec.id })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("V-20d refuses a person without read access, for the list and for the content", async () => {
    const { harness, scope, spec, setup } = await world();
    const [stranger] = await setup.database.insert(users).values({ name: "Estranha", email: "estranha@test.invalid" }).returning();
    const asStranger = harness.callerFor(stranger!.id).artifacts;
    await expect(asStranger.list(scope)).rejects.toThrow();
    await expect(asStranger.get({ ...scope, artifactId: spec.id })).rejects.toThrow();
  });
});
