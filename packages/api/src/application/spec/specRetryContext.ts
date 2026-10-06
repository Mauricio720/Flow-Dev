import type { StoredSpecInput } from "../services/spec/specInput";

export type SavedAnswer = { interactionId: string; question: string; answer: string };
export type SavedPermission = { interactionId: string; decision: "allow_once" | "deny_once"; actionDigest: string };
export type RetrySource = { input: StoredSpecInput; answers: SavedAnswer[]; permissions: SavedPermission[]; adjustment: string | null; reviewedPackageIds: string[] };
export type RetryContext = { input: StoredSpecInput; answers: SavedAnswer[]; permissionHistory: SavedPermission[]; executablePermissions: SavedPermission[]; reviewedPackageIds: string[] };

export function buildRetryContext(source: RetrySource): RetryContext {
  return {
    input: { ...source.input, adjustment: source.adjustment ?? source.input.adjustment },
    answers: source.answers,
    permissionHistory: source.permissions,
    executablePermissions: [],
    reviewedPackageIds: source.reviewedPackageIds,
  };
}
