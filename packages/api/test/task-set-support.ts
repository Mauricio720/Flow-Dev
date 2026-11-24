import { taskArtifactVersions, taskArtifacts } from "../src/infra/database/schema";
import { terminalHarness } from "./terminal-harness";
import { executionWorld } from "./terminal-execution-support";

type Setup = Awaited<ReturnType<typeof executionWorld>>["setup"];
export type SeedVersion = { skill: string; content: string; at: string };

export async function seedVersions(setup: Setup, input: { path: string; versions: SeedVersion[] }) {
  const { path, versions } = input;
  const [artifact] = await setup.database.insert(taskArtifacts).values({ taskId: setup.taskId, projectId: setup.project.id, relativePath: path, latestVersion: versions.length }).returning();
  const rows = versions.map((version, index) => ({ artifactId: artifact!.id, version: index + 1, skill: version.skill, content: version.content, sha256: String(index).padEnd(64, "0"), byteSize: version.content.length, trigger: "stop", capturedAt: new Date(version.at) }));
  await setup.database.insert(taskArtifactVersions).values(rows);
  return artifact!;
}

export async function taskSetWorld() {
  const base = await executionWorld();
  const harness = await terminalHarness(base.setup);
  const scope = { projectId: base.setup.project.id, taskId: base.setup.taskId };
  return { ...base, harness, scope, caller: harness.caller.taskSet };
}
