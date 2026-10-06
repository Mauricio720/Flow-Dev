import { lstat, mkdir, readFile, rm, stat, writeFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { TaskError } from "../../../application/services/tasks/taskErrors";
import type { GitCredential, PrepareSpecWorkspace, SpecWorkspace } from "../../../application/spec/specWorkspaceGateway";
import { planCheckout, type CheckoutPlan } from "./checkoutPlan";
import type { GitRunner } from "./gitRunner";

export type RemoteIdentity = { githubId: string };
export type CheckoutDependencies = { root: string; remoteBase: string; git: GitRunner; resolveIdentity: (repository: { owner: string; name: string }, credential: GitCredential) => Promise<RemoteIdentity>; maxCheckoutBytes: number; fetchTimeoutMs: number };

const COMMIT_PATTERN = /^[0-9a-f]{40}([0-9a-f]{24})?$/;
const FAILURE = () => new TaskError("workspace_unavailable");
const RESOURCE_LIMIT = () => new TaskError("resource_limit");

export async function prepareCheckout(deps: CheckoutDependencies, input: PrepareSpecWorkspace): Promise<SpecWorkspace> {
  const plan = planCheckout({ root: deps.root, repositoryGithubId: input.repositoryGithubId, taskId: input.taskId });
  await assertIdentity(deps, input);
  const existing = await readMarker(plan);
  if (existing) return reuse(deps, plan, { marker: existing, input });
  if (await exists(plan.checkoutPath)) throw FAILURE();
  return clone(deps, plan, input);
}

async function assertIdentity(deps: CheckoutDependencies, input: PrepareSpecWorkspace) {
  const identity = await deps.resolveIdentity({ owner: input.owner, name: input.name }, input.credential).catch(() => { throw FAILURE(); });
  if (identity.githubId !== input.repositoryGithubId) throw FAILURE();
}

async function clone(deps: CheckoutDependencies, plan: CheckoutPlan, input: PrepareSpecWorkspace): Promise<SpecWorkspace> {
  await mkdir(plan.workspaceRoot, { recursive: true });
  const remote = `${deps.remoteBase}/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.name)}.git`;
  const run = (args: string[], cwd?: string, credential = input.credential) => deps.git({ args, cwd, credential, timeoutMs: deps.fetchTimeoutMs });
  try {
    await run(["clone", "--no-checkout", "--no-recurse-submodules", remote, plan.checkoutPath]);
    const baseCommit = input.pinnedCommit ?? (await run(["rev-parse", "HEAD"], plan.checkoutPath)).stdout;
    if (!COMMIT_PATTERN.test(baseCommit)) throw FAILURE();
    await run(["checkout", "--detach", baseCommit], plan.checkoutPath);
    await assertIdentity(deps, input);
    await assertSize(plan.checkoutPath, deps.maxCheckoutBytes);
    await writeFile(plan.markerPath, JSON.stringify({ slug: plan.slug, taskId: input.taskId, repositoryGithubId: input.repositoryGithubId, baseCommit }));
    return { slug: plan.slug, checkoutPath: plan.checkoutPath, baseCommit };
  } catch (error) {
    await rm(plan.checkoutPath, { recursive: true, force: true });
    throw error;
  }
}

async function reuse(deps: CheckoutDependencies, plan: CheckoutPlan, existing: { marker: { baseCommit: string }; input: PrepareSpecWorkspace }): Promise<SpecWorkspace> {
  const { marker, input } = existing;
  if (input.pinnedCommit && input.pinnedCommit !== marker.baseCommit) throw FAILURE();
  const head = await deps.git({ args: ["rev-parse", "HEAD"], cwd: plan.checkoutPath, timeoutMs: deps.fetchTimeoutMs });
  if (head.stdout !== marker.baseCommit) throw FAILURE();
  return { slug: plan.slug, checkoutPath: plan.checkoutPath, baseCommit: marker.baseCommit };
}

async function readMarker(plan: CheckoutPlan): Promise<{ baseCommit: string } | null> {
  try {
    const marker = JSON.parse(await readFile(plan.markerPath, "utf8")) as { slug?: string; baseCommit?: string };
    return marker.slug === plan.slug && marker.baseCommit ? { baseCommit: marker.baseCommit } : null;
  } catch { return null; }
}

async function exists(path: string) {
  try { await stat(path); return true; } catch { return false; }
}

async function assertSize(root: string, limit: number) {
  const total = await measure(root);
  if (total > limit) throw RESOURCE_LIMIT();
}

async function measure(path: string): Promise<number> {
  const stats = await lstat(path);
  if (stats.isSymbolicLink()) return 0;
  if (!stats.isDirectory()) return stats.size;
  const names = await readdir(path);
  const sizes = await Promise.all(names.map((name) => measure(join(path, name))));
  return sizes.reduce((sum, size) => sum + size, 0);
}
