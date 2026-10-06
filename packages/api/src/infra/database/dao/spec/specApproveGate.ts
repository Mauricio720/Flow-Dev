import { and, eq, inArray, sql } from "drizzle-orm";
import type { SpecAction } from "../../../../application/services/spec/specContracts";
import { specApprovalGate } from "../../../../application/spec/documents/specApprovalGate";
import type { ReviewDiagnostic } from "../../../../application/spec/documents/specDocumentTypes";
import { TaskError } from "../../../../application/services/tasks/taskErrors";
import { taskSpecAttempts, taskSpecFinalizations, taskSpecInteractions, taskSpecPackages, taskSpecStages } from "../../schema";
import type { Database } from "../../client";
import type { SpecWorkflowRow } from "./specCommandHelpers";

const ACTIVE_STATES = ["queued", "dispatching", "running", "waiting", "finalizing", "stopping", "reconciling"];
const REVIEWABLE_STATES = ["review_ready", "installed"];
const PENDING_FINALIZATION = ["prepared", "installing", "installed"];

export async function assertApprovable(db: Database, workflow: SpecWorkflowRow, input: { action: SpecAction; stage: string; packageId: string; manifestHash: unknown }) {
  const [pkg] = await db.select().from(taskSpecPackages).where(eq(taskSpecPackages.id, input.packageId));
  const [stage] = await db.select().from(taskSpecStages).where(and(eq(taskSpecStages.workflowId, workflow.id), eq(taskSpecStages.stage, input.stage)));
  if (!pkg || !stage) throw new TaskError("spec_unavailable");
  if (!REVIEWABLE_STATES.includes(pkg.captureState)) throw new TaskError("package_incomplete");
  if (stage.currentPackageId !== pkg.id || pkg.manifestHash !== input.manifestHash) throw new TaskError("spec_conflict");
  const attemptId = stage.currentAttemptId;
  const interactions = attemptId ? await db.select().from(taskSpecInteractions).where(eq(taskSpecInteractions.attemptId, attemptId)) : [];
  const [active] = attemptId ? await db.select({ id: taskSpecAttempts.id }).from(taskSpecAttempts).where(and(eq(taskSpecAttempts.id, attemptId), inArray(taskSpecAttempts.state, ACTIVE_STATES))) : [];
  const [finalization] = await db.select({ id: taskSpecFinalizations.id }).from(taskSpecFinalizations).where(and(eq(taskSpecFinalizations.workflowId, workflow.id), sql`${taskSpecFinalizations.phase} in (${sql.join(PENDING_FINALIZATION.map((phase) => sql`${phase}`), sql`, `)})`));
  const decisions = ((pkg.packageIndex as { decisions?: { id: string; severity: string; status: string }[] }).decisions ?? []).filter((item) => item.severity === "blocking" && item.status === "open").map((item) => item.id);
  const blockers = specApprovalGate({ captureState: pkg.captureState, diagnostics: pkg.diagnostics as ReviewDiagnostic[], openBlockingDecisions: decisions, pendingInteractions: interactions.filter((item) => item.status === "pending").length, undeliveredResponses: interactions.filter((item) => item.status === "resolved" && item.delivery === "pending").length, activeAttempt: Boolean(active), unresolvedFinalization: Boolean(finalization) });
  if (blockers.length > 0 && input.action === "spec.approve") throw new TaskError(blockers[0]!.reason);
}
