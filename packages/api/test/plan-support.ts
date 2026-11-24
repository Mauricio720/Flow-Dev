import { and, eq } from "drizzle-orm";
import { taskArtifactVersions, taskArtifacts, taskPlanningDecisions, taskSessionPlanItems, taskSessionPlans } from "../src/infra/database/schema";
import { manifestWith } from "../src/application/services/tasks-set/manifestFixture";
import { taskFileWith } from "../src/application/services/tasks-set/taskFileFixture";
import type { AgentChoice } from "../src/application/terminal/sessionAgentCatalog";
import { seedVersions } from "./task-set-support";
import type { executionWorld } from "./terminal-execution-support";
import { seedSession } from "./terminal-execution-support";

export const FOLDER = "docs/specs/login";
export const OPUS_MAX: AgentChoice = { agent: "claude", model: "opus", effort: "max" };
export const T10 = "2026-11-23T10:00:00Z";
export const T11 = "2026-11-23T11:00:00Z";

type Setup = Awaited<ReturnType<typeof executionWorld>>["setup"];
type World = { setup: Setup };
type SeedSet = { ids: string[]; edges?: Array<[string, string]>; statuses?: Record<string, string>; folder?: string; at?: string };
type SeedItem = { taskIds: string[]; choice?: AgentChoice };

export async function seedTaskSet(world: World, input: SeedSet) {
  const folder = input.folder ?? FOLDER;
  const at = input.at ?? T10;
  const content = manifestWith({ ids: input.ids, edges: input.edges });
  const manifest = await seedVersions(world.setup, { path: `${folder}/_tasks.md`, versions: [{ skill: "spec-to-tasks", content, at }] });
  for (const id of input.ids) await seedVersions(world.setup, { path: `${folder}/${id}.md`, versions: [{ skill: "spec-to-tasks", content: taskFileWith({ status: input.statuses?.[id] ?? "pending", minis: [false] }), at }] });
  return manifest;
}

export async function seedStoredPlan(world: World, input: { version?: number; manifestVersion?: number; items: SeedItem[] }) {
  const { setup } = world;
  const [plan] = await setup.database.insert(taskSessionPlans).values({ taskId: setup.taskId, tasksFolder: FOLDER, manifestVersion: input.manifestVersion ?? 1, version: input.version ?? 1, updatedBy: setup.ownerId }).returning();
  const rows = input.items.map((item, index) => ({ planId: plan!.id, position: index + 1, taskIds: item.taskIds, agent: (item.choice ?? OPUS_MAX).agent, model: (item.choice ?? OPUS_MAX).model, effort: (item.choice ?? OPUS_MAX).effort }));
  const items = rows.length > 0 ? await setup.database.insert(taskSessionPlanItems).values(rows).returning() : [];
  return { plan: plan!, items: items.sort((left, right) => left.position - right.position) };
}

export async function seedItemSession(world: World, input: { itemId: string; status: string; started?: boolean }) {
  const [decision] = await world.setup.database.select().from(taskPlanningDecisions);
  return seedSession({ setup: world.setup, decisionId: decision!.id }, { planItemId: input.itemId, purpose: "plan_item", status: input.status, startedAt: input.started === false ? null : new Date() });
}

export async function setTaskStatus(world: World, taskId: string, status: string) {
  const database = world.setup.database;
  const ownerTaskId = world.setup.taskId;
  const [artifact] = await database.select().from(taskArtifacts).where(and(eq(taskArtifacts.taskId, ownerTaskId), eq(taskArtifacts.relativePath, `${FOLDER}/${taskId}.md`)));
  const version = artifact!.latestVersion + 1;
  const content = taskFileWith({ status, minis: [status === "completed"] });
  await database.insert(taskArtifactVersions).values({ artifactId: artifact!.id, version, skill: "plano-de-execucao", content, sha256: String(version).padEnd(64, "0"), byteSize: content.length, trigger: "stop", capturedAt: new Date(T11) });
  await database.update(taskArtifacts).set({ latestVersion: version }).where(eq(taskArtifacts.id, artifact!.id));
}

export async function addManifestVersion(world: World, input: { artifactId: string; version: number; ids: string[]; edges?: Array<[string, string]>; note?: string }) {
  const content = `${manifestWith({ ids: input.ids, edges: input.edges })}${input.note ?? ""}`;
  await world.setup.database.insert(taskArtifactVersions).values({ artifactId: input.artifactId, version: input.version, skill: "spec-to-tasks", content, sha256: String(input.version).padEnd(64, "0"), byteSize: content.length, trigger: "stop", capturedAt: new Date(T11) });
  await world.setup.database.update(taskArtifacts).set({ latestVersion: input.version }).where(eq(taskArtifacts.id, input.artifactId));
}

export const SONNET_HIGH = { agent: "claude", model: "sonnet", effort: "high" } as const;
export const THREE = { ids: ["task_01", "task_02", "task_03"], edges: [["task_01", "task_02"]] as Array<[string, string]> };
export const draft = (taskIds: string[], extra: Record<string, unknown> = {}) => ({ taskIds, choice: OPUS_MAX, ...extra });

export async function rejection(promise: Promise<unknown>) {
  return promise.then(() => null, (error: { code: string; message: string; cause?: { reason: string } }) => ({ code: error.code, message: error.message, reason: error.cause?.reason }));
}

export async function storedItems(world: World) {
  const rows = await world.setup.database.select().from(taskSessionPlanItems);
  return rows.sort((left, right) => left.position - right.position).map((row) => [row.position, row.taskIds, row.model, row.effort]);
}
