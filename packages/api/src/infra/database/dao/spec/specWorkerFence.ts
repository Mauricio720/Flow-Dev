import { and, eq } from "drizzle-orm";
import type { SpecClaim } from "../../../../application/database/dao/taskSpecWorkerDao";
import { TaskError } from "../../../../application/services/tasks/taskErrors";
import { taskSpecAttempts } from "../../schema";
import type { Database } from "../../client";

export type AttemptPatch = Partial<typeof taskSpecAttempts.$inferInsert>;

type Update = AttemptPatch | { patch: AttemptPatch; requiredState: string };

export async function fencedAttemptUpdate(db: Database, claim: SpecClaim, update: Update) {
  const guarded = "patch" in update && typeof update.requiredState === "string";
  const patch = guarded ? update.patch : update as AttemptPatch;
  const requiredState = guarded ? update.requiredState : undefined;
  const guard = requiredState ? [eq(taskSpecAttempts.state, requiredState)] : [];
  const rows = await db.update(taskSpecAttempts).set({ ...patch, updatedAt: new Date() }).where(and(eq(taskSpecAttempts.id, claim.attemptId), eq(taskSpecAttempts.leaseFence, claim.fence), ...guard)).returning();
  if (!rows[0]) throw new TaskError("stale_execution");
  return rows[0];
}
