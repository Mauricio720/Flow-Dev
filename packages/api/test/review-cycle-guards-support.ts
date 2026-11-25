import { eq } from "drizzle-orm";
import { taskArtifactVersions, taskArtifacts, taskIssueClaims, taskReviewCycles, taskTerminalSessions, tasks } from "../src/infra/database/schema";
import { cycle } from "./session-worker-support";
import { reviewCycleWorkerWorld } from "./review-cycle-world";
import { advance, REVIEW_EXECUTE, row, WAIT } from "./review-cycle-sessions-support";

export const GUARD_REASONS = { claim: "Você não opera mais este trabalho.", planning: "O planejamento não está mais aprovado.", taskSet: "O conjunto de tarefas não está legível." } as const;
export type GuardInvalidation = keyof typeof GUARD_REASONS;

export async function stopForGuard(state: "executing" | "caveats", invalidation: GuardInvalidation) {
  const world = await reviewCycleWorkerWorld(REVIEW_EXECUTE, WAIT);
  await cycle(world.worker);
  await advance(world.worker);
  const current = await row(world);
  if (state === "caveats") await world.setup.database.update(taskReviewCycles).set({ state, stepRole: "execute" }).where(eq(taskReviewCycles.id, current.id));
  await invalidate(world, invalidation);
  await cycle(world.worker);
  const stopped = await row(world);
  const sessions = await world.setup.database.select().from(taskTerminalSessions).where(eq(taskTerminalSessions.reviewCycleId, current.id));
  return { world, stopped, sessions, reason: GUARD_REASONS[invalidation] };
}

async function invalidate(world: Awaited<ReturnType<typeof reviewCycleWorkerWorld>>, kind: GuardInvalidation) {
  if (kind === "claim") await world.setup.database.delete(taskIssueClaims).where(eq(taskIssueClaims.taskId, world.setup.taskId));
  if (kind === "planning") {
    await world.setup.database.update(tasks).set({ planningStatus: "review" }).where(eq(tasks.id, world.setup.taskId));
  }
  if (kind === "taskSet") await invalidateManifest(world);
}

async function invalidateManifest(world: Awaited<ReturnType<typeof reviewCycleWorkerWorld>>) {
  const path = "docs/specs/login/_tasks.md";
  const [artifact] = await world.setup.database.select().from(taskArtifacts).where(eq(taskArtifacts.relativePath, path));
  const version = artifact!.latestVersion + 1;
  const content = "manifesto ilegível";
  await world.setup.database.insert(taskArtifactVersions).values({ artifactId: artifact!.id, version, skill: "spec-to-tasks", content, sha256: String(version).padEnd(64, "0"), byteSize: content.length, trigger: "stop", capturedAt: new Date() });
  await world.setup.database.update(taskArtifacts).set({ latestVersion: version }).where(eq(taskArtifacts.id, artifact!.id));
}
