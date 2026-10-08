import { decisionMatchesSource } from "../tasks/planningSourceInput";
import { isSpecRoute, type SpecReason, type SpecRoute, type SpecStage } from "./specContracts";

export type SpecEligibilityInput = {
  taskStatus: string;
  publication: { outcome: string; repositoryBindingMatches: boolean; issueId: string; issueNumber: number; title: string; bodyMarkdown: string } | null;
  planning: { status: string; selectedRoute: string; sourceSnapshotId?: string | null; publicationAttemptId?: string | null } | null;
  source?: { snapshotId: string; publicationAttemptId: string | null; claimState: string | null } | null;
};
export type SpecEligibility = { canStart: boolean; reason: SpecReason | null; route: SpecRoute | null; firstStage: SpecStage | null };

const APPROVED_PLANNING_STATUS = "approved";
const PUBLISHED_STATUS = "published";
const IMPORTED_STATUS = "imported";
const CLAIMED_STATE = "claimed";
const CREATED_OUTCOME = "created";

const blocked = (reason: SpecReason): SpecEligibility => ({ canStart: false, reason, route: null, firstStage: null });

export function specEligibility(input: SpecEligibilityInput): SpecEligibility {
  if (!hasConfirmedPublication(input) && !hasClaimedSource(input)) return blocked("publication_required");
  if (input.planning?.status !== APPROVED_PLANNING_STATUS) return blocked("planning_required");
  if (input.source && !decisionMatchesSource({ sourceSnapshotId: input.planning.sourceSnapshotId ?? null, publicationAttemptId: input.planning.publicationAttemptId ?? null }, input.source)) return blocked("source_changed");
  const route = input.planning.selectedRoute;
  if (!isSpecRoute(route)) return blocked("route_unsupported");
  return { canStart: true, reason: null, route, firstStage: route };
}

function hasClaimedSource(input: SpecEligibilityInput) {
  return [PUBLISHED_STATUS, IMPORTED_STATUS].includes(input.taskStatus) && input.source?.claimState === CLAIMED_STATE;
}

function hasConfirmedPublication(input: SpecEligibilityInput) {
  const publication = input.publication;
  if (input.taskStatus !== PUBLISHED_STATUS || publication?.outcome !== CREATED_OUTCOME || !publication.repositoryBindingMatches) return false;
  return Boolean(publication.issueId.trim() && publication.issueNumber > 0 && publication.title.trim() && publication.bodyMarkdown.trim());
}
