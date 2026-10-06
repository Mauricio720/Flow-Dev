import type { SpecInput, SpecRoute, SpecStage } from "./specContracts";
import { sha256Hex } from "./specPayload";
import { requiredUpstream } from "./specStages";
import { TaskError } from "../tasks/taskErrors";

export type SpecInputSource = {
  taskId: string;
  projectId: string;
  stage: SpecStage;
  publicationId: string;
  planningDecisionId: string;
  selectedRoute: SpecRoute;
  repositoryGithubId: string;
  publication: { issueNumber: number; title: string; bodyMarkdown: string };
  planningUncertainties: string[];
  upstreamPackageIds?: string[];
  reviewedPackageId?: string | null;
  adjustment?: string | null;
};

export type StoredSpecInput = Omit<SpecInput, "commitSha"> & {
  commitSha: string | null;
  publication: SpecInputSource["publication"];
  planningUncertainties: string[];
  retryContext?: { answers: { interactionId: string; question: string; answer: string }[]; unavailable: { interactionId: string; question: string }[]; permissionHistory: unknown[]; executablePermissions: never[] };
};

export function buildSpecInput(source: SpecInputSource): StoredSpecInput {
  const retained = { publication: source.publication, planningUncertainties: source.planningUncertainties };
  const upstreamPackageIds = source.upstreamPackageIds ?? [];
  const contextHash = sha256Hex(JSON.stringify({ ...retained, publicationId: source.publicationId, planningDecisionId: source.planningDecisionId, upstreamPackageIds }));
  return {
    taskId: source.taskId,
    projectId: source.projectId,
    stage: source.stage,
    publicationId: source.publicationId,
    planningDecisionId: source.planningDecisionId,
    selectedRoute: source.selectedRoute,
    repositoryGithubId: source.repositoryGithubId,
    commitSha: null,
    upstreamPackageIds,
    decisionIds: [],
    reviewedPackageId: source.reviewedPackageId ?? null,
    adjustment: source.adjustment ?? null,
    contextHash,
    ...retained,
  };
}

export function specInputHash(input: StoredSpecInput) {
  return sha256Hex(JSON.stringify(input));
}

export function sealSpecInput(input: StoredSpecInput, commitSha: string): StoredSpecInput & { commitSha: string } {
  const contextHash = sha256Hex(JSON.stringify({ contextHash: input.contextHash, commitSha }));
  return { ...input, commitSha, contextHash };
}

export function assertUpstreamPackages(input: Pick<StoredSpecInput, "selectedRoute" | "stage" | "upstreamPackageIds">) {
  const required = requiredUpstream(input.selectedRoute, input.stage);
  if (input.upstreamPackageIds.length !== required.length) throw new TaskError("stage_prerequisite");
}
