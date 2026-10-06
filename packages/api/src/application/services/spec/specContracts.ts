import type { TaskErrorReason } from "../tasks/taskErrors";

export const SPEC_STAGES = ["prd", "tech_spec", "tasks"] as const;
export const SPEC_ROUTES = ["prd", "tech_spec"] as const;
export const SPEC_STATES = ["not_started", "queued", "running", "waiting_question", "waiting_permission", "finalizing", "review", "stopping", "failed", "canceled", "approved"] as const;
export const SPEC_ACTIVE_ATTEMPT_STATES = ["queued", "dispatching", "running", "waiting", "finalizing", "stopping", "reconciling"] as const;
export const SPEC_ACTIONS = ["spec.start", "spec.adjust", "spec.answer", "spec.permission", "spec.cancel", "spec.retry", "spec.returnToReview", "spec.approve"] as const;
export const SPEC_INITIAL_VERSION = 0;

export type SpecStage = (typeof SPEC_STAGES)[number];
export type SpecRoute = (typeof SPEC_ROUTES)[number];
export type SpecState = (typeof SPEC_STATES)[number];
export type SpecAction = (typeof SPEC_ACTIONS)[number];
export type SpecReason = TaskErrorReason;

export type SpecInput = {
  taskId: string;
  projectId: string;
  stage: SpecStage;
  publicationId: string;
  planningDecisionId: string;
  selectedRoute: SpecRoute;
  repositoryGithubId: string;
  commitSha: string;
  upstreamPackageIds: string[];
  decisionIds: string[];
  reviewedPackageId: string | null;
  adjustment: string | null;
  contextHash: string;
};

export type SpecCommand = { projectId: string; taskId: string; requestKey: string; expectedSpecVersion: number };

export type SpecReceipt = {
  commandId: string;
  status: "accepted" | "applied" | "rejected" | "reconciling";
  specVersion: number;
  attemptId: string | null;
  packageId: string | null;
  reason: SpecReason | null;
};

export function isSpecRoute(value: unknown): value is SpecRoute {
  return (SPEC_ROUTES as readonly unknown[]).includes(value);
}
