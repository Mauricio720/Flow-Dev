import { eq } from "drizzle-orm";
import { taskSpecAttempts, taskSpecCommands, taskSpecStages } from "../src/infra/database/schema";
import { harness } from "./spec-finalization-support";
import { specCaller, specScope } from "./spec-support";
import { fakeDeps } from "./spec-worker-support";

export async function reviewedStage() {
  const base = await harness();
  const saved = await base.prepare();
  await base.finalization().finalize(base.claim, saved.packageId);
  const caller = specCaller(base.setup);
  const version = async () => (await caller.byTask(specScope(base.setup))).specVersion;
  const scope = specScope(base.setup);
  const adjust = async (text = "Clarify retention", overrides: Record<string, unknown> = {}) => ({ ...scope, requestKey: crypto.randomUUID(), expectedSpecVersion: await version(), stage: "tech_spec" as const, packageId: saved.packageId, manifestHash: saved.manifestHash, text, ...overrides });
  const retry = async (failedAttemptId: string, overrides: Record<string, unknown> = {}) => ({ ...scope, requestKey: crypto.randomUUID(), expectedSpecVersion: await version(), failedAttemptId, ...overrides });
  const cancel = async (attemptId: string, overrides: Record<string, unknown> = {}) => ({ ...scope, requestKey: crypto.randomUUID(), expectedSpecVersion: await version(), attemptId, ...overrides });
  const restore = async (failedAttemptId: string, overrides: Record<string, unknown> = {}) => ({ ...scope, requestKey: crypto.randomUUID(), expectedSpecVersion: await version(), failedAttemptId, packageId: saved.packageId, manifestHash: saved.manifestHash, ...overrides });
  return { ...base, ...fakeDeps(base.setup), saved, caller, version, adjust, retry, cancel, restore, scope };
}

export type Reviewed = Awaited<ReturnType<typeof reviewedStage>>;
export const attempts = async (setup: Reviewed["setup"]) => (await setup.database.select().from(taskSpecAttempts)).sort((left, right) => left.attemptNumber - right.attemptNumber);
export const stageRow = async (setup: Reviewed["setup"]) => (await setup.database.select().from(taskSpecStages).where(eq(taskSpecStages.stage, "tech_spec")))[0]!;
export const commandsOf = async (setup: Reviewed["setup"], action: string) => (await setup.database.select().from(taskSpecCommands)).filter((command) => command.action === action);

export async function failAdjustment(context: Reviewed, reason: "runtime_failed" | "artifact_conflict" = "runtime_failed") {
  const receipt = await context.caller.adjust(await context.adjust());
  const claim = (await context.deps.dao.claim({ owner: "w", now: new Date("2031-01-01"), maxActive: 2 }))!;
  await context.deps.dao.settle(claim, { state: "failed", reason });
  return { receipt, claim };
}
