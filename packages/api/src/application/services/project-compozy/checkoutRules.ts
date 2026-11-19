import { isAbsolute, normalize } from "node:path";
import { TaskError } from "../../services/tasks/taskErrors";
import type { CheckoutInspection } from "../../git/checkoutInspector";

export type RepositoryRef = { owner: string; name: string };
export type CheckoutFailureCode = "checkout_not_found" | "checkout_not_git_root" | "checkout_remote_mismatch" | "default_branch_unknown";
export type CheckoutEvaluation = { ready: true; root: string; defaultBranch: string } | { ready: false; failureCode: CheckoutFailureCode; defaultBranch: string | null };

const MAX_PATH_LENGTH = 4096;
const TRAILING_SEPARATORS = /\/+$/;
const GIT_SUFFIX = /\.git$/i;
const SCP_REMOTE = /^[^/@\s]+@[^:/\s]+:(.+)$/;
const REPOSITORY_PATH = /^\/*([^/]+)\/([^/]+?)\/*$/;

export function validateCheckoutPath(value: string) {
  const path = value.trim();
  if (!path || path.length > MAX_PATH_LENGTH || !isAbsolute(path)) throw new TaskError("checkout_path_not_absolute");
  const normalized = normalize(path).replace(TRAILING_SEPARATORS, "");
  return normalized || "/";
}

export function normalizeRemote(remote: string): string | null {
  const repositoryPath = remotePath(remote.trim());
  const match = repositoryPath ? REPOSITORY_PATH.exec(repositoryPath.replace(GIT_SUFFIX, "")) : null;
  return match ? `${match[1]}/${match[2]}`.toLowerCase() : null;
}

export function matchesProjectRemote(remotes: string[], repository: RepositoryRef) {
  const expected = `${repository.owner}/${repository.name}`.toLowerCase();
  return remotes.some((remote) => normalizeRemote(remote) === expected);
}

export function evaluateCheckout(inspection: CheckoutInspection, repository: RepositoryRef): CheckoutEvaluation {
  if (!matchesProjectRemote(inspection.remotes, repository)) return { ready: false, failureCode: "checkout_remote_mismatch", defaultBranch: inspection.defaultBranch };
  if (!inspection.defaultBranch) return { ready: false, failureCode: "default_branch_unknown", defaultBranch: null };
  return { ready: true, root: inspection.root, defaultBranch: inspection.defaultBranch };
}

function remotePath(remote: string) {
  const scp = SCP_REMOTE.exec(remote);
  if (scp) return scp[1];
  try { return new URL(remote).pathname; }
  catch { return null; }
}
