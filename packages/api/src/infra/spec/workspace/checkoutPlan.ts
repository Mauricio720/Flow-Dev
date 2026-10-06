import { join } from "node:path";
import { TaskError } from "../../../application/services/tasks/taskErrors";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const NUMERIC_ID_PATTERN = /^[0-9]{1,20}$/;
const CANONICAL_ROOT = ".compozy/tasks";

export type CheckoutPlan = { slug: string; workspaceRoot: string; checkoutPath: string; markerPath: string; attemptsRoot: string; canonicalPath: string };

export function planCheckout(input: { root: string; repositoryGithubId: string; taskId: string }): CheckoutPlan {
  if (!NUMERIC_ID_PATTERN.test(input.repositoryGithubId) || !UUID_PATTERN.test(input.taskId)) throw new TaskError("workspace_unavailable");
  const slug = `flow-${input.taskId}`;
  const workspaceRoot = join(input.root, input.repositoryGithubId, input.taskId);
  const checkoutPath = join(workspaceRoot, "checkout");
  return { slug, workspaceRoot, checkoutPath, markerPath: join(workspaceRoot, "workspace.json"), attemptsRoot: join(workspaceRoot, "attempts"), canonicalPath: join(checkoutPath, CANONICAL_ROOT, slug) };
}

export function attemptPaths(plan: CheckoutPlan, attemptId: string) {
  if (!UUID_PATTERN.test(attemptId)) throw new TaskError("workspace_unavailable");
  const base = join(plan.attemptsRoot, attemptId);
  return { base, candidatePath: join(base, "candidate"), inputsPath: join(base, "inputs"), scratchPath: join(base, "scratch"), snapshotPath: join(base, "snapshot") };
}
