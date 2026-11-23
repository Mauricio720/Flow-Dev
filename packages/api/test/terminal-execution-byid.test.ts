import { afterEach, describe, expect, it } from "vitest";
import { users } from "../src/infra/database/schema";
import { closeTaskFixture } from "./task-api-support";
import { cleanupTerminalFolders } from "./terminal-support";
import { terminalHarness } from "./terminal-harness";
import { ago, executionWorld, seedArtifact, seedEvents, seedSession, MINUTE_MS } from "./terminal-execution-support";

afterEach(async () => {
  await closeTaskFixture();
  await cleanupTerminalFolders();
});

describe("tasks.byId execution", () => {
  it("V-08h gives a project member who is not the operator the full execution and refuses a stranger", async () => {
    const world = await executionWorld();
    const session = await seedSession(world, { status: "running", openedAt: ago(MINUTE_MS) });
    await seedEvents(world.setup, { sessionId: session.id, count: 3 });
    await seedArtifact(world.setup, { path: "docs/spec.md", versions: ["spec-writer"] });
    const harness = await terminalHarness(world.setup);
    const scope = { projectId: world.setup.project.id, taskId: world.setup.taskId };
    await world.setup.authorize(world.setup.readerId);
    const asReader = await harness.callerFor(world.setup.readerId).byId(scope);
    expect(asReader.execution.sessions).toHaveLength(1);
    expect(asReader.execution.sessions[0]!.events).toHaveLength(3);
    expect(asReader.execution.artifacts).toHaveLength(1);
    const [stranger] = await world.setup.database.insert(users).values({ name: "Estranha", email: "estranha@test.invalid" }).returning();
    await expect(harness.callerFor(stranger!.id).byId(scope)).rejects.toThrow();
  });

  it("V-08i summarizes artifacts without content, including one that only failed", async () => {
    const world = await executionWorld();
    await seedArtifact(world.setup, { path: "docs/spec.md", versions: ["spec-writer", "spec-writer", "spec-to-tasks"] });
    await seedArtifact(world.setup, { path: "docs/grande.md", versions: [], lastFailure: "Maior que 1 MB" });
    const harness = await terminalHarness(world.setup);
    const detail = await harness.caller.byId({ projectId: world.setup.project.id, taskId: world.setup.taskId });
    const byPath = Object.fromEntries(detail.execution.artifacts.map((artifact) => [artifact.path, artifact]));
    expect(byPath["docs/spec.md"]).toMatchObject({ skill: "spec-to-tasks", versions: 3, lastFailure: null, updatedAt: expect.any(String) });
    expect(byPath["docs/grande.md"]).toMatchObject({ skill: null, versions: 0, lastFailure: "Maior que 1 MB" });
    expect(JSON.stringify(detail.execution)).not.toContain("conteudo");
  });
});
