import { taskArtifacts, taskPlanningDecisions, taskTerminalSessions } from "../src/infra/database/schema";
import { publishedTask, seedReview, type PlanningSetup } from "./planning-support";

export async function world() {
  const setup = await publishedTask();
  await seedReview(setup);
  const [decision] = await setup.database.select().from(taskPlanningDecisions);
  return { setup, decisionId: decision!.id };
}

export function sessionValues(setup: PlanningSetup, decisionId: string, overrides: Record<string, unknown> = {}) {
  return { taskId: setup.taskId, projectId: setup.project.id, userId: setup.ownerId, planningDecisionId: decisionId, route: "tech_spec", requestKey: crypto.randomUUID(), checkoutPath: "/work/shop", dirty: false, ...overrides } as never;
}

async function sessionWorld() {
  const { setup, decisionId } = await world();
  const [session] = await setup.database.insert(taskTerminalSessions).values(sessionValues(setup, decisionId)).returning();
  return { setup, decisionId, session: session! };
}

export async function artifactWorld() {
  const { setup, session, decisionId } = await sessionWorld();
  const [artifact] = await setup.database.insert(taskArtifacts).values({ taskId: setup.taskId, projectId: setup.project.id, relativePath: "docs/spec.md" }).returning();
  return { setup, session, decisionId, artifact: artifact! };
}

export function versionValues(artifactId: string, overrides: Record<string, unknown> = {}) {
  return { artifactId, version: 1, skill: "spec-writer", content: "a", sha256: "a".repeat(64), byteSize: 1, trigger: "stop", ...overrides } as never;
}

