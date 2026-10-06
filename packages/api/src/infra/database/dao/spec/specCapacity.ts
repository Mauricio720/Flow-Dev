import { eq, sql } from "drizzle-orm";
import { SPEC_ADMISSION_RETRY_SECONDS, SPEC_RUNNER_QUEUED_ATTEMPTS } from "../../../../application/services/spec/specLimits";
import { TaskError } from "../../../../application/services/tasks/taskErrors";
import { taskSpecAttempts } from "../../schema";
import type { Database } from "../../client";

export async function assertCapacity(db: Database) {
  await db.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended('spec-admission', 1))`);
  const [queued] = await db.select({ count: sql<number>`count(*)::int` }).from(taskSpecAttempts).where(eq(taskSpecAttempts.state, "queued"));
  if ((queued?.count ?? 0) >= SPEC_RUNNER_QUEUED_ATTEMPTS) throw new TaskError("spec_capacity", undefined, undefined, SPEC_ADMISSION_RETRY_SECONDS);
}
