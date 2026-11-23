import { taskArtifactVersions, taskArtifacts, taskPlanningDecisions, taskTerminalAttachments, taskTerminalEvents, taskTerminalSessions } from "../src/infra/database/schema";
import { TerminalExecutionReader } from "../src/application/services/terminal/terminalExecutionReader";
import { DrizzleTerminalExecutionDao } from "../src/infra/database/dao/terminal/drizzleTerminalExecutionDao";
import { approvedWork } from "./terminal-support";

type Setup = Awaited<ReturnType<typeof approvedWork>>;

export const MINUTE_MS = 60_000;
export const DAY_MS = 24 * 60 * MINUTE_MS;
export const ago = (ms: number) => new Date(Date.now() - ms);

export async function executionWorld() {
  const setup = await approvedWork();
  const [decision] = await setup.database.select().from(taskPlanningDecisions);
  const reader = new TerminalExecutionReader(new DrizzleTerminalExecutionDao(setup.database));
  return { setup, decisionId: decision!.id, reader };
}

export async function seedSession(world: { setup: Setup; decisionId: string }, overrides: Record<string, unknown> = {}) {
  const values = { taskId: world.setup.taskId, projectId: world.setup.project.id, userId: world.setup.ownerId, planningDecisionId: world.decisionId, route: "tech_spec", requestKey: crypto.randomUUID(), checkoutPath: "/work/shop", dirty: false, ...overrides };
  const [row] = await world.setup.database.insert(taskTerminalSessions).values(values as never).returning();
  return row!;
}

export async function seedEvents(setup: Setup, input: { sessionId: string; count: number; from?: Date }) {
  const { sessionId, count, from = ago(DAY_MS) } = input;
  const rows = Array.from({ length: count }, (_, index) => ({ sessionId, kind: "command", summary: `evento ${index + 1}`, occurredAt: new Date(from.getTime() + index * 1000) }));
  await setup.database.insert(taskTerminalEvents).values(rows);
}

export async function seedAttachment(setup: Setup, input: { sessionId: string; name: string; contentType: string; byteSize: number }) {
  const { sessionId, name, contentType, byteSize } = input;
  await setup.database.insert(taskTerminalAttachments).values({ taskId: setup.taskId, userId: setup.ownerId, sessionId, origin: "upload", originalName: name, storedName: name, contentType, byteSize, sha256: name.padEnd(64, "0") });
}

export async function seedArtifact(setup: Setup, input: { path: string; versions: string[]; lastFailure?: string | null }) {
  const { path, versions, lastFailure = null } = input;
  const [artifact] = await setup.database.insert(taskArtifacts).values({ taskId: setup.taskId, projectId: setup.project.id, relativePath: path, latestVersion: versions.length, lastFailure }).returning();
  const rows = versions.map((skill, index) => ({ artifactId: artifact!.id, version: index + 1, skill, content: `conteudo ${index + 1}`, sha256: String(index).padEnd(64, "0"), byteSize: 10, trigger: "stop" }));
  if (rows.length > 0) await setup.database.insert(taskArtifactVersions).values(rows);
  return artifact!;
}
